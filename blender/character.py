# Calen in turnaround PPE, after the reference photos: white hard hat with a teal
# strap and a Pelican headlamp over a navy toque, thick black frames, stubble,
# navy FR henley with the tan undershirt at the collar and hi-vis stripes down to a
# waist band, a chest harness carrying a radio and a gas detector, a name tag,
# navy cargo pants with hi-vis shin bands and tan work boots.
#
# The body is one continuous mesh grown from a stick skeleton by Blender's Skin
# modifier and smoothed, so shoulders, the chest-to-waist taper, elbows, knees and
# boots blend like the chunky brawlers in the style references. Clothing is painted
# onto it by region. Head, hands and gear are modelled separately, each riding a
# joint of the skeleton. No rig: each pose in `POSES` turns joints, the body and
# parts are built once per pose, and each pose's meshes are exported under an
# empty named `pose_<name>`, which the site shows one at a time. Built in
# Blender's axes: z up, facing -y. Run inside Blender with DIR set to this folder:
#   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
import io, contextlib, math, os
import bpy, bmesh
from mathutils import Euler, Matrix, Vector

COLORS = {
    'navy': 0x26325a, 'navyDark': 0x1d2747, 'hiVis': 0xd4f03a, 'reflective': 0xc5ccd6, 'skin': 0xe3b48d,
    'skinShade': 0xc99a76, 'stubble': 0xbf9373, 'hair': 0x4a3324, 'hardHat': 0xf2f1ea, 'headband': 0x56736e,
    'black': 0x17191f, 'lens': 0x9db9dc, 'undershirt': 0xcdbb9c, 'boots': 0xa97c4e, 'bootsDark': 0x7d5a39,
    'sole': 0x4a3a2c, 'lamp': 0xfff2c2, 'detectorLed': 0x5cff7a, 'steelDark': 0x30364a, 'tankRed': 0xc84a3a,
    'pipeBlue': 0x4a7fd0, 'tube': 0xe0e2e8, 'toque': 0x2b3f63, 'lip': 0xb97a66, 'eye': 0x3d5a80,
}

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def material(paint):
    name = f'calen_{paint}'
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    lin = [srgb_to_linear(((COLORS[paint] >> s) & 255) / 255) for s in (16, 8, 0)]
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = 1
    m.diffuse_color = (*lin, 1)
    return m

def mesh_object(name, bm, collection, paints, smooth=True):
    """An object from a bmesh whose faces carry `material_index` into `paints`."""
    me = bpy.data.meshes.new(name)
    for f in bm.faces: f.smooth = smooth
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    for p in paints: ob.data.materials.append(material(p))
    return ob

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

# ---- body ----

# Skeleton joints: name -> (position, (radius across, radius front-to-back)).
JOINTS = {
    'pelvis': ((0, 0, 0.98), (0.2, 0.14)),
    'waist': ((0, 0, 1.12), (0.21, 0.15)),
    'chest': ((0, -0.01, 1.34), (0.26, 0.17)),
    'upper': ((0, 0, 1.5), (0.27, 0.16)),
    'neckBase': ((0, 0.01, 1.63), (0.11, 0.1)),
    'neckTop': ((0, 0.01, 1.7), (0.09, 0.09)),
}
for side, s in (('R', -1), ('L', 1)):
    JOINTS.update({
        f'shoulder{side}': ((s * 0.29, 0, 1.53), (0.115, 0.11)),
        f'bicep{side}': ((s * 0.36, 0.0, 1.38), (0.095, 0.095)),
        f'elbow{side}': ((s * 0.39, 0.02, 1.22), (0.075, 0.075)),
        f'forearm{side}': ((s * 0.405, 0.0, 1.1), (0.08, 0.075)),
        f'wrist{side}': ((s * 0.41, -0.02, 0.99), (0.06, 0.055)),
        f'hip{side}': ((s * 0.12, 0, 0.9), (0.125, 0.125)),
        f'thigh{side}': ((s * 0.13, 0, 0.72), (0.115, 0.115)),
        f'knee{side}': ((s * 0.135, -0.01, 0.52), (0.09, 0.095)),
        f'calf{side}': ((s * 0.135, 0.01, 0.36), (0.095, 0.095)),
        f'ankle{side}': ((s * 0.135, 0.0, 0.18), (0.1, 0.1)),
        f'heel{side}': ((s * 0.135, 0.04, 0.08), (0.1, 0.085)),
        f'toe{side}': ((s * 0.14, -0.15, 0.07), (0.095, 0.075)),
    })
