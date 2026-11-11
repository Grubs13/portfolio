import { Box3, Color, Float32BufferAttribute, Group, Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { buildCharacter, type Character, CHARACTER_POSES, type CharacterPose, CHARACTER_SCALE } from './character';
import { litMaterial } from './materials';
import { sceneLoader } from './sceneModel';

/**
 * A character modelled in Blender and exported as a GLB. Give each part a
 * flat base color rather than a texture: the toon shader bands the color itself,
 * and textures are not read.
 */
export interface CharacterModel {
  url: string;
  /** Height in world units, feet to the top of the hard hat. */
  height: number;
  /** Turn applied so the model faces +z, in radians. */
  yaw?: number;
}

/** Calen, modelled in Blender by `blender/character.py` and packed with gltfpack. The stand-in from `character.ts` is used if it fails to load. */
export const CHARACTER_MODEL: CharacterModel | null = {
  url: '/models/calen.glb',
  // The same height the flight-path tests allow for.
  height: 2.3 * CHARACTER_SCALE,
};

/**
 * Bakes each mesh's base color into vertex colors, the shape every lit shader here expects, and
 * shades it with the faceted scene shader, so Calen reads like the crews he works among.
 */
function paintVertices(mesh: Mesh) {
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial | undefined;
  // glTF colors are linear and this world works in display space throughout.
  const { r, g, b } = new Color().copy(material?.color ?? new Color(1, 1, 1)).convertLinearToSRGB();
  mesh.geometry = mesh.geometry.clone();
  const colors = new Float32Array(mesh.geometry.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([r, g, b], i);
  mesh.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  mesh.material = litMaterial;
}

/**
 * The character from a loaded glTF scene, sized by its standing pose. Each pose is
 * a `pose_<name>` group, and only the one named last is shown; a pose the model
 * lacks shows it standing.
 */
export function characterFromGltf(model: Object3D, { height, yaw = 0 }: Omit<CharacterModel, 'url'>): Character {
  model.traverse((child) => {
    if (child instanceof Mesh) paintVertices(child);
  });
  const groups = new Map(CHARACTER_POSES.flatMap((name) => {
    const group = model.getObjectByName(`pose_${name}`);
    return group ? [[name, group] as const] : [];
  }));

  const bounds = new Box3().setFromObject(groups.get('stand') ?? model);
  const scale = height / (bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.rotation.y = yaw;
  const root = new Group();
  root.add(model);

  const pose = (name: CharacterPose) => {
    const shown = groups.get(name) ?? groups.get('stand');
    for (const group of groups.values()) group.visible = group === shown;
  };
  pose('stand');
  return { root, pose };
}

export async function loadCharacter(model: CharacterModel): Promise<Character> {
  const gltf = await (await sceneLoader()).loadAsync(model.url);
  return characterFromGltf(gltf.scene, model);
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
