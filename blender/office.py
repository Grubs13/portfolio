# A site engineering office for the Technical Interests scene, cut away so the
# camera looks in over the two open sides. Calen sits at his desk at the anchor,
# facing -x, working at two monitors: trend charts on one, a P&ID on the other.
# Around him are binder shelves and filing cabinets, a whiteboard with a colleague
# at it, a framed plant drawing, his hard hat and vest on a hook, and a window
# onto the plant. The office sits in a trailer complex on a gravel pad.
# Sizes are at Calen's hero scale: he is about 3 units tall, and seated his thighs
# are 0.56 up and his hands about 1.3 up and 0.56 in front of him.
import math
from mathutils import Vector
SET_SCALE = 1.53
YAW = -math.pi / 2

# The room: walls along x = WX (behind the desk) and z = WZ, open toward the camera.
WX, WZ, EX, EZ, H = -3.4, -5.0, 4.2, 4.0, 4.0
DESK = (-1.95, -1.7, -0.5, 1.7)
TOP = 1.18

def layout(K):
    rnd = K.rnd
    # Outside: hay land to the stage rim, a gravel pad with trailers and parking, the plant beyond the window.
    K.cyl('fieldGreen', (0, -0.02, 0), 74.6, 0.04, 48)
    K.site.cover(Vector((-74, 0, -74)), Vector((74, 0.02, 74)), 'fieldGreen')
    K.ground('gravel', -40, -40, 40, 40)
    K.ground('asphalt', 8, -16, 30, -4, 0.06)
    for i in range(14):
        if rnd.random() < 0.8:
            K.box(rnd.choice(['carSilver', 'tube', 'carBlue', 'carRed', 'black']), (9.5 + (i % 7) * 2.9, 0.6, -13.5 + (i // 7) * 7), (1.5, 0.8, 2.9), 0, 0.08)
    for x0 in (8, 16, 24):
        K.building(x0, 6, x0 + 6.5, 10, 3.2, 'tube', 'flat', doors=1, windows=3, louvres=1, vents=1)
    K.stack(-20, -14, 1.2, 20, 'stackTan', platforms=(0.86,))
    K.vessel(-15, -22, 1.1, 14, platforms=(0.35, 0.7, 0.98), davit=True)
    K.vessel(-24, -4, 0.9, 11, platforms=(0.5, 0.98))
    K.pipe_rack((-30, -9), (-8, -9), width=2.4, tiers=(2.6, 3.6), seed=4)
    for x in range(-34, 34, 10):
        K.light_pole(x + 0.5, 16, 5.5)

    # The building: floor on a low base, the two back walls with trim, and a skirt under the open sides.
    K.slab('concrete', (WX - 0.3, 0, WZ - 0.3), (EX + 0.3, 0.32, EZ + 0.3))
    K.slab('carpet', (WX, 0.32, WZ), (EX, 0.36, EZ))
    K.slab('officeWall', (WX - 0.25, 0.36, WZ - 0.25), (WX, H, EZ))
    K.slab('officeWall', (WX, 0.36, WZ - 0.25), (EX, H, WZ))
    for a, b in (((WX - 0.27, H - 0.12, WZ - 0.27), (WX + 0.02, H + 0.05, EZ)), ((WX, H - 0.12, WZ - 0.27), (EX, H + 0.05, WZ + 0.02))):
        K.slab('casingShade', a, b)
    K.slab('casingShade', (WX, 0.36, WZ), (WX + 0.04, 0.5, EZ))
    K.slab('casingShade', (WX, 0.36, WZ), (EX, 0.5, WZ + 0.04))
    K.foot(WX - 0.3, WZ - 0.3, EX + 0.3, EZ + 0.3, H)

    # The window behind the desk, looking out at the stack and columns: a frame round an opening, mullions, a sill.
    wz0, wz1, wy0, wy1 = -1.3, 1.3, 1.9, 3.4
    K.slab('casingShade', (WX - 0.3, wy0 - 0.12, wz0 - 0.12), (WX + 0.05, wy1 + 0.12, wz1 + 0.12))
    K.slab('lens', (WX - 0.2, wy0, wz0), (WX - 0.16, wy1, wz1))
    K.slab('casingShade', (WX - 0.24, wy0, -0.04), (WX + 0.02, wy1, 0.04))
    K.slab('officeWall', (WX - 0.02, wy0 - 0.16, wz0 - 0.1), (WX + 0.16, wy0 - 0.1, wz1 + 0.1))

    # The desk: a laminate top on steel legs with a modesty panel and a pedestal of drawers.
    x0, z0, x1, z1 = DESK
    K.slab('laminate', (x0, TOP - 0.06, z0), (x1, TOP, z1), 0.02)
    for z in (z0 + 0.1, z1 - 0.1):
        K.slab('steelDark', (x0 + 0.1, 0.36, z - 0.05), (x1 - 0.1, TOP - 0.06, z + 0.05))
    K.slab('steelDark', (x0 + 0.05, 0.6, z0 + 0.1), (x0 + 0.1, TOP - 0.06, z1 - 0.1))
    K.slab('stackGrey', (x0 + 0.15, 0.36, z1 - 0.65), (x1 - 0.15, TOP - 0.08, z1 - 0.12), 0.02)
    for y in (0.55, 0.8, 1.0):
        K.slab('casingShade', (x1 - 0.16, y, z1 - 0.5), (x1 - 0.14, y + 0.05, z1 - 0.27))
    K.foot(x0, z0, x1, z1, TOP)

    # Two monitors on stands, angled in toward him: trend charts on the left, a P&ID on the right.
    for z, face in ((0.62, 0.18), (-0.62, -0.18)):
        mx = x0 + 0.35
        K.box('black', (mx, TOP + 0.03, z), (0.3, 0.05, 0.36), face)
        K.box('black', (mx, TOP + 0.3, z), (0.06, 0.5, 0.08), face)
        K.box('black', (mx + 0.03, TOP + 0.78, z), (0.06, 0.66, 1.08), face, 0.02)
        K.box('screenDark', (mx + 0.065, TOP + 0.78, z), (0.01, 0.58, 1.0), face, 0, True)
        c, s = math.cos(face), math.sin(face)
        def on(dy, dz, h, w, paint):
            # A mark on the screen face, `dz` across it and `dy` up it.
            K.box(paint, (mx + 0.072 + dz * s, TOP + 0.78 + dy, z + dz * c), (0.008, h, w), face, 0, True)
        if z > 0:
            # Trends: a rising green line over a grid, an amber limit and a red alarm marker.
            for k in range(-2, 3): on(k * 0.1, 0, 0.006, 0.94, 'screen')
            pts = [(-0.42, -0.16), (-0.25, -0.1), (-0.1, -0.12), (0.05, 0.02), (0.2, 0.05), (0.38, 0.15)]
            for (a0, b0), (a1, b1) in zip(pts, pts[1:]):
                on((b0 + b1) / 2, (a0 + a1) / 2, 0.03 + abs(b1 - b0), a1 - a0, 'detectorLed')
            on(0.21, 0, 0.012, 0.94, 'lamp')
            on(0.15, 0.38, 0.05, 0.05, 'beacon')
        else:
            # A P&ID: vessels, lines and valves in light lines on the dark screen.
            on(0.02, -0.3, 0.32, 0.12, 'screen')
            on(0.0, 0.25, 0.22, 0.16, 'screen')
            on(0.06, -0.02, 0.012, 0.5, 'screen')
            on(-0.12, 0.05, 0.012, 0.64, 'screen')
            on(0.18, -0.1, 0.012, 0.3, 'screen')
            for dz in (-0.12, 0.1): on(0.06, dz, 0.05, 0.05, 'lamp')
    # Keyboard and mouse at his hands, a mug, a lamp, papers, drawings and a binder stack.
    K.box('black', (x1 + 0.0, TOP + 0.02, 0.05), (0.26, 0.04, 0.8), 0, 0.01)
    K.box('steelDark', (x1 + 0.01, TOP + 0.045, 0.05), (0.2, 0.01, 0.72))
    K.box('black', (x1 - 0.02, TOP + 0.03, -0.55), (0.16, 0.05, 0.1), 0, 0.02)
    K.cyl('tube', (x1 - 0.25, TOP, 0.95), 0.08, 0.17, 12)
    K.box('tube', (x1 - 0.18, TOP + 0.09, 1.03), (0.03, 0.08, 0.06))
    K.cyl('steelDark', (x0 + 0.25, TOP, 1.45), 0.12, 0.04, 10)
    K.rod('steelDark', (x0 + 0.25, TOP + 0.04, 1.45), (x0 + 0.45, TOP + 0.6, 1.35), 0.025, 6)
    K.cyl('safetyYellow', (x0 + 0.55, TOP + 0.42, 1.3), 0.13, 0.16, 10, top=0.06)
    for k, (dx, dz, yaw) in enumerate(((-0.35, -1.25, 0.1), (-0.5, -1.05, -0.2), (-0.3, 1.25, 0.3))):
        K.box('tube', (x1 + dx, TOP + 0.005 + k * 0.005, dz), (0.42, 0.01, 0.3), yaw)
    for k, paint in enumerate(('pipeBlue', 'tube', 'pipeBlue')):
        K.rod(paint, (x0 + 0.3, TOP + 0.08 + k * 0.01, -1.55 + k * 0.17), (x1 - 0.2, TOP + 0.08 + k * 0.01, -1.6 + k * 0.17), 0.07, 8)
    for k, paint in enumerate(('pipeBlue', 'tankRed', 'safetyYellow')):
        K.box(paint, (x0 + 0.3, TOP + 0.06 + k * 0.1, 1.55 - 0.04 * k), (0.4, 0.09, 0.3), 0.05 * k, 0.01)

    # His chair: a seat under him, the backrest behind, the gas lift and a five-star base on casters.
    K.box('navy', (0.12, 0.5, 0), (0.75, 0.12, 0.75), 0, 0.04)
    K.box('navy', (0.52, 1.15, 0), (0.12, 0.95, 0.68), 0, 0.04)
    K.rod('steelDark', (0.48, 0.5, 0), (0.48, 0.85, 0), 0.05, 6)
    K.rod('steelDark', (0.12, 0.38, 0), (0.12, 0.5, 0), 0.06, 8)
    for k in range(5):
        a = k * 2 * math.pi / 5
        K.rod('black', (0.12, 0.4, 0), (0.12 + 0.36 * math.cos(a), 0.4, 0.36 * math.sin(a)), 0.035, 5)
        K.ball('black', (0.12 + 0.36 * math.cos(a), 0.39, 0.36 * math.sin(a)), 0.05, 0)

    # Along the back wall: binder shelves, filing cabinets, a whiteboard and a door.
    for i, bx in enumerate((-2.9, -1.4)):
        # An open case: back panel, sides and top, so the binders on its shelves show.
        K.slab('laminate', (bx, 0.36, WZ + 0.02), (bx + 1.3, 3.2, WZ + 0.08))
        for sx in (bx, bx + 1.25): K.slab('laminate', (sx, 0.36, WZ + 0.02), (sx + 0.05, 3.2, WZ + 0.55))
        K.slab('laminate', (bx, 3.15, WZ + 0.02), (bx + 1.3, 3.2, WZ + 0.55))
        for shelf in range(4):
            y = 0.5 + shelf * 0.68
            K.slab('casingShade', (bx + 0.05, y, WZ + 0.08), (bx + 1.25, y + 0.03, WZ + 0.52))
            for k in range(7):
                K.box(rnd.choice(['pipeBlue', 'tankRed', 'black', 'safetyYellow', 'signGreen', 'tube', 'pipeBlue']),
                      (bx + 0.13 + k * 0.165, y + 0.27, WZ + 0.32), (0.13, 0.48, 0.4), 0, 0.01)
    for k in range(2):
        cx = 0.25 + k * 0.75
        K.slab('stackGrey', (cx, 0.36, WZ + 0.05), (cx + 0.7, 1.7, WZ + 0.7), 0.02)
        for d in range(3):
            K.slab('casingShade', (cx + 0.25, 0.65 + d * 0.38, WZ + 0.7), (cx + 0.45, 0.7 + d * 0.38, WZ + 0.72))
    K.cyl('treeDark', (1.95, 1.7, WZ + 0.38), 0.05, 0.02, 6)
    K.ball('treeLight', (1.95, 1.95, WZ + 0.38), 0.26, 1, (1, 0.9, 1))
    K.cyl('rust', (1.95, 1.7, WZ + 0.38), 0.15, 0.2, 10, top=0.13)
    K.slab('tube', (2.4, 1.5, WZ + 0.02), (4.0, 2.9, WZ + 0.06))
    K.slab('steelDark', (2.36, 1.46, WZ), (4.04, 2.94, WZ + 0.04))
    # The whiteboard: a process sketch of a column, an exchanger and a pump, in blue and red marker.
    for a, b, paint in (((2.7, 1.8), (2.8, 2.6), 'pipeBlue'), ((2.8, 2.4), (3.3, 2.4), 'pipeBlue'), ((3.3, 2.2), (3.6, 2.2), 'tankRed'),
                        ((3.3, 2.0), (3.3, 2.4), 'pipeBlue'), ((3.6, 1.8), (3.6, 2.2), 'pipeBlue'), ((2.8, 1.8), (3.6, 1.8), 'tankRed')):
        K.slab(paint, (min(a[0], b[0]) - 0.015, min(a[1], b[1]) - 0.015, WZ + 0.065), (max(a[0], b[0]) + 0.015, max(a[1], b[1]) + 0.015, WZ + 0.07))
    K.slab('tankRed', (3.2, 1.5, WZ + 0.06), (3.6, 1.56, WZ + 0.12))

    # A small meeting table in the open front of the room, a drawing unrolled on it and two chairs.
    K.cyl('steelDark', (1.9, 0.36, 1.7), 0.08, 0.78, 8)
    K.cyl('steelDark', (1.9, 0.36, 1.7), 0.42, 0.05, 12)
    K.cyl('laminate', (1.9, 1.14, 1.7), 0.95, 0.06, 20)
    K.box('tube', (1.9, 1.205, 1.7), (1.0, 0.01, 0.7), 0.3)
    for a0, b0 in (((1.55, 1.55), (2.25, 1.85)), ((1.7, 1.95), (2.1, 1.45))):
        K.rod('pipeBlue', (a0[0], 1.215, a0[1]), (b0[0], 1.215, b0[1]), 0.012, 4)
    K.rod('pipeBlue', (1.35, 1.25, 1.35), (2.45, 1.25, 1.2), 0.06, 8)
    for cx, cz, yaw in ((2.9, 2.3, -0.6), (1.0, 2.6, 0.5)):
        K.box('navy', (cx, 0.78, cz), (0.6, 0.1, 0.6), yaw, 0.03)
        K.box('navy', (cx + 0.32 * math.sin(yaw + math.pi / 2), 1.2, cz + 0.32 * math.cos(yaw + math.pi / 2)), (0.6, 0.75, 0.1), yaw, 0.03)
        for dx in (-0.25, 0.25):
            for dz in (-0.25, 0.25): K.rod('steelDark', (cx + dx, 0.36, cz + dz), (cx + dx, 0.74, cz + dz), 0.025, 4)
    K.foot(0.9, 0.7, 3.3, 3.0, 1.3)

    # The framed plant drawing on the window wall, and his hard hat and vest on hooks by it.
    K.slab('steelDark', (WX, 1.7, 1.75), (WX + 0.05, 3.1, 3.45))
    K.slab('tube', (WX + 0.05, 1.78, 1.83), (WX + 0.07, 3.02, 3.37))
    for a, b in (((1.95, 2.1), (3.25, 2.1)), ((2.2, 1.9), (2.2, 2.8)), ((2.9, 2.3), (2.9, 2.9)), ((2.2, 2.6), (3.1, 2.6))):
        K.slab('pipeBlue', (WX + 0.07, min(a[1], b[1]) - 0.012, min(a[0], b[0]) - 0.012), (WX + 0.08, max(a[1], b[1]) + 0.012, max(a[0], b[0]) + 0.012))
    K.slab('steelDark', (WX, 2.55, -2.95), (WX + 0.1, 2.6, -2.05))
    K.dome('hardHat', (WX + 0.28, 2.62, -2.75), 0.24, 0.2, 12)
    K.cyl('hardHat', (WX + 0.28, 2.6, -2.75), 0.3, 0.03, 12)
    K.cyl('headband', (WX + 0.28, 2.64, -2.75), 0.245, 0.04, 12)
    K.box('hiVis', (WX + 0.14, 2.1, -2.25), (0.08, 0.95, 0.55), 0, 0.02)
    K.box('reflective', (WX + 0.19, 1.95, -2.25), (0.01, 0.07, 0.55))
    K.box('reflective', (WX + 0.19, 2.25, -2.25), (0.01, 0.07, 0.55))
    # Boots under the hooks, a waste bin and a printer on a side table.
    for dz in (-2.85, -2.6):
        K.box('boots', (WX + 0.4, 0.46, dz), (0.42, 0.2, 0.2), 0, 0.04)
    K.cyl('steelDark', (-0.35, 0.36, 1.9), 0.18, 0.4, 10, top=0.2)
    K.slab('laminate', (-2.9, 0.36, 2.3), (-2.0, 1.1, 3.4), 0.02)
    K.box('casing', (-2.45, 1.32, 2.85), (0.7, 0.42, 0.75), 0, 0.03)
    K.slab('tube', (-2.65, 1.53, 2.65), (-2.25, 1.54, 3.05))
    K.foot(-2.95, 2.25, -1.95, 3.45, 1.6)

def dress(P, site, rnd):
    stats = {'people': 0}
    # A colleague at the whiteboard, pointing at the sketch.
    person(P, 3.0, 0.36, WZ + 1.3, math.pi, None, 'point', rnd)
    stats['people'] += 1
    for (x, z, n, spread) in ((12, 2, 4, 3), (20, -2, 3, 3), (-10, 12, 3, 3)):
        stats['people'] += crew(P, site, x, z, n, spread, rnd)
    stats['stones'] = stones(P, site, 1400, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=900, flowers=180, bushes=40, skids=6))
    return stats
