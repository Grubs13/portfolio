import { BufferGeometry, Color, Float32BufferAttribute, Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { Scene } from '../../content/scenes';
import { type Cast, type Stage, type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';

/**
 * A scene's stage modelled in Blender and exported as a GLB, standing on the
 * shared rock slab. Give each part a flat base color, not a texture: the color
 * becomes the part's paint, and an emissive material becomes a glowing paint.
 */
export interface SceneModel {
  url: string;
  /** Where the camera aims at rest, relative to the anchor. */
  look: Vec;
  /** How the character is posed and turned at the anchor, when the scene is built around it. */
  cast?: Cast;
  /** World units that must fit across the free part of the screen, when the scene wants a closer or wider shot. */
  frame?: number;
}

/** Scenes whose stage comes from a GLB in `public/`, keyed by scene id. They replace the code art in `SCENE_ART`. */
export const SCENE_MODELS: Readonly<Partial<Record<string, SceneModel>>> = {
  'ammonia-operations-engineer': { url: '/models/carseland.glb', look: [-5, 6, -8] },
  'reformer-reharp': { url: '/models/reformer-reharp.glb', look: [-4, 6.5, -10] },
  // Calen kneels at the open flange face in front of him, seen from behind at three-quarters.
  'reliability-engineer': { url: '/models/reliability.glb', look: [-0.9, 1.4, 0.25], cast: { pose: 'inspect', yaw: -1.3 }, frame: 11 },
};

/** The pixel texture of the palette paint a Blender material is named after, as `paint_<name>`. */
function surfaceOf(name = ''): Pick<Paint, 'surface'> {
  const paint = (palette as Record<string, Paint>)[name.replace(/^paint_/, '').replace(/_glow$/, '')];
  return paint?.surface ? { surface: paint.surface } : {};
}

/**
 * Positions only, as floats. Packed models store them as quantized integers,
 * which would round to whole units once the node's transform is applied.
 */
function floatPositions(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.getAttribute('position');
  const positions = new Float32Array(source.count * 3);
  for (let i = 0; i < source.count; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = source.getComponent(i, k);
  const floats = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (geometry.index) floats.setIndex(geometry.index);
  return floats;
}

/** Merges a loaded glTF scene into one mesh per material, so it shades and costs the same as the code-built stages. */
export function stageFromGltf(root: Object3D, { look, cast, frame }: Pick<SceneModel, 'look' | 'cast' | 'frame'>): Stage {
  const model = stageGround(new MergedModel());
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const material = (Array.isArray(child.material) ? child.material[0] : child.material) as MeshStandardMaterial | undefined;
    // glTF colors are linear and this world works in display space throughout.
    const color = new Color().copy(material?.color ?? new Color(1, 1, 1)).convertLinearToSRGB().getHex();
    const glow = (material?.emissive?.getHex() ?? 0) !== 0;
    model.add({ color, ...(glow ? { glow } : {}), ...surfaceOf(material?.name) }, floatPositions(child.geometry), child.matrixWorld);
  });
  return { object: model.build(), look, ...(cast ? { cast } : {}), ...(frame ? { frame } : {}) };
}

/** A loader for scene models, which Blender exports with meshopt compression. */
export async function sceneLoader() {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

export async function loadSceneStage(model: SceneModel): Promise<StageBuilder> {
  const gltf = await (await sceneLoader()).loadAsync(model.url);
  return () => stageFromGltf(gltf.scene, model);
}

/** Loads every scene's GLB at once. A model that fails to load is left out, so that scene keeps its code art. */
export async function loadSceneStages(scenes: readonly Scene[]): Promise<Partial<Record<string, StageBuilder>>> {
  const entries = await Promise.all(
    scenes.flatMap((scene) => {
      const model = SCENE_MODELS[scene.id];
      if (!model) return [];
      return [
        loadSceneStage(model).then(
          (build) => [scene.id, build] as const,
          (error: unknown) => {
            console.warn(`Scene model ${model.url} failed to load; using the code art`, error);
            return null;
          },
        ),
      ];
    }),
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}
