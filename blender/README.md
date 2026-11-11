# Blender models

The scenes and the character are modelled in Blender by these scripts and loaded by the site as GLBs from `public/models/`.

## Rebuilding

1. Run `npm run models:dump`. It writes the palette and each scene's flight paths to `out/`.
2. In Blender, with the MCP add-on or the Python console, run each scene and the character:
   ```python
   DIR = '/path/to/portfolio/blender'
   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'carseland'})
   exec(open(f'{DIR}/run.py').read(), {'DIR': DIR, 'SCENE': 'reformer'})
   exec(open(f'{DIR}/character.py').read(), {'DIR': DIR})
   ```
3. Run `npm run models:pack`. It compresses `out/*.glb` into `public/models/` with gltfpack at 16-bit positions, so thin ground layers keep their order.
4. Run `npm test`. The tests load the GLBs and check that each stage stays inside its radius, merges to one draw call per material, and leaves the flight paths clear.

## Files

- `build.py`: mesh primitives and the per-paint collector. Each paint becomes one object with a material named `paint_<name>`. The site reads that name back as the palette paint and its surface texture (`SURFACE` in `src/world/art/palette.ts`).
- `plantkit.py`: plant equipment and site furniture, including the parametric Kellogg reformer and the crawler crane.
- `detail.py`: crews, clutter, pebbles, grass and the `Site` that keeps them clear of placed equipment and the flight paths.
- `carseland.py` and `reformer.py`: the two scene layouts.
- `character.py`: Calen, a Skin-modifier body with modelled head, hands, boots and gear.

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
