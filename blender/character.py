# Calen in turnaround PPE, after the reference photos: white hard hat with a teal
# strap and a Pelican headlamp over a navy toque, thick black frames, stubble,
# navy FR henley with the tan undershirt at the collar and hi-vis stripes down to a
# waist band, a chest harness carrying a radio and a gas detector, a name tag,
# navy cargo pants with hi-vis shin bands and tan work boots. Chunky proportions, after the style references:
# big head, hands and boots.
#
# Each part rides one bone rigidly. Clips: `idle` (one held pose) and `fly` (one
# limb-swing cycle, which the site scrubs with scroll). Built in Blender's axes:
# z up, facing -y. Run inside Blender with DIR set to this folder:
#   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
import io, contextlib, math, os
import bpy, bmesh
from mathutils import Matrix, Vector

COLORS = {
    'navy': 0x26325a, 'hiVis': 0xd4f03a, 'reflective': 0xc5ccd6, 'skin': 0xe3b48d, 'stubble': 0xb88a6a,
    'hair': 0x4a3324, 'hardHat': 0xf2f1ea, 'headband': 0x56736e, 'black': 0x17191f, 'lens': 0x9db9dc,
    'undershirt': 0xcdbb9c, 'boots': 0xa97c4e, 'lamp': 0xfff2c2, 'detectorLed': 0x5cff7a, 'steelDark': 0x30364a, 'tankRed': 0xc84a3a, 'pipeBlue': 0x4a7fd0, 'tube': 0xe0e2e8,
    'toque': 0x2b3f63, 'sole': 0x5c4632,
}
HIP = 0.9
BONES = {
    # name: (head, parent)
    'root': ((0, 0, 0), None),
    'body': ((0, 0, HIP), 'root'),
    'head': ((0, 0, 1.68), 'body'),
    'arm.R': ((-0.39, 0, 1.48), 'body'),
    'arm.L': ((0.39, 0, 1.48), 'body'),
    'leg.R': ((-0.14, 0, HIP), 'body'),
    'leg.L': ((0.14, 0, HIP), 'body'),
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

class Body:
    """Parts collected per paint, each vertex weighted fully to its part's bone."""
    def __init__(self):
        self.parts = {}

    def add(self, paint, bone, maker, M, subdiv=0, smooth=True):
        bm = bmesh.new()
        maker(bm)
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
        if subdiv:
            me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new('tmp', me)
            bpy.context.scene.collection.objects.link(ob)
            mod = ob.modifiers.new('s', 'SUBSURF'); mod.levels = subdiv
            dg = bpy.context.evaluated_depsgraph_get()
            ev = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
            bm = bmesh.new(); bm.from_mesh(ev)
            bpy.data.objects.remove(ob); bpy.data.meshes.remove(me); bpy.data.meshes.remove(ev)
        for f in bm.faces: f.smooth = smooth
        self.parts.setdefault(paint, []).append((bone, bm))

    def objects(self, arm, collection):
        names = list(BONES)
        made = []
        for paint, items in self.parts.items():
            me = bpy.data.meshes.new(f'calen_{paint}')
            out = bmesh.new()
            deform = out.verts.layers.deform.verify()
            for bone, bm in items:
                tmp = bpy.data.meshes.new('t'); bm.to_mesh(tmp); bm.free()
                start = len(out.verts)
                out.from_mesh(tmp); bpy.data.meshes.remove(tmp)
                out.verts.ensure_lookup_table()
                for v in out.verts[start:]: v[deform][names.index(bone)] = 1.0
            bmesh.ops.recalc_face_normals(out, faces=out.faces)
            out.to_mesh(me); out.free()
            ob = bpy.data.objects.new(f'calen_{paint}', me)
            collection.objects.link(ob)
            for n in names: ob.vertex_groups.new(name=n)
            ob.data.materials.append(material(paint))
            ob.parent = arm
            ob.modifiers.new('rig', 'ARMATURE').object = arm
            made.append(ob)
        return made

# ---- primitive makers ----
def cube(bm): bmesh.ops.create_cube(bm, size=1)
def sphere(seg=16, rings=10):
    return lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=0.5)
