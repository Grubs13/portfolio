# Calen in turnaround PPE, after the reference photos: white hard hat with a teal
# strap and a Pelican headlamp over a navy toque, thick black frames, stubble,
# navy FR henley with the tan undershirt at the collar and hi-vis stripes down to a
# waist band, a chest harness carrying a radio and a gas detector, a name tag,
# navy cargo pants with hi-vis shin bands and tan work boots.
#
# He is built like the site workers in `detail.py`, at their proportions: the
# skin body from `figure.py`, lightly smoothed so it keeps crisp facets, with the
# clothing painted on by region, a head about a seventh of his height (a little
# larger than theirs, so his glasses read), a snug domed hat and mitten hands.
# His own gear rides the joints of the skeleton. No rig: each pose
# in `POSES` turns joints, the body and parts are built once per pose, and each
# pose's meshes are exported under an empty named `pose_<name>`, which the site
# shows one at a time. Built in Blender's axes: z up, facing -y. Run inside
# Blender with DIR set to this folder:
#   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
import io, contextlib, os
import bpy, bmesh
from mathutils import Matrix, Vector

exec(open(f'{DIR}/figure.py').read(), globals())

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

# ---- body ----

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
    if 1.13 <= z < 1.6 and 0.11 < ax < 0.21 and abs(y) > 0.06: return 'hiVis'
    if 1.56 < z < 1.64 and ax < 0.045 and y < -0.06: return 'undershirt'
    return 'navy'

# ---- poses ----

# Joint turns in `figure.py`'s format; `stand` is the rest pose.
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
    # Seated at a desk: hips and knees at right angles, forearms forward to a keyboard and mouse.
    'sit': {
        'hipR': (-1.55, 0, 0.06), 'kneeR': (1.55, 0, 0), 'hipL': (-1.55, 0, -0.06), 'kneeL': (1.55, 0, 0),
        'shoulderR': (-0.55, 0, 0.12), 'elbowR': (-1.0, 0, 0), 'shoulderL': (-0.55, 0, -0.12), 'elbowL': (-1.0, 0, 0),
        'neckTop': (0.05, 0, 0),
    },
}
def body(collection, G=None):
    bm = skin_body(collection, G, 2, lambda c: BODY_PAINTS.index(body_paint(c)))
    return mesh_object('calen_body', bm, collection, BODY_PAINTS, smooth=False)

# ---- head ----

HEAD_PAINTS = ['skin', 'stubble', 'hair']
HEAD_C = Vector((0, 0, 1.87))
HEAD_SIZE = Vector((0.19, 0.2, 0.22))

def head(collection, hat=True):
    """The head: skin in front, stubble along the jaw, brown hair at the back and sides under the hat,
    with a nose, ears, thick black frames, a navy toque edge and the white hard hat with its teal strap
    and headlamp. Without the hat, at his desk, his hair covers the crown instead."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(HEAD_C) @ Matrix.Diagonal((*HEAD_SIZE, 1)), verts=bm.verts)
    for f in bm.faces:
        x, y, z = f.calc_center_median() - HEAD_C
        paint = 'skin'
        if z < -0.08 and y < -0.04: paint = 'stubble'
        if y > 0.03 and z > -0.1: paint = 'hair'
        if abs(x) > 0.15 and z > -0.02 and y > -0.08: paint = 'hair'
        f.material_index = HEAD_PAINTS.index(paint)
    made = [mesh_object('calen_head', bm, collection, HEAD_PAINTS, smooth=False)]

    def part(name, paint, maker, M, sub=0):
        b = bmesh.new(); maker(b); bmesh.ops.transform(b, matrix=M, verts=b.verts)
        if sub: b = smoothed(collection, b, sub)
        made.append(mesh_object(name, b, collection, [paint], smooth=False))

    cube = lambda b: bmesh.ops.create_cube(b, size=1)
    disc = lambda seg: (lambda b: bmesh.ops.create_cone(b, cap_ends=True, segments=seg, radius1=1, radius2=1, depth=1))
    T = lambda x, y, z, sx=1, sy=1, sz=1: Matrix.Translation(HEAD_C + Vector((x, y, z))) @ Matrix.Diagonal((sx, sy, sz, 1))
    part('nose', 'skin', cube, T(0, -0.2, -0.025, 0.05, 0.05, 0.075))
    for x in (-0.19, 0.19): part('ear', 'skin', cube, T(x, 0.0, -0.005, 0.03, 0.06, 0.08))
    # Thick black square frames with light lenses.
    for x in (-0.072, 0.072):
        part('frame', 'black', cube, T(x, -0.19, 0.03, 0.1, 0.025, 0.075))
        part('lens', 'lens', cube, T(x, -0.2035, 0.03, 0.074, 0.004, 0.05))
    part('bridge', 'black', cube, T(0, -0.19, 0.045, 0.05, 0.02, 0.02))
    for x in (-0.19, 0.19): part('temple', 'black', cube, T(x, -0.1, 0.045, 0.02, 0.18, 0.02))
    if not hat:
        crown = bmesh.new()
        bmesh.ops.create_uvsphere(crown, u_segments=12, v_segments=8, radius=1)
        bmesh.ops.delete(crown, geom=[v for v in crown.verts if v.co.z < 0.15 or (v.co.y < -0.55 and v.co.z < 0.6)], context='VERTS')
        bmesh.ops.transform(crown, matrix=T(0, 0.01, 0.0, HEAD_SIZE.x + 0.015, HEAD_SIZE.y + 0.015, HEAD_SIZE.z + 0.02), verts=crown.verts)
        made.append(mesh_object('hairCrown', crown, collection, ['hair'], smooth=False))
        return made
    # The toque edge, a snug dome with a brim, the teal strap round the dome and the headlamp on it.
    part('toque', 'toque', disc(12), T(0, 0.0, 0.055, 0.195, 0.205, 0.04))
    dome = bmesh.new()
    bmesh.ops.create_uvsphere(dome, u_segments=12, v_segments=6, radius=1)
    bmesh.ops.delete(dome, geom=[v for v in dome.verts if v.co.z < -1e-4], context='VERTS')
    bmesh.ops.transform(dome, matrix=T(0, 0, 0.08, 0.215, 0.23, 0.19), verts=dome.verts)
    made.append(mesh_object('hat', dome, collection, ['hardHat'], smooth=False))
    part('brim', 'hardHat', disc(12), T(0, -0.03, 0.085, 0.26, 0.285, 0.03))
    part('strap', 'headband', disc(12), T(0, 0, 0.125, 0.212, 0.227, 0.035))
    part('lamp', 'black', cube, T(0, -0.225, 0.15, 0.085, 0.05, 0.06))
    part('lampLens', 'lamp', cube, T(0, -0.251, 0.15, 0.05, 0.004, 0.035))
    return made

# ---- hands and gear ----

def hand(collection, side):
    """A mitten hand like the workers', relaxed at his side, and his watch on the left wrist."""
    wx, wy, wz = JOINTS[f'wrist{side}'][0]
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1)
    bmesh.ops.transform(b, matrix=Matrix.Translation((wx, wy - 0.01, wz - 0.06)) @ Matrix.Diagonal((0.14, 0.17, 0.21, 1)), verts=b.verts)
    made = [mesh_object(f'calen_hand{side}', smoothed(collection, b, 1), collection, ['skin'], smooth=False)]
    if side == 'L':
        w = bmesh.new()
        bmesh.ops.create_cone(w, cap_ends=True, segments=14, radius1=0.068, radius2=0.068, depth=0.035)
        bmesh.ops.transform(w, matrix=Matrix.Translation((wx, wy, wz + 0.03)), verts=w.verts)
        made.append(mesh_object('calen_watch', w, collection, ['reflective'], smooth=False))
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
        made.append(('wristL', mesh_object(name, b, collection, [paint], smooth=False)))
    return made

