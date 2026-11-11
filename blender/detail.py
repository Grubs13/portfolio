# Set dressing modelled in Blender: crews, clutter and ground scatter, the density
# the style references get their richness from. Everything is placed in three.js
# coordinates relative to the scene anchor. Needs build.py's namespace.
import math, random
from mathutils import Matrix, Vector, Euler

def T(x, y, z, yaw=0.0, s=(1, 1, 1)):
    return Matrix.Translation((x, y, z)) @ Matrix.Rotation(yaw, 4, 'Y') @ Matrix.Diagonal((*s, 1))

class Site:
    """Free ground for set dressing: what the kit has placed and what covers the ground."""
    def __init__(self, cell=0.5, radius=72):
        self.cell, self.radius, self.taken = cell, radius, set()
        self.ground = {}
        self.decks = []

    def cover(self, lo, hi, paint):
        if (hi.x - lo.x) * (hi.z - lo.z) > 20000: return
        for i in range(math.floor(lo.x / self.cell), math.floor(hi.x / self.cell) + 1):
            for j in range(math.floor(lo.z / self.cell), math.floor(hi.z / self.cell) + 1):
                old = self.ground.get((i, j))
                if old is None or hi.y >= old[0]: self.ground[(i, j)] = (hi.y, paint)

    def surface(self, x, z):
        g = self.ground.get(self.key(x, z))
        return g[1] if g else 'grass'

    def near_taken(self, x, z, reach=2):
        i, j = self.key(x, z)
        return any((i + a, j + b) in self.taken for a in range(-reach, reach + 1) for b in range(-reach, reach + 1))

    def key(self, x, z): return (math.floor(x / self.cell), math.floor(z / self.cell))

    def mark(self, x0, z0, x1, z1, pad=0.0):
        for i in range(math.floor((x0 - pad) / self.cell), math.floor((x1 + pad) / self.cell) + 1):
            for j in range(math.floor((z0 - pad) / self.cell), math.floor((z1 + pad) / self.cell) + 1):
                self.taken.add((i, j))

    def free(self, x, z, half=0.4, top=1.0):
        if math.hypot(x, z) > self.radius - half: return False
        for i in range(math.floor((x - half) / self.cell), math.floor((x + half) / self.cell) + 1):
            for j in range(math.floor((z - half) / self.cell), math.floor((z + half) / self.cell) + 1):
                if (i, j) in self.taken: return False
        return True

    def claim(self, x, z, half=0.4, top=1.0):
        if not self.free(x, z, half, top): return False
        self.mark(x - half, z - half, x + half, z + half)
        return True

def box(P, paint, M, w, h, d, bevel=0.0, glow=False):
    v, f = prim_box(w, h, d)
    P.add(paint, glow, v, f, M, bevel)

def cyl(P, paint, M, r, h, seg=10, rb=None, glow=False):
    v, f = prim_cyl(r, r if rb is None else rb, h, seg)
    P.add(paint, glow, v, f, M)

# ---- people ----