def cylinder(seg=16, top=0.5, bottom=0.5, caps=True):
    return lambda bm: bmesh.ops.create_cone(bm, cap_ends=caps, segments=seg, radius1=bottom, radius2=top, depth=1)
def S(x, y, z): return Matrix.Diagonal((x, y, z, 1))
def at(x, y, z, sx=1, sy=1, sz=1, rx=0, ry=0, rz=0):
    return Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X') @ S(sx, sy, sz)

def build_parts(B):
    rnd_box = lambda paint, bone, M, sub=2: B.add(paint, bone, cube, M, subdiv=sub)
    flat_box = lambda paint, bone, M: B.add(paint, bone, cube, M, smooth=False)

    for side, bone in ((-1, 'leg.R'), (1, 'leg.L')):
        x = side * 0.14
        # Cargo pants, slightly flared, a thigh pocket on the outside, hi-vis band below the knee.
        B.add('navy', bone, cylinder(14, 0.16, 0.135), at(x, 0, 0.56, 1, 1, 0.72), subdiv=0)
        rnd_box('navy', bone, at(x + side * 0.16, 0.0, 0.58, 0.06, 0.2, 0.22), 1)
        B.add('hiVis', bone, cylinder(14, 0.145, 0.145), at(x, 0, 0.34, 1, 1, 0.09))
        B.add('reflective', bone, cylinder(14, 0.148, 0.148), at(x, 0, 0.34, 1, 1, 0.03))
        # Work boots: a chunky toe cap on a darker sole.
        rnd_box('boots', bone, at(x + side * 0.01, -0.06, 0.13, 0.22, 0.4, 0.22))
        rnd_box('boots', bone, at(x, 0.0, 0.25, 0.2, 0.24, 0.14))
        rnd_box('sole', bone, at(x + side * 0.01, -0.06, 0.03, 0.22, 0.41, 0.06), 1)

    # Hips and the henley over a broad chest.
    rnd_box('navy', 'body', at(0, 0, 0.95, 0.5, 0.3, 0.24))
    rnd_box('navy', 'body', at(0, 0, 1.3, 0.68, 0.42, 0.62))
    rnd_box('navy', 'body', at(0, 0, 1.56, 0.8, 0.38, 0.16))
    # Tan undershirt in the open placket, two buttons.
    flat_box('undershirt', 'body', at(0, -0.205, 1.55, 0.14, 0.02, 0.1))
    for z in (1.47, 1.41): B.add('hair', 'body', sphere(8, 5), at(0, -0.215, z, 0.03, 0.02, 0.03))
    # Hi-vis: stripes from the shoulders down the front to the waist band, and up the back.
    for x in (-0.17, 0.17):
        for y, sgn in ((-0.205, -1), (0.205, 1)):
            flat_box('hiVis', 'body', at(x, y, 1.3, 0.09, 0.02, 0.5))
            flat_box('reflective', 'body', at(x, y + sgn * 0.006, 1.3, 0.035, 0.02, 0.5))
    rnd_box('hiVis', 'body', at(0, 0, 1.07, 0.71, 0.45, 0.08), 1)
    rnd_box('reflective', 'body', at(0, 0, 1.07, 0.715, 0.455, 0.03), 1)
    # Name tag on his right chest, crest patch on his left.
    flat_box('tube', 'body', at(-0.17, -0.218, 1.46, 0.13, 0.01, 0.05))
    flat_box('pipeBlue', 'body', at(0.17, -0.218, 1.47, 0.09, 0.01, 0.06))

    # Chest harness: straps over both shoulders, radio high on the right, gas detector on the left.
    for x in (-0.25, 0.25):
        flat_box('black', 'body', at(x, -0.215, 1.32, 0.06, 0.02, 0.5))
        flat_box('black', 'body', at(x, 0.215, 1.32, 0.06, 0.02, 0.5))
        flat_box('black', 'body', at(x, 0, 1.63, 0.06, 0.44, 0.03))
    rnd_box('black', 'body', at(-0.26, -0.25, 1.52, 0.11, 0.07, 0.17), 1)
    flat_box('steelDark', 'body', at(-0.29, -0.25, 1.65, 0.025, 0.025, 0.1))
    rnd_box('black', 'body', at(0.27, -0.25, 1.3, 0.11, 0.07, 0.2), 1)
    flat_box('lens', 'body', at(0.27, -0.288, 1.27, 0.06, 0.01, 0.05))
    flat_box('tankRed', 'body', at(0.27, -0.288, 1.21, 0.03, 0.01, 0.025))
    flat_box('detectorLed', 'body', at(0.27, -0.288, 1.37, 0.04, 0.01, 0.02))
    # Second radio clipped at his right hip.
    flat_box('black', 'body', at(-0.33, -0.08, 1.0, 0.07, 0.1, 0.18))
    flat_box('pipeBlue', 'body', at(-0.37, -0.08, 1.0, 0.01, 0.08, 0.12))

    # Head on a short neck: skin, stubble on the jaw, mustache, nose, ears, hair at the sides and back.
    B.add('skin', 'head', cylinder(12, 0.1, 0.11), at(0, 0, 1.7, 1, 1, 0.14))
    B.add('skin', 'head', sphere(18, 12), at(0, 0, 1.92, 0.47, 0.46, 0.5))
    B.add('stubble', 'head', sphere(18, 12), at(0, -0.03, 1.84, 0.44, 0.42, 0.32))
    B.add('stubble', 'head', cube, at(0, -0.225, 1.84, 0.12, 0.02, 0.025), subdiv=1)
    B.add('skin', 'head', sphere(10, 6), at(0, -0.235, 1.9, 0.08, 0.08, 0.1))
    for x in (-0.235, 0.235): B.add('skin', 'head', sphere(8, 6), at(x, 0.0, 1.92, 0.05, 0.09, 0.11))
    B.add('hair', 'head', sphere(18, 12), at(0, 0.035, 1.98, 0.5, 0.46, 0.4))
    # Thick black square frames, light lenses, blue-grey eyes behind them.
    flat_box('black', 'head', at(0, -0.238, 1.98, 0.44, 0.03, 0.025))
    for x in (-0.1, 0.1):
        flat_box('black', 'head', at(x, -0.238, 1.93, 0.15, 0.03, 0.11))
        flat_box('lens', 'head', at(x, -0.252, 1.93, 0.115, 0.01, 0.08))
        flat_box('navy', 'head', at(x, -0.258, 1.93, 0.035, 0.005, 0.035))
    for x in (-0.225, 0.225): flat_box('black', 'head', at(x, -0.12, 1.97, 0.025, 0.24, 0.025))
    # Navy toque showing under the hat brim.
    B.add('toque', 'head', cylinder(18, 0.245, 0.25), at(0, -0.005, 2.08, 1, 1.03, 0.07))

    # Hard hat: a dome with a ridge, a brim longer at the front, teal strap, headlamp.
    B.add('hardHat', 'head', sphere(20, 12), at(0, 0.0, 2.13, 0.54, 0.58, 0.5), subdiv=0)
    B.add('hardHat', 'head', cylinder(20, 0.27, 0.28), at(0, -0.04, 2.12, 1, 1.12, 0.035))
    rnd_box('hardHat', 'head', at(0, 0, 2.37, 0.06, 0.4, 0.06), 1)
    B.add('headband', 'head', cylinder(20, 0.265, 0.27), at(0, 0.0, 2.19, 1, 1.07, 0.05))
    rnd_box('black', 'head', at(0, -0.3, 2.25, 0.15, 0.08, 0.11), 1)
    flat_box('lamp', 'head', at(0, -0.342, 2.25, 0.08, 0.01, 0.06))

    # Arms: chunky sleeves with a hi-vis band near the cuff, big hands, a watch on his left wrist.
    for side, bone in ((-1, 'arm.R'), (1, 'arm.L')):
        x = side * 0.41
        B.add('navy', bone, cylinder(12, 0.11, 0.095), at(x, 0, 1.22, 1, 1, 0.5), subdiv=0)
        B.add('navy', bone, sphere(12, 8), at(side * 0.4, 0, 1.47, 0.24, 0.24, 0.2))
        B.add('hiVis', bone, cylinder(12, 0.104, 0.1), at(x, 0, 1.08, 1, 1, 0.07))
        B.add('reflective', bone, cylinder(12, 0.106, 0.102), at(x, 0, 1.08, 1, 1, 0.025))
        B.add('skin', bone, sphere(12, 8), at(x, -0.01, 0.92, 0.2, 0.2, 0.22))
        B.add('skin', bone, sphere(8, 6), at(x - side * 0.06, -0.07, 0.95, 0.07, 0.07, 0.08))
        if side == 1: B.add('reflective', bone, cylinder(12, 0.1, 0.1), at(x, 0, 1.02, 1, 1, 0.04))


