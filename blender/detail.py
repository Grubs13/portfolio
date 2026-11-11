# Set dressing modelled in Blender: crews, clutter and ground scatter, the density
# the style references get their richness from. Everything is placed in three.js
# coordinates relative to the scene anchor. Needs build.py's namespace.
import math, random
from mathutils import Matrix, Vector, Euler

def T(x, y, z, yaw=0.0, s=(1, 1, 1)):
    return Matrix.Translation((x, y, z)) @ Matrix.Rotation(yaw, 4, 'Y') @ Matrix.Diagonal((*s, 1))

class Site:
    """Free ground for set dressing: what the kit has placed, what covers the ground, and the flight paths."""
    def __init__(self, paths, cell=0.5, radius=72):
        self.cell, self.radius, self.taken = cell, radius, set()
        self.ground = {}
        self.decks = []
        self.paths = [Vector(p) for p in paths]

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

    def clear_of_paths(self, x, z, top, margin=1.6):
        for p in self.paths:
            if p.y < top + 2.4 and math.hypot(p.x - x, p.z - z) < margin: return False
        return True

    def free(self, x, z, half=0.4, top=1.0):
        if math.hypot(x, z) > self.radius - half: return False
        for i in range(math.floor((x - half) / self.cell), math.floor((x + half) / self.cell) + 1):
            for j in range(math.floor((z - half) / self.cell), math.floor((z + half) / self.cell) + 1):
                if (i, j) in self.taken: return False
        return self.clear_of_paths(x, z, top)

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

def hardhat(P, M, paint='hardHat'):
    # A dome with a brim.
    v, f = prim_sphere(0.19, 10, 4, 0, 2 * math.pi, 0, math.pi / 2)
    P.add(paint, False, v, f, M)
    cyl(P, paint, M @ T(0, 0.01, 0.03), 0.23, 0.03, 10)

# ---- people ----

POSES = ('stand', 'walk', 'carry', 'point', 'crouch')

# Scenes at plant scale shrink people and their clutter so they sit right beside the equipment.
SET_SCALE = 1.0

def person(P, x, y, z, yaw, vest='hiVis', pose='stand', rnd=random):
    """A site worker about 1.85 tall at SET_SCALE 1: boots, coveralls, vest with reflective band, arms, head and hard hat."""
    M = T(x, y, z, yaw, (SET_SCALE,) * 3)
    crouch = pose == 'crouch'
    hip = 0.55 if crouch else 0.85
    stride = 0.16 if pose == 'walk' else 0.0
    for s in (-1, 1):
        if crouch:
            box(P, 'navy', M @ T(s * 0.1, 0.18, 0.14) @ Matrix.Rotation(0.9, 4, 'X'), 0.14, 0.5, 0.15)
            box(P, 'boots', M @ T(s * 0.1, 0.06, 0.28), 0.15, 0.12, 0.26)
        else:
            box(P, 'navy', M @ T(s * 0.1, hip / 2 + 0.06, s * stride), 0.15, hip - 0.06, 0.16)
            box(P, 'boots', M @ T(s * 0.1, 0.06, s * stride + 0.03), 0.16, 0.12, 0.25)
    box(P, 'navy', M @ T(0, hip + 0.06, 0), 0.34, 0.16, 0.2)
    box(P, vest, M @ T(0, hip + 0.38, 0), 0.4, 0.5, 0.26, 0.04)
    box(P, 'reflective', M @ T(0, hip + 0.3, 0), 0.41, 0.05, 0.27)
    box(P, 'navy', M @ T(0, hip + 0.66, 0), 0.38, 0.08, 0.22)
    # Arms: down at the sides, both forward to carry, or one raised to point.
    for s in (-1, 1):
        if pose == 'carry':
            box(P, 'navy', M @ T(s * 0.25, hip + 0.42, 0.16) @ Matrix.Rotation(-1.2, 4, 'X'), 0.12, 0.45, 0.12)
        elif pose == 'point' and s == 1:
            box(P, 'navy', M @ T(0.3, hip + 0.62, 0.18) @ Matrix.Rotation(-1.4, 4, 'X') @ Matrix.Rotation(-0.3, 4, 'Z'), 0.11, 0.5, 0.11)
        else:
            swing = (0.35 * s if pose == 'walk' else 0.06 * s)
            box(P, 'navy', M @ T(s * 0.26, hip + 0.38, 0) @ Matrix.Rotation(swing, 4, 'X') @ Matrix.Rotation(-0.08 * s, 4, 'Z'), 0.12, 0.5, 0.13)
            box(P, 'skin', M @ T(s * 0.28, hip + 0.1, 0.0 + swing * 0.2), 0.1, 0.1, 0.1)
    if pose == 'carry':
        box(P, rnd.choice(['plank', 'timber', 'casing', 'pipeBlue']), M @ T(0, hip + 0.3, 0.42), 0.5, 0.3, 0.4, 0.04)
    box(P, 'skin', M @ T(0, hip + 0.84, 0.0), 0.24, 0.26, 0.24, 0.03)
    box(P, 'hair', M @ T(0, hip + 0.8, -0.1), 0.25, 0.2, 0.06)
    box(P, 'black', M @ T(0, hip + 0.88, 0.12), 0.2, 0.05, 0.02)
    hardhat(P, M @ T(0, hip + 0.97, 0), rnd.choice(['hardHat', 'hardHat', 'hardHat', 'safetyYellow', 'tankOrange', 'pipeBlue']))

def crew(P, site, cx, cz, n, spread, rnd, vests=('hiVis', 'hiVis', 'tankOrange'), face=None):
    placed = 0
    for _ in range(n * 12):
        if placed >= n: break
        x, z = cx + rnd.uniform(-spread, spread), cz + rnd.uniform(-spread, spread)
        if not site.claim(x, z, 0.35 * SET_SCALE, 2.0 * SET_SCALE): continue
        yaw = face if face is not None else rnd.uniform(-math.pi, math.pi)
        person(P, x, 0, z, yaw + rnd.uniform(-0.6, 0.6), rnd.choice(vests), rnd.choice(POSES), rnd)
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
    decks = [d for d in site.decks if site.clear_of_paths((d[0].x + d[1].x) / 2, (d[0].z + d[1].z) / 2, d[1].y + 2)]
    rnd.shuffle(decks)
    for lo, hi in decks[: n * 2]:
        if placed >= n: break
        x, z = rnd.uniform(lo.x + 0.3, hi.x - 0.3), rnd.uniform(lo.z + 0.3, hi.z - 0.3)
        if not site.clear_of_paths(x, z, hi.y + 2): continue
        person(P, x, hi.y, z, rnd.uniform(-3.1, 3.1), rnd.choice(['hiVis', 'tankOrange']), rnd.choice(['stand', 'point', 'crouch']), rnd)
        placed += 1
    return placed