def gear(collection):
    """Chest harness with radio and gas detector, name tag, crest, and the hip radio."""
    made = []
    def box(name, paint, c, size, joint='chest'):
        b = bmesh.new(); bmesh.ops.create_cube(b, size=1)
        bmesh.ops.transform(b, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*size, 1)), verts=b.verts)
        made.append((joint, mesh_object(name, b, collection, [paint], smooth=False)))
    for s in (-1, 1):
        # Straps down the front, over the shoulder and down the back.
        box('strap', 'black', (s * 0.2, -0.175, 1.33), (0.055, 0.03, 0.42))
        box('strap', 'black', (s * 0.2, 0.165, 1.33), (0.055, 0.03, 0.42))
        box('strap', 'black', (s * 0.21, 0.0, 1.61), (0.055, 0.34, 0.035))
    box('radio', 'black', (-0.21, -0.215, 1.49), (0.1, 0.06, 0.15))
    box('antenna', 'steelDark', (-0.24, -0.215, 1.6), (0.022, 0.022, 0.1))
    box('detector', 'black', (0.21, -0.215, 1.29), (0.1, 0.06, 0.18))
    box('screen', 'lens', (0.21, -0.248, 1.27), (0.055, 0.01, 0.045))
    box('button', 'tankRed', (0.21, -0.248, 1.215), (0.03, 0.01, 0.022))
    box('led', 'detectorLed', (0.21, -0.248, 1.355), (0.04, 0.01, 0.018))
    box('nameTag', 'tube', (-0.11, -0.185, 1.43), (0.1, 0.01, 0.045))
    box('crest', 'pipeBlue', (0.1, -0.18, 1.44), (0.07, 0.01, 0.05))
    box('hipRadio', 'black', (-0.27, -0.06, 1.01), (0.06, 0.09, 0.16), 'pelvis')
    box('hipRadioFace', 'pipeBlue', (-0.302, -0.06, 1.01), (0.01, 0.07, 0.1), 'pelvis')
    for z in (1.5, 1.45): box('button', 'hair', (0, -0.172, z), (0.025, 0.01, 0.025))
    return made

def lowest(obs):
    return min((ob.matrix_world @ v.co).z for ob in obs for v in ob.data.vertices)

def posed(col, name):
    """Calen in pose `name`, under an empty `pose_<name>`. Each part is built at rest and carried
    by its joint's posed transform, and the pose is set on the ground where the standing pose stands."""
    pose = POSES[name]
    G = pose_matrices(pose) if pose else None
    riders = [*(('neckTop', ob) for ob in head(col, hat=name != 'sit')), *hand(col, 'R'), *hand(col, 'L'), *gear(col)]
    if name == 'inspect': riders += flashlight(col)
    for joint, ob in riders: ob.data.transform(rider(G, joint))
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
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_normals=False,
                                  export_texcoords=False, export_tangents=False, export_vertex_color='NONE',
                                  export_animations=False, export_apply=True, export_cameras=False, export_lights=False, export_yup=True)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs)
    return {'objects': len(obs), 'tris': tris, 'bytes': os.path.getsize(path)}

result = run(DIR)
