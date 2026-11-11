# A turnaround exchanger bay at hero scale, about 0.9 units per metre, built round
# Calen. He kneels at the anchor facing YAW (the `cast` in sceneModel.ts) at the
# open channel end of a shell-and-tube exchanger: the channel head is off, so he
# shines his flashlight on the bare flange face, its gasket seat, bolt holes and
# the tubesheet. Beside it the pulled bundle lies on a bundle extractor under a
# hydraulic crane, the channel head lies on timber, and the studs are racked. The
# rest of the bank stands up-screen, still bolted or blinded and tagged, with a
# scaffold, the pipe rack and the turnaround camp around it.
import math
from mathutils import Vector
S = 0.9
YAW = -1.3
# People and their clutter at the character's scale.
SET_SCALE = 1.6

# The frame of the bay: u runs along the exchangers from Calen into the shell, w across them toward the camera.
F = Vector((math.sin(YAW), 0, math.cos(YAW)))
N = Vector((F.z, 0, -F.x))
def W(u, y, w): return F * u + N * w + Vector((0, y, 0))
def xz(u, w): return (W(u, 0, w).x, W(u, 0, w).z)

# The open exchanger: its flange face in front of Calen at chest height when he kneels.
FACE_U, AXIS_Y = 1.9, 1.45
R, T_FLANGE, LENGTH = 0.75 * S, 0.15 * S, 6.0 * S

def pad(K, paint, u0, w0, u1, w1, y):
    """Ground cover laid square to the bay."""
    c = W((u0 + u1) / 2, y - 0.02, (w0 + w1) / 2)
    K.box(paint, tuple(c), (u1 - u0, 0.04, w1 - w0), yaw_of(F))
    pts = [W(u, 0, w) for u in (u0, u1) for w in (w0, w1)]
    K.site.cover(Vector((min(p.x for p in pts), 0, min(p.z for p in pts))), Vector((max(p.x for p in pts), y, max(p.z for p in pts))), paint)