BONES = [('pelvis', 'waist'), ('waist', 'chest'), ('chest', 'upper'), ('upper', 'neckBase'), ('neckBase', 'neckTop')]
for side in 'RL':
    BONES += [('upper', f'shoulder{side}'), (f'shoulder{side}', f'bicep{side}'), (f'bicep{side}', f'elbow{side}'),
              (f'elbow{side}', f'forearm{side}'), (f'forearm{side}', f'wrist{side}'),
              ('pelvis', f'hip{side}'), (f'hip{side}', f'thigh{side}'), (f'thigh{side}', f'knee{side}'),
              (f'knee{side}', f'calf{side}'), (f'calf{side}', f'ankle{side}'), (f'ankle{side}', f'heel{side}'), (f'heel{side}', f'toe{side}')]

BODY_PAINTS = ['navy', 'hiVis', 'reflective', 'boots', 'sole', 'navyDark', 'bootsDark', 'undershirt']

def body_paint(c):
    """Which clothing covers a point of the body, from its position."""
    x, y, z = c
    ax = abs(x)
    if z < 0.03: return 'sole'
    if z < 0.25: return 'bootsDark' if z > 0.21 else 'boots'
    if ax < 0.3 and z < 0.95:
        # Pants: hi-vis band below the knee with a reflective centre, a darker cargo pocket on the outer thigh.
        if 0.3 < z < 0.38: return 'reflective' if 0.325 < z < 0.355 else 'hiVis'
        if 0.6 < z < 0.8 and ax > 0.2 and abs(y) < 0.07: return 'navyDark'
        return 'navy'
    if ax >= 0.3:
        # Sleeves: a hi-vis band near the cuff.
        if 1.03 < z < 1.09: return 'reflective' if 1.05 < z < 1.07 else 'hiVis'
        return 'navy'
    # Henley: stripes down front and back from the shoulders to a waist band, the undershirt at the collar.
    if 1.04 < z < 1.13: return 'reflective' if 1.075 < z < 1.095 else 'hiVis'
    if 1.13 <= z < 1.6 and 0.12 < ax < 0.21 and abs(y) > 0.06: return 'reflective' if 0.15 < ax < 0.18 else 'hiVis'
    if 1.56 < z < 1.64 and ax < 0.045 and y < -0.06: return 'undershirt'
    return 'navy'

# ---- poses ----

# A pose turns joints by Euler angles (x, y, z) in radians, about Blender's axes as the
# parent joint carries them, and a turn at a joint swings everything below it in `BONES`.
# Facing -y, a positive x turn tips an upright bone forward and swings a hanging one back.
POSES = {
    'stand': {},
    # Kneeling on his right knee with the toes tucked, leaning in to a flange face: a
    # flashlight raised in his left hand, the right hand reaching forward palm out, the head down.
    'inspect': {
        'pelvis': (0.6, 0, 0), 'neckTop': (-0.15, 0, 0),
        'hipR': (-0.55, 0, 0.05), 'kneeR': (1.75, 0, 0), 'ankleR': (-0.2, 0, 0),
        'hipL': (-2.3, 0, -0.12), 'kneeL': (1.7, 0, 0),
        'shoulderL': (-1.95, 0, -0.3), 'elbowL': (-0.35, 0, 0), 'wristL': (0.15, 0, 0),
        'shoulderR': (-1.75, 0, 0.2), 'elbowR': (-0.1, 0, 0), 'wristR': (1.2, 0, 0),
    },
}
PARENT = {b: a for a, b in BONES}

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

