import { AnimationClip, AnimationMixer, Box3, Color, Float32BufferAttribute, Group, Mesh, type MeshStandardMaterial } from 'three';
import { buildCharacter, type Character } from './character';
import { smoothMaterial } from './materials';

/**
 * A sculpted, rigged character exported from Blender as a GLB. Give each part a
 * flat base color rather than a texture: the toon shader bands the color itself,
 * and textures are not read.
 */
export interface CharacterModel {
  url: string;
  /** Height in world units, feet to the top of the hard hat. */
  height: number;
  /** Turn applied so the model faces +z, in radians. */
  yaw?: number;
  /** Clip names: a standing pose, and a looping flight cycle scrubbed by scroll. */
  clips: { idle: string; fly: string };
}

/** Set once a model is in `public/`; until then the stand-in from `character.ts` is used. */
export const CHARACTER_MODEL: CharacterModel | null = null;

/** Bakes each mesh's base color into vertex colors, the shape every lit shader here expects. */
function paintVertices(mesh: Mesh) {
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial | undefined;
  // glTF colors are linear and this world works in display space throughout.
  const { r, g, b } = new Color().copy(material?.color ?? new Color(1, 1, 1)).convertLinearToSRGB();
  mesh.geometry = mesh.geometry.clone();
  const colors = new Float32Array(mesh.geometry.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([r, g, b], i);
  mesh.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  mesh.material = smoothMaterial;
}

export async function loadCharacter({ url, height, yaw = 0, clips }: CharacterModel): Promise<Character> {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  model.traverse((child) => {
    if (child instanceof Mesh) paintVertices(child);
  });

  const bounds = new Box3().setFromObject(model);
  const scale = height / (bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.rotation.y = yaw;
  const root = new Group();
  root.add(model);

  const mixer = new AnimationMixer(model);
  const action = (name: string) => {
    const clip = AnimationClip.findByName(gltf.animations, name);
    if (!clip) throw new Error(`${url} has no "${name}" clip; it has ${gltf.animations.map((c) => c.name).join(', ')}`);
    return mixer.clipAction(clip).play();
  };
  const idle = action(clips.idle);
  const fly = action(clips.fly);

  return {
    root,
    pose(flight, stride) {
      // Scroll drives time, so the flight cycle scrubs with the page and the idle pose holds still.
      idle.setEffectiveWeight(1 - flight);
      fly.setEffectiveWeight(flight);
      idle.time = 0;
      fly.time = (stride % 1) * fly.getClip().duration;
      mixer.update(0);
    },
  };
}

/** The sculpted character when one is set and loads, otherwise the stand-in. */
export async function characterFor(model: CharacterModel | null = CHARACTER_MODEL): Promise<Character> {
  if (!model) return buildCharacter();
  try {
    return await loadCharacter(model);
  } catch (error) {
    console.warn('Character model failed to load; using the stand-in', error);
    return buildCharacter();
  }
}