# Worker poses as joint turns in figure.py's format, which `crew` and `dress_decks` pick from.
# `climb` has a foot up on a rung and the hands up the rails, for a figure placed on a ladder.
WORKER_POSES = {
    'stand': {'shoulderR': (0, -0.06, 0), 'shoulderL': (0, 0.06, 0)},
    'walk': {'hipR': (-0.45, 0, 0), 'kneeR': (0.25, 0, 0), 'hipL': (0.35, 0, 0), 'kneeL': (0.45, 0, 0), 'ankleL': (-0.25, 0, 0),
             'shoulderR': (0.4, 0, 0), 'elbowR': (-0.2, 0, 0), 'shoulderL': (-0.4, 0, 0), 'elbowL': (-0.4, 0, 0)},
    'carry': {'shoulderR': (-0.75, 0, 0.12), 'elbowR': (-0.85, 0, 0), 'shoulderL': (-0.75, 0, -0.12), 'elbowL': (-0.85, 0, 0),
              'neckTop': (-0.1, 0, 0)},
    'point': {'shoulderL': (-1.75, 0, 0.25), 'elbowL': (-0.1, 0, 0), 'shoulderR': (0.05, 0, 0), 'elbowR': (-0.3, 0, 0), 'neckTop': (0, 0, 0.25)},
    'crouch': {'pelvis': (0.4, 0, 0), 'hipR': (-2.3, 0, 0.1), 'kneeR': (2.2, 0, 0), 'ankleR': (-0.3, 0, 0),
               'hipL': (-2.3, 0, -0.1), 'kneeL': (2.2, 0, 0), 'ankleL': (-0.3, 0, 0), 'neckTop': (-0.35, 0, 0),
               'shoulderR': (-1.0, 0, 0), 'elbowR': (-0.6, 0, 0), 'shoulderL': (-1.0, 0, 0), 'elbowL': (-0.6, 0, 0)},
    'kneel': {'pelvis': (0.15, 0, 0), 'hipR': (-0.1, 0, 0.05), 'kneeR': (1.75, 0, 0), 'ankleR': (-0.2, 0, 0),
              'hipL': (-1.85, 0, -0.1), 'kneeL': (1.7, 0, 0), 'neckTop': (0.15, 0, 0),
              'shoulderL': (-0.75, 0, 0), 'elbowL': (-0.5, 0, 0), 'shoulderR': (-0.35, 0, 0), 'elbowR': (-0.5, 0, 0)},
    'climb': {'hipL': (-1.3, 0, 0), 'kneeL': (1.5, 0, 0), 'ankleL': (-0.2, 0, 0),
              'shoulderR': (-2.9, 0, 0), 'elbowR': (-0.2, 0, 0), 'shoulderL': (-2.3, 0, 0), 'elbowL': (-0.5, 0, 0)},
}
POSES = ('stand', 'walk', 'carry', 'point', 'crouch')

# Scenes at plant scale shrink people and their clutter so they sit right beside the equipment.
SET_SCALE = 1.0
# 'light' builds workers for scenes where they are only a few pixels tall: no smoothing pass on the body,
# a coarser head and hat, and no nose, glasses or modelled hands. A scene sets it like SET_SCALE.
WORKER_DETAIL = 'full'
# A worker's height to the top of the hard hat, standing, at SET_SCALE 1.
WORKER_HEIGHT = 1.95
HEAD = Vector((0, 0, 1.86))

def worker_region(c):
    """Which part of the outfit covers a point of the body at rest."""
    x, y, z = c
    ax = abs(x)
    if z < 0.25: return 'boot'
    if ax < 0.3 and z < 0.95: return 'legBand' if 0.3 < z < 0.4 else 'coverall'
    if ax >= 0.3: return 'armBand' if 1.03 < z < 1.1 else 'coverall'
    if z > 1.64: return 'skin'
    if 1.14 < z < 1.24: return 'vestBand'
    if 0.98 < z < 1.6: return 'vest'
    return 'coverall'

def worker_parts(collection, light=False):
    """Head, hard hat, glasses and mitten hands at rest, as (region, joint, bmesh). A light worker
    keeps only the head and hat, more coarsely divided."""
    parts = []
    seg = (6, 4) if light else (10, 7)
    def part(region, joint, maker, M, sub=0):
        b = bmesh.new(); maker(b); bmesh.ops.transform(b, matrix=M, verts=b.verts)
        parts.append((region, joint, smoothed(collection, b, sub) if sub else b))
    cube = lambda b: bmesh.ops.create_cube(b, size=1)
    at = lambda c, size: Matrix.Translation(c) @ Matrix.Diagonal((*size, 1))
    # The head: hair at the back and sides under the hat, the face in front.
    hair = lambda c: c.y > HEAD.y + 0.03 and c.z > HEAD.z - 0.08
    for region, keep in (('skin', lambda c: not hair(c)), ('hair', hair)):
        b = bmesh.new()
        bmesh.ops.create_uvsphere(b, u_segments=seg[0], v_segments=seg[1], radius=1)
        bmesh.ops.transform(b, matrix=at(HEAD, (0.17, 0.18, 0.2)), verts=b.verts)
        bmesh.ops.delete(b, geom=[f for f in b.faces if not keep(f.calc_center_median())], context='FACES')
        parts.append((region, 'neckTop', b))
    if not light: part('skin', 'neckTop', cube, at(HEAD + Vector((0, -0.18, -0.02)), (0.045, 0.05, 0.065)))
    # A domed hard hat with a brim.
    ring = 8 if light else 12
    dome = bmesh.new()
    bmesh.ops.create_uvsphere(dome, u_segments=ring, v_segments=4 if light else 6, radius=1)
    bmesh.ops.delete(dome, geom=[v for v in dome.verts if v.co.z < -1e-4], context='VERTS')
    bmesh.ops.transform(dome, matrix=at(HEAD + Vector((0, 0, 0.07)), (0.2, 0.215, 0.17)), verts=dome.verts)
    parts.append(('hat', 'neckTop', dome))
    part('hat', 'neckTop', lambda b: bmesh.ops.create_cone(b, cap_ends=True, segments=ring, radius1=1, radius2=1, depth=1),
         at(HEAD + Vector((0, -0.03, 0.075)), (0.245, 0.27, 0.03)))
    if light: return parts
    for s in (-1, 1): part('glasses', 'neckTop', cube, at(HEAD + Vector((s * 0.068, -0.168, 0.03)), (0.085, 0.025, 0.05)))
    for side in 'RL':
        wx, wy, wz = JOINTS[f'wrist{side}'][0]
        part('hand', f'wrist{side}', cube, at(Vector((wx, wy - 0.01, wz - 0.06)), (0.14, 0.17, 0.21)), 1)
    return parts

