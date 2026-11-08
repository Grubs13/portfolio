import { type BufferGeometry, CylinderGeometry, Euler, Group, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, type Vec } from './kit';
import type { PaletteMaterial } from './palette';

const UP = new Vector3(0, 1, 0);

/**
 * Collects transformed primitives and merges them per material, so a whole
 * diorama costs one draw call per material however many parts it has.
 */
export class MergedModel {
  private readonly parts = new Map<PaletteMaterial, BufferGeometry[]>();

  add(material: PaletteMaterial, geometry: BufferGeometry, matrix: Matrix4): this {
    const list = this.parts.get(material) ?? [];
    this.parts.set(material, list);
    list.push(geometry.clone().applyMatrix4(matrix));
    return this;
  }

  box(material: PaletteMaterial, [x, y, z]: Vec, [sx, sy, sz]: Vec, yaw = 0): this {
    const matrix = new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(0, yaw, 0)),
      new Vector3(sx, sy, sz),
    );
    return this.add(material, box, matrix);
  }

  /** A vertical cylinder centered at `center`. */
  cylinder(material: PaletteMaterial, [x, y, z]: Vec, radius: number, height: number, segments = 8): this {
    return this.add(material, new CylinderGeometry(radius, radius, height, segments), new Matrix4().makeTranslation(x, y, z));
  }

  /** A square-section bar from `from` to `to`. */
  beam(material: PaletteMaterial, from: Vec, to: Vec, width: number): this {
    const a = new Vector3(...from);
    const dir = new Vector3(...to).sub(a);
    const matrix = new Matrix4().compose(
      a.addScaledVector(dir, 0.5),
      new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      new Vector3(width, dir.length(), width),
    );
    return this.add(material, box, matrix);
  }

  build(): Group {
    const g = new Group();
    for (const [material, geometries] of this.parts) {
      const merged = mergeGeometries(geometries);
      if (!merged) throw new Error('Island parts have mismatched attributes');
      g.add(new Mesh(merged, material));
    }
    return g;
  }
}