def build_armature(collection):
    data = bpy.data.armatures.new('calen_rig')
    arm = bpy.data.objects.new('calen_rig', data)
    collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (head, parent) in BONES.items():
        b = data.edit_bones.new(name)
        b.head = head
        b.tail = (head[0], head[1], head[2] + 0.15)
        b.roll = 0
        if parent: b.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def key(arm, action, frame, rot=None, scale=None):
    for name, angle in (rot or {}).items():
        pb = arm.pose.bones[name]
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (angle, 0, 0)
        pb.keyframe_insert('rotation_euler', frame=frame)
    for name, s in (scale or {}).items():
        pb = arm.pose.bones[name]
        pb.scale = s
        pb.keyframe_insert('scale', frame=frame)

def animate(arm):
    arm.animation_data_create()
    bones = ['body', 'head', 'arm.R', 'arm.L', 'leg.R', 'leg.L']
    # Idle: standing.
    idle = bpy.data.actions.new('idle')
    arm.animation_data.action = idle
    for f in (1, 2):
        key(arm, idle, f, {b: 0.0 for b in bones})
    idle.use_fake_user = True
    # Fly: leaning into the flight, legs trailing, limbs swinging through one cycle.
    fly = bpy.data.actions.new('fly')
    arm.animation_data.action = fly
    frames = 24
    for i in range(5):
        t = i / 4
        swing = math.sin(2 * math.pi * t)
        f = 1 + t * frames
        key(arm, fly, f, {
            # Positive turns about x lean the top toward -y, his front.
            'body': 0.45, 'head': -0.25,
            'arm.R': -0.7 * swing + 0.2, 'arm.L': 0.7 * swing + 0.2,
            'leg.R': 0.5 + 0.25 * swing, 'leg.L': 0.5 - 0.25 * swing,
        })
    fly.use_fake_user = True
    # Linear keys so the cycle scrubs evenly with scroll.
    for action in (idle, fly):
        for fc in action_fcurves(action):
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    arm.animation_data.action = None
    for action in (idle, fly):
        track = arm.animation_data.nla_tracks.new(); track.name = action.name
        track.strips.new(action.name, 1, action)

def action_fcurves(action):
    if hasattr(action, 'fcurves') and action.fcurves is not None:
        try: return list(action.fcurves)
        except TypeError: pass
    curves = []
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for bag in strip.channelbags: curves.extend(bag.fcurves)
    return curves

def run(DIR):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
    for a in list(bpy.data.armatures): bpy.data.armatures.remove(a)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    col = bpy.data.collections.new('calen'); bpy.context.scene.collection.children.link(col)
    arm = build_armature(col)
    B = Body(); build_parts(B)
    obs = B.objects(arm, col)
    animate(arm)
    os.makedirs(f'{DIR}/out', exist_ok=True)
    path = f'{DIR}/out/calen.glb'
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col.objects: ob.select_set(True)
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_normals=True,
                                  export_texcoords=False, export_tangents=False, export_vertex_color='NONE', export_skins=True,
                                  export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False,
                                  export_cameras=False, export_lights=False, export_yup=True)
    return {'objects': len(obs), 'tris': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs), 'bytes': os.path.getsize(path)}

result = run(DIR)
