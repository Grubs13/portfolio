# Nutrien Carseland Nitrogen Operations, laid out from the aerial photos and the
# plant-design research, at about 0.18 units per metre with heights a little
# exaggerated so they read. x runs east and z south, so the camera looks north-west.
# The character stands at the anchor on the main east-west road in front of the
# ammonia block; the flight paths leave south (+z) and west (-x), rising, so
# everything tall stands up-screen of the road.
import math
from mathutils import Vector
SCENE_ID = 'reliability-engineer'
S = 0.18
# People and their clutter at plant scale.
SET_SCALE = 0.62

def layout(K):
    rnd = K.rnd
    # ---- ground: the gravel site pad inside the fence, roads, ditches, and the hay land around it ----
    # Hay land fills the stage's circle; canola and stubble lie in rectangular fields beyond the site.
    K.cyl('fieldGreen', (0, -0.02, 0), 74.6, 0.04, 48)
    K.site.cover(Vector((-74, 0, -74)), Vector((74, 0.02, 74)), 'fieldGreen')
    for x0, z0, x1, z1, paint in ((-22, -70, 22, -56, 'canola'), (-44, -58, -28, -51, 'canolaDeep'), (28, -58, 46, -51, 'canola'),
                                  (-26, 58, 26, 68, 'stubble2'), (57, -30, 68, -10, 'canola')):
        K.ground(paint, x0, z0, x1, z1, 0.03)
    X0, Z0, X1, Z1 = -55, -49, 54, 24
    K.ground('gravel', X0, Z0, X1, Z1)
    for (x0, z0, x1, z1, p) in ((X0, -1.4, X1, 1.4, 'road'), (-27.5, Z0, -24.5, Z1, 'road'), (3, Z0, 6, Z1, 'road'),
                                 (31, Z0, 34, Z1, 'road'), (X0, -29, X1, -26.5, 'road'), (X0, 20.5, X1, 23, 'road')):
        K.ground(p, x0, z0, x1, z1, 0.06)
    for x0, z0, x1, z1 in ((X0, Z1 + 0.2, X1, Z1 + 1.2), (X0, Z0 - 1.0, X1, Z0 - 0.2), (X1 + 0.2, Z0, X1 + 1.2, Z1)):
        K.ground('fieldDark', x0, z0, x1, z1, 0.035)
    # Concrete under the process units.
    for x0, z0, x1, z1 in ((-23, -24, 2, -3), (8, -25, 30, -3), (-23, 3, -3, 20)):
        K.ground('concrete', x0, z0, x1, z1, 0.05)
    K.fence([(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1), (X0, Z0)], 0.8)

    # ---- the main pipe rack, the spine of the site, and its branches ----
    K.pipe_rack((-44, -4.5), (30, -4.5), width=2.6, tiers=(2.0, 2.8, 3.5), bent=2.2, seed=3)
    K.pipe_rack((6.8 + 1.3, -24), (6.8 + 1.3, -6), width=2.0, tiers=(2.0, 2.7), seed=4)
    K.pipe_rack((-31, -26), (-31, -6), width=2.0, tiers=(2.0, 2.7), seed=5)
    K.pipe_rack((30, -4.5), (52, -4.5), width=1.8, tiers=(1.8, 2.5), seed=6)
    K.pumps(-20, -7.2, 8, 1.3)
    K.pumps(10, -7.2, 6, 1.3)

    # ---- ammonia block, north of the rack in process order west to east ----
    # The reformer is drawn a third larger than the rest, so it reads as the subject.
    R = kellogg_reformer(K, -25, -25, 0.0, 0.24)
    # Shift converters and the waste heat boilers with the steam drum high on a structure.
    K.vessel(-6.5, -19, 0.75, 2.6, platforms=(0.98,))
    K.vessel(-4.5, -19, 0.75, 2.6, platforms=(0.98,))
    K.structure(-8.5, -24.5, -3.5, -22, (2.0, 4.0, 6.0), paint='galvanized')
    K.drum((-6, 6.6, -23.2), 0.33, 3.0, True, 'jacket')
    K.drum((-6, 0.75, -16.2), 0.35, 3.2, True, 'jacket')
    # CO2 removal: absorber and stripper, the tallest columns, with their reboilers.
    K.vessel(-0.5, -20, 0.75, 8.2, platforms=(0.3, 0.55, 0.8, 0.98), davit=True)
    K.vessel(2.0, -21, 0.9, 8.6, platforms=(0.3, 0.55, 0.8, 0.98), davit=True)
    K.exchanger_bank(-1.5, -15.8, 2, 0.3, 2.2, True, 1)
    K.vessel(3.4, -16.5, 0.55, 3.4, platforms=(0.98,))
    # Compressor house: the big clad building with its crane rail roof, roll-up doors and louvres.
    K.building(-22.5, -11.5, -12.5, -7.2, 3.6, 'corrugated', 'gable', doors=2, louvres=4)
    # Synthesis: converter in its structure, refrigeration drums, the separator.
    K.vessel(-5.0, -11, 0.55, 4.6, platforms=(0.5, 0.98))
    K.drum((-2.8, 0.7, -12.5), 0.42, 3.4, False, 'jacket')
    K.structure(-9.2, -13.5, -6.8, -8.5, (2.2, 4.2), paint='redSteel')
    # The 2024 supplementary converter, horizontal on saddles.
    K.drum((0.5, 0.8, -9.5), 0.55, 3.6, True, 'steel')

    # ---- urea: HP structure and the granulation plant, conveyors to the warehouse ----
    K.structure(9, -22, 15, -15, (2.2, 4.4, 6.6, 8.2), paint='galvanized')
    K.vessel(12, -18.5, 0.5, 7.2, base=0.0, platforms=(0.6, 0.98))
    K.vessel(10.2, -16, 0.4, 3.0, platforms=(0.98,))
    K.building(9, -13.5, 16, -8.5, 4.2, 'corrugated', 'flat', doors=1, louvres=3, vents=3)
    # Granulation tower: the tall salmon block with its stepped head, windows, scrubber stacks and plume.
    gx0, gz0, gx1, gz1 = 18, -22, 24, -15
    K.slab('concrete', (gx0 - 0.3, 0, gz0 - 0.3), (gx1 + 0.3, 0.2, gz1 + 0.3))
    K.slab('towerTan', (gx0, 0.2, gz0), (gx1, 11, gz1), 0.08)
    K.slab('towerPale', (gx0 + 0.6, 11, gz0 + 0.6), (gx1 - 0.6, 14, gz1 - 0.6), 0.08)
    K.slab('towerTan', (gx0 + 1.6, 14, gz0 + 1.6), (gx1 - 1.6, 15.6, gz1 - 1.6), 0.06)
    for y in (3, 5.5, 8):
        for zz in (gz0 + 1.5, gz0 + 3.5, gz0 + 5.5):
            K.slab('window', (gx1, y, zz - 0.4), (gx1 + 0.04, y + 0.6, zz + 0.4))
        for xx in (gx0 + 1.5, gx0 + 3, gx0 + 4.5):
            K.slab('window', (xx - 0.4, y, gz1), (xx + 0.4, y + 0.6, gz1 + 0.04))
    K.slab('signGreen', (gx0 + 2, 12, gz1 - 0.58), (gx0 + 4, 13.3, gz1 - 0.54))
    for xx in (gx0 + 1, gx1 - 1):
        K.cyl('towerPale', (xx, 15.6, gz0 + 1.2), 0.35, 2.0, 12)
    steam_plume(K, (gx0 + 3, 16.2, gz0 + 3), 7, 0.9)
    K.foot(gx0, gz0, gx1, gz1, 16)
    K.building(gx1 + 0.2, -21, gx1 + 4, -16, 5.5, 'corrugated', 'flat', doors=1)
    # Salmon conveyor galleries up to the warehouse's ridge and to the transfer tower.
    K.slab('corrugated', (30, 0, -37), (33, 9.5, -34), 0.05)
    K.foot(30, -37, 33, -34, 9.5)
    K.gallery((gx1 - 1, 12, gz0 + 1), (31.5, 9, -35.5))
    K.gallery((31.5, 9, -35.5), (34, 5.5, -42))
    K.gallery((gx0 + 1, 10, gz0 + 0.5), (-2, 5.5, -40))

    # ---- warehouse along the rail, rail tracks with strings of hoppers and tank cars ----
    K.a_frame_warehouse(-14, -47, 62, 8.5, 4.6)
    K.ground('ballast', -66, -32.6, 66, -29.6, 0.08)
    K.rail((-66, -31.8), (66, -31.8), tracks=2, gap=1.4)
    K.railcars((-58, -31.8), (1, 0), 16, ('hopper',))
    K.railcars((-40, -30.4), (1, 0), 22, ('tank',))
    K.railcars((14, -31.8), (1, 0), 1, ('loco',))
    # Loadout over the tracks at the warehouse's west end.
    for xx in (-17, -13):
        for zz in (-33.6, -29.8): K.box('steelDark', (xx, 2.5, zz), (0.25, 5, 0.25))
    K.slab('corrugated', (-17.3, 4.2, -34), (-12.7, 6.2, -29.4), 0.05)
    K.foot(-17.3, -34, -12.7, -29.4, 6.2)

    # ---- cooling tower and the tanks south of the rack ----
    K.cooling_tower(-46, 4.0, 6, 2.8, 3.4, True, True)
    K.building(-46, 8.5, -42.5, 11, 2.2, 'tube', 'flat', doors=1, louvres=1, vents=1)
    K.tank(-13, 9.5, 2.6, 2.4, 'tankOrange', 'flat', bands=True)
    K.tank(-18, 7, 1.05, 4.4, 'tankRed', 'cone')
    K.cyl('tankOrange', (-16.2, 0, 10.8), 0.4, 5.0, 12)
    K.building(-10, 13.5, -4, 18, 2.6, 'tube', 'flat', doors=2, windows=3, louvres=1)

    # ---- ammonia storage and the cogen to the west ----
    K.tank(-55, 9, 7.5, 5.6, 'tube', 'dome', bands=True, stair=True, bund=9.0)
    K.building(-44, 14, -40, 18, 2.4, 'tube', 'flat', doors=1, louvres=2)
    K.building(-40, -22, -32, -14, 3.0, 'corrugated', 'gable', doors=2, louvres=3)
    K.slab('casing', (-40, 0, -13), (-33, 3.8, -9.5), 0.05)
    K.foot(-40, -13, -33, -9.5, 3.8)
    K.stack(-34.5, -11, 0.55, 8.5, 'stackGrey', platforms=(0.85,))

    # ---- offices, parking and control room south of the road, the laydown with sprung domes to the west ----
    K.building(-24, 4, -16, 8, 1.6, 'tube', 'flat', doors=2, windows=4, louvres=0, vents=2)
    K.ground('asphalt', -36, 4, -28, 16, 0.06)
    for i in range(16):
        x = -35.3 + (i % 8) * 0.95
        z = 5.2 + (i // 8) * 6.0
        if rnd.random() < 0.8:
            car(K, x, z, rnd)
    for x, z in ((-50, -39), (-44, -39), (-50, -34)):
        K.sprung_dome(x, z, 4.6, 1.5, 0)
    K.sprung_dome(-14, 17.5, 6, 1.6, 0)

    # ---- substation and the flare to the east, the lined and open ponds to the south ----
    K.ground('gravelLight', 36, -24, 46, -14, 0.06)
    K.fence([(36, -24), (46, -24), (46, -14), (36, -14), (36, -24)], 0.7)
    for i in range(3):
        for j in range(2):
            transformer(K, 38 + i * 3, -21 + j * 4)
    K.cyl('galvanized', (52, 0, -18), 0.12, 12.0, 6)
    K.cyl('steelDark', (52, 12.0, -18), 0.2, 0.4, 8)
    K.ball('flame', (52, 12.7, -18), 0.3, 1, glow=True)
    for a in range(3):
        ang = a * 2.09
        K.rod('galvanized', (52 + math.cos(ang) * 5, 0, -18 + math.sin(ang) * 5), (52, 9, -18), 0.02, 3)
    K.foot(51, -19, 53, -17, 13)
    K.pond(-52, 28, -30, 46, 'water')
    K.pond(-26, 28, -6, 48, 'pondGreen')
    K.pond(-2, 28, 22, 42, 'pondDeep')
    K.pond(28, 28, 46, 40, 'liner', liner=True)
    K.pond(28, 44, 44, 54, 'liner', liner=True)
    K.ground('salt', -3, 12, 8, 21, 0.09)
    K.slab('turquoise', (-1, 0.09, 14), (5, 0.12, 19))
    for i in range(14):
        K.ball('salt', (-3 + rnd.random() * 11, 0.1, 12 + rnd.random() * 9), 0.4 + rnd.random() * 0.6, 0, (1, 0.4, 1))
    # Light poles along the main road, windsocks up high.
    for x in range(-52, 52, 8):
        if abs(x) > 4: K.light_pole(x + 0.5, 2.2, 3.6)
    K.windsock(2.0, 10.4, -21)

    # ---- the rest of the pad: shops, warehouses, trailer rows, laydown and parking, as the aerials show ----
    K.building(10, 6, 20, 12, 2.8, 'corrugated', 'gable', doors=3, louvres=2)          # maintenance shop
    K.building(22, 6, 28, 10, 2.2, 'tube', 'flat', doors=2, windows=2, louvres=1)       # stores
    K.building(10, 14, 16, 18, 2.0, 'casing', 'flat', doors=1, louvres=2)               # lab
    for i in range(5):
        K.building(37 + i * 3.2, 3, 39.6 + i * 3.2, 4.6, 1.2, 'tube', 'flat', doors=1, windows=2, louvres=0, vents=1)
    for i in range(4):
        K.building(37 + i * 3.2, 6, 39.6 + i * 3.2, 7.6, 1.2, 'tube', 'flat', doors=1, windows=2, louvres=0, vents=1)
    K.ground('asphalt', 36, 10, 52, 19, 0.06)
    for i in range(24):
        if rnd.random() < 0.75: car(K, 36.8 + (i % 12) * 1.3, 11.2 + (i // 12) * 5.6, rnd)
    K.building(38, -10, 48, -5, 3.0, 'corrugated', 'gable', doors=2, louvres=2)         # ESN coating plant
    K.gallery((43, 5.0, -10), (40, 6.0, -38.5))
    K.slab('concrete', (14, 0, -40), (22, 0.3, -36))
    # Pipe spools, steel and timber in the laydown west of the plant, with sea cans and a crane mat stack.
    for i in range(10):
        x, z = -53 + (i % 5) * 3.6, -26 + (i // 5) * 4.5
        K.slab('concrete', (x - 1.2, 0, z - 0.5), (x + 1.2, 0.06, z + 0.5))
        for k in range(3): K.rod(rnd.choice(['jacket', 'steel', 'rust', 'pipeGreen']), (x - 1.1, 0.2 + k * 0.24, z - 0.3 + k * 0.1), (x + 1.1, 0.2 + k * 0.24, z - 0.3 + k * 0.1), 0.11, 8)
        K.foot(x - 1.2, z - 0.5, x + 1.2, z + 0.5, 0.8)
    for i in range(6):
        x, z = -53 + i * 2.8, -14.5
        K.box(rnd.choice(['canBlue', 'canRed', 'canGreen', 'stackGrey']), (x, 0.45, z), (2.4, 0.9, 1.0), 0, 0.04)
        K.foot(x - 1.2, z - 0.5, x + 1.2, z + 0.5, 0.9)
    for k in range(5): K.box('timber', (-36, 0.08 + k * 0.16, -36), (1.2, 0.15, 4.0), 0, 0.02)
    K.foot(-36.6, -38, -35.4, -34, 0.8)

    # ---- the hay land outside the fence: bales and sloughs ----
    for i in range(40):
        x, z = rnd.uniform(-72, 72), rnd.uniform(28, 72)
        if math.hypot(x, z) < 72 and z > 26 and not (-55 < x < 54 and z < 56): K.rod('hay', (x - 0.35, 0.42, z), (x + 0.35, 0.42, z), 0.4, 10)
    for x, z, r in ((40, 64, 3.0), (-40, -62, 2.4), (62, 30, 2.0)):
        if math.hypot(x, z) + r < 74:
            K.cyl('reed', (x, 0.02, z), r, 0.1, 12)
            K.cyl('water', (x, 0.03, z), r * 0.55, 0.11, 10)

def car(K, x, z, rnd):
    paint = rnd.choice(['carSilver', 'carBlue', 'carRed', 'tube', 'black', 'carGreen'])
    K.box(paint, (x, 0.3, z), (0.6, 0.3, 1.2), 0, 0.04)
    K.box('window', (x, 0.5, z + 0.05), (0.52, 0.2, 0.6), 0, 0.03)

def transformer(K, x, z):
    K.slab('concrete', (x - 0.8, 0, z - 0.6), (x + 0.8, 0.2, z + 0.6))
    K.box('pipeGreen', (x, 0.85, z), (1.2, 1.3, 0.9), 0, 0.04)
    for i in range(5): K.box('steelDark', (x - 0.5 + i * 0.25, 0.85, z + 0.47), (0.05, 1.1, 0.06))
    for i in range(3): K.rod('tube', (x - 0.4 + i * 0.4, 1.5, z), (x - 0.4 + i * 0.4, 2.1, z), 0.06, 6)

def dress(P, site, rnd):
    stats = {'people': 0, 'clutter': 0}
    for (x, z, n, spread) in ((-10, -2.5, 5, 3), (-20, -3, 4, 3), (12, -2.5, 4, 3), (-30, 2.5, 3, 2.5), (-46, -30, 5, 4), (-18, 10, 3, 2),
                              (16, -11, 3, 2), (-7, -9, 3, 2), (36, -3, 2, 2), (-50, -36, 4, 4)):
        stats['people'] += crew(P, site, x, z, n, spread, rnd)
    for (x, z, n, spread) in ((-48, -36, 14, 6), (-30, -36, 8, 4), (-6, -7, 6, 4), (14, -6.5, 5, 3), (-38, -2.5, 4, 3), (20, 2.5, 4, 3)):
        stats['clutter'] += clutter(P, site, x, z, n, spread, rnd)
    for _ in range(30):
        x, z = rnd.uniform(-60, 56), rnd.uniform(-48, 24)
        if site.surface(x, z) in {'road', 'asphalt', 'concrete'}:
            stain(P, site, x, z, rnd.uniform(0.3, 1.0), rnd, rnd.choice(['roadEdge', 'gravelDark', 'ballast']))
    stats['stones'] = stones(P, site, 2400, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=1400, flowers=260, bushes=50, skids=22))
    stats['deckCrew'] = dress_decks(P, site, rnd, 26)
    return stats
