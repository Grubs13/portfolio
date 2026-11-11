# Builds one scene in the open Blender session and exports it to out/<scene>.glb,
# for `npm run models:pack` to compress into public/models (`character.py` builds the character). Run it inside Blender
# with DIR set to this folder and SCENE to 'reformer' or 'carseland':
#   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'reformer'})
import io, contextlib, json, os, random, time

for f in ('build.py', 'detail.py', f'{SCENE}.py'):
    exec(open(f'{DIR}/{f}').read(), globals())

started = time.time()
data = load(SCENE)
# The rock slab comes from `stageGround` at load time, so its parts are left out.
parts = [p for p in data['parts'] if not (p['t'] == 'CylinderGeometry' and max(p['a']['radiusTop'], p['a']['radiusBottom']) > 40)]
col = reset_scene(SCENE)
P = Paints(data['colors'])
rebuild(P, parts)
site = Site(parts, json.load(open(f'{DIR}/out/paths.json'))[SCENE_ID])
stats = dress(P, site, random.Random(11))
obs = P.objects(SCENE, col)
tris = sum(len(o.data.polygons) for o in obs)
raw = f'{DIR}/out/{SCENE}.glb'
with contextlib.redirect_stdout(io.StringIO()):
    MESHOPT = False
    export(raw)
result = {'tris': tris, 'objects': len(obs), 'secs': round(time.time() - started, 1), 'raw': os.path.getsize(raw), **stats}
