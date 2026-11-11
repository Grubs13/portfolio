# Mesh primitives and the per-paint collector the scenes are modelled with. Each
# paint becomes one object with one material named after it, which the site
# reads back as that paint and its surface texture. Coordinates are three.js
# (y up) until `C` turns them into Blender's (z up).
import json, math, bpy, bmesh
from mathutils import Matrix, Vector

C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_rgb(h):
    return [((h >> s) & 255) / 255 for s in (16, 8, 0)]

# ---- primitives in three.js local space: (verts, faces) ----

def prim_box(w, h, d):
    x, y, z = w / 2, h / 2, d / 2
    v = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)]
    return v, f

def prim_cyl(rt, rb, h, seg, open_ended=False, t0=0.0, tl=2 * math.pi):
    full = abs(tl - 2 * math.pi) < 1e-6
    n = seg if full else seg + 1
    v, f = [], []
    for ring, (r, y) in enumerate(((rt, h / 2), (rb, -h / 2))):
        for i in range(n):
            th = t0 + tl * i / seg
            v.append((r * math.sin(th), y, r * math.cos(th)))
    for i in range(seg):
        a, b = i, (i + 1) % n if full else i + 1
        f.append((a, n + a, n + b, b))
    if not open_ended:
        if rt > 1e-6: f.append(tuple(range(n))) if full else None
        if rb > 1e-6: f.append(tuple(reversed(range(n, 2 * n)))) if full else None
    return v, f

def prim_ico(radius, detail):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=detail + 1, radius=radius)
    v = [tuple(x.co) for x in bm.verts]
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    return v, f

def prim_torus(R, r, rs, ts, arc):
    v, f = [], []
    for j in range(rs + 1):
        for i in range(ts + 1):
            u = i / ts * arc
            w = j / rs * 2 * math.pi
            v.append(((R + r * math.cos(w)) * math.cos(u), (R + r * math.cos(w)) * math.sin(u), r * math.sin(w)))
    for j in range(1, rs + 1):
        for i in range(1, ts + 1):
            a = (ts + 1) * j + i - 1; b = (ts + 1) * (j - 1) + i - 1; c = (ts + 1) * (j - 1) + i; d = (ts + 1) * j + i
            f.append((a, b, c, d))
    return v, f

def prim_sphere(r, ws, hs, p0, pl, t0, tl):
    v, f, grid = [], [], []
    for iy in range(hs + 1):
        row = []
        for ix in range(ws + 1):
            u, vv = ix / ws, iy / hs
            v.append((-r * math.cos(p0 + u * pl) * math.sin(t0 + vv * tl), r * math.cos(t0 + vv * tl), r * math.sin(p0 + u * pl) * math.sin(t0 + vv * tl)))
            row.append(len(v) - 1)
        grid.append(row)
    for iy in range(hs):
        for ix in range(ws):
            a, b, c, d = grid[iy][ix + 1], grid[iy][ix], grid[iy + 1][ix], grid[iy + 1][ix + 1]
            f.append((a, b, c, d))
    return v, f

class Paints:
    def __init__(self, colors):
        self.colors = colors
        self.bms = {}

    def bm(self, paint, glow):
        key = (paint, glow)
        if key not in self.bms: self.bms[key] = bmesh.new()
        return self.bms[key]

    def add(self, paint, glow, verts, faces, M, bevel=0.0, bevel_filter=None):
        tmp = bmesh.new()
        vs = [tmp.verts.new((C @ M @ Vector((*p, 1.0))).xyz) for p in verts]
        for face in faces:
            if face is None: continue
            try: tmp.faces.new([vs[i] for i in face])
            except ValueError: pass
        bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=1e-5)
        if bevel > 0:
            edges = [e for e in tmp.edges if bevel_filter is None or bevel_filter(e)]
            if edges:
                bmesh.ops.bevel(tmp, geom=edges, offset=bevel, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)
        target = self.bm(paint, glow)
        me = bpy.data.meshes.new('tmp'); tmp.to_mesh(me); tmp.free()
        target.from_mesh(me); bpy.data.meshes.remove(me)

    def objects(self, name, collection):
        made = []
        for (paint, glow), bm in self.bms.items():
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bmesh.ops.triangulate(bm, faces=bm.faces)
            me = bpy.data.meshes.new(f'{name}_{paint}')
            bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new(f'{name}_{paint}', me)
            ob.data.materials.append(material(paint, self.colors[paint] if isinstance(paint, str) else paint, glow))
            collection.objects.link(ob)
            made.append(ob)
        self.bms = {}
        return made

def material(paint, hexcolor, glow):
    name = f'paint_{paint}' + ('_glow' if glow else '')
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    lin = [srgb_to_linear(c) for c in hex_rgb(hexcolor)]
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = 1
    if glow:
        bsdf.inputs['Emission Color'].default_value = (*lin, 1)
        bsdf.inputs['Emission Strength'].default_value = 1
    m.diffuse_color = (*lin, 1)
    return m

def reset_scene(name):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

MESHOPT = True
def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH': ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_normals=False,
                              export_texcoords=False, export_tangents=False, export_vertex_color="NONE", export_meshopt_compression_enable=MESHOPT, export_apply=True, export_materials='EXPORT',
                              export_cameras=False, export_lights=False, export_yup=True, export_animations=False)
