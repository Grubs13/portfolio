# Set dressing for the whole Carseland site: crews and clutter where the plant is,
# speckle over open ground, and grass life in the farmland around it.
SCENE_ID = 'reliability-engineer'

def scatter_near_plant(site, rnd, tries=4000):
    for _ in range(tries):
        x, z = rnd.uniform(-55, 55), rnd.uniform(-55, 55)
        if site.surface(x, z) in GRAVEL | {'road', 'asphalt'} and site.near_taken(x, z, 3):
            yield x, z

def dress(P, site, rnd):
    stats = {'people': 0, 'clutter': 0}
    spots = scatter_near_plant(site, rnd)
    for _ in range(26):
        x, z = next(spots, (0, 0))
        stats['people'] += crew(P, site, x, z, rnd.randint(1, 3), 1.5, rnd)
    for _ in range(30):
        x, z = next(spots, (0, 0))
        stats['clutter'] += clutter(P, site, x, z, rnd.randint(1, 3), 1.6, rnd)
    for _ in range(30):
        x, z = rnd.uniform(-60, 60), rnd.uniform(-60, 60)
        if site.surface(x, z) in {'road', 'asphalt', 'concrete'}:
            stain(P, site, x, z, rnd.uniform(0.3, 1.0), rnd, rnd.choice(['roadEdge', 'gravelDark', 'ballast']))
    stats['stones'] = stones(P, site, 2000, rnd)
    stats.update(dress_ground(P, site, rnd, tufts=900, flowers=200, bushes=60, skids=24))
    stats['deckCrew'] = dress_decks(P, site, rnd, 24)
    return stats