def body(collection, G=None):
    me = bpy.data.meshes.new('skeleton')
    names = list(JOINTS)
    joint = (lambda n: JOINTS[n][0]) if G is None else (lambda n: G[n] @ Vector(JOINTS[n][0]))
    me.from_pydata([joint(n) for n in names], [(names.index(a), names.index(b)) for a, b in BONES], [])
    ob = bpy.data.objects.new('skeleton', me)
    collection.objects.link(ob)
    skin = ob.modifiers.new('skin', 'SKIN')
    skin.use_smooth_shade = True
    for i, n in enumerate(names):
        me.skin_vertices[0].data[i].radius = JOINTS[n][1]
    me.skin_vertices[0].data[0].use_root = True
    # Fine enough that the painted stripes and bands keep straight edges.
    ob.modifiers.new('smooth', 'SUBSURF').levels = 3
    bm = evaluated(ob)
    # Painted where each face sat at rest, so the bands stay put on the limbs in any pose.
    rest = (lambda c: c) if G is None else (lambda c: rest_point(G, c))
    for f in bm.faces: f.material_index = BODY_PAINTS.index(body_paint(rest(f.calc_center_median())))
    return mesh_object('calen_body', bm, collection, BODY_PAINTS)

# ---- head ----

HEAD_PAINTS = ['skin', 'stubble', 'hair', 'lip', 'skinShade']
HEAD_C = Vector((0, 0.0, 1.9))

