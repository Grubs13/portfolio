import { type BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
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
  private readonly lit: BufferGeometry[] = [];
  private readonly glowing: BufferGeometry[] = [];

  add(paint: Paint, geometry: BufferGeometry, matrix: Matrix4): this {
    // The shader derives facet normals from screen-space derivatives, so only positions and colors are kept.
    const part = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrix);
    part.deleteAttribute('normal');
    part.deleteAttribute('uv');
    const { r, g, b } = new Color(paint.color);
    const count = part.getAttribute('position').count;
    part.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count * 3 }, (_, i) => [r, g, b][i % 3]!), 3));
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

  /** A vertical cylinder centered at `center`. */
  cylinder(paint: Paint, [x, y, z]: Vec, radius: number, height: number, segments = 8): this {
    return this.add(paint, new CylinderGeometry(radius, radius, height, segments), new Matrix4().makeTranslation(x, y, z));
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
