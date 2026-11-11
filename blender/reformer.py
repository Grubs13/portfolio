# The Carseland Kellogg reformer mid-turnaround, close up at 0.34 units per metre:
# the penthouse roof off over the harps being changed, one crawler crane lifting a
# spent harp out while a second sets a new convection module in its slot, the unit
# packed in close behind it, and the turnaround camp on the gravel in front. The
# row runs away from the road with the convection section and stack at the near
# end, so the camera sees a long panelled wall and the convection end.
import math
from mathutils import Vector
S = 0.34
YAW = 3 * math.pi / 2
# The reformer frame's origin: its burner end wall, far from the road.
OX, OZ = -3.5, -21.5
SET_SCALE = 0.85

def layout(K):
    rnd = K.rnd
    # Ground: hay land to the stage rim, the gravel pad, concrete under the unit, the roads.
    K.cyl('fieldGreen', (0, -0.02, 0), 74.6, 0.04, 48)
    K.site.cover(Vector((-74, 0, -74)), Vector((74, 0.02, 74)), 'fieldGreen')
    K.ground('gravel', -48, -46, 40, 34)
    K.ground('concrete', -26, -35, -1.6, 1.4, 0.05)
    for x0, z0, x1, z1 in ((-48, 1.8, 40, 4.6), (-1.2, -46, 1.6, 34)):
        K.ground('road', x0, z0, x1, z1, 0.06)
    K.fence([(-48, -46), (40, -46), (40, 34), (-48, 34), (-48, -46)], 0.8)

    R = kellogg_reformer(K, OX, OZ, YAW, S, opening=(10, 18), empty_slot=True, secondary=False)
    W = R['W']

    # Harp lift: a spent harp, a row of tubes on its outlet collector, rigged under a spreader and lifted clear.
    hu, hv = 14.0, 10.0
    hx, _, hz = W(hu, 0, hv)
    # The harp crane stands off the burner end and booms in along the box.
    hook = crawler_crane(K, hx, -31, (hx, 23.5, hz), 15.5, 0.9)
    top_y, length = 13.2, 7.0
    for k in range(7):
        p = Vector(W(hu - 4 + k * 1.3, 0, hv))
        K.rod('tube', (p.x, top_y - length, p.z), (p.x, top_y, p.z), 0.12, 8)
    a, b = Vector(W(hu - 4.6, 0, hv)), Vector(W(hu + 4.6, 0, hv))
    K.rod('stainless', (a.x, top_y + 0.1, a.z), (b.x, top_y + 0.1, b.z), 0.2, 10)
    K.rod('stainless', (a.x, top_y - length, a.z), (b.x, top_y - length, b.z), 0.24, 10)
    K.rod('safetyYellow', (a.x, top_y + 1.0, a.z), (b.x, top_y + 1.0, b.z), 0.14, 8)
    slings(K, hook, [Vector((a.x, top_y + 1.0, a.z)), Vector((b.x, top_y + 1.0, b.z))])
    for p in (a, b): K.rod('black', (p.x, top_y + 1.0, p.z), (p.x, top_y + 0.1, p.z), 0.03, 4)
    # Tag lines down to the crew steadying it.

    # Module lift: a new convection module hanging over its empty slot from the second crane.
    mu, my = R['slot']
    corners = R['module'](mu, my, 6.0)
    mx, _, mz = W(mu + 3.05, 0, 10.0)
    # The module crane stands across the road and booms in past the stack.
    hook2 = crawler_crane(K, -19, 8.2, (mx, 23.5, mz), 13.5, 0.95)
    slings(K, hook2, [Vector(c) for c in corners])

    # The unit packed in behind, as on site: the main pipe rack a few metres off the back
    # wall, pump rows under its edge, the CO2 columns, shift converters and the steam-drum structure beyond it,
    # the compressor house, a cross rack past the burner end, and the cooling tower at the back of the pad.
    K.pipe_rack((-16, -44), (-16, 0), width=2.6, tiers=(2.2, 3.0, 3.8), seed=7)
    K.pipe_rack((-46, -37.5), (-17.4, -37.5), width=2.2, tiers=(2.2, 3.0), seed=8)
    K.pumps(-18.6, -30, 9, 1.5, along_x=False)
    K.vessel(-21.5, -8, 0.9, 11.5, platforms=(0.3, 0.55, 0.8, 0.98), davit=True)
    K.vessel(-22, -12.5, 1.05, 12.5, platforms=(0.3, 0.55, 0.8, 0.98), davit=True)
    K.vessel(-21.3, -17, 0.8, 4.2, platforms=(0.98,))
    K.vessel(-21.3, -20, 0.8, 4.2, platforms=(0.98,))
    K.exchanger_bank(-23.5, -4.6, 2, 0.35, 3.0, True, 2)
    K.structure(-24, -29, -19.6, -24, (2.4, 4.8, 7.2), paint='galvanized')
    K.drum((-21.8, 7.9, -26.5), 0.45, 4.0, False, 'jacket')
    K.vessel(-21.6, -32.5, 0.7, 5, platforms=(0.98,))
    K.building(-40, -22, -28, -8, 4.6, 'corrugated', 'gable', doors=3, louvres=4)
    K.pipe_rack((-27, -4.5), (-17.4, -4.5), width=1.8, tiers=(2.2, 3.0), seed=9)
    K.exchanger_bank(-34, -30, 3, 0.35, 3.0, True, 2)
    K.cooling_tower(-45, -45, 6, 3.6, 4.0, True, True)
    K.tank(-38, 14, 3.4, 4.0, 'tube', 'cone', bund=0)
    K.tank(-38, 24, 2.6, 3.0, 'tankOrange', 'flat')
    K.pipe_rack((-32, -2), (-32, 0.6), width=1.6, tiers=(1.6,), seed=10)

    # Turnaround laydown in front of the burner wall: new harps on the tube stand under a tent, spent harps on cribbing.
    for row, (x0, z0) in enumerate(((-4.0, 13.0), (-4.0, 16.5))):
        for k in range(3): K.box('timber', (x0 + k * 3.2, 0.18, z0), (0.35, 0.35, 2.4), 0, 0.03)
        for i in range(7):
            K.rod('tube' if row == 0 else 'rustLight', (x0 - 0.6, 0.5 + (i % 2) * 0.2, z0 - 0.9 + i * 0.3), (x0 + 7.0, 0.5 + (i % 2) * 0.2, z0 - 0.9 + i * 0.3), 0.1, 8)
        K.foot(x0 - 0.8, z0 - 1.3, x0 + 7.2, z0 + 1.3, 0.9)
    K.sprung_dome(8.0, 24.0, 9.0, 2.2, 0, 'tube')
    # Spare convection module on cribbing, catalyst bins and supersacks, crane mats.
    K.box('casing', (12, 1.6, 12.5), (6.1 * S, 3.9 * S, 13 * S), YAW, 0.05)
    K.foot(10, 10, 14, 15, 2.2)
    for i in range(6):
        K.box('tube', (16 + (i % 3) * 1.2, 0.5, 9 + (i // 3) * 1.2), (0.9, 0.9, 0.9), 0, 0.12)
        K.foot(15.4 + (i % 3) * 1.2, 8.4 + (i // 3) * 1.2, 16.6 + (i % 3) * 1.2, 9.6 + (i // 3) * 1.2, 0.9)
    for k in range(6): K.box('timber', (-20, 0.1 + k * 0.18, 18), (1.3, 0.17, 6.0), 0, 0.02)
    K.foot(-20.7, 15, -19.3, 21, 1.2)
    # Trailer city across the road: offices, lunch trailers, washrooms, tool cribs, light towers, buses.
    for i in range(6):
        K.building(6 + i * 4.2, 28, 9.8 + i * 4.2, 30.4, 1.6, 'tube', 'flat', doors=1, windows=2, louvres=0, vents=1)
    for i in range(5):
        K.box(rnd.choice(['canBlue', 'canRed', 'canGreen', 'stackGrey']), (-14 + i * 3.2, 0.6, 28.5), (2.8, 1.2, 1.2), 0, 0.05)
        K.foot(-15.4 + i * 3.2, 27.9, -12.6 + i * 3.2, 29.1, 1.2)
    for i in range(6): K.box('portaBlue', (-26 + i * 0.9, 0.6, 26), (0.7, 1.2, 0.7), 0, 0.05)
    K.foot(-26.4, 25.6, -21.1, 26.4, 1.2)
    for i in range(3):
        K.box('tube', (24 + i * 4.5, 0.9, 20), (3.8, 1.6, 1.4), 0, 0.1)
        K.box('window', (24 + i * 4.5, 1.2, 20.72), (3.2, 0.4, 0.04))
        K.foot(22, 19.3, 26 + i * 4.5, 20.7, 1.8)
    for (x, z) in ((3, 10), (-6, 22), (20, 14), (-26, 14)):
        light_tower(K, x, z)
    K.ground('asphalt', 22, 22, 38, 32, 0.06)
    for i in range(20):
        if rnd.random() < 0.8:
            K.box(rnd.choice(['carSilver', 'tube', 'carBlue', 'carRed', 'black']), (23 + (i % 10) * 1.5, 0.45, 23.5 + (i // 10) * 5), (0.85, 0.5, 1.8), 0, 0.05)
    for x in range(-44, 38, 9):
        if x < -12 or x > 6: K.light_pole(x + 0.5, 5.2, 5.0)
    # East of the road: scaffold and steel laydown, a stores building, folded hydraulic cranes, crane mats and a pipe-spool yard.
    K.building(14, -24, 24, -16, 3.2, 'corrugated', 'gable', doors=2, louvres=2)
    for i in range(12):
        x, z = 10 + (i % 4) * 4.2, -10 + (i // 4) * 3.4
        K.slab('concrete', (x - 1.6, 0, z - 0.6), (x + 1.6, 0.06, z + 0.6))
        for k in range(3): K.rod(rnd.choice(['jacket', 'steel', 'rust', 'pipeGreen', 'galvanized']), (x - 1.5, 0.22 + k * 0.28, z - 0.35 + k * 0.12), (x + 1.5, 0.22 + k * 0.28, z - 0.35 + k * 0.12), 0.13, 8)
        K.foot(x - 1.6, z - 0.6, x + 1.6, z + 0.6, 1.0)
    for i, (x, z) in enumerate(((28, -6), (30, 2), (26, 10))):
        K.box('safetyYellow', (x, 0.9, z), (3.6, 1.2, 1.8), 0.3 * i, 0.12)
        K.box('black', (x, 0.35, z), (3.4, 0.7, 1.9), 0.3 * i, 0.1)
        K.box('safetyYellow', (x - 0.4, 1.8, z), (3.8, 0.5, 0.5), 0.3 * i, 0.08)
        K.foot(x - 2.2, z - 1.4, x + 2.2, z + 1.4, 2.1)
    for k in range(8): K.box('timber', (34, 0.1 + k * 0.18, -16), (1.3, 0.17, 6.0), 0, 0.02)
    K.foot(33.3, -19, 34.7, -13, 1.5)
    for i in range(8):
        x, z = 16 + (i % 4) * 2.6, -30 + (i // 4) * 2.2
        for k in range(4): K.rod('galvanized', (x - 1.1, 0.12 + k * 0.1, z - 0.3 + k * 0.05), (x + 1.1, 0.12 + k * 0.1, z - 0.3 + k * 0.05), 0.05, 6)
        K.foot(x - 1.1, z - 0.4, x + 1.1, z + 0.4, 0.5)

def dress(P, site, rnd):
    stats = {'people': 0, 'clutter': 0}
    for (x, z, n, spread) in ((-1, 14.5, 8, 3), (6, 18, 7, 3), (14, 11, 6, 3), (-8, 20, 6, 3), (12, 26, 8, 4),
                              (-10, 10, 4, 2), (24, 15, 5, 3), (-20, 26, 5, 3), (3, 6.5, 4, 3), (-11, -1, 3, 1.5)):
        stats['people'] += crew(P, site, x, z, n, spread, rnd)
    for (x, z, n, spread) in ((4, 16, 10, 5), (-10, 24, 8, 4), (16, 18, 8, 4), (26, 10, 6, 4), (-28, 16, 6, 4), (8, 8.5, 5, 3)):
        stats['clutter'] += clutter(P, site, x, z, n, spread, rnd)
    for (x0, z0, x1, z1, paint) in ((-8, 18, -2, 13, 'black'), (6, 20, 2, 15, 'black'), (14, 22, 18, 12, 'pipeGreen')):
        hose(P, x0, z0, x1, z1, rnd, paint)
    for _ in range(36):
        x, z = rnd.uniform(-30, 30), rnd.uniform(4, 30)
        stain(P, site, x, z, rnd.uniform(0.3, 1.1), rnd, rnd.choice(['roadEdge', 'gravelDark', 'ballast']))
    stats['stones'] = stones(P, site, 2600, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=1200, flowers=220, bushes=40, skids=16))
    stats['deckCrew'] = dress_decks(P, site, rnd, 30)
    return stats