def layout(K):
    rnd = K.rnd
    # Ground: hay land to the stage rim, the gravel pad, an access road, concrete under the bank.
    K.cyl('fieldGreen', (0, -0.02, 0), 74.6, 0.04, 48)
    K.site.cover(Vector((-74, 0, -74)), Vector((74, 0.02, 74)), 'fieldGreen')
    K.ground('gravel', -46, -44, 44, 42)
    K.ground('road', -46, 20, 44, 24, 0.06)
    K.fence([(-46, -44), (44, -44), (44, 42), (-46, 42), (-46, -44)], 0.9)
    pad(K, 'concrete', -3.5, -7.0, 9.5, 1.6, 0.06)

    # The bank: the open exchanger Calen kneels at, a blinded one with a bolted one stacked on it, and one more bolted.
    face = W(FACE_U, AXIS_Y, 0)
    shell_exchanger(K, face, F, LENGTH, R, T_FLANGE, 'open')
    lower = W(FACE_U, AXIS_Y, -2.7)
    shell_exchanger(K, lower, F, LENGTH, R, T_FLANGE, 'blinded')
    shell_exchanger(K, lower + Vector((0, 2 * R * 0.76 + 0.45, 0)), F, LENGTH, R, T_FLANGE, 'bolted', base=AXIS_Y + R * 0.76 - 0.05)
    shell_exchanger(K, W(FACE_U, AXIS_Y, -5.4), F, LENGTH, R, T_FLANGE, 'bolted')
    # A scaffold across the channel ends of the stacked pair and its neighbour, decked at the upper channel.
    scaffold(K, W(-2.6, 0, -1.6), yaw_of(-N), 3, 1.4, 2, [1, 2])

    # The pipe rack behind the bank, and the main rack beyond it.
    K.pipe_rack(xz(-12, -9.5), xz(18, -9.5), width=4.5, tiers=(4.4, 5.6), bent=5.4, seed=21)
    K.pipe_rack(xz(-12, -22), xz(26, -22), width=5.0, tiers=(4.4, 5.6, 6.8), bent=5.4, seed=22, fans=3)
    K.pumps(*xz(-6, -13), 6, 2.2, along_x=False)

    # The laydown on the camera side: the pulled bundle on its extractor, the crane over it, the channel head, studs and gaskets.
    rb = R * 0.68
    bundle_extractor(K, W(1.6, 0, 3.3), W(9.0, 0, 3.3), 0.8, rb * 1.6)
    pulled_bundle(K, W(2.2, 0.8 + rb, 3.3), W(8.4, 0.8 + rb, 3.3), rb)
    # Its boom is kept low, so the sun from up-bay does not throw its shadow over Calen.
    hook = hydraulic_crane(K, W(15.0, 0, 3.6), yaw_of(N), W(5.4, 6.2, 3.4), 3.4, 0.95)
    slings(K, hook, [W(4.0, 0.8 + 2 * rb, 3.3), W(6.8, 0.8 + 2 * rb, 3.3)])
    ch = (Vector((-1.0, 0, -0.35))).normalized()
    channel_head(K, W(-3.4, R + 0.32, 3.4), ch, R, T_FLANGE)
    stud_rack(K, W(-1.6, 0, 1.9), yaw_of(F) + 0.3)
    x, z = xz(1.2, 2.3)
    gasket_pack(K, (x, 0.06, z), yaw_of(F) + 0.2, R * 0.82)
    # Calen's own patch: nothing is dropped where he kneels or between him and the camera.
    K.foot(-1.4, -1.4, 1.4, 1.4, 3.0)
    K.foot(0, 0, 5, 5, 0.5)

    # The turnaround camp: a work tent with its tables, light towers on the job, a hydro-vac and a pump trailer.
    tx, tz = xz(11, -4)
    K.sprung_dome(tx, tz, 7.0, 2.4, yaw_of(F), 'tube')
    for k in range(3):
        x, z = xz(9.4 + k * 1.6, -4)
        K.box('plank', (x, 0.9, z), (1.2, 0.08, 0.7), yaw_of(F))
        K.box('steelDark', (x, 0.45, z), (1.1, 0.9, 0.05), yaw_of(F))
    for (u, w) in ((-2.5, -3.6), (12.5, 2.0)):
        light_tower(K, *xz(u, w))
    x, z = xz(-6.5, 6.5)
    K.box('tankRed', (x, 1.3, z), (6.5, 2.2, 2.4), yaw_of(F), 0.1)
    K.rod('stainless', W(-9.0, 1.6, 6.5), W(-4.0, 1.6, 6.5), 1.0, 16)
    K.box('black', (x, 0.4, z), (6.0, 0.8, 2.3), yaw_of(F), 0.05)
    K.foot(x - 4, z - 4, x + 4, z + 4, 3.0)
    x, z = xz(-7.5, 1.5)
    K.box('safetyYellow', (x, 0.9, z), (3.2, 1.4, 1.8), yaw_of(F), 0.08)
    K.box('black', (x, 0.3, z), (2.6, 0.6, 1.9), yaw_of(F), 0.05)
    K.foot(x - 2, z - 2, x + 2, z + 2, 2.0)
    # Sea-cans of turnaround tooling and a scaffold-tube laydown down the near side of the bay.
    for k, paint in enumerate(('canBlue', 'canRed', 'canGreen', 'stackGrey')):
        x, z = xz(-13.5, -6 + k * 3.4)
        K.box(paint, (x, 1.3, z), (6.0, 2.6, 2.4), yaw_of(F), 0.05)
        K.foot(x - 3.5, z - 3.5, x + 3.5, z + 3.5, 2.6)
    for k in range(3):
        x, z = xz(-9.5, -5.5 + k * 1.6)
        for i in range(10):
            K.rod('galvanized', W(-11.0, 0.12 + (i // 5) * 0.12, -5.9 + k * 1.6 + (i % 5) * 0.12), W(-8.0, 0.12 + (i // 5) * 0.12, -5.9 + k * 1.6 + (i % 5) * 0.12), 0.05, 5)
        K.foot(x - 1.8, z - 1.8, x + 1.8, z + 1.8, 0.5)
    # Turnaround trailers and parked trucks along the road.
    for i in range(6):
        K.building(-30 + i * 6.5, 26, -25 + i * 6.5, 29, 2.4, 'tube', 'flat', doors=1, windows=2, louvres=0, vents=1)
    for i in range(8):
        K.box(rnd.choice(['carSilver', 'tube', 'carBlue', 'carRed', 'black']), (12 + i * 3.2, 0.8, 31), (1.6, 1.0, 3.6), 0, 0.08)
    # Columns and a steel structure beyond the main rack.
    K.vessel(*xz(4, -30), 2.0, 22, platforms=(0.3, 0.55, 0.8, 0.98), davit=True)
    K.vessel(*xz(14, -30), 1.6, 16, platforms=(0.4, 0.75, 0.98))
    x, z = xz(-10, -30)
    K.structure(x - 4, z - 4, x + 4, z + 4, (4.0, 8.0, 12.0))

def dress(P, site, rnd):
    stats = {'people': 0, 'clutter': 0}
    # The crew on the job, placed: one on the bundle with a lance, the riggers, two at the stud rack, one up the scaffold.
    for (u, y, w, face, vest, pose) in ((4.6, 0, 5.0, -N, 'hiVis', 'point'), (8.2, 0, 5.2, -N, 'tankOrange', 'stand'),
                                        (-4.2, 0, 2.0, N, 'hiVis', 'carry'), (-3.6, 0, 0.6, -N, 'hiVis', 'crouch'),
                                        (-3.3, 4.1, -3.4, F, 'tankOrange', 'point'), (10.5, 0, 1.0, F, 'hiVis', 'walk')):
        x, z = xz(u, w)
        site.claim(x, z, 0.35 * SET_SCALE)
        person(P, x, y, z, math.atan2(face.x, face.z), vest, pose, rnd)
        stats['people'] += 1
    for (u, w, n, spread) in ((6, 7, 4, 2.5), (-3, 7, 3, 2), (11, -1.5, 4, 2.5), (-6, -3.5, 2, 1.5),
                              (13, 8, 3, 3), (-8, 10, 3, 3), (2, 13, 4, 4)):
        x, z = xz(u, w)
        stats['people'] += crew(P, site, x, z, n, spread, rnd)
    for (u, w, n, spread) in ((10, 5, 6, 4), (-4, 8, 5, 3), (14, -2, 5, 3), (-10, 4, 6, 4), (4, 14, 8, 5), (18, 8, 6, 4)):
        x, z = xz(u, w)
        stats['clutter'] += clutter(P, site, x, z, n, spread, rnd)
    for (u0, w0, u1, w1) in ((-6, 5, 2, 4.2), (-6, 6, 8.6, 4.2)):
        hose(P, *xz(u0, w0), *xz(u1, w1), rnd, 'black', 0.07)
    for _ in range(30):
        x, z = rnd.uniform(-30, 30), rnd.uniform(-25, 25)
        stain(P, site, x, z, rnd.uniform(0.3, 1.2), rnd, rnd.choice(['roadEdge', 'gravelDark', 'ballast']))
    stats['stones'] = stones(P, site, 2400, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=1200, flowers=220, bushes=40, skids=10))
    stats['deckCrew'] = dress_decks(P, site, rnd, 10)
    return stats