def head(collection):
    """A big head with a square jaw, stubble on the jaw and lip, brown hair at the sides and back under the hat."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=1)
    for v in bm.verts:
        x, y, z = v.co
        # Squarer, wider jaw below, a flatter back, the chin brought forward.
        jaw = max(0.0, -z)
        v.co = Vector((x * 0.235 * (1 + 0.1 * jaw), y * 0.235 * (1 - 0.08 * max(0.0, y)) - 0.01 * jaw, z * 0.27))
        if z < -0.55 and y < 0: v.co.y -= 0.08 * (-z - 0.55)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(HEAD_C), verts=bm.verts)
    bm = smoothed(collection, bm, 1)
    for f in bm.faces:
        x, y, z = f.calc_center_median() - HEAD_C
        front = y < -0.08
        paint = 'skin'
        if z < -0.12 and (front or abs(x) > 0.15): paint = 'stubble'
        if -0.075 < z < -0.055 and abs(x) < 0.055 and front: paint = 'stubble'
        if -0.115 < z < -0.09 and abs(x) < 0.05 and y < -0.18: paint = 'lip'
        if z > 0.02 and not front: paint = 'hair'
        if z > -0.05 and y > 0.05: paint = 'hair'
        if z > 0.11 and front and abs(x) > 0.1: paint = 'hair'
        f.material_index = HEAD_PAINTS.index(paint)
    made = [mesh_object('calen_head', bm, collection, HEAD_PAINTS)]

    def part(name, paint, maker, M, sub=0, smooth=True):
        b = bmesh.new(); maker(b); bmesh.ops.transform(b, matrix=M, verts=b.verts)
        if sub: b = smoothed(collection, b, sub)
        made.append(mesh_object(name, b, collection, [paint], smooth))

    cube = lambda b: bmesh.ops.create_cube(b, size=1)
    sphere = lambda b: bmesh.ops.create_uvsphere(b, u_segments=12, v_segments=8, radius=0.5)
    cyl = lambda seg, r1, r2: (lambda b: bmesh.ops.create_cone(b, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=1))
    T = lambda x, y, z, sx=1, sy=1, sz=1: Matrix.Translation(HEAD_C + Vector((x, y, z))) @ Matrix.Diagonal((sx, sy, sz, 1))
    # Nose, ears, brow.
    part('nose', 'skin', sphere, T(0, -0.235, -0.01, 0.07, 0.07, 0.1), 1)
    for x in (-0.235, 0.235): part('ear', 'skinShade', sphere, T(x, 0.0, 0.0, 0.05, 0.09, 0.11), 1)
    part('brow', 'hair', cube, T(0, -0.215, 0.085, 0.3, 0.04, 0.025), 1)
    # Thick black square frames, light lenses, blue eyes behind.
    for x in (-0.095, 0.095):
        part('eye', 'eye', sphere, T(x, -0.21, 0.035, 0.05, 0.03, 0.05))
        part('frame', 'black', cube, T(x, -0.232, 0.035, 0.15, 0.03, 0.115), 0, False)
        part('lens', 'lens', cube, T(x, -0.246, 0.035, 0.115, 0.01, 0.08), 0, False)
    part('bridge', 'black', cube, T(0, -0.236, 0.05, 0.06, 0.025, 0.025), 0, False)
    for x in (-0.225, 0.225): part('temple', 'black', cube, T(x, -0.11, 0.05, 0.025, 0.24, 0.025), 0, False)
    # Navy toque edge under the brim, the hat dome with its ridge, brim, teal strap, headlamp.
    part('toque', 'toque', cyl(24, 0.25, 0.25), T(0, 0.0, 0.16, 1, 1.04, 0.06), 1)
    part('hat', 'hardHat', sphere, T(0, 0.0, 0.2, 0.56, 0.6, 0.5), 1)
    part('brim', 'hardHat', cyl(24, 0.27, 0.28), T(0, -0.04, 0.19, 1, 1.12, 0.035), 1)
    part('ridge', 'hardHat', cube, T(0, 0.0, 0.44, 0.06, 0.42, 0.06), 2)
    part('strap', 'headband', cyl(24, 0.268, 0.272), T(0, 0.0, 0.26, 1, 1.07, 0.05))
    part('lamp', 'black', cube, T(0, -0.3, 0.32, 0.15, 0.08, 0.11), 1)
    part('lampLens', 'lamp', cube, T(0, -0.342, 0.32, 0.08, 0.01, 0.06), 0, False)
    return made

# ---- hands and gear ----

def hand(collection, side):
    """A big mitten hand with a thumb, relaxed at his side."""
    s = -1 if side == 'R' else 1
    wx, wy, wz = JOINTS[f'wrist{side}'][0]
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1)
    bmesh.ops.transform(b, matrix=Matrix.Translation((wx + s * 0.005, wy - 0.01, wz - 0.07)) @ Matrix.Diagonal((0.12, 0.17, 0.19, 1)), verts=b.verts)
    thumb = bmesh.new()
    bmesh.ops.create_cube(thumb, size=1)
    bmesh.ops.transform(thumb, matrix=Matrix.Translation((wx - s * 0.045, wy - 0.085, wz - 0.04)) @ Matrix.Rotation(-0.4 * s, 4, 'Y') @ Matrix.Diagonal((0.055, 0.06, 0.1, 1)), verts=thumb.verts)
    me = bpy.data.meshes.new('t'); thumb.to_mesh(me); thumb.free(); b.from_mesh(me); bpy.data.meshes.remove(me)
    made = [mesh_object(f'calen_hand{side}', smoothed(collection, b, 2), collection, ['skin'])]
    if side == 'L':
        w = bmesh.new()
        bmesh.ops.create_cone(w, cap_ends=True, segments=14, radius1=0.068, radius2=0.068, depth=0.035)
        bmesh.ops.transform(w, matrix=Matrix.Translation((wx, wy, wz + 0.03)), verts=w.verts)
        made.append(mesh_object('calen_watch', w, collection, ['reflective']))
    return [(f'wrist{side}', ob) for ob in made]

def flashlight(collection):
    """A black flashlight gripped in the left fist, its body along the hand and the lens past the fingertips."""
    wx, wy, wz = JOINTS['wristL'][0]
    made = []
    for name, paint, r1, r2, z0, z1 in (('flashlight', 'black', 0.034, 0.034, 0.64, 0.98), ('bezel', 'black', 0.052, 0.036, 0.58, 0.64),
                                        ('flashlightLens', 'lamp', 0.042, 0.042, 0.574, 0.582)):
        b = bmesh.new()
        bmesh.ops.create_cone(b, cap_ends=True, segments=12, radius1=r1, radius2=r2, depth=z1 - z0)
        bmesh.ops.transform(b, matrix=Matrix.Translation((wx + 0.005, wy - 0.03, (z0 + z1) / 2)), verts=b.verts)
        made.append(('wristL', mesh_object(name, b, collection, [paint])))
    return made

def gear(collection):
    """Chest harness with radio and gas detector, name tag, crest, and the hip radio."""
    made = []
    def box(name, paint, c, size, sub=0, joint='chest'):
        b = bmesh.new(); bmesh.ops.create_cube(b, size=1)
        bmesh.ops.transform(b, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*size, 1)), verts=b.verts)
        if sub: b = smoothed(collection, b, sub)
        made.append((joint, mesh_object(name, b, collection, [paint], smooth=bool(sub))))
    for s in (-1, 1):
        # Straps down the front, over the shoulder and down the back.
        box('strap', 'black', (s * 0.2, -0.175, 1.33), (0.055, 0.03, 0.42))
        box('strap', 'black', (s * 0.2, 0.165, 1.33), (0.055, 0.03, 0.42))
        box('strap', 'black', (s * 0.21, 0.0, 1.61), (0.055, 0.34, 0.035))
    box('radio', 'black', (-0.21, -0.215, 1.49), (0.1, 0.06, 0.15), 1)
    box('antenna', 'steelDark', (-0.24, -0.215, 1.6), (0.022, 0.022, 0.1))
    box('detector', 'black', (0.21, -0.215, 1.29), (0.1, 0.06, 0.18), 1)
    box('screen', 'lens', (0.21, -0.248, 1.27), (0.055, 0.01, 0.045))
    box('button', 'tankRed', (0.21, -0.248, 1.215), (0.03, 0.01, 0.022))
    box('led', 'detectorLed', (0.21, -0.248, 1.355), (0.04, 0.01, 0.018))
    box('nameTag', 'tube', (-0.11, -0.185, 1.43), (0.1, 0.01, 0.045))
    box('crest', 'pipeBlue', (0.1, -0.18, 1.44), (0.07, 0.01, 0.05))
    box('hipRadio', 'black', (-0.27, -0.06, 1.01), (0.06, 0.09, 0.16), 1, 'pelvis')
    box('hipRadioFace', 'pipeBlue', (-0.302, -0.06, 1.01), (0.01, 0.07, 0.1), 0, 'pelvis')
    for z in (1.5, 1.45): box('button', 'hair', (0, -0.172, z), (0.025, 0.01, 0.025))
    # Work boots over the feet: a rounded toe cap, the shaft, a darker welt and sole, laces.
    for s, side in ((-1, 'R'), (1, 'L')):
        x = s * 0.14
        box('boot', 'boots', (x, -0.05, 0.1), (0.22, 0.36, 0.17), 2, f'ankle{side}')
        box('boot', 'boots', (x, 0.01, 0.2), (0.21, 0.22, 0.17), 2, f'ankle{side}')
        box('sole', 'sole', (x, -0.05, 0.03), (0.225, 0.365, 0.05), 1, f'ankle{side}')
        box('laces', 'bootsDark', (x, -0.11, 0.2), (0.07, 0.09, 0.01), 0, f'ankle{side}')
    return made

def lowest(obs):
    return min((ob.matrix_world @ v.co).z for ob in obs for v in ob.data.vertices)

def posed(col, name):
    """Calen in pose `name`, under an empty `pose_<name>`. Each part is built at rest and carried
    by its joint's posed transform, and the pose is set on the ground where the standing pose stands."""
    pose = POSES[name]
    G = pose_matrices(pose) if pose else None
    riders = [*(('neckTop', ob) for ob in head(col)), *hand(col, 'R'), *hand(col, 'L'), *gear(col)]
    if name == 'inspect': riders += flashlight(col)
    if G:
        for joint, ob in riders: ob.data.transform(G[joint])
    obs = [body(col, G), *(ob for _, ob in riders)]
    root = bpy.data.objects.new(f'pose_{name}', None)
    col.objects.link(root)
    for ob in obs: ob.parent = root
    return root, obs

def run(DIR):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions):
        for x in list(coll): coll.remove(x)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    col = bpy.data.collections.new('calen'); bpy.context.scene.collection.children.link(col)
    obs = []
    ground = None
    for name in POSES:
        _, made = posed(col, name)
        low = lowest(made)
        if ground is None: ground = low
        for ob in made: ob.data.transform(Matrix.Translation((0, 0, ground - low)))
        obs += made
    os.makedirs(f'{DIR}/out', exist_ok=True)
    path = f'{DIR}/out/calen.glb'
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col.objects: ob.select_set(True)
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_normals=True,
                                  export_texcoords=False, export_tangents=False, export_vertex_color='NONE',
                                  export_animations=False, export_apply=True, export_cameras=False, export_lights=False, export_yup=True)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs)
    return {'objects': len(obs), 'tris': tris, 'bytes': os.path.getsize(path)}

result = run(DIR)
