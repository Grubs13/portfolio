# Plant equipment modelled in Blender for the stylized scenes, proportioned after
# real ammonia and urea plants (see the research notes in README.md): aluminium-
# jacketed vessels and columns with platforms and caged ladders, steel structures
# with grating and yellow handrails, pipe racks carrying runs of pipe with fin-fan
# banks on top, a Kellogg top-fired reformer, cooling towers, tanks, a long A-frame
# warehouse with conveyor galleries, rail, ponds and site furniture.
#
# Coordinates are three.js (y up) relative to the scene anchor, in scene units.
# Every piece is added to a `Paints` collector from build.py and registers its
# footprint with the `Site`, so set dressing keeps clear of it. Needs build.py and
# detail.py loaded first.
import math
from mathutils import Matrix, Vector

UP = Vector((0, 1, 0))

class Kit:
    def __init__(self, P, site, rnd):
        self.P, self.site, self.rnd = P, site, rnd
        self.conflicts = []

    # ---- primitives ----
    def box(self, paint, c, size, yaw=0.0, bevel=0.0, glow=False):
        v, f = prim_box(*size)
        self.P.add(paint, glow, v, f, T(c[0], c[1], c[2], yaw), bevel)

    def slab(self, paint, a, b, bevel=0.0):
        c = [(a[i] + b[i]) / 2 for i in range(3)]
        size = [max(abs(b[i] - a[i]), 1e-3) for i in range(3)]
        self.box(paint, c, size, 0.0, bevel)

    def cyl(self, paint, base, r, h, seg=16, top=None, glow=False):
        """A vertical cylinder or cone section standing on `base`."""
        v, f = prim_cyl(r if top is None else top, r, h, seg)
        self.P.add(paint, glow, v, f, Matrix.Translation((base[0], base[1] + h / 2, base[2])))

    def rod(self, paint, a, b, r, seg=8):
        a, b = Vector(a), Vector(b)
        d = b - a
        if d.length < 1e-4: return
        v, f = prim_cyl(r, r, d.length, seg)
        rot = UP.rotation_difference(d.normalized()).to_matrix().to_4x4()
        self.P.add(paint, False, v, f, Matrix.Translation((a + b) / 2) @ rot)

    def beam(self, paint, a, b, w):
        a, b = Vector(a), Vector(b)
        d = b - a
        if d.length < 1e-4: return
        v, f = prim_box(w, d.length, w)
        rot = UP.rotation_difference(d.normalized()).to_matrix().to_4x4()
        self.P.add(paint, False, v, f, Matrix.Translation((a + b) / 2) @ rot)

    def ball(self, paint, c, r, detail=1, s=(1, 1, 1), glow=False):
        v, f = prim_ico(r, detail)
        self.P.add(paint, glow, v, f, T(c[0], c[1], c[2], 0, s))

    def dome(self, paint, c, r, h, seg=20):
        v, f = prim_sphere(1, seg, 6, 0, 2 * math.pi, 0, math.pi / 2)
        self.P.add(paint, False, v, f, T(c[0], c[1], c[2], 0, (r, h, r)))

    def gable(self, paint, c, length, span, rise, yaw=0.0):
        """A gable roof along local x, eaves at c.y."""
        x, z = length / 2, span / 2
        v = [(-x, 0, -z), (x, 0, -z), (x, 0, z), (-x, 0, z), (-x, rise, 0), (x, rise, 0)]
        f = [(0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
        self.P.add(paint, False, v, f, T(c[0], c[1], c[2], yaw))

    def ground(self, paint, x0, z0, x1, z1, y=0.04):
        """Flat ground cover: a pad, road or field, which dressing reads to choose what grows or lies on it."""
        self.slab(paint, (x0, y - 0.04, z0), (x1, y, z1))
        self.site.cover(Vector((min(x0, x1), 0, min(z0, z1))), Vector((max(x0, x1), y, max(z0, z1))), paint)

    def foot(self, x0, z0, x1, z1, top, pad=0.3):
        """Registers a footprint, and records it if it stands in a flight path."""
        lo_x, hi_x, lo_z, hi_z = min(x0, x1), max(x0, x1), min(z0, z1), max(z0, z1)
        self.site.mark(lo_x, lo_z, hi_x, hi_z, pad)
        for p in self.site.paths:
            if p.y < top + 2.4 and lo_x - 1.4 < p.x < hi_x + 1.4 and lo_z - 1.4 < p.z < hi_z + 1.4:
                self.conflicts.append(((round(lo_x, 1), round(lo_z, 1), round(hi_x, 1), round(hi_z, 1)), round(top, 1)))
                break

    # ---- access steel ----
    def handrail(self, a, b, h=0.5, paint='safetyYellow'):
        a, b = Vector(a), Vector(b)
        n = max(1, round((b - a).length / 1.0))
        for i in range(n + 1):
            p = a.lerp(b, i / n)
            self.rod(paint, p, p + Vector((0, h, 0)), 0.025, 4)
        self.rod(paint, a + Vector((0, h, 0)), b + Vector((0, h, 0)), 0.03, 4)
        self.rod(paint, a + Vector((0, h * 0.5, 0)), b + Vector((0, h * 0.5, 0)), 0.02, 4)

    def deck(self, x0, z0, x1, z1, y, rails='nsew', paint='galvanized'):
        self.slab(paint, (x0, y - 0.06, z0), (x1, y, z1))
        if y > 1.5: self.site.decks.append((Vector((min(x0, x1), y - 0.06, min(z0, z1))), Vector((max(x0, x1), y, max(z0, z1)))))
        if 'n' in rails: self.handrail((x0, y, z0), (x1, y, z0))
        if 's' in rails: self.handrail((x0, y, z1), (x1, y, z1))
        if 'w' in rails: self.handrail((x0, y, z0), (x0, y, z1))
        if 'e' in rails: self.handrail((x1, y, z0), (x1, y, z1))

    def ladder(self, x, z, y0, y1, face=(0, 1), cage=True):
        """A caged ladder up a face, `face` the outward direction in xz."""
        fx, fz = face
        sx, sz = -fz, fx
        for s in (-0.16, 0.16):
            self.rod('safetyYellow', (x + sx * s, y0, z + sz * s), (x + sx * s, y1, z + sz * s), 0.022, 4)
        if cage:
            for y in [y0 + 2.2 + k * 0.7 for k in range(int(max(0, y1 - y0 - 2.2) / 0.7) + 1)]:
                pts = [Vector((x + sx * 0.22 * math.cos(a) + fx * (0.3 + 0.22 * math.sin(a)), y, z + sz * 0.22 * math.cos(a) + fz * (0.3 + 0.22 * math.sin(a)))) for a in [i * math.pi / 4 for i in range(5)]]
                for p, q in zip(pts, pts[1:]): self.rod('safetyYellow', p, q, 0.018, 4)
            for a in (0.4, 1.57, 2.74):
                off = (sx * 0.22 * math.cos(a) + fx * (0.3 + 0.22 * math.sin(a)), sz * 0.22 * math.cos(a) + fz * (0.3 + 0.22 * math.sin(a)))
                self.rod('safetyYellow', (x + off[0], y0 + 2.2, z + off[1]), (x + off[0], y1, z + off[1]), 0.016, 4)

    def stairs(self, x, z, y0, y1, along=(1, 0), width=0.7):
        """A switchback stair tower with landings every 2.5 units."""
        ax, az = along
        px, pz = -az, ax
        flights = max(1, round((y1 - y0) / 2.5))
        rise = (y1 - y0) / flights
        run = rise * 1.1
        for i in range(flights):
            ya, yb = y0 + i * rise, y0 + (i + 1) * rise
            side = 1 if i % 2 == 0 else -1
            a = Vector((x - ax * run / 2 * side + px * width * 0.55, ya, z - az * run / 2 * side + pz * width * 0.55))
            b = Vector((x + ax * run / 2 * side + px * width * 0.55, yb, z + az * run / 2 * side + pz * width * 0.55))
            if i % 2: a, b = a - Vector((px, 0, pz)) * width * 1.1, b - Vector((px, 0, pz)) * width * 1.1
            self.beam('galvanized', a, b, width * 0.9)
            self.rod('safetyYellow', a + Vector((0, 0.5, 0)), b + Vector((0, 0.5, 0)), 0.025, 4)
            lx, lz = x + ax * run / 2 * side, z + az * run / 2 * side
            self.slab('galvanized', (lx - 0.4, yb - 0.06, lz - 0.4), (lx + 0.4 + abs(px) * width, yb, lz + 0.4 + abs(pz) * width))
        for dx in (-run / 2 - 0.3, run / 2 + 0.3):
            for dw in (-0.1, width * 1.2):
                self.rod('galvanized', (x + ax * dx + px * dw, y0, z + az * dx + pz * dw), (x + ax * dx + px * dw, y1 + 0.6, z + az * dx + pz * dw), 0.05, 4)

    # ---- process equipment ----
    def vessel(self, x, z, r, h, paint='jacket', base=0.0, platforms=(), ladder=True, skirt=0.6, head='ellipse', bands=True, davit=False, nozzles=3):
        """A vertical vessel or column on a skirt: aluminium jacketing with banded seams, heads, platforms, a caged ladder."""
        y = base
        self.cyl('concrete', (x, y, z), r * 1.25, 0.3, 16)
        self.cyl('steelDark', (x, y + 0.3, z), r * 0.95, skirt, 16)
        y0 = y + 0.3 + skirt
        seg = max(14, min(28, round(10 + r * 8)))
        self.cyl(paint, (x, y0, z), r, h, seg)
        if bands:
            for k in range(1, int(h / 1.4) + 1):
                self.cyl('jacketBand', (x, y0 + k * 1.4 - 0.03, z), r + 0.012, 0.06, seg)
        top = y0 + h
        if head == 'ellipse': self.dome(paint, (x, top, z), r, r * 0.5, seg)
        elif head == 'cone': self.cyl(paint, (x, top, z), r, r * 0.6, seg, top=r * 0.15)
        self.dome(paint, (x, y0, z), r, -0.01, seg)
        for i in range(nozzles):
            a = self.rnd.uniform(0, 6.28)
            ny = y0 + self.rnd.uniform(0.2, 0.9) * h
            self.rod('stainless', (x + math.cos(a) * r, ny, z + math.sin(a) * r), (x + math.cos(a) * (r + 0.35), ny, z + math.sin(a) * (r + 0.35)), 0.09, 8)
            self.cyl('steelDark', (x + math.cos(a) * (r + 0.36), ny - 0.12, z + math.sin(a) * (r + 0.36)), 0.14, 0.24, 8)
        face = (math.cos(0.6), math.sin(0.6))
        for fy in platforms:
            py = y0 + fy * h
            self.platform_ring(x, z, py, r, 0.75)
        if ladder and h > 2.5:
            lx, lz = x + face[0] * (r + 0.05), z + face[1] * (r + 0.05)
            self.ladder(lx, lz, y0, top + (0.4 if platforms and platforms[-1] > 0.95 else 0), face)
        if davit:
            self.rod('safetyYellow', (x + r * 0.6, top + r * 0.4, z), (x + r * 0.6, top + r * 0.4 + 1.2, z), 0.05, 6)
            self.rod('safetyYellow', (x + r * 0.6, top + r * 0.4 + 1.2, z), (x + r * 0.1, top + r * 0.4 + 1.2, z), 0.04, 6)
        # Relief valve vent up the side.
        self.rod('stainless', (x - r - 0.1, top - 1, z), (x - r - 0.1, top + r + 1.2, z), 0.06, 6)
        self.foot(x - r * 1.3, z - r * 1.3, x + r * 1.3, z + r * 1.3, top + r)
        return top

    def platform_ring(self, x, z, y, r, width, seg=16):
        ro = r + width
        v, f = prim_cyl(ro, ro, 0.08, seg)
        self.P.add('galvanized', False, v, f, Matrix.Translation((x, y - 0.04, z)))
        pts = [Vector((x + math.cos(a) * ro, y, z + math.sin(a) * ro)) for a in [i * 2 * math.pi / seg for i in range(seg + 1)]]
        for i, (p, q) in enumerate(zip(pts, pts[1:])):
            self.rod('safetyYellow', p + Vector((0, 0.5, 0)), q + Vector((0, 0.5, 0)), 0.025, 4)
            if i % 2 == 0: self.rod('safetyYellow', p, p + Vector((0, 0.5, 0)), 0.02, 4)
        for a in [i * 2 * math.pi / 4 + 0.4 for i in range(4)]:
            self.beam('steelDark', (x + math.cos(a) * r, y - 0.05, z + math.sin(a) * r), (x + math.cos(a) * (ro - 0.1), y - 0.5, z + math.sin(a) * (ro - 0.1)), 0.06)

    def drum(self, c, r, length, along_x=True, paint='jacket', saddles=True):
        """A horizontal drum or exchanger shell on saddles."""
        x, y, z = c
        a = Vector((x - length / 2, y, z)) if along_x else Vector((x, y, z - length / 2))
        b = Vector((x + length / 2, y, z)) if along_x else Vector((x, y, z + length / 2))
        self.rod(paint, a, b, r, 16)
        for p in (a, b): self.ball(paint, p, r * 0.98, 1, (0.5 if along_x else 1, 1, 1 if along_x else 0.5))
        for k in range(1, int(length / 1.2)):
            q = a.lerp(b, k / int(length / 1.2))
            self.rod('jacketBand', q - (b - a).normalized() * 0.03, q + (b - a).normalized() * 0.03, r + 0.012, 16)
        if saddles and y - r > 0.05:
            for t in (0.2, 0.8):
                q = a.lerp(b, t)
                self.slab('concrete', (q.x - (0.25 if along_x else r * 0.9), 0, q.z - (r * 0.9 if along_x else 0.25)),
                          (q.x + (0.25 if along_x else r * 0.9), y - r * 0.6, q.z + (r * 0.9 if along_x else 0.25)))
        self.foot(min(a.x, b.x) - r, min(a.z, b.z) - r, max(a.x, b.x) + r, max(a.z, b.z) + r, y + r)

    def exchanger_bank(self, x, z, n, r, length, along_x=True, stack=2):
        for i in range(n):
            for k in range(stack):
                off = i * (2 * r + 0.5)
                c = (x + (0 if along_x else off), r + 0.4 + k * (2 * r + 0.25), z + (off if along_x else 0))
                self.drum(c, r, length, along_x, 'jacket' if (i + k) % 2 else 'steel')
                # Channel head and flanged nozzles.
                hx = c[0] + (length / 2 + 0.15 if along_x else 0)
                hz = c[2] + (0 if along_x else length / 2 + 0.15)
                v, f = prim_cyl(r * 1.08, r * 1.08, 0.3, 14)
                M = Matrix.Translation((hx, c[1], hz)) @ (Matrix.Rotation(math.pi / 2, 4, 'Z') if along_x else Matrix.Rotation(math.pi / 2, 4, 'X'))
                self.P.add('steelDark', False, v, f, M)
                self.rod('stainless', (c[0], c[1] + r, c[2]), (c[0], c[1] + r + 0.5, c[2]), 0.1, 8)

    def pumps(self, x, z, n, spacing=1.2, along_x=True, yaw=0.0):
        """A row of pumps on plinths with motors and suction/discharge lines up to the rack."""
        for i in range(n):
            px = x + (i * spacing if along_x else 0)
            pz = z + (0 if along_x else i * spacing)
            self.slab('concrete', (px - 0.45, 0, pz - 0.3), (px + 0.45, 0.2, pz + 0.3))
            v, f = prim_cyl(0.16, 0.16, 0.5, 10)
            M = Matrix.Translation((px - 0.12, 0.42, pz)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
            self.P.add(self.rnd.choice(['pipeBlue', 'pipeGreen', 'steel']), False, v, f, M)
            self.cyl('steel', (px + 0.22, 0.22, pz), 0.18, 0.36, 12)
            self.rod('stainless', (px + 0.22, 0.58, pz), (px + 0.22, 1.6, pz), 0.07, 8)
            self.cyl('tankRed', (px + 0.22, 1.1, pz), 0.12, 0.04, 10)
            self.foot(px - 0.5, pz - 0.35, px + 0.5, pz + 0.35, 1.6, 0.1)

    def structure(self, x0, z0, x1, z1, levels, paint='galvanized', bays=2.4, brace=True, equipment=True):
        """An open steel frame with grating decks, X-bracing on the ends, yellow handrails and a stair."""
        nx = max(1, round((x1 - x0) / bays)); nz = max(1, round((z1 - z0) / bays))
        xs = [x0 + (x1 - x0) * i / nx for i in range(nx + 1)]
        zs = [z0 + (z1 - z0) * j / nz for j in range(nz + 1)]
        top = levels[-1]
        for X in xs:
            for Z in zs:
                self.box(paint, (X, top / 2, Z), (0.16, top, 0.16))
                self.slab('concrete', (X - 0.25, 0, Z - 0.25), (X + 0.25, 0.25, Z + 0.25))
        for y in levels:
            for X in xs: self.beam(paint, (X, y, z0), (X, y, z1), 0.12)
            for Z in zs: self.beam(paint, (x0, y, Z), (x1, y, Z), 0.12)
            self.deck(x0, z0, x1, z1, y + 0.1)
        if brace:
            prev = 0.0
            for y in levels:
                for Z in (z0, z1): self.beam(paint, (x0, prev, Z), (xs[1], y, Z), 0.07); self.beam(paint, (xs[1], prev, Z), (x0, y, Z), 0.07)
                for X in (x0, x1): self.beam(paint, (X, prev, z0), (X, y, zs[1]), 0.07)
                prev = y
        self.stairs(x1 + 0.9, (z0 + z1) / 2, 0, top + 0.1, (0, 1))
        self.foot(x0 - 0.3, z0 - 0.3, x1 + 1.8, z1 + 0.3, top + 0.6)

    def pipe_rack(self, a, b, width=2.4, tiers=(2.2, 3.0), bent=2.0, seed=1, fans=0, trays=True):
        """A pipe rack from `a` to `b` in xz: portal bents, tiers of pipe in jacket, steel and service colours, cable trays, fin-fans on top."""
        import random as _r
        R = _r.Random(seed)
        a, b = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
        d = b - a; L = d.length; u = d.normalized(); n = Vector((-u.z, 0, u.x))
        nb = max(1, round(L / bent))
        top = tiers[-1]
        for i in range(nb + 1):
            p = a + u * (L * i / nb)
            for s in (-1, 1):
                q = p + n * (s * width / 2)
                self.box('steelDark', (q.x, top / 2, q.z), (0.14, top, 0.14))
                self.slab('fireproof', (q.x - 0.14, 0, q.z - 0.14), (q.x + 0.14, min(1.4, tiers[0]), q.z + 0.14))
            for y in tiers: self.beam('steelDark', p + n * (-width / 2) + Vector((0, y, 0)), p + n * (width / 2) + Vector((0, y, 0)), 0.12)
            if i % 2 == 0: self.beam('steelDark', p + n * (-width / 2) + Vector((0, tiers[0], 0)), p + n * (-width / 2 + 0.6) + Vector((0, tiers[0] - 0.6, 0)), 0.06)
        for s in (-1, 1):
            for y in tiers: self.beam('steelDark', a + n * (s * width / 2) + Vector((0, y, 0)), b + n * (s * width / 2) + Vector((0, y, 0)), 0.1)
        palette_pipes = ['jacket', 'jacket', 'jacket', 'steel', 'stainless', 'pipeGreen', 'fireRed', 'pipeBlue', 'galvanized']
        for ti, y in enumerate(tiers):
            k = 0
            off = -width / 2 + 0.2
            while off < width / 2 - 0.15:
                r = R.choice([0.07, 0.09, 0.12, 0.16, 0.2]) if ti == 0 else R.choice([0.07, 0.1, 0.14])
                paint = R.choice(palette_pipes)
                c = off + r
                self.rod(paint, a + n * c + Vector((0, y + 0.06 + r, 0)), b + n * c + Vector((0, y + 0.06 + r, 0)), r, 10 if r > 0.1 else 6)
                off += 2 * r + R.uniform(0.05, 0.16)
                k += 1
        if trays:
            for s in (-1, 1):
                self.beam('galvanized', a + n * (s * (width / 2 - 0.35)) + Vector((0, top + 0.12, 0)), b + n * (s * (width / 2 - 0.35)) + Vector((0, top + 0.12, 0)), 0.08)
        if fans:
            self.fin_fans(a + u * (L * 0.5 - fans * 1.4), u, n, top, fans, width)
        self.foot(min(a.x, b.x) - width / 2 - 0.3, min(a.z, b.z) - width / 2 - 0.3, max(a.x, b.x) + width / 2 + 0.3, max(a.z, b.z) + width / 2 + 0.3, top + (2.2 if fans else 0.6))

    def fin_fans(self, start, u, n, y, count, width):
        """Air coolers on the rack: tube bundles under fan rings with grey plenums, a walkway alongside."""
        bay = 2.8
        for i in range(count):
            c = start + u * (bay * (i + 0.5))
            self.box('casing', (c.x, y + 0.9, c.z), (bay * abs(u.x) + width * abs(n.x) + 0.01, 0.5, bay * abs(u.z) + width * abs(n.z) + 0.01), 0, 0.05)
            self.box('steel', (c.x, y + 0.5, c.z), (bay * abs(u.x) + width * abs(n.x) - 0.1, 0.25, bay * abs(u.z) + width * abs(n.z) - 0.1))
            for s in (-0.5, 0.5):
                q = c + n * (s * width * 0.5)
                # Fan ring, the blades in shadow inside it, a hub and the guard bar across.
                self.cyl('galvanized', (q.x, y + 1.15, q.z), 0.85, 0.24, 20)
                self.cyl('steelDark', (q.x, y + 1.37, q.z), 0.74, 0.03, 20)
                for k in range(3):
                    a = k * 2.09 + 0.3
                    self.beam('steel', q + Vector((0, 1.41, 0)), q + Vector((math.cos(a) * 0.68, 1.41, math.sin(a) * 0.68)), 0.12)
                self.cyl('galvanized', (q.x, y + 1.4, q.z), 0.14, 0.06, 10)
                self.beam('galvanized', q + u * -0.8 + Vector((0, 1.48, 0)), q + u * 0.8 + Vector((0, 1.48, 0)), 0.05)
        self.handrail(start + n * (width / 2 + 0.3) + Vector((0, y + 1.15, 0)), start + u * (bay * count) + n * (width / 2 + 0.3) + Vector((0, y + 1.15, 0)))

    # ---- buildings ----
    def building(self, x0, z0, x1, z1, h, paint='corrugated', roof='flat', trim='casingShade', doors=1, windows=0, louvres=2, vents=2):
        self.slab('concrete', (x0 - 0.2, 0, z0 - 0.2), (x1 + 0.2, 0.15, z1 + 0.2))
        self.slab(paint, (x0, 0.15, z0), (x1, h, z1), 0.05)
        self.slab(trim, (x0 - 0.05, h - 0.15, z0 - 0.05), (x1 + 0.05, h, z1 + 0.05))
        if roof == 'gable':
            span_x = (x1 - x0) >= (z1 - z0)
            self.gable(paint, ((x0 + x1) / 2, h, (z0 + z1) / 2), (x1 - x0) if span_x else (z1 - z0), (z1 - z0) if span_x else (x1 - x0), 0.25 * min(x1 - x0, z1 - z0), 0 if span_x else math.pi / 2)
        else:
            self.slab(trim, (x0 + 0.1, h, z0 + 0.1), (x1 - 0.1, h + 0.06, z1 - 0.1))
            for i in range(vents):
                vx = x0 + (x1 - x0) * (i + 1) / (vents + 1)
                self.box('galvanized', (vx, h + 0.25, (z0 + z1) / 2), (0.5, 0.4, 0.5))
        # Doors and louvres on the +z face (toward the camera side), windows along +x.
        for i in range(doors):
            dx = x0 + (x1 - x0) * (i + 1) / (doors + 1)
            self.slab('rollDoor' if (x1 - x0) > 6 else 'casingShade', (dx - 0.6, 0.15, z1), (dx + 0.6, min(h - 0.4, 2.2), z1 + 0.04))
        for i in range(louvres):
            lx = x0 + (x1 - x0) * (i + 0.5) / max(1, louvres)
            self.slab('steelDark', (lx - 0.35, h * 0.6, z1), (lx + 0.35, h * 0.6 + 0.5, z1 + 0.03))
        for i in range(windows):
            wz = z0 + (z1 - z0) * (i + 0.5) / windows
            self.slab('window', (x1, h * 0.55, wz - 0.35), (x1 + 0.03, h * 0.55 + 0.45, wz + 0.35))
        self.foot(x0, z0, x1, z1, h + (0.25 * min(x1 - x0, z1 - z0) if roof == 'gable' else 0.5))

    def tank(self, x, z, r, h, paint='tube', roof='cone', bands=True, stair=True, bund=0.0):
        seg = max(20, min(36, round(12 + r * 4)))
        self.cyl('concrete', (x, 0, z), r + 0.25, 0.25, seg)
        self.cyl(paint, (x, 0.25, z), r, h, seg)
        if bands:
            for k in range(1, int(h / 1.3) + 1): self.cyl('jacketBand', (x, 0.25 + k * 1.3, z), r + 0.015, 0.05, seg)
        top = 0.25 + h
        if roof == 'cone': self.cyl(paint, (x, top, z), r, r * 0.18, seg, top=0.3)
        elif roof == 'dome': self.dome(paint, (x, top, z), r, r * 0.22, seg)
        else: self.cyl(paint, (x, top, z), r, 0.08, seg)
        if r > 2.5: self.platform_ring(x, z, top + 0.05, r - 0.9, 0.9, seg)
        if stair:
            # A stair winding a quarter-turn up the shell, as wide as a real one at this scale.
            sw = min(0.55, 0.06 * r + 0.15)
            steps = 14
            for i in range(steps):
                a0, a1 = 0.2 + i * 0.12, 0.2 + (i + 1) * 0.12
                y0, y1 = 0.25 + h * i / steps, 0.25 + h * (i + 1) / steps
                p = Vector((x + math.cos(a0) * (r + sw * 0.7), y0, z + math.sin(a0) * (r + sw * 0.7)))
                q = Vector((x + math.cos(a1) * (r + sw * 0.7), y1, z + math.sin(a1) * (r + sw * 0.7)))
                self.beam('galvanized', p, q, sw)
                self.rod('safetyYellow', p + Vector((math.cos(a0) * sw * 0.55, 0.45, math.sin(a0) * sw * 0.55)), q + Vector((math.cos(a1) * sw * 0.55, 0.45, math.sin(a1) * sw * 0.55)), 0.025, 4)
        if bund:
            for (ax, az, bx, bz) in ((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1)):
                self.slab('berm', (x + ax * bund, 0, z + az * bund), (x + bx * bund + (0.6 if ax == bx else 0), 0.8, z + bz * bund + (0.6 if az == bz else 0)), 0.15)
        self.foot(x - r - 0.6, z - r - 0.6, x + r + 0.6, z + r + 0.6, top + r * 0.22)
        return top

    def cooling_tower(self, x, z, cells, cell=3.0, h=3.2, along_x=True, plumes=True):
        """A multi-cell counterflow tower: louvred casing over a basin, fan decks with stacks, plumes."""
        L = cells * cell
        x1, z1 = (x + L, z + cell * 1.1) if along_x else (x + cell * 1.1, z + L)
        self.slab('concrete', (x - 0.3, 0, z - 0.3), (x1 + 0.3, 0.6, z1 + 0.3))
        self.slab('towerCasing', (x, 0.6, z), (x1, h, z1), 0.05)
        for k in range(int((h - 0.8) / 0.32)):
            y = 0.9 + k * 0.32
            if along_x: self.slab('steelDark', (x, y, z1), (x1, y + 0.1, z1 + 0.04))
            else: self.slab('steelDark', (x1, y, z), (x1 + 0.04, y + 0.1, z1))
        self.slab('galvanized', (x - 0.1, h, z - 0.1), (x1 + 0.1, h + 0.1, z1 + 0.1))
        self.handrail((x - 0.1, h + 0.1, z - 0.1), (x1 + 0.1, h + 0.1, z - 0.1))
        self.handrail((x - 0.1, h + 0.1, z1 + 0.1), (x1 + 0.1, h + 0.1, z1 + 0.1))
        for i in range(cells):
            cx = x + (i + 0.5) * cell if along_x else x + cell * 0.55
            cz = z + cell * 0.55 if along_x else z + (i + 0.5) * cell
            self.cyl('towerCasing', (cx, h + 0.1, cz), cell * 0.4, 1.1, 22, top=cell * 0.43)
            self.cyl('black', (cx, h + 1.15, cz), cell * 0.38, 0.05, 22)
            if plumes: steam_plume(self, (cx, h + 1.4, cz), 5 + i % 2, cell * 0.32)
        self.ladder(x - 0.05, z + 0.6, 0, h + 0.1, (-1, 0) if along_x else (0, -1))
        self.foot(x - 0.3, z - 0.3, x1 + 0.3, z1 + 0.3, h + 1.2 + (6 if plumes else 0))

    def stack(self, x, z, r, h, paint='stackTan', platforms=(0.88,), bands_red=False):
        self.cyl('concrete', (x, 0, z), r + 0.5, 0.4, 20)
        self.cyl(paint, (x, 0.4, z), r, h, 22, top=r * 0.92)
        for k in range(1, int(h / 1.6)):
            self.cyl('stackBand', (x, 0.4 + k * 1.6, z), r * (1 - 0.08 * k * 1.6 / h) + 0.015, 0.06, 22)
        if bands_red:
            for k in range(2): self.cyl('fireRed' if k == 0 else 'tube', (x, h - 1.6 + k * 0.8, z), r * 0.93 + 0.02, 0.8, 22)
        for fy in platforms: self.platform_ring(x, z, 0.4 + fy * h, r * 0.93, 0.7, 20)
        self.cyl('steelDark', (x, 0.4 + h - 0.15, z), r * 0.93 + 0.05, 0.25, 22)
        self.ladder(x + r * 0.93 + 0.02, z, 0.4, 0.4 + h, (1, 0))
        self.ball('beacon', (x, h + 0.7, z + r * 0.8), 0.12, 0, glow=True)
        self.foot(x - r - 0.6, z - r - 0.6, x + r + 0.6, z + r + 0.6, h + 0.4)

    def a_frame_warehouse(self, x0, z0, length, span, ridge, along_x=True):
        """The long urea warehouse: low side walls, a steep white roof, a ridge conveyor gallery, buttress frames and a blue stripe."""
        wall = ridge * 0.22
        if along_x:
            x1, z1 = x0 + length, z0 + span
            self.slab('concrete', (x0, 0, z0), (x1, wall, z1))
            self.slab('stripeBlue', (x0, wall - 0.2, z1), (x1, wall - 0.05, z1 + 0.03))
            self.gable('roofWhite', ((x0 + x1) / 2, wall, (z0 + z1) / 2), length, span, ridge - wall)
            self.slab('roofWhite', (x0 - 0.01, wall, z0 + span * 0.45), (x0, ridge * 0.9, z0 + span * 0.55))
            self.slab('corrugated', (x0, ridge - 0.1, (z0 + z1) / 2 - 0.4), (x1, ridge + 0.7, (z0 + z1) / 2 + 0.4), 0.05)
            for i in range(int(length / 4) + 1):
                bx = x0 + i * 4
                for zz in (z0 - 0.4, z1 + 0.4):
                    self.beam('steelDark', (bx, 0, zz), (bx, wall + 0.6, zz + (0.35 if zz > z0 else -0.35)), 0.16)
                self.slab('roofShade', (bx - 0.06, wall, z1 - 0.01), (bx + 0.06, wall + 0.04, z1 + 0.01))
            self.foot(x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, ridge + 0.7)
        else:
            raise NotImplementedError

    def gallery(self, a, b, w=0.9, h=0.8, paint='gallery'):
        """An enclosed conveyor gallery from `a` to `b` (xyz), on trestles every 6 units."""
        a, b = Vector(a), Vector(b)
        d = b - a
        v, f = prim_box(w, d.length, h)
        flat = Vector((d.x, 0, d.z)).normalized()
        rot = UP.rotation_difference(d.normalized()).to_matrix().to_4x4()
        self.P.add(paint, False, v, f, Matrix.Translation((a + b) / 2) @ rot)
        n = int(Vector((d.x, 0, d.z)).length / 6)
        for i in range(1, n + 1):
            p = a.lerp(b, i / (n + 1))
            if p.y - h / 2 < 0.5: continue
            for s in (-1, 1):
                side = Vector((-flat.z, 0, flat.x)) * (w / 2 * s)
                self.beam('steelDark', (p.x + side.x, 0, p.z + side.z), (p.x + side.x, p.y - h / 2, p.z + side.z), 0.1)
            self.beam('steelDark', (p.x - flat.z * w / 2, p.y * 0.5, p.z + flat.x * w / 2), (p.x + flat.z * w / 2, p.y * 0.5, p.z - flat.x * w / 2), 0.06)
            self.foot(p.x - 0.6, p.z - 0.6, p.x + 0.6, p.z + 0.6, p.y)

    def rail(self, a, b, tracks=1, gap=1.1):
        a, b = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
        d = b - a; u = d.normalized(); n = Vector((-u.z, 0, u.x)); L = d.length
        for t in range(tracks):
            o = n * (t * gap)
            p0, p1 = a + o, b + o
            self.slab('ballast', (min(p0.x, p1.x) - 0.6 * abs(n.x) - 0.01, 0, min(p0.z, p1.z) - 0.6 * abs(n.z) - 0.01), (max(p0.x, p1.x) + 0.6 * abs(n.x) + 0.01, 0.07, max(p0.z, p1.z) + 0.6 * abs(n.z) + 0.01))
            for k in range(int(L / 0.45)):
                q = p0 + u * (k * 0.45)
                self.box('timber', (q.x, 0.09, q.z), (0.12 * abs(u.x) + 1.0 * abs(n.x), 0.05, 0.12 * abs(u.z) + 1.0 * abs(n.z)))
            for s in (-0.3, 0.3):
                self.beam('steelDark', p0 + n * s + Vector((0, 0.14, 0)), p1 + n * s + Vector((0, 0.14, 0)), 0.05)

    def railcars(self, a, u, count, kind_cycle=('hopper',), gap=0.15, track_offset=Vector((0, 0, 0))):
        a = Vector((a[0], 0, a[1])) + track_offset
        u = Vector((u[0], 0, u[1])).normalized()
        n = Vector((-u.z, 0, u.x))
        pos = 0.0
        for i in range(count):
            kind = kind_cycle[i % len(kind_cycle)]
            L = 2.4 if kind != 'loco' else 3.0
            c = a + u * (pos + L / 2)
            yaw = math.atan2(-u.z, u.x)
            for t in (-0.32, 0.32): self.box('black', (c.x + u.x * L * t, 0.3, c.z + u.z * L * t), (0.5, 0.25, 0.9), yaw)
            if kind == 'hopper':
                self.box(self.rnd.choice(['hopper', 'hopperTan', 'hopperRust', 'hopper']), (c.x, 0.95, c.z), (L, 1.1, 0.95), yaw, 0.06)
                for t in (-0.25, 0.0, 0.25): self.box('hopperDark', (c.x + u.x * L * t, 0.95, c.z + u.z * L * t), (0.06, 1.0, 0.97), yaw)
            elif kind == 'tank':
                self.rod('railCar', c - u * (L / 2 - 0.15) + Vector((0, 0.95, 0)), c + u * (L / 2 - 0.15) + Vector((0, 0.95, 0)), 0.45, 14)
                self.cyl('railCar', (c.x, 1.35, c.z), 0.15, 0.15, 8)
            else:
                self.box('locoRed', (c.x, 0.9, c.z), (L, 1.0, 0.95), yaw, 0.06)
                self.box('locoRed', (c.x + u.x * L * 0.3, 1.5, c.z + u.z * L * 0.3), (0.8, 0.5, 0.9), yaw, 0.04)
                self.box('window', (c.x + u.x * L * 0.3, 1.55, c.z + u.z * L * 0.3), (0.82, 0.22, 0.92), yaw)
                self.box('safetyYellow', (c.x, 0.55, c.z), (L, 0.08, 0.97), yaw)
            pos += L + gap

    def pond(self, x0, z0, x1, z1, paint='water', liner=False, berm=0.7):
        self.slab('berm', (x0 - berm, 0, z0 - berm), (x1 + berm, 0.18, z1 + berm), 0.1)
        self.slab('liner' if liner else 'pondEdge', (x0, 0.18, z0), (x1, 0.2, z1))
        self.slab(paint, (x0 + 0.3, 0.2, z0 + 0.3), (x1 - 0.3, 0.22, z1 - 0.3))
        if liner:
            for k in range(1, int((x1 - x0) / 2.5)): self.slab('linerSeam', (x0 + k * 2.5, 0.221, z0 + 0.3), (x0 + k * 2.5 + 0.05, 0.225, z1 - 0.3))

    def sprung_dome(self, x, z, length, r, yaw=0.0, paint='tube'):
        v, f = prim_cyl(r, r, length, 16, False, -math.pi / 2, math.pi)
        self.P.add(paint, False, v, f, T(x, 0, z, yaw) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
        for k in range(1, int(length / 1.2)):
            v, f = prim_cyl(r + 0.02, r + 0.02, 0.06, 16, True, -math.pi / 2, math.pi)
            self.P.add('tubeShade', False, v, f, T(x, 0, z, yaw) @ Matrix.Translation((-length / 2 + k * 1.2, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
        c, s = math.cos(yaw), math.sin(yaw)
        hx, hz = abs(c) * length / 2 + abs(s) * r, abs(s) * length / 2 + abs(c) * r
        self.foot(x - hx, z - hz, x + hx, z + hz, r)

    def light_pole(self, x, z, h=4.0):
        self.rod('galvanized', (x, 0, z), (x, h, z), 0.06, 6)
        self.box('steelDark', (x, h + 0.05, z), (0.6, 0.1, 0.25))
        self.box('lamp', (x, h - 0.03, z), (0.5, 0.05, 0.2), 0, 0, True)
        self.foot(x - 0.2, z - 0.2, x + 0.2, z + 0.2, h)

    def fence(self, pts, h=0.9):
        for a, b in zip(pts, pts[1:]):
            a3, b3 = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
            n = max(1, round((b3 - a3).length / 2.5))
            for i in range(n + 1):
                p = a3.lerp(b3, i / n)
                self.rod('galvanized', p, p + Vector((0, h, 0)), 0.035, 4)
            for y in (h, h * 0.5): self.rod('galvanized', a3 + Vector((0, y, 0)), b3 + Vector((0, y, 0)), 0.02, 4)

    def windsock(self, x, y, z):
        self.rod('galvanized', (x, y, z), (x, y + 1.4, z), 0.04, 6)
        v, f = prim_cyl(0.06, 0.16, 0.8, 8)
        self.P.add('windsock', False, v, f, Matrix.Translation((x + 0.42, y + 1.35, z)) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))

def steam_plume(kit, c, puffs, size):
    """A rising plume: small puffs that widen, thin out and drift downwind as they climb."""
    x, y, z = c
    for i in range(puffs):
        s = size * (0.55 + i * 0.16)
        for k in range(2 if i > 1 else 1):
            jx, jz = kit.rnd.uniform(-0.3, 0.3) * s, kit.rnd.uniform(-0.3, 0.3) * s
            kit.ball('steam', (x - i * 0.45 * size + jx, y + i * size * 0.6, z - i * 0.25 * size + jz), s * (0.8 if k else 1), 1, (1, 0.75, 1))

def kellogg_reformer(K, ox, oz, yaw, s, opening=None, empty_slot=False, secondary=True):
    """A Kellogg top-fired primary reformer at `s` units per metre, after the Carseland photos:
    a rust-panelled radiant box on concrete piers with a stiffener grid, two walkway levels and tunnel
    burners along the foot of the end wall; a corrugated gable penthouse with a red lifting frame and
    windsock; light-grey insulated convection modules with a rusty transition duct and a yellow caged
    ladder; the stack with its platform ring; the F.D. fan house; and the red steel structure beside it.
    The frame's u runs along the box, v toward the front wall. `opening` (u0, u1) leaves the penthouse
    roof off over the harps being changed, and `empty_slot` leaves the top module of the second column out,
    for a crane to set. `secondary` adds the red structure with the secondary reformer. Returns points other
    parts attach to."""
    c, sn = math.cos(yaw), math.sin(yaw)
    def W(u, y, v):
        return (ox + u * s * c + v * s * sn, y * s, oz - u * s * sn + v * s * c)
    def slab(paint, a, b, bevel=0.0):
        # A box in the frame: centre and size from frame corners.
        cu, cy, cv = [(a[i] + b[i]) / 2 for i in range(3)]
        x, y, z = W(cu, cy, cv)
        K.box(paint, (x, y, z), (abs(b[0] - a[0]) * s, abs(b[1] - a[1]) * s, abs(b[2] - a[2]) * s), yaw, bevel)
    def rod(paint, a, b, r, seg=8): K.rod(paint, W(*a), W(*b), r * s, seg)
    def rail(a, b): K.handrail(W(*a), W(*b), 1.1 * s)

    L, D, H0, H1 = 38.0, 20.0, 3.0, 16.0
    # Piers and the floor frame.
    for u in range(0, int(L) + 1, 4):
        for v in (1, D / 2, D - 1): slab('concrete', (u - 0.6, 0, v - 0.6), (u + 0.6, H0, v + 0.6))
    slab('steelDark', (0, H0 - 0.4, 0), (L, H0, D))
    # Radiant casing with its stiffener grid.
    slab('radiantRust', (0, H0, 0), (L, H1, D))
    for face_v, out in ((D, 1), (0, -1)):
        for u in range(0, int(L) + 1, 3): slab('rustDark', (u - 0.18, H0, face_v), (u + 0.18, H1, face_v + out * 0.35))
        for y in (6.5, 10.0, 13.5): slab('rustDark', (0, y - 0.18, face_v), (L, y + 0.18, face_v + out * 0.35))
        for y in (6.5, 11.5):
            slab('galvanized', (-1.2, y - 0.15, face_v + out * 0.35), (L + 1.2, y, face_v + out * 1.6))
            ends = [Vector(W(-1.2, y, face_v + out * 0.35)), Vector(W(L + 1.2, y, face_v + out * 1.6))]
            K.site.decks.append((Vector((min(e.x for e in ends), ends[0].y - 0.05, min(e.z for e in ends))), Vector((max(e.x for e in ends), ends[0].y, max(e.z for e in ends)))))
            rail((-1.2, y, face_v + out * 1.6), (L + 1.2, y, face_v + out * 1.6))
    for u_face, out in ((0, -1), (L, 1)):
        for v in range(0, int(D) + 1, 3): slab('rustDark', (u_face, H0, v - 0.18), (u_face + out * 0.35, H1, v + 0.18))
    # Tunnel burners along the foot of the burner end wall (u = 0), each with its fuel line.
    for v in range(2, int(D) - 1, 2):
        slab('rustLight', (-1.6, H0, v - 0.6), (0, H0 + 2.6, v + 0.6))
        rod('stainless', (-1.0, H0 + 2.6, v + 0.8), (-1.0, H0 + 4.2, v + 0.8), 0.1, 6)
    rod('stainless', (-1.0, H0 + 4.2, 1), (-1.0, H0 + 4.2, D - 1), 0.22, 8)
    # Penthouse over the roof: corrugated walls under a gable, with the inlet header and pigtails along the eave.
    P0, P1 = 1.0, D - 1.0
    gaps = [(0, L)] if not opening else [(0, opening[0]), (opening[1], L)]
    for a, b in gaps:
        if b - a < 0.5: continue
        slab('corrugated', (a, H1, P0), (b, H1 + 5, P1), 0.05)
        x, y, z = W((a + b) / 2, H1 + 5, (P0 + P1) / 2)
        K.gable('corrugated', (x, y, z), (b - a) * s, (P1 - P0) * s, 3.0 * s, yaw)
    if opening:
        # Harp tops showing in the opening: rows of tube ends and their inlet pigtails.
        for v in range(3, int(D) - 2, 3):
            for k in range(int((opening[1] - opening[0]) / 1.2)):
                u = opening[0] + 0.6 + k * 1.2
                rod('tube', (u, H1 - 0.5, v), (u, H1 + 1.4, v), 0.16, 6)
    rod('stainless', (0, H1 + 0.6, D + 0.4), (L, H1 + 0.6, D + 0.4), 0.35, 10)
    for u in range(1, int(L), 2): rod('stainless', (u, H1 + 0.6, D + 0.4), (u, H1 + 0.1, D - 0.6), 0.08, 5)
    # The red lifting frame and windsock on the roof.
    fu = L * 0.72
    for du in (-2.5, 2.5):
        for dv in (-2.5, 2.5): rod('redSteel', (fu + du, H1 + 8, D / 2 + dv), (fu + du, H1 + 14, D / 2 + dv), 0.25, 6)
    for dv in (-2.5, 2.5): rod('redSteel', (fu - 3, H1 + 14, D / 2 + dv), (fu + 3, H1 + 14, D / 2 + dv), 0.3, 6)
    slab('galvanized', (fu - 4, H1 + 8, D / 2 - 4), (fu + 4, H1 + 8.3, D / 2 + 4))
    x, y, z = W(fu + 3, H1 + 14, D / 2)
    K.windsock(x, y, z)
    # Outlet manifolds under the box between the piers.
    for v in (4, D / 2, D - 4): rod('stainless', (0.5, 1.6, v), (L - 0.5, 1.6, v), 0.45, 10)

    # Convection section beside the radiant box at the far end: tiers of insulated coil modules on a steel base,
    # a rusty transition duct across the top, a caged ladder and a platform.
    C0, C1, CD0, CD1 = L + 3, L + 16, 3.0, D - 3.0
    slab('steelDark', (C0, 0, CD0), (C1, 3.5, CD1))
    for u in (C0 + 1, C1 - 1):
        for v in (CD0 + 1, CD1 - 1): slab('concrete', (u - 0.6, 0, v - 0.6), (u + 0.6, 1.2, v + 0.6))
    slab('radiantRust', (C0, 3.5, CD0), (C1, 7.0, CD1))
    modules, slot = [], None
    for col in range(2):
        for tier in range(3):
            mu0 = C0 + col * 6.5 + 0.2
            y0 = 7.0 + tier * 4.0
            if empty_slot and col == 1 and tier == 2:
                slot = (mu0, y0)
                continue
            slab('casing', (mu0, y0, CD0 + 0.3), (mu0 + 6.1, y0 + 3.9, CD1 - 0.3), 0.06)
            # Bolted access panels and the rusty bottom rail each module sits on.
            for k in range(1, 3):
                slab('casingShade', (mu0 + k * 2.03 - 0.08, y0, CD1 - 0.3), (mu0 + k * 2.03 + 0.08, y0 + 3.9, CD1 - 0.2))
                slab('casingShade', (mu0 + k * 2.03 - 0.08, y0, CD0 + 0.2), (mu0 + k * 2.03 + 0.08, y0 + 3.9, CD0 + 0.3))
            slab('rustDark', (mu0, y0, CD0 + 0.2), (mu0 + 6.1, y0 + 0.4, CD1 - 0.2))
            modules.append(W(mu0 + 3.05, y0 + 3.9, (CD0 + CD1) / 2))
    slab('radiantRust', (L - 1, 19.0, CD0 + 2), (C0 + 8, 23.0, CD1 - 2))
    slab('rustDark', (L - 1, 23.0, CD0 + 2), (C0 + 8, 23.4, CD1 - 2))
    for y in range(4, 22, 2): slab('safetyYellow', (C0 - 1.2, y, CD1 - 1.6), (C0 - 0.3, y + 0.12, CD1 - 0.5))
    slab('safetyYellow', (C0 - 0.4, 0, CD1 - 1.6), (C0 - 0.3, 23, CD1 - 1.5))
    slab('galvanized', (C0, 19, CD1 - 3), (C0 + 6.5, 19.3, CD1 - 0.3))
    rail((C0, 19.3, CD1 - 0.3), (C0 + 6.5, 19.3, CD1 - 0.3))
    rod('stainless', (C0 + 6.4, 1, CD1 + 0.6), (C0 + 6.4, 19, CD1 + 0.6), 0.55, 12)
    # The stack beyond the convection section, and the F.D. fan house at grade in front of it.
    sx, sy, sz = W(C1 + 5, 0, D / 2)
    K.stack(sx, sz, 2.0 * s * 1.0, 50 * s, platforms=(0.86,))
    slab('radiantRust', (C1, 3.5, D / 2 - 2.5), (C1 + 3.5, 9, D / 2 + 2.5))
    slab('corrugated', (C1 - 1, 0, D + 1), (C1 + 7, 5.5, D + 7), 0.05)
    slab('casingShade', (C1 + 1, 0, D + 7), (C1 + 3, 3.2, D + 7.1))
    if secondary:
        # The red steel structure beside the burner end: secondary reformer in a braced frame, the transfer line across.
        R0, R1 = -16.0, -5.0
        for u in (R0, R1):
            for v in (2, 12): rod('redSteel', (u, 0, v), (u, 36, v), 0.35, 6)
        for y in range(6, 37, 6):
            for v in (2, 12): rod('redSteel', (R0, y, v), (R1, y, v), 0.3, 6)
            for u in (R0, R1): rod('redSteel', (u, y, 2), (u, y, 12), 0.3, 6)
            slab('galvanized', (R0, y - 0.15, 2), (R1, y, 12))
            if y > 6:
                rod('redSteel', (R0, y - 6, 2), (R1, y, 2), 0.2, 4)
                rod('redSteel', (R0, y - 6, 12), (R1, y, 12), 0.2, 4)
        x, y, z = W((R0 + R1) / 2, 0, 7)
        K.vessel(x, z, 2.2 * s, 18 * s, paint='stackTan', ladder=False, bands=True, nozzles=2)
        rod('stainless', (R1, 21, 7), (0, 21, 7), 0.6, 12)
        rod('stainless', (0, 21, 7), (2, 17, 7), 0.6, 12)
    # Footprints for dressing: box, convection, fan house, red structure.
    prints = [((-2, -2), (L + 2, D + 2), H1 + 14), ((C0 - 2, CD0), (C1 + 8, D + 8), 23)]
    if secondary: prints.append(((-17, 1), (-4, 13), 36))
    for a, b, top in prints:
        pts = [W(a[0], 0, a[1]), W(b[0], 0, a[1]), W(a[0], 0, b[1]), W(b[0], 0, b[1])]
        K.foot(min(p[0] for p in pts), min(p[2] for p in pts), max(p[0] for p in pts), max(p[2] for p in pts), top * s)
    def module(paint_u, y0, lift):
        """A module in the frame at (u, y), raised `lift` metres, for the crane's load."""
        slab('casing', (paint_u, y0 + lift, CD0 + 0.3), (paint_u + 6.1, y0 + lift + 3.9, CD1 - 0.3), 0.06)
        slab('rustDark', (paint_u, y0 + lift, CD0 + 0.3), (paint_u + 6.1, y0 + lift + 0.4, CD1 - 0.2))
        return [W(paint_u + du, y0 + lift + 3.9, CD0 + dv) for du in (0.3, 5.8) for dv in (0.6, CD1 - CD0 - 0.6)]
    return {'modules': modules, 'slot': slot, 'module': module, 'opening_center': W(((opening or (0, 0))[0] + (opening or (0, 0))[1]) / 2, H1, D / 2), 'roof': H1 * s, 'W': W}

def crawler_crane(K, x, z, tip, hook_y, s=1.0, paint='safetyYellow'):
    """A lattice-boom crawler crane: tracks with pads, the carbody, upperworks with cab and counterweight,
    a gantry with pendant lines to the boom tip, a four-chord laced boom, and the hook block on its falls."""
    tip = Vector(tip)
    yaw = math.atan2(-(tip.z - z), tip.x - x)
    c, sn = math.cos(yaw), math.sin(yaw)
    def at(f, y, side):
        return Vector((x + f * c + side * sn, y, z - f * sn + side * c))
    # Tracks and pads.
    for side in (-1.7 * s, 1.7 * s):
        a, b = at(-2.8 * s, 0.5 * s, side), at(2.8 * s, 0.5 * s, side)
        K.box('steelDark', ((a.x + b.x) / 2, 0.5 * s, (a.z + b.z) / 2), (5.8 * s, 1.0 * s, 0.9 * s), yaw, 0.1 * s)
        for k in range(14):
            p = a.lerp(b, k / 13)
            K.box('black', (p.x, 0.06 * s, p.z), (0.3 * s, 0.12 * s, 0.95 * s), yaw)
    K.box('steelDark', (x, 1.15 * s, z), (2.6 * s, 0.5 * s, 2.6 * s), yaw, 0.08 * s)
    K.cyl('steel', (x, 1.4 * s, z), 1.2 * s, 0.25 * s, 18)
    # Upperworks, cab, engine house, counterweight slabs.
    up = at(-0.6 * s, 2.4 * s, 0)
    K.box(paint, (up.x, up.y, up.z), (4.0 * s, 1.8 * s, 2.6 * s), yaw, 0.1 * s)
    cab = at(1.6 * s, 2.5 * s, 1.5 * s)
    K.box(paint, (cab.x, cab.y, cab.z), (1.3 * s, 1.7 * s, 1.0 * s), yaw, 0.08 * s)
    win = at(2.27 * s, 2.7 * s, 1.5 * s)
    K.box('window', (win.x, win.y, win.z), (0.05 * s, 0.8 * s, 0.85 * s), yaw)
    for k in range(4):
        cw = at(-3.1 * s, 1.75 * s + k * 0.45 * s, 0)
        K.box('steelDark' if k % 2 else 'black', (cw.x, cw.y, cw.z), (1.2 * s, 0.42 * s, 2.7 * s), yaw, 0.04 * s)
    K.box('steelDark', (up.x, up.y + 1.0 * s, up.z), (2.0 * s, 0.25 * s, 1.6 * s), yaw)
    # Gantry and pendants.
    g_top = at(-2.0 * s, 7.0 * s, 0)
    for side in (-0.9 * s, 0.9 * s):
        K.beam(paint, at(-1.0 * s, 3.3 * s, side), g_top, 0.18 * s)
        K.beam(paint, at(-3.0 * s, 3.3 * s, side), g_top, 0.14 * s)
    K.rod('black', g_top, tip, 0.04 * s, 4)
    # Boom: four chords tapering from foot to tip, laced in a zig-zag on every face.
    foot = at(1.4 * s, 3.0 * s, 0)
    d = (tip - foot)
    L = d.length
    u = d.normalized()
    side = Vector((sn, 0, c))
    upv = u.cross(side).normalized()
    def chord(i, t):
        w = (1 - 0.55 * t) * 0.75 * s
        sx = (-1 if i in (0, 3) else 1) * w
        sy = (-1 if i < 2 else 1) * w
        return foot + d * t + side * sx + upv * sy
    for i in range(4): K.beam(paint, chord(i, 0), chord(i, 1), 0.16 * s)
    bays = max(8, int(L / (1.6 * s)))
    for k in range(bays):
        t0, t1 = k / bays, (k + 1) / bays
        for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
            K.beam(paint, chord(a, t0), chord(b, t1), 0.07 * s)
    K.box(paint, (tip.x, tip.y, tip.z), (1.0 * s, 1.0 * s, 1.0 * s), yaw, 0.08 * s)
    for k in (-0.3, 0.3): K.rod('steelDark', tip + side * (k * s), tip + side * (k * s) + upv * 0.0, 0.5 * s, 12)
    # Hook block on its falls.
    hb = Vector((tip.x, hook_y + 0.6 * s, tip.z))
    for k in (-0.15, 0.15): K.rod('black', tip + side * (k * s), hb + side * (k * s), 0.03 * s, 4)
    K.box(paint, (hb.x, hb.y, hb.z), (0.7 * s, 1.1 * s, 0.5 * s), yaw, 0.08 * s)
    K.rod('steelDark', hb, hb - Vector((0, 0.9 * s, 0)), 0.08 * s, 6)
    K.foot(x - 3.5 * s, z - 3.5 * s, x + 3.5 * s, z + 3.5 * s, 8 * s)
    return hb - Vector((0, 0.9 * s, 0))

def slings(K, hook, points, paint='black'):
    for p in points: K.rod(paint, hook, p, 0.035, 4)
