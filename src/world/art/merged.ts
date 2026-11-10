import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, type Vec } from './kit';
import { glowMaterial, litMaterial } from './materials';
import type { Paint } from './palette';

const UP = new Vector3(0, 1, 0);

/**
 * Collects transformed primitives with their paint baked into vertex colors,
 * so a whole model costs one draw call for lit parts and one for glowing parts.
 */
export class MergedModel {
  private lit: BufferGeometry[] = [];
  private glowing: BufferGeometry[] = [];
  private base = new Matrix4();

  /** A view that adds into this same model with every part placed by `transform` first, for laying out a group in its own frame. */
  within(transform: Matrix4): MergedModel {
    const view = new MergedModel();
    view.lit = this.lit;
    view.glowing = this.glowing;
    view.base = this.base.clone().multiply(transform);
    return view;
  }

  add(paint: Paint, geometry: BufferGeometry, matrix: Matrix4): this {
    // The shader derives facet normals from screen-space derivatives, so only positions and colors are kept.
    const part = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(
      new Matrix4().multiplyMatrices(this.base, matrix),
    );
    part.deleteAttribute('normal');
    part.deleteAttribute('uv');
    const { r, g, b } = new Color(paint.color);
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([r, g, b], i);
    part.setAttribute('color', new Float32BufferAttribute(colors, 3));
    (paint.glow ? this.glowing : this.lit).push(part);
    return this;
  }

  box(paint: Paint, [x, y, z]: Vec, [sx, sy, sz]: Vec, yaw = 0): this {
    const matrix = new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(0, yaw, 0)),
      new Vector3(sx, sy, sz),
    );
    return this.add(paint, box, matrix);
  }

  /** A box from corner to corner, which reads more naturally for buildings than centre and size. */
  slab(paint: Paint, [x0, y0, z0]: Vec, [x1, y1, z1]: Vec): this {
    return this.box(paint, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)]);
  }

  /** A vertical cylinder centered at `center`. */
  cylinder(paint: Paint, [x, y, z]: Vec, radius: number, height: number, segments = 8): this {
    return this.add(paint, new CylinderGeometry(radius, radius, height, segments), new Matrix4().makeTranslation(x, y, z));
  }

  /** A vertical cone section centered at `center`, for vessel heads, tank roofs and hoppers. */
  frustum(paint: Paint, [x, y, z]: Vec, top: number, bottom: number, height: number, segments = 8): this {
    return this.add(paint, new CylinderGeometry(top, bottom, height, segments), new Matrix4().makeTranslation(x, y, z));
  }

  /** A round pipe from `from` to `to`. */
  tube(paint: Paint, from: Vec, to: Vec, radius: number, segments = 6): this {
    const a = new Vector3(...from);
    const dir = new Vector3(...to).sub(a);
    const length = dir.length();
    const matrix = new Matrix4().compose(
      a.addScaledVector(dir, 0.5),
      new Quaternion().setFromUnitVectors(UP, dir.normalize()),
      new Vector3(1, 1, 1),
    );
    return this.add(paint, new CylinderGeometry(radius, radius, length, segments), matrix);
  }

  /** A round limb from `from` to `to` that tapers from radius `r0` to `r1`, for arms, legs and necks. */
  limb(paint: Paint, from: Vec, to: Vec, r0: number, r1: number, segments = 8): this {
    const a = new Vector3(...from);
    const dir = new Vector3(...to).sub(a);
    const length = dir.length();
    const matrix = new Matrix4().compose(
      a.addScaledVector(dir, 0.5),
      new Quaternion().setFromUnitVectors(UP, dir.normalize()),
      new Vector3(1, 1, 1),
    );
    // A cylinder's top sits at +y, which the rotation carries to `to`.
    return this.add(paint, new CylinderGeometry(r1, r0, length, segments), matrix);
  }

  /** An ellipsoid with the given radii along x, y and z, for heads, joints, hands and muscle. */
  ellipsoid(paint: Paint, [x, y, z]: Vec, [rx, ry, rz]: Vec, segments = 8): this {
    const matrix = new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(rx, ry, rz));
    return this.add(paint, new SphereGeometry(1, segments, Math.max(3, Math.round((segments * 3) / 4))), matrix);
  }

  /** A flat strip from `from` to `to`, `width` across x and `depth` thick along z, for straps and reflective tape. */
  strip(paint: Paint, from: Vec, to: Vec, width: number, depth: number): this {
    const a = new Vector3(...from);
    const dir = new Vector3(...to).sub(a);
    const matrix = new Matrix4().compose(
      a.addScaledVector(dir, 0.5),
      new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      new Vector3(width, dir.length(), depth),
    );
    return this.add(paint, box, matrix);
  }

  /** A square-section bar from `from` to `to`. */
  beam(paint: Paint, from: Vec, to: Vec, width: number): this {
    const a = new Vector3(...from);
    const dir = new Vector3(...to).sub(a);
    const matrix = new Matrix4().compose(
      a.addScaledVector(dir, 0.5),
      new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      new Vector3(width, dir.length(), width),
    );
    return this.add(paint, box, matrix);
  }

  build(): Group {
    const g = new Group();
    for (const [parts, material] of [[this.lit, litMaterial], [this.glowing, glowMaterial]] as const) {
      if (parts.length === 0) continue;
      const merged = mergeGeometries(parts);
      if (!merged) throw new Error('Model parts have mismatched attributes');
      g.add(new Mesh(merged, material));
    }
    return g;
  }
}
