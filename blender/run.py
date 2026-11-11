# Builds a scene in the open Blender session and exports it to out/<scene>.glb for
# `npm run models:pack` (`character.py` builds the character). Run `npm run models:dump`
# first for the palette, then inside Blender with DIR set to this
# folder and SCENE to 'carseland' or 'reformer':
#   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'carseland'})
import io, contextlib, json, os, random, time

for f in ('build.py', 'detail.py', 'plantkit.py', f'{SCENE}.py'):
    exec(open(f'{DIR}/{f}').read(), globals())

started = time.time()
colors = json.load(open(f'{DIR}/out/palette.json'))
col = reset_scene(SCENE)
P = Paints(colors)
site = Site()
K = Kit(P, site, random.Random(5))
layout(K)
stats = dress(P, site, random.Random(11))
missing = sorted({p for (p, g) in P.bms if p not in colors})
if missing: raise ValueError(f'paints missing from the palette: {missing}')
obs = P.objects(SCENE, col)
raw = f'{DIR}/out/{SCENE}.glb'
with contextlib.redirect_stdout(io.StringIO()):
    MESHOPT = False
    export(raw)
result = {'tris': sum(len(o.data.polygons) for o in obs), 'objects': len(obs), 'secs': round(time.time() - started, 1),
          'raw': os.path.getsize(raw), **stats}