def to_three(bm, M):
    """The bmesh's vertices carried by M into three.js axes, and its faces."""
    k = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1))) @ M
    return [tuple(k @ v.co) for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces]

FIGURES = {}

def figure(pose):
    """A worker in `pose`, built once: {region: (verts, faces)} in three.js axes, standing on y = 0
    and facing +z, and where a carried load sits between the hands."""
    key = (pose, WORKER_DETAIL)
    if key in FIGURES: return FIGURES[key]
    if pose != 'stand' and ('stand', WORKER_DETAIL) not in FIGURES: figure('stand')
    light = WORKER_DETAIL == 'light'
    collection = bpy.context.scene.collection
    G = pose_matrices(WORKER_POSES[pose])
    regions = ['boot', 'legBand', 'coverall', 'armBand', 'skin', 'vestBand', 'vest']
    body = skin_body(collection, G, 0 if light else 1, lambda c: regions.index(worker_region(c)))
    pieces = split_by_material(body, regions)
    for region, joint, bm in worker_parts(collection, light):
        bm.transform(rider(G, joint))
        pieces.append((region, bm))
    low = min(v.co.z for _, bm in pieces for v in bm.verts)
    top = max(v.co.z for _, bm in pieces for v in bm.verts)
    scale = WORKER_HEIGHT / (top - low) if pose == 'stand' else FIGURES[('stand', WORKER_DETAIL)][2]
    M = Matrix.Diagonal((scale,) * 3 + (1,)) @ Matrix.Translation((0, 0, -low))
    out = {}
    for region, bm in pieces:
        v, f = to_three(bm, M)
        ov, of = out.setdefault(region, ([], []))
        of += [tuple(i + len(ov) for i in face) for face in f]
        ov += v
        bm.free()
    hands = [M @ (G[f'wrist{s}'] @ Vector(JOINTS[f'wrist{s}'][0])) for s in 'RL']
    load = (hands[0] + hands[1]) / 2
    FIGURES[key] = (out, (load.x, load.z - 0.08 * scale, -load.y + 0.06 * scale), scale)
    return FIGURES[key]

def split_by_material(bm, regions):
    """One bmesh per material index, named by `regions`."""
    me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free()
    out = []
    for i, region in enumerate(regions):
        b = bmesh.new(); b.from_mesh(me)
        bmesh.ops.delete(b, geom=[f for f in b.faces if f.material_index != i], context='FACES')
        if b.faces: out.append((region, b))
        else: b.free()
    bpy.data.meshes.remove(me)
    return out

COVERALLS = (('navy', True), ('navy', True), ('navy', False), ('khaki', False), ('frRed', True))

def standing(x, y, z, salt):
    """A random stream fixed by where a worker stands, so dressing and posing workers leaves the
    scene's own stream, and everything placed after them, as it was."""
    return random.Random(hash((round(x, 3), round(y, 3), round(z, 3), salt)))

def outfit(vest, look):
    """Which paint each region of a worker wears, or None to leave it off."""
    coverall, bands = look.choice(COVERALLS)
    band = 'reflective' if bands else coverall
    return {'coverall': coverall, 'legBand': band, 'armBand': band, 'vest': vest or coverall,
            'vestBand': 'reflective' if vest else band, 'boot': 'boots', 'skin': 'skin', 'hair': 'hair',
            'glasses': 'black' if look.random() < 0.4 else None, 'hand': look.choice(['skin', 'glove', 'glove', 'black'])}

