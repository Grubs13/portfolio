# Calen in turnaround PPE, after the reference photos, at real human proportions
# (1.8 m, about seven and a half heads): a sculpted head with thick black frames,
# stubble and wavy brown hair under a navy toque and a white hard hat with its strap
# and Pelican headlamp, a navy FR henley with hi-vis stripes down to a waist band,
# a chest harness carrying a speaker mic and a gas detector, cargo pants with
# hi-vis shin bands, tan work boots and hands with fingers.
#
# The clothed body is the skin body from `figure.py`, smoothed. Stripes, bands,
# straps and patches are strips shrink-wrapped onto that body at rest, so they
# follow its surface, and every part rides the joint that carries it. No rig: each
# pose in `POSES` turns joints, the body and parts are built once per pose, and
# each pose's meshes are exported under an empty named `pose_<name>`, which the
# site shows one at a time. Built in metres in Blender's axes: z up, facing -y,
# his right hand at -x. Run inside Blender with DIR set to this folder:
#   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
import io, contextlib, math, os
import bpy, bmesh
from mathutils import Matrix, Vector

exec(open(f'{DIR}/figure.py').read(), globals())

COLORS = {
    'shirt': 0x232d52, 'pants': 0x2b3454, 'navyDark': 0x1a2240, 'hiVis': 0xd8f23c, 'reflective': 0xb9c0cb,
    'skin': 0xdcab86, 'stubble': 0xb58e70, 'lip': 0xb9776a, 'hair': 0x4b3324, 'eyeWhite': 0xe9e6e0, 'iris': 0x3f5d86,
    'hardHat': 0xf1f0e8, 'headband': 0x5f8580, 'toque': 0x2c4368, 'black': 0x16181e, 'undershirt': 0xcbb999,
    'boots': 0xa77b4f, 'bootsDark': 0x7a5839, 'sole': 0x3d3027, 'lace': 0x5a4330, 'lamp': 0xfff2c2,
    'detectorLed': 0x5cff7a, 'steel': 0x8d939f, 'steelDark': 0x30364a, 'tankRed': 0xc84a3a, 'pipeBlue': 0x3f74c8,
    'tube': 0xecebe6, 'lens': 0x9db9dc,
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

def mesh_object(name, bm, collection, paints):
    """An object from a bmesh whose faces carry `material_index` into `paints`."""
    me = bpy.data.meshes.new(name)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    for p in paints: ob.data.materials.append(material(p))
    return ob

# ---- shapes ----

def box(c, size, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES', profile=0.5)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return bm

def rod(a, b, r, segments=10, r2=None):
    """A capped cylinder from `a` to `b`."""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r, radius2=r if r2 is None else r2, depth=(b - a).length)
    M = Matrix.Translation((a + b) / 2) @ (b - a).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return bm

def shell(c, surface, u=40, v=28):
    """A closed surface round `c`: `surface(direction)` places each vertex of a sphere."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1)
    for vert in bm.verts: vert.co = Vector(c) + surface(vert.co.normalized())
    return bm

def skin_mesh(collection, points, edges, radii, roots, levels=2):
    """A smooth body grown over a small skeleton by the Skin modifier, as a bmesh."""
    me = bpy.data.meshes.new('chain')
    me.from_pydata([tuple(p) for p in points], edges, [])
    ob = bpy.data.objects.new('chain', me)
    collection.objects.link(ob)
    ob.modifiers.new('skin', 'SKIN').use_smooth_shade = True
    for i, r in enumerate(radii):
        me.skin_vertices[0].data[i].radius = r if isinstance(r, tuple) else (r, r)
        me.skin_vertices[0].data[i].use_root = i in roots
    ob.modifiers.new('smooth', 'SUBSURF').levels = levels
    return evaluated(ob)

def painted(bm, index):
    for f in bm.faces: f.material_index = index
    return bm

# ---- wrapping onto the body ----

def wrapped(collection, bm, target, offset, thickness=0.003):
    """`bm` pulled onto the body's surface, `offset` above it, and given `thickness`."""
    ob = bpy.data.objects.new('wrap', bpy.data.meshes.new('wrap'))
    bm.to_mesh(ob.data); bm.free()
    collection.objects.link(ob)
    wrap = ob.modifiers.new('wrap', 'SHRINKWRAP')
    wrap.target, wrap.wrap_method, wrap.wrap_mode, wrap.offset = target, 'NEAREST_SURFACEPOINT', 'ABOVE_SURFACE', offset
    solid = ob.modifiers.new('solid', 'SOLIDIFY')
    solid.thickness, solid.offset = thickness, 0
    return evaluated(ob)

def band(center, radii, z0, z1, rows=(0,), segments=40):
    """A ring of quads round a vertical axis, split bottom to top into rows carrying those material indices."""
    bm = bmesh.new()
    weights = [1.25 if len(rows) == 3 and i == 1 else 1 for i in range(len(rows))]
    levels = [z0 + (z1 - z0) * sum(weights[:i]) / sum(weights) for i in range(len(rows) + 1)]
    loops = [[bm.verts.new((center[0] + radii[0] * math.cos(2 * math.pi * k / segments), center[1] + radii[1] * math.sin(2 * math.pi * k / segments), z))
              for k in range(segments)] for z in levels]
    for i, index in enumerate(rows):
        for k in range(segments):
            bm.faces.new((loops[i][k], loops[i][(k + 1) % segments], loops[i + 1][(k + 1) % segments], loops[i + 1][k])).material_index = index
    return bm

def strip(path, across, width, cols=(0,), step=0.016):
    """A ribbon along `path`, `width` wide along `across`, split across into columns carrying those material indices."""
    points = [Vector(path[0])]
    for a, b in zip(path, path[1:]):
        a, b = Vector(a), Vector(b)
        n = max(1, round((b - a).length / step))
        points += [a.lerp(b, (i + 1) / n) for i in range(n)]
    across = Vector(across).normalized()
    weights = [1.25 if len(cols) == 3 and i == 1 else 1 for i in range(len(cols))]
    offsets = [width * (sum(weights[:i]) / sum(weights) - 0.5) for i in range(len(cols) + 1)]
    bm = bmesh.new()
    rows = [[bm.verts.new(p + across * o) for o in offsets] for p in points]
    for a, b in zip(rows, rows[1:]):
        for i, index in enumerate(cols):
            bm.faces.new((a[i], a[i + 1], b[i + 1], b[i])).material_index = index
    return bm

def on_surface(target, p, lift=0.0):
    """The point of the body nearest `p`, lifted off the surface along its normal."""
    _, location, normal, _ = target.closest_point_on_mesh(Vector(p))
    return location + normal * lift

# ---- body ----

BODY_PAINTS = ['shirt', 'pants', 'skin']

def body_paint(c):
    x, y, z = c
    if z > 1.52 and abs(x) < 0.09: return 'skin'
    if z < 0.9 and abs(x) < 0.2: return 'pants'
    return 'shirt'

def body(collection, G=None):
    """The clothed body without its feet, which the boots replace."""
    skip = [f'{j}{side}' for j in ('heel', 'toe') for side in 'RL']
    bm = skin_body(collection, G, 2, lambda c: BODY_PAINTS.index(body_paint(c)), skip)
    return mesh_object('calen_body', bm, collection, BODY_PAINTS)

STRIPE = ['hiVis', 'reflective']
FRONT, BACK, SHOULDER_TOP = -0.13, 0.125, 1.51

def clothing(collection, target):
    """What is sewn onto the henley and the pants: hi-vis stripes and bands with their reflective
    centre, the collar, placket and undershirt, the name tag and crest, cuffs, hems and cargo pockets."""
    made = []
    def add(joint, name, bm, paints): made.append((joint, mesh_object(name, bm, collection, paints)))
    def wrap(bm, offset=0.0025, thickness=0.003): return wrapped(collection, bm, target, offset, thickness)
    over_shoulder = lambda x, low: [(x, FRONT, low), (x, FRONT, 1.36), (x, -0.07, 1.47), (x, 0.0, SHOULDER_TOP), (x, 0.07, 1.47), (x, BACK, 1.36), (x, BACK, low)]
    for s in (-1, 1):
        add('pelvis', 'stripe', wrap(strip(over_shoulder(s * 0.082, 1.09), (1, 0, 0), 0.05, (0, 1, 0))), STRIPE)
        side = 'R' if s < 0 else 'L'
        ex, ey, _ = JOINTS[f'forearm{side}'][0]
        add(f'elbow{side}', 'sleeveBand', wrap(band((ex, ey), (0.07, 0.07), 0.985, 1.045, (0, 1, 0))), STRIPE)
        add(f'elbow{side}', 'cuff', wrap(band((ex, ey - 0.012), (0.05, 0.05), 0.912, 0.938), 0.0035), ['navyDark'])
        kx, ky, _ = JOINTS[f'calf{side}'][0]
        add(f'knee{side}', 'shinBand', wrap(band((kx, ky), (0.08, 0.08), 0.27, 0.345, (0, 1, 0))), STRIPE)
        add(f'knee{side}', 'hem', wrap(band((kx, ky), (0.076, 0.076), 0.118, 0.142), 0.004), ['pants'])
        pocket = on_surface(target, (s * 0.19, 0.0, 0.66), 0.002)
        add(f'hip{side}', 'cargoPocket', box(pocket, (0.016, 0.11, 0.15), 0.005), ['pants'])
        add(f'hip{side}', 'cargoFlap', box(pocket + Vector((s * 0.004, 0, 0.055)), (0.016, 0.116, 0.045), 0.004), ['navyDark'])
    add('pelvis', 'waistBand', wrap(band((0, 0), (0.15, 0.11), 1.02, 1.09, (0, 1, 0))), STRIPE)
    add('pelvis', 'shirtHem', wrap(band((0, 0), (0.15, 0.11), 0.885, 0.91), 0.005), ['shirt'])
    add('pelvis', 'collar', wrap(band((0, 0.012), (0.075, 0.075), 1.505, 1.53), 0.004, 0.006), ['shirt'])
    add('pelvis', 'undershirt', wrap(strip([(0, -0.06, 1.515), (0, -0.115, 1.462)], (1, 0, 0), 0.05), 0.002), ['undershirt'])
    add('pelvis', 'placket', wrap(strip([(0, -0.11, 1.475), (0, FRONT, 1.33)], (1, 0, 0), 0.03), 0.0035), ['navyDark'])
    for z in (1.44, 1.4, 1.36):
        p = on_surface(target, (0, FRONT, z), 0.005)
        add('pelvis', 'button', rod(p, p + Vector((0, -0.004, 0)), 0.006, 8), ['lace'])
    add('pelvis', 'nameTag', wrap(strip([(-0.082, FRONT, 1.395), (-0.082, FRONT, 1.362)], (1, 0, 0), 0.075), 0.0062), ['tube'])
    add('pelvis', 'crest', wrap(strip([(0.084, FRONT, 1.4), (0.084, FRONT, 1.352)], (1, 0, 0), 0.05), 0.0062), ['pipeBlue'])
    add('pelvis', 'crestLeaf', wrap(strip([(0.084, FRONT, 1.388), (0.084, FRONT, 1.364)], (1, 0, 0), 0.022), 0.0072, 0.002), ['hiVis'])
    return made

def gear(collection, target):
    """The chest harness with the speaker mic and the gas detector, the hip radio and the watch."""
    made = []
    def add(joint, name, bm, paints): made.append((joint, mesh_object(name, bm, collection, paints)))
    def wrap(bm, offset=0.008): return wrapped(collection, bm, target, offset, 0.005)
    for s in (-1, 1):
        x = s * 0.142
        add('pelvis', 'strap', wrap(strip([(x, FRONT, 1.1), (x, FRONT, 1.36), (x, -0.07, 1.47), (x, 0.0, SHOULDER_TOP), (x, 0.07, 1.47), (x, BACK, 1.36), (x, BACK, 1.1)],
                                         (1, 0, 0), 0.036)), ['black'])
        buckle = on_surface(target, (x, FRONT, 1.2), 0.013)
        add('pelvis', 'buckle', box(buckle, (0.042, 0.008, 0.03), 0.003), ['steelDark'])
    add('pelvis', 'backStrap', wrap(strip([(-0.142, BACK, 1.3), (0.142, BACK, 1.3)], (0, 0, 1), 0.036)), ['black'])
    add('pelvis', 'sideStrap', wrap(band((0, 0), (0.15, 0.11), 1.105, 1.14)), ['black'])

    mic = on_surface(target, (-0.142, FRONT, 1.4), 0.024)
    add('pelvis', 'mic', box(mic, (0.048, 0.03, 0.075), 0.007), ['black'])
    add('pelvis', 'micGrille', box(mic + Vector((0, -0.0155, 0.008)), (0.03, 0.003, 0.03), 0.001), ['steelDark'])
    add('pelvis', 'micAntenna', rod(mic + Vector((-0.014, 0, 0.035)), mic + Vector((-0.014, 0, 0.07)), 0.0045, 8), ['black'])
    add('pelvis', 'micCord', rod(mic + Vector((0.01, 0, -0.035)), on_surface(target, (-0.15, -0.06, 1.12), 0.012), 0.004, 6), ['black'])

    detector = on_surface(target, (0.142, FRONT, 1.29), 0.026)
    add('pelvis', 'detector', box(detector, (0.052, 0.034, 0.1), 0.008), ['black'])
    add('pelvis', 'detectorScreen', box(detector + Vector((0, -0.0175, -0.006)), (0.032, 0.003, 0.026), 0.001), ['lens'])
    add('pelvis', 'detectorButton', box(detector + Vector((0, -0.0175, -0.034)), (0.02, 0.004, 0.014), 0.0015), ['tankRed'])
    add('pelvis', 'detectorLed', box(detector + Vector((0, -0.0175, 0.034)), (0.03, 0.003, 0.008), 0.001), ['detectorLed'])
    for dx in (-0.012, 0.012):
        add('pelvis', 'detectorSensor', rod(detector + Vector((dx, -0.016, 0.018)), detector + Vector((dx, -0.019, 0.018)), 0.007, 10), ['steelDark'])

    radio = on_surface(target, (-0.17, -0.07, 1.0), 0.022)
    add('pelvis', 'hipRadio', box(radio, (0.04, 0.062, 0.13), 0.007), ['black'])
    add('pelvis', 'hipRadioFace', box(radio + Vector((-0.019, 0, 0.012)), (0.005, 0.044, 0.07), 0.001), ['pipeBlue'])
    add('pelvis', 'hipRadioKnob', rod(radio + Vector((0, 0.018, 0.065)), radio + Vector((0, 0.018, 0.08)), 0.008, 8), ['steelDark'])
    add('pelvis', 'hipRadioAntenna', rod(radio + Vector((0, -0.018, 0.065)), radio + Vector((0, -0.018, 0.17)), 0.005, 8, 0.0035), ['black'])

    wx, wy, _ = JOINTS['forearmL'][0]
    add('elbowL', 'watchBand', wrapped(collection, band((wx, wy - 0.012), (0.06, 0.06), 0.935, 0.953), target, 0.004, 0.003), ['steel'])
    face = on_surface(target, (wx + 0.08, wy - 0.012, 0.944), 0.005)
    add('elbowL', 'watchFace', rod(face, face + Vector((0.006, 0, 0)), 0.016, 14), ['steel'])
    return made

# ---- head ----

HEAD_C = Vector((0, -0.012, 1.672))
HEAD_R = Vector((0.0765, 0.098, 0.118))
HEAD_PAINTS = ['skin', 'stubble', 'lip', 'hair']

def bump(p, cx, cz, sx, sz):
    return math.exp(-(((p.x - cx) / sx) ** 2 + ((p.z - cz) / sz) ** 2))

def skull(d):
    """The head's surface along direction `d` from its centre: an egg with a tapered jaw and the nape drawn in."""
    p = Vector((d.x * HEAD_R.x, d.y * HEAD_R.y, d.z * HEAD_R.z))
    if p.z < 0:
        t = min(1, -p.z / HEAD_R.z)
        p.x *= 1 - 0.17 * t ** 2.4
        p.y *= 1 - (0.42 * t ** 1.2 if p.y > 0 else 0.06 * t ** 2)
        p.z *= 1 - 0.07 * t
    elif p.y > 0:
        p.y *= 1 + 0.06 * (1 - p.z / HEAD_R.z)
    return p

def face(d):
    """The skull with a face: brow, eye sockets, nose, cheekbones, mouth and chin."""
    p = skull(d)
    front = max(0.0, min(1.0, (-d.y - 0.2) / 0.5))
    forward = 0.015 * bump(p, 0, -0.004, 0.009, 0.03) + 0.028 * bump(p, 0, -0.032, 0.012, 0.012)
    forward += 0.004 * bump(p, 0, -0.062, 0.026, 0.012) + 0.007 * bump(p, 0, -0.1, 0.022, 0.014)
    for s in (-1, 1):
        forward += 0.005 * bump(p, s * 0.03, 0.032, 0.028, 0.008) - 0.008 * bump(p, s * 0.031, 0.012, 0.016, 0.01)
        forward += 0.004 * bump(p, s * 0.046, -0.024, 0.02, 0.02)
    p.y -= forward * front
    return p

def face_paint(c):
    x, y, z = c
    if y > -0.045: return 'skin'
    if abs(x) < 0.022 and -0.068 < z < -0.058: return 'lip'
    if 0.012 < abs(x) < 0.054 and 0.03 < z < 0.041: return 'hair'
    if z < -0.04 and (z < -0.05 or abs(x) < 0.032): return 'stubble'
    return 'skin'

def hair(hat):
    """Wavy hair over the back, sides and crown, as a surface direction to point. Under the hat it only
    shows below the toque, where it curls out at the sides."""
    def surface(d):
        p = skull(d)
        cover = max(min((d.y + 0.2) / 0.2, (d.z + 0.5) / 0.15), (d.z - 0.5) / 0.15)
        cover = max(0.0, min(1.0, cover))
        wave = 0.5 + 0.5 * math.sin(11 * math.atan2(d.y, d.x) + 5 * d.z) * math.sin(9 * d.z + 2 * d.x)
        lift = 0.012 + 0.014 * wave
        if hat: lift += 0.008 * max(0.0, 1 - abs(d.z + 0.05) / 0.3)
        return p * (0.9 + 0.1 * cover) + d * (lift * cover)
    return surface

def ring_frame(c, w, h, bar, depth):
    """One lens frame: four bars round an opening, facing -y."""
    bm = bmesh.new()
    for cx, cz, sx, sz in ((0, h / 2, w + bar, bar), (0, -h / 2, w + bar, bar), (-w / 2, 0, bar, h), (w / 2, 0, bar, h)):
        part = box(Vector(c) + Vector((cx, 0, cz)), (sx, depth, sz), bar * 0.3)
        part.to_mesh(tmp := bpy.data.meshes.new('t')); part.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return bm

def head(collection, hat=True):
    """The head and what he wears on it. Without the hat, at his desk, his hair covers the crown."""
    made = []
    def add(name, bm, paints): made.append(mesh_object(name, bm, collection, paints))
    L = lambda x, y, z: HEAD_C + Vector((x, y, z))
    bm = shell(HEAD_C, face, 56, 38)
    for f in bm.faces: f.material_index = HEAD_PAINTS.index(face_paint(f.calc_center_median() - HEAD_C))
    add('calen_head', bm, HEAD_PAINTS)
    add('hair', shell(HEAD_C, hair(hat), 32, 22), ['hair'])
    for s in (-1, 1):
        add('ear', shell(L(s * 0.076, 0.014, -0.004), lambda d: Vector((d.x * 0.009, d.y * 0.017, d.z * 0.03)), 12, 8), ['skin'])
        add('eye', shell(L(s * 0.031, -0.081, 0.012), lambda d: Vector((d.x * 0.0115, d.y * 0.006, d.z * 0.0065)), 12, 8), ['eyeWhite'])
        add('iris', shell(L(s * 0.031, -0.0855, 0.012), lambda d: Vector((d.x * 0.0048, d.y * 0.003, d.z * 0.0052)), 10, 6), ['iris'])
        add('frame', ring_frame(L(s * 0.033, -0.103, 0.012), 0.046, 0.036, 0.0075, 0.007), ['black'])
        add('temple', rod(L(s * 0.06, -0.1, 0.022), L(s * 0.082, 0.01, 0.016), 0.0035, 6), ['black'])
    add('bridge', box(L(0, -0.104, 0.02), (0.016, 0.006, 0.007), 0.002), ['black'])
    if not hat: return made

    HAT = Vector((0, 0.002, 0.05))
    def dome(d):
        p = Vector((d.x * 0.104, d.y * 0.124, max(d.z, 0) * 0.09))
        ridge = 0.007 * math.exp(-(p.x / 0.014) ** 2) + sum(0.004 * math.exp(-((p.x - x) / 0.012) ** 2) for x in (-0.05, 0.05))
        return p + Vector((0, 0, ridge * max(d.z, 0) ** 0.5))
    add('toque', shell(HEAD_C, lambda d: skull(d) * (1.075 if 0.2 < d.z < 0.75 else 0.9), 32, 20), ['toque'])
    add('hat', shell(HEAD_C + HAT, dome, 36, 20), ['hardHat'])
    brim = bmesh.new()
    bmesh.ops.create_cone(brim, cap_ends=True, segments=40, radius1=1, radius2=1, depth=1)
    for v in brim.verts:
        front = max(0.0, -v.co.y)
        v.co = Vector((v.co.x * (0.113 - 0.014 * front), v.co.y * (0.133 + 0.05 * front), v.co.z * 0.005 - 0.014 * front ** 2))
    bmesh.ops.translate(brim, vec=HEAD_C + HAT + Vector((0, 0, 0.004)), verts=brim.verts)
    add('brim', brim, ['hardHat'])
    strap = bpy.data.objects.new('t', bpy.data.meshes.new('t'))
    band(HEAD_C.xy + HAT.xy, (0.1005, 0.1195), HEAD_C.z + HAT.z + 0.018, HEAD_C.z + HAT.z + 0.04).to_mesh(strap.data)
    collection.objects.link(strap)
    solid = strap.modifiers.new('solid', 'SOLIDIFY'); solid.thickness, solid.offset = 0.004, 1
    add('hatStrap', evaluated(strap), ['headband'])
    lamp = L(0, -0.134, 0.086)
    add('lamp', box(lamp, (0.052, 0.03, 0.04), 0.006), ['black'])
    add('lampBracket', box(lamp + Vector((0, 0.004, -0.024)), (0.06, 0.026, 0.012), 0.003), ['black'])
    add('lampLens', rod(lamp + Vector((0, -0.013, 0.002)), lamp + Vector((0, -0.0175, 0.002)), 0.0125, 14), ['lamp'])
    return made

# ---- hands and boots ----

def hand(collection, side, fist=False):
    """A hand with fingers, relaxed at his side with the palm to the thigh, or closed round a grip."""
    s = -1 if side == 'R' else 1
    W = Vector(JOINTS[f'wrist{side}'][0])
    palm = box(W + Vector((0, -0.006, -0.055)), (0.027, 0.08, 0.1), 0.011)
    made = [mesh_object(f'calen_palm{side}', smoothed(collection, palm, 1), collection, ['skin'])]
    points, edges, radii, roots = [], [], [], set()
    def chain(joints, sizes):
        roots.add(len(points))
        for i, (p, r) in enumerate(zip(joints, sizes)):
            if i: edges.append((len(points) - 1, len(points)))
            points.append(W + Vector(p)); radii.append(r)
    for i, length in enumerate((0.075, 0.083, 0.077, 0.061)):
        y = -0.037 + 0.0215 * i
        if fist: chain([(0, y, -0.098), (-s * 0.034, y, -0.122), (-s * 0.04, y, -0.09)], (0.0098, 0.0088, 0.008))
        else: chain([(0, y, -0.098), (-s * 0.012, y, -0.098 - length * 0.5), (-s * 0.034, y - 0.002, -0.098 - length * 0.92)], (0.0098, 0.0088, 0.0078))
    thumb = [(-s * 0.006, -0.04, -0.03), (-s * 0.014, -0.058, -0.07), (-s * 0.024, -0.062, -0.104)]
    if fist: thumb = [(-s * 0.006, -0.04, -0.03), (-s * 0.03, -0.05, -0.065), (-s * 0.046, -0.03, -0.09)]
    chain(thumb, (0.0125, 0.011, 0.0095))
    made.append(mesh_object(f'calen_fingers{side}', skin_mesh(collection, points, edges, radii, roots, 1), collection, ['skin']))
    return [(f'wrist{side}', ob) for ob in made]

BOOT_PAINTS = ['boots', 'bootsDark']

def boot(collection, side):
    """A lace-up work boot under the trouser hem: leather upper with a toe cap and collar, laces and a heeled sole."""
    A = Vector(JOINTS[f'ankle{side}'][0]); A.z = 0
    points = [(0, 0.008, 0.21), (0, 0.008, 0.1), (0, -0.05, 0.072), (0, -0.115, 0.052), (0, -0.168, 0.046), (0, 0.048, 0.055)]
    radii = [(0.05, 0.052), (0.047, 0.052), (0.047, 0.043), (0.05, 0.037), (0.045, 0.034), (0.042, 0.044)]
    upper = skin_mesh(collection, [A + Vector(p) for p in points], [(0, 1), (1, 2), (2, 3), (3, 4), (1, 5)], radii, {0})
    for v in upper.verts: v.co.z = max(v.co.z, 0.026)
    for f in upper.faces:
        c = f.calc_center_median() - A
        f.material_index = 1 if c.y < -0.135 or c.z > 0.185 else 0
    sole = upper.copy()
    centre = sum((v.co for v in sole.verts), Vector()) / len(sole.verts)
    # The sole is the upper's own outline, a little wider, pressed into a slab from the ground to the welt.
    for v in sole.verts:
        v.co = Vector((centre.x + (v.co.x - centre.x) * 1.07, centre.y + (v.co.y - centre.y) * 1.035, 0.0 if v.co.z <= 0.0261 else min(v.co.z, 0.031)))
    made = [mesh_object(f'calen_boot{side}', upper, collection, BOOT_PAINTS), mesh_object(f'calen_sole{side}', sole, collection, ['sole'])]
    for i in range(4):
        t = i / 3
        made.append(mesh_object('lace', box(A + Vector((0, -0.02 - 0.062 * t, 0.156 - 0.062 * t)), (0.05 - 0.006 * t, 0.007, 0.007), 0.002), collection, ['lace']))
    return [(f'ankle{side}', ob) for ob in made]

def flashlight(collection):
    """A black flashlight gripped in the left fist, its lens past the knuckles."""
    W = Vector(JOINTS['wristL'][0]) + Vector((-0.02, -0.006, 0))
    return [('wristL', mesh_object(name, rod(W + Vector((0, 0, z0)), W + Vector((0, 0, z1)), r1, 14, r2), collection, [paint]))
            for name, paint, r1, r2, z0, z1 in (('flashlight', 'black', 0.015, 0.015, -0.14, -0.03), ('bezel', 'black', 0.022, 0.016, -0.168, -0.14),
                                                ('flashlightLens', 'lamp', 0.018, 0.018, -0.171, -0.168))]

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

def lowest(obs):
    return min((ob.matrix_world @ v.co).z for ob in obs for v in ob.data.vertices)

def posed(col, name, target):
    """Calen in pose `name`, under an empty `pose_<name>`. Each part is built at rest and carried
    by its joint's posed transform, and the pose is set on the ground where the standing pose stands."""
    pose = POSES[name]
    G = pose_matrices(pose) if pose else None
    riders = [*(('neckTop', ob) for ob in head(col, hat=name != 'sit')), *hand(col, 'R'), *hand(col, 'L', fist=name == 'inspect'),
              *boot(col, 'R'), *boot(col, 'L'), *clothing(col, target), *gear(col, target)]
    if name == 'inspect': riders += flashlight(col)
    for joint, ob in riders: ob.data.transform(rider(G, joint))
    obs = [body(col, G), *(ob for _, ob in riders)]
    root = bpy.data.objects.new(f'pose_{name}', None)
    col.objects.link(root)
    for ob in obs: ob.parent = root
    return root, obs

def run(DIR, poses=None):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions):
        for x in list(coll): coll.remove(x)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    col = bpy.data.collections.new('calen'); bpy.context.scene.collection.children.link(col)
    target = body(col)
    target.name = 'wrapTarget'
    bpy.context.view_layer.update()
    obs = []
    ground = None
    for name in poses or POSES:
        _, made = posed(col, name, target)
        low = lowest(made)
        if ground is None: ground = low
        for ob in made: ob.data.transform(Matrix.Translation((0, 0, ground - low)))
        obs += made
    bpy.data.objects.remove(target)
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

result = run(DIR, globals().get('ONLY'))
