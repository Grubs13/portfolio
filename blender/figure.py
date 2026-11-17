# The figure Calen and the site workers are built from: a stick skeleton whose
# joints a pose turns, and a smooth body grown over it by Blender's Skin modifier.
# A pose turns joints, forward kinematics carries each joint and everything below
# it, the body is rebuilt from the posed joints, and each face is painted by where
# it sat at rest, so clothing stays put on the limbs. Other parts ride one joint.
# Built in Blender's axes: z up, facing -y.
import bpy, bmesh
from mathutils import Euler, Matrix, Vector

# Skeleton joints, in metres for a 1.8 m adult: name -> (position, (radius across, radius front-to-back)).
# The radii are of the clothed body, so sleeves and trouser legs hang straight.
JOINTS = {
    'pelvis': ((0, 0, 0.95), (0.16, 0.115)),
    'waist': ((0, 0.005, 1.1), (0.146, 0.106)),
    'chest': ((0, -0.005, 1.27), (0.164, 0.122)),
    'upper': ((0, 0, 1.41), (0.15, 0.108)),
    'neckBase': ((0, 0.012, 1.505), (0.068, 0.066)),
    'neckTop': ((0, 0.004, 1.575), (0.058, 0.06)),
}
for side, s in (('R', -1), ('L', 1)):
    JOINTS.update({
        f'shoulder{side}': ((s * 0.178, 0, 1.445), (0.068, 0.066)),
        f'bicep{side}': ((s * 0.208, 0.005, 1.3), (0.056, 0.058)),
        f'elbow{side}': ((s * 0.222, 0.015, 1.14), (0.048, 0.05)),
        f'forearm{side}': ((s * 0.23, 0.0, 1.03), (0.046, 0.045)),
        f'wrist{side}': ((s * 0.236, -0.02, 0.9), (0.036, 0.033)),
        f'hip{side}': ((s * 0.09, 0, 0.9), (0.098, 0.104)),
        f'thigh{side}': ((s * 0.096, -0.005, 0.72), (0.088, 0.094)),
        f'knee{side}': ((s * 0.1, -0.012, 0.5), (0.072, 0.076)),
        f'calf{side}': ((s * 0.1, 0.012, 0.36), (0.07, 0.074)),
        f'ankle{side}': ((s * 0.1, 0.01, 0.13), (0.066, 0.07)),
        f'heel{side}': ((s * 0.1, 0.035, 0.05), (0.05, 0.048)),
        f'toe{side}': ((s * 0.105, -0.16, 0.045), (0.052, 0.04)),
    })
BONES = [('pelvis', 'waist'), ('waist', 'chest'), ('chest', 'upper'), ('upper', 'neckBase'), ('neckBase', 'neckTop')]
for side in 'RL':
    BONES += [('upper', f'shoulder{side}'), (f'shoulder{side}', f'bicep{side}'), (f'bicep{side}', f'elbow{side}'),
              (f'elbow{side}', f'forearm{side}'), (f'forearm{side}', f'wrist{side}'),
              ('pelvis', f'hip{side}'), (f'hip{side}', f'thigh{side}'), (f'thigh{side}', f'knee{side}'),
              (f'knee{side}', f'calf{side}'), (f'calf{side}', f'ankle{side}'), (f'ankle{side}', f'heel{side}'), (f'heel{side}', f'toe{side}')]
PARENT = {b: a for a, b in BONES}

def evaluated(ob):
    """The object's mesh with its modifiers applied, as a bmesh; the object is removed."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me)
    data = ob.data
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    if isinstance(data, bpy.types.Mesh) and data.users == 0: bpy.data.meshes.remove(data)
    return bm

def smoothed(collection, bm, levels):
    o = bpy.data.objects.new('t', bpy.data.meshes.new('t')); bm.to_mesh(o.data); bm.free()
    collection.objects.link(o); o.modifiers.new('s', 'SUBSURF').levels = levels
    return evaluated(o)

# ---- poses ----

# A pose turns joints by Euler angles (x, y, z) in radians, about Blender's axes as the
# parent joint carries them, and a turn at a joint swings everything below it in `BONES`.
# Facing -y, a positive x turn tips an upright bone forward and swings a hanging one back.

def pose_matrices(pose):
    """Each joint's posed rigid transform, by forward kinematics from the pelvis down `BONES`.
    It carries a point riding that joint from where it sits at rest to where it sits posed."""
    G = {}
    for name in ['pelvis', *PARENT]:
        rest = Vector(JOINTS[name][0])
        turn = Euler(pose.get(name, (0, 0, 0)), 'XYZ').to_matrix().to_4x4()
        G[name] = G.get(PARENT.get(name), Matrix.Identity(4)) @ Matrix.Translation(rest) @ turn @ Matrix.Translation(-rest)
    return G

def rest_point(G, p):
    """Where a point of the posed body sat at rest, pulled back through the bone nearest to it."""
    def distance(bone):
        a, b = (G[bone[0]] @ Vector(JOINTS[j][0]) for j in bone)
        t = max(0.0, min(1.0, (p - a).dot(b - a) / (b - a).length_squared))
        return (a.lerp(b, t) - p).length
    return G[min(BONES, key=distance)[0]].inverted() @ p

def rider(G, joint):
    """The transform that carries a part riding `joint` from rest into the pose; identity at rest."""
    return G[joint] if G else Matrix.Identity(4)

# ---- body ----

def skin_body(collection, G, levels, paint_index, skip=()):
    """The body grown over the skeleton posed by `G` (at rest when None) and smoothed `levels`
    times, as a bmesh whose faces carry `paint_index(rest position)` as their material index.
    Joints named in `skip` are left out, for parts modelled separately."""
    me = bpy.data.meshes.new('skeleton')
    names = [n for n in JOINTS if n not in skip]
    joint = (lambda n: JOINTS[n][0]) if G is None else (lambda n: G[n] @ Vector(JOINTS[n][0]))
    me.from_pydata([joint(n) for n in names], [(names.index(a), names.index(b)) for a, b in BONES if a in names and b in names], [])
    ob = bpy.data.objects.new('skeleton', me)
    collection.objects.link(ob)
    skin = ob.modifiers.new('skin', 'SKIN')
    skin.use_smooth_shade = True
    for i, n in enumerate(names):
        me.skin_vertices[0].data[i].radius = JOINTS[n][1]
    me.skin_vertices[0].data[0].use_root = True
    if levels: ob.modifiers.new('smooth', 'SUBSURF').levels = levels
    bm = evaluated(ob)
    # Painted where each face sat at rest, so the bands stay put on the limbs in any pose.
    rest = (lambda c: c) if G is None else (lambda c: rest_point(G, c))
    for f in bm.faces: f.material_index = paint_index(rest(f.calc_center_median()))
    return bm