def person(P, x, y, z, yaw, vest='hiVis', pose='stand', rnd=random):
    """A site worker about 1.95 tall to the hat at SET_SCALE 1, in coveralls, a vest with a reflective
    band (none when `vest` is None), boots, a hard hat and sometimes glasses and gloves."""
    M = T(x, y, z, yaw, (SET_SCALE,) * 3)
    regions, load, _ = figure(pose)
    paints = outfit(vest, standing(x, y, z, 0))
    if pose == 'carry':
        box(P, rnd.choice(['plank', 'timber', 'casing', 'pipeBlue']), M @ T(*load), 0.6, 0.3, 0.4, 0.04)
    paints['hat'] = rnd.choice(['hardHat', 'hardHat', 'hardHat', 'safetyYellow', 'tankOrange', 'pipeBlue'])
    for region, (v, f) in regions.items():
        if paints.get(region): P.add(paints[region], False, v, f, M)

def varied(vest, pose, look):
    """Some of a crew work without a vest, and some kneel instead of crouching."""
    return (None if look.random() < 0.25 else vest), ('kneel' if pose == 'crouch' and look.random() < 0.5 else pose)

def crew(P, site, cx, cz, n, spread, rnd, vests=('hiVis', 'hiVis', 'tankOrange'), face=None):
    placed = 0
    for _ in range(n * 12):
        if placed >= n: break
        x, z = cx + rnd.uniform(-spread, spread), cz + rnd.uniform(-spread, spread)
        if not site.claim(x, z, 0.35 * SET_SCALE, 2.0 * SET_SCALE): continue
        yaw = face if face is not None else rnd.uniform(-math.pi, math.pi)
        person(P, x, 0, z, yaw + rnd.uniform(-0.6, 0.6), *varied(rnd.choice(vests), rnd.choice(POSES), standing(x, 0, z, 1)), rnd)
        placed += 1
    return placed

# ---- clutter ----

def pallet(P, M):
    for dz in (-0.45, 0, 0.45): box(P, 'timber', M @ T(0, 0.05, dz), 1.2, 0.1, 0.18)
    for dx in (-0.5, -0.17, 0.17, 0.5): box(P, 'plank', M @ T(dx, 0.13, 0), 0.22, 0.05, 1.15)

def sack_pallet(P, M, rnd):
    pallet(P, M)
    paint = rnd.choice(['tube', 'casing', 'dust', 'pipeBlue'])
    for layer in range(rnd.randint(1, 3)):
        for i in range(2):
            for j in range(2):
                box(P, paint, M @ T(-0.28 + i * 0.56, 0.24 + layer * 0.22, -0.25 + j * 0.5, 0.05 * (i - j)), 0.52, 0.2, 0.46, 0.06)

def crate_stack(P, M, rnd):
    n = rnd.randint(1, 3)
    for k in range(n):
        s = rnd.uniform(0.6, 1.0)
        box(P, rnd.choice(['plank', 'timber', 'plank']), M @ T(rnd.uniform(-0.1, 0.1), s / 2 + k * 0.8 * 0.95 if k else s / 2, rnd.uniform(-0.1, 0.1), rnd.uniform(-0.3, 0.3)), s, s * 0.8, s, 0.05)

def barrels(P, M, rnd):
    paint = rnd.choice(['pipeBlue', 'tankRed', 'safetyYellow', 'stainless', 'pipeGreen'])
    for i in range(rnd.randint(2, 5)):
        a = i * 2.1
        cyl(P, paint, M @ T(0.42 * math.cos(a) * (i > 0), 0.42, 0.42 * math.sin(a) * (i > 0)), 0.28, 0.84, 10)
        cyl(P, 'steelDark', M @ T(0.42 * math.cos(a) * (i > 0), 0.85, 0.42 * math.sin(a) * (i > 0)), 0.26, 0.03, 10)

