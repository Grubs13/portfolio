# Blender models

The scenes and the character are modelled in Blender by these scripts and loaded by the site as GLBs from `public/models/`.

## Rebuilding

1. Run `npm run models:dump`. It writes the palette to `out/`.
2. In Blender, with the MCP add-on or the Python console, run each scene and the character:
   ```python
   DIR = '/path/to/portfolio/blender'
   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'carseland'})
   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'reformer'})
   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'reliability'})
   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
   ```
3. Run `npm run models:pack`. It compresses `out/*.glb` into `public/models/` with gltfpack at 16-bit positions, so thin ground layers keep their order.
4. Run `npm test`. The tests load the GLBs and check that each stage stays inside its radius and merges to one draw call per material.

## Files

- `build.py`: mesh primitives and the per-paint collector. Each paint becomes one object with a material named `paint_<name>`. The site reads that name back as the palette paint and its surface texture (`SURFACE` in `src/world/art/palette.ts`).
- `plantkit.py`: plant equipment and site furniture, including the parametric Kellogg reformer, the crawler and hydraulic cranes, and the turnaround exchanger pieces: an exchanger open, bolted or blinded, its flange face and tubesheet, the pulled bundle on its extractor, the channel head, a stud rack, gaskets and scaffold.
- `figure.py`: the figure Calen and the workers share. It holds the stick skeleton (`JOINTS`, `BONES`), forward kinematics for a pose, the Skin-modifier body painted by rest position, and `rider`, which carries a part on a joint.
- `detail.py`: crews, clutter, pebbles, grass and the `Site` that keeps them clear of placed equipment.
- `carseland.py`, `reformer.py` and `reliability.py`: the scene layouts. `reliability.py` is laid out round Calen kneeling at an open exchanger flange, at 0.9 units per metre with `SET_SCALE` 1.6 so the crews match him. Its `YAW` must match the `cast` yaw for `reliability-engineer` in `src/world/art/sceneModel.ts`.
- `character.py`: Calen, built like the workers at their proportions (`figure.py`'s body lightly smoothed so it keeps crisp facets, painted boots, mitten hands), with his own head, hat, glasses and gear. The site shades him with the faceted scene shader.

## Character poses

`POSES` in `character.py` names each pose by the joints it turns, as Euler angles in radians. Forward kinematics down `BONES` gives each joint a rigid transform. The skin body is rebuilt from the posed joints and painted where each face sat at rest, so the hi-vis bands stay put. Every other part rides one joint and moves with it. Each pose is exported under an empty named `pose_<name>` in one `out/calen.glb`, and `stand` is the rest pose. The site shows one pose at a time: a stage's `cast` names the pose and the yaw (`src/world/art/kit.ts`), and the loader sizes Calen by `pose_stand`. To add a pose, add it to `POSES` and to `CHARACTER_POSES` in `src/world/art/character.ts`.

## Workers

`person()` in `detail.py` places a site worker built from `figure.py` at one subdivision level, about 1,330 to 1,420 triangles. Each worker has a rounded body, a head with face and hair, a domed hard hat with a brim, mitten hands and optional glasses. `WORKER_POSES` holds `stand`, `walk`, `carry`, `point`, `crouch`, `kneel` and `climb` in the same joint-turn format as Calen's poses. `figure()` builds each pose once per scene as vertex and face lists per outfit region, and `person()` adds them to the scene's `Paints` at each placement, scaled by `SET_SCALE`. `outfit()` maps regions to paints. Coveralls are navy, `khaki` or `frRed`, with or without reflective bands. The vest is `hiVis`, `tankOrange` or none, and gloves are skin, `glove` or `black`. The hat colour comes from the scene's random stream as before. The rest of the outfit, and whether a crew member drops the vest or kneels instead of crouching, comes from a stream seeded by where the worker stands. That keeps each scene's own stream, and the layout placed after the crews, unchanged. `climb` is for a figure placed on a ladder, so crews never pick it.

## Design notes

These notes come from the reference photos (kept outside the repo) and from plant-design research. Figures marked [est] are estimates.

- **Carseland:** a Kellogg ammonia plant of about 1,500 t/d and a Stamicarbon granular urea plant of about 2,000 t/d. The dry storage building is about 400 m long and holds about 78,000 t. The TC Energy cogen plant sits on site. The cold ammonia tank holds 36,000 t, which is about 50 m in diameter by 35 m [est]. Water comes from the Bow River, and the blowdown and storm water go to ponds.
- **Plot plan:**
  - Blocks run in process order along the main pipe rack: reforming, then shift and CO2 removal, compression, synthesis, then urea and granulation.
  - Racks are 6–10 m wide per bay with 6 m bents and 4–5.5 m to the first tier, with fin-fans on top in older Kellogg plants.
  - Pumps sit in rows under the rack edges, and columns stand 3–6 m off the rack.
  - The cooling tower stands at least 30 m from the process. The ammonia tank and the flare are at the edge, and offices are upwind (west) [est].
- **Reformer:**
  - Top-fired, with a box about 38 × 20 × 13 m on piers [est] and tunnel burners at the foot of the end wall.
  - A corrugated penthouse covers the inlet headers and pigtails.
  - The convection section's coil modules are lifted in and out by crane. The stack is 45–60 m [est].
  - During a re-harp, penthouse roof panels come off and harps are lifted out with a main and a tail crane.
- **Finishes:**
  - Aluminium-jacketed insulation with banded seams, the dominant colour.
  - Galvanized or grey steel, with safety-yellow handrails, caged ladders and stairs.
  - Concrete fireproofing on rack columns, and concrete under equipment with gravel between units.
  - Fire water in red, and rust streaks on uninsulated carbon steel.
