# Turnaround set dressing for the reformer re-harp. The scene's row frame (u along
# the reformer row, v toward the viewer) is turned ROW_YAW from the world.
import math
SCENE_ID = 'reformer-reharp'
ROW_YAW = 5 * math.pi / 12

def row(u, v):
    c, s = math.cos(ROW_YAW), math.sin(ROW_YAW)
    return u * c + v * s, -u * s + v * c

def dress(P, site, rnd):
    stats = {'people': 0, 'clutter': 0, 'stones': 0}
    # Crews: the laydown by the burners, the camp, the lunch tent, the road shoulder, the module crane's tag lines.
    for (u, v, n, spread) in [(-10, 4.2, 8, 2.6), (-4, 6.5, 7, 2.5), (5, 6, 7, 2.6), (11, 12, 10, 2.4), (-14, 9, 6, 2.5),
                               (1, 11, 6, 2.2), (-20, 9, 5, 2.4), (16, 7, 5, 2.4), (-26, 4, 4, 2), (22, 4, 4, 2)]:
        x, z = row(u, v)
        stats['people'] += crew(P, site, x, z, n, spread, rnd)
    # Clutter around the laydown and camp.
    for (u, v, n, spread) in [(-9, 7, 10, 4), (0, 8, 12, 4.5), (8, 9, 10, 4), (-18, 11, 8, 4), (16, 12, 8, 4),
                               (-24, 7, 6, 3), (24, 8, 6, 3), (4, 14, 8, 3.5), (-6, 15, 6, 3)]:
        x, z = row(u, v)
        stats['clutter'] += clutter(P, site, x, z, n, spread, rnd)
    # Jersey barriers lining the near road shoulder.
    for u in range(-34, 36, 3):
        x, z = row(u + rnd.uniform(-0.3, 0.3), 2.9)
        if site.claim(x, z, 0.9, 1.0):
            jersey(P, T(x, 0, z, ROW_YAW))
    # Hoses and cables from the welding rigs and compressors snaking across the pad.
    for (u0, v0, u1, v1, paint) in [(-14.6, 4.4, -10, 1.4, 'black'), (-14.6, 6.4, -8, 3.5, 'black'), (4.6, -2.2, 9, 0.6, 'pipeGreen'),
                                     (-2, 7.4, 3, 9.5, 'tankRed'), (12, 6, 16, 4.6, 'black')]:
        hose(P, *row(u0, v0), *row(u1, v1), rnd, paint)
    # Festoon lights strung over the lunch area.
    for (a, b) in [((8.8, 11.0), (15.6, 11.2)), ((8.8, 12.8), (15.6, 13.0))]:
        pa, pb = row(*a), row(*b)
        if site.clear_of_paths((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, 3.2, 3):
            string_lights(P, (pa[0], 2.8, pa[1]), (pb[0], 2.8, pb[1]))
            for p in (pa, pb):
                box(P, 'steelDark', T(p[0], 1.45, p[1]), 0.08, 2.9, 0.08)
    # Oil stains under the cranes and trucks, puddles on the pad.
    for _ in range(40):
        x, z = row(rnd.uniform(-30, 30), rnd.uniform(-1, 14))
        stain(P, site, x, z, rnd.uniform(0.3, 1.1), rnd, rnd.choice(['roadEdge', 'gravelDark', 'ballast']))
    stats['stones'] = stones(P, site, 2200, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=800, flowers=160))
    stats['deckCrew'] = dress_decks(P, site, rnd, 24)
    return stats