def bottle_cage(P, M):
    box(P, 'galvanized', M @ T(0, 0.04, 0), 1.0, 0.08, 0.6)
    for x in (-0.48, 0.48):
        for z in (-0.28, 0.28): box(P, 'galvanized', M @ T(x, 0.7, z), 0.05, 1.4, 0.05)
    box(P, 'galvanized', M @ T(0, 1.4, 0), 1.0, 0.05, 0.6)
    for i in range(6):
        cyl(P, 'signGreen' if i % 3 == 0 else 'tankRed', M @ T(-0.38 + (i % 3) * 0.38, 0.65, -0.13 + (i // 3) * 0.26), 0.11, 1.2, 8)

def cable_reel(P, M):
    for s in (-0.3, 0.3):
        v, f = prim_cyl(0.6, 0.6, 0.06, 14)
        P.add('timber', False, v, f, M @ T(s, 0.6, 0) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
    v, f = prim_cyl(0.4, 0.4, 0.54, 12)
    P.add('black', False, v, f, M @ T(0, 0.6, 0) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))

def jersey(P, M):
    box(P, 'concrete', M @ T(0, 0.12, 0), 1.9, 0.24, 0.6, 0.05)
    box(P, 'concrete', M @ T(0, 0.48, 0), 1.9, 0.5, 0.3, 0.05)
    box(P, 'tankOrange', M @ T(0, 0.55, 0.16), 0.4, 0.12, 0.02)

def tool_chest(P, M, rnd):
    paint = rnd.choice(['tankRed', 'pipeBlue', 'safetyYellow'])
    box(P, paint, M @ T(0, 0.45, 0), 0.9, 0.8, 0.5, 0.05)
    for y in (0.3, 0.5, 0.7): box(P, 'steelDark', M @ T(0, y, 0.26), 0.8, 0.03, 0.02)
    for x in (-0.35, 0.35): box(P, 'black', M @ T(x, 0.04, 0), 0.1, 0.08, 0.4)

def wheelbarrow(P, M):
    v, f = prim_cyl(0.5, 0.3, 0.35, 8)
    P.add('pipeGreen', False, v, f, M @ T(0, 0.55, 0))
    v, f = prim_cyl(0.17, 0.17, 0.08, 10)
    P.add('black', False, v, f, M @ T(0, 0.18, 0.5) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
    for s in (-0.2, 0.2): box(P, 'steelDark', M @ T(s, 0.45, -0.5) @ Matrix.Rotation(0.3, 4, 'X'), 0.05, 0.05, 0.9)

def tube_bundle(P, M, rnd):
    for d in (-0.6, 0.6): box(P, 'timber', M @ T(d, 0.07, 0), 0.2, 0.14, 1.0)
    for row in range(3):
        for i in range(5 - row):
            v, f = prim_cyl(0.06, 0.06, 2.8, 6)
            P.add('galvanized', False, v, f, M @ T(0, 0.2 + row * 0.11, -0.25 + i * 0.12 + row * 0.06) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))

def a_frame(P, M, rnd):
    paint = rnd.choice(['signGreen', 'tankOrange', 'stripeBlue'])
    for s in (-1, 1): box(P, paint, M @ T(0, 0.45, s * 0.12) @ Matrix.Rotation(s * 0.25, 4, 'X'), 0.6, 0.9, 0.03)
    box(P, 'tube', M @ T(0, 0.55, 0.25) @ Matrix.Rotation(0.25, 4, 'X'), 0.42, 0.3, 0.01)

def hose(P, x0, z0, x1, z1, rnd, paint='black', r=0.05):
    # A hose lying in a lazy S across the ground.
    n = 10
    pts = []
    for i in range(n + 1):
        t = i / n
        wob = math.sin(t * math.pi * 2 + rnd.uniform(0, 1)) * 0.5
        dx, dz = x1 - x0, z1 - z0
        L = math.hypot(dx, dz) or 1
        pts.append(Vector((x0 + dx * t - dz / L * wob, r, z0 + dz * t + dx / L * wob)))
    for a, b in zip(pts, pts[1:]):
        d = b - a
        v, f = prim_cyl(r, r, d.length + 0.02, 5)
        rot = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        P.add(paint, False, v, f, Matrix.Translation((a + b) / 2) @ rot)

def string_lights(P, a, b, sag=0.6, beads=12):
    a, b = Vector(a), Vector(b)
    prev = a
    for i in range(1, beads + 1):
        t = i / beads
        p = a.lerp(b, t) - Vector((0, sag * 4 * t * (1 - t), 0))
        d = p - prev
        v, f = prim_cyl(0.025, 0.025, d.length, 4)
        rot = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        P.add('black', False, v, f, Matrix.Translation((p + prev) / 2) @ rot)
        if i < beads:
            v, f = prim_ico(0.09, 0)
            P.add('lamp', True, v, f, Matrix.Translation(p - Vector((0, 0.08, 0))))
        prev = p

def stones(P, site, n, rnd, paints=('gravelDark', 'stoneDark', 'gravelLight', 'ballast'), within=None):
    """Pebbles and rubble: the speckle the references scatter over every open surface."""
    tet = ([(0, 0.12, 0), (0.1, 0, 0.06), (-0.1, 0, 0.06), (0, 0, -0.11)], [(0, 1, 2), (0, 2, 3), (0, 3, 1), (1, 3, 2)])
    placed = 0
    for _ in range(n * 3):
        if placed >= n: break
        x, z = within() if within else (rnd.uniform(-70, 70), rnd.uniform(-70, 70))
        if not site.free(x, z, 0.1, 0.3): continue
        s = rnd.uniform(0.6, 1.8)
        P.add(rnd.choice(paints), False, *tet, T(x, 0.03, z, rnd.uniform(0, 6.3), (s, s * rnd.uniform(0.6, 1.2), s)))
        placed += 1
    return placed

def stain(P, site, x, z, r, rnd, paint='roadEdge'):
    # Oil and water stains just above whatever ground they sit on.
    v, f = prim_cyl(r, r, 0.01, 9)
    P.add(paint, False, v, f, T(x, 0.075, z, rnd.uniform(0, 6.3), (1, 1, rnd.uniform(0.5, 1))))

CLUTTER = [
    (sack_pallet, 0.75, 1.0), (crate_stack, 0.6, 2.2), (barrels, 0.7, 1.0), (bottle_cage, 0.6, 1.5),
    (cable_reel, 0.7, 1.3), (tool_chest, 0.5, 1.0), (wheelbarrow, 0.6, 0.8), (tube_bundle, 1.5, 0.6), (a_frame, 0.4, 1.0),
]

def clutter(P, site, cx, cz, n, spread, rnd, kinds=None):
    kinds = kinds or CLUTTER
    placed = 0
    for _ in range(n * 15):
        if placed >= n: break
        fn, half, top = rnd.choice(kinds)
        half, top = half * SET_SCALE, top * SET_SCALE
        x, z = cx + rnd.uniform(-spread, spread), cz + rnd.uniform(-spread, spread)
        if not site.claim(x, z, half, top): continue
        M = T(x, 0, z, rnd.uniform(-math.pi, math.pi), (SET_SCALE,) * 3)
        fn(P, M) if fn in (pallet, bottle_cage, cable_reel, jersey, wheelbarrow) else fn(P, M, rnd)
        placed += 1
    return placed


GRASS = {'grass', 'fieldGreen', 'fieldDark', 'reed', 'stubble2'}
GRAVEL = {'gravel', 'gravelDark', 'gravelLight', 'concrete', 'berm', 'dust', 'salt'}

def tuft(P, x, z, rnd, paints=('treeLight', 'fieldDark', 'reed', 'grass')):
    paint = rnd.choice(paints)
    for k in range(3):
        a = rnd.uniform(0, 6.3)
        v, f = prim_cyl(0.0, 0.07, rnd.uniform(0.25, 0.45), 3)
        P.add(paint, False, v, f, T(x + 0.08 * math.cos(a), 0.15, z + 0.08 * math.sin(a)) @ Matrix.Rotation(rnd.uniform(-0.4, 0.4), 4, 'X') @ Matrix.Rotation(rnd.uniform(-0.4, 0.4), 4, 'Z'))

def flower(P, x, z, rnd):
    v, f = prim_ico(0.09, 0)
    P.add(rnd.choice(['canola', 'tube', 'tankOrange', 'lens', 'tankRed']), False, v, f, T(x, 0.22, z, 0, (1, 0.6, 1)))
    v, f = prim_cyl(0.015, 0.015, 0.2, 3)
    P.add('fieldDark', False, v, f, T(x, 0.1, z))

def bush(P, x, z, rnd):
    s = rnd.uniform(0.5, 1.0)
    for k in range(3):
        v, f = prim_ico(0.45 * s, 0)
        P.add(rnd.choice(['treeDark', 'treeLight', 'fieldDark']), False, v, f, T(x + rnd.uniform(-0.3, 0.3) * s, 0.3 * s, z + rnd.uniform(-0.3, 0.3) * s, rnd.uniform(0, 6), (1, 0.75, 1)))

def pump_skid(P, M, rnd):
    box(P, 'steelDark', M @ T(0, 0.08, 0), 1.6, 0.16, 0.8, 0.03)
    v, f = prim_cyl(0.24, 0.24, 0.7, 12)
    P.add(rnd.choice(['pipeBlue', 'pipeGreen', 'fireRed']), False, v, f, M @ T(-0.35, 0.42, 0) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
    v, f = prim_cyl(0.26, 0.26, 0.3, 12)
    P.add('galvanized', False, v, f, M @ T(0.4, 0.42, 0))
    v, f = prim_cyl(0.09, 0.09, 0.9, 8)
    P.add('stainless', False, v, f, M @ T(0.4, 1.0, 0))
    box(P, 'tankRed', M @ T(0.4, 1.0, 0.0), 0.3, 0.05, 0.05)

def valve_station(P, M, rnd):
    paint = rnd.choice(['pipeGreen', 'stainless', 'pipeBlue'])
    for z in (-0.3, 0.3):
        v, f = prim_cyl(0.08, 0.08, 1.8, 8)
        P.add(paint, False, v, f, M @ T(0, 0.5, z) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
        for x in (-0.5, 0.5): box(P, 'concrete', M @ T(x, 0.2, z), 0.2, 0.4, 0.2)
        cyl(P, 'tankRed', M @ T(0.1, 0.82, z), 0.16, 0.04, 10)
        box(P, 'steelDark', M @ T(0.1, 0.65, z), 0.14, 0.3, 0.14)

def dress_ground(P, site, rnd, tufts=1500, flowers=300, bushes=60, skids=20):
    stats = {'tufts': 0, 'flowers': 0, 'bushes': 0, 'skids': 0}
    for _ in range(tufts * 3):
        if stats['tufts'] >= tufts: break
        x, z = rnd.uniform(-72, 72), rnd.uniform(-72, 72)
        if site.surface(x, z) in GRASS and site.free(x, z, 0.1, 0.5):
            tuft(P, x, z, rnd); stats['tufts'] += 1
    for _ in range(flowers * 3):
        if stats['flowers'] >= flowers: break
        x, z = rnd.uniform(-72, 72), rnd.uniform(-72, 72)
        if site.surface(x, z) in GRASS and site.free(x, z, 0.1, 0.4):
            # Wildflowers grow in patches.
            for k in range(rnd.randint(2, 5)): flower(P, x + rnd.uniform(-0.6, 0.6), z + rnd.uniform(-0.6, 0.6), rnd)
            stats['flowers'] += 1
    for _ in range(bushes * 5):
        if stats['bushes'] >= bushes: break
        x, z = rnd.uniform(-72, 72), rnd.uniform(-72, 72)
        if site.surface(x, z) in GRASS and site.claim(x, z, 0.8 * SET_SCALE, 1.2):
            bush(P, x, z, rnd); stats['bushes'] += 1
    for _ in range(skids * 40):
        if stats['skids'] >= skids: break
        x, z = rnd.uniform(-50, 50), rnd.uniform(-50, 50)
        if site.surface(x, z) in GRAVEL and site.near_taken(x, z, 3) and site.claim(x, z, SET_SCALE, 1.4 * SET_SCALE):
            (pump_skid if rnd.random() < 0.6 else valve_station)(P, T(x, 0.04, z, rnd.choice([0, math.pi / 2]) + rnd.uniform(-0.05, 0.05), (SET_SCALE,) * 3), rnd)
            stats['skids'] += 1
    return stats

def dress_decks(P, site, rnd, n=30):
    """Crews up on the platforms and walkways."""
    placed = 0
    decks = list(site.decks)
    rnd.shuffle(decks)
    for lo, hi in decks[: n * 2]:
        if placed >= n: break
        x, z = rnd.uniform(lo.x + 0.3, hi.x - 0.3), rnd.uniform(lo.z + 0.3, hi.z - 0.3)
        yaw, vest, pose = rnd.uniform(-3.1, 3.1), rnd.choice(['hiVis', 'tankOrange']), rnd.choice(['stand', 'point', 'crouch'])
        person(P, x, hi.y, z, yaw, *varied(vest, pose, standing(x, hi.y, z, 1)), rnd)
        placed += 1
    return placed
