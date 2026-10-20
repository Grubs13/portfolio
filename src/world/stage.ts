import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene as ThreeScene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Scene } from '../content/scenes';
import type { TimelineState } from '../lib/timeline';
import { ISLAND_RADIUS, pointOnSegment, segmentTangent, type Vec3, type WorldLayout } from './layout';

/** Where on screen the subject is framed, as fractions of width and of height from the top. */
export interface Focus {
  x: number;
  y: number;
}

export interface Stage {
  /** Resolves once shaders are compiled, so the first render does not block on them. */
  ready: Promise<unknown>;
  resize(width: number, height: number, focus: Focus): void;
  render(state: TimelineState): void;
}

interface Materials {
  dark: MeshLambertMaterial;
  mid: MeshLambertMaterial;
  light: MeshLambertMaterial;
}

const ISO_DIRECTION = new Vector3(1, 1, 1).normalize();
const CAMERA_DISTANCE = 100;
/** World units that must fit across the free part of the screen. */
const FRAME = 10;
const LOOK_HEIGHT = 1;
const TRAVEL_ZOOM_OUT = 0.3;
/** Faces the camera, which looks from +x +z. */
const IDLE_YAW = Math.PI / 4;
const LEAN = 0.45;
const SWINGS_PER_TRAVEL = 3;

const box = new BoxGeometry(1, 1, 1);
const islandRock = new CylinderGeometry(ISLAND_RADIUS, 1.2, 2, 7);
const platformRock = new CylinderGeometry(1.8, 1, 0.8, 6);
const orb = new IcosahedronGeometry(1, 0);

function mesh(
  geometry: BufferGeometry,
  material: MeshLambertMaterial,
  [x, y, z]: [number, number, number],
  [sx, sy, sz]: [number, number, number] = [1, 1, 1],
): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function group(...children: Object3D[]): Group {
  const g = new Group();
  g.add(...children);
  return g;
}

const island = (m: Materials) => mesh(islandRock, m.dark, [0, -1, 0]);
const platform = (m: Materials) => mesh(platformRock, m.dark, [0, -0.4, 0]);

// Props sit toward -x, to the character's screen-left, so they never hide it or sit on its head.
const ISLANDS: Record<Scene['kind'], (m: Materials) => Object3D> = {
  intro: platform,
  contact: platform,
  role: (m) =>
    group(
      island(m),
      mesh(box, m.mid, [-1.7, 0.6, 0.3], [1.2, 1.2, 1.2]),
      mesh(box, m.light, [-1.2, 0.4, -1.1], [0.8, 0.8, 0.8]),
      mesh(box, m.mid, [-1.8, 1.5, 0.1], [0.7, 0.6, 0.7]),
    ),
  project: (m) => group(island(m), mesh(box, m.mid, [-1.7, 2, 0.2], [1.2, 4, 1.2])),
  interest: (m) => group(island(m), mesh(orb, m.light, [-1.7, 1.6, 0.4])),
};

interface Character {
  root: Group;
  body: Group;
  arms: [Group, Group];
  legs: [Group, Group];
  flame: Mesh;
}

/** A limb hangs from a pivot at its top so rotating the pivot swings it. */
function limb(material: MeshLambertMaterial, x: number, y: number, length: number, width: number): Group {
  const pivot = group(mesh(box, material, [0, -length / 2, 0], [width, length, width]));
  pivot.position.set(x, y, 0);
  return pivot;
}

function buildCharacter(m: Materials): Character {
  const arms: [Group, Group] = [limb(m.mid, -0.42, 0.95, 0.65, 0.2), limb(m.mid, 0.42, 0.95, 0.65, 0.2)];
  const legs: [Group, Group] = [limb(m.mid, -0.16, 0.2, 0.75, 0.24), limb(m.mid, 0.16, 0.2, 0.75, 0.24)];
  const flame = mesh(box, m.light, [0, -0.35, 0], [0.22, 0.7, 0.22]);
  const nozzle = group(flame);
  nozzle.position.set(0, 0.3, -0.42);
  const body = group(
    mesh(box, m.mid, [0, 0.6, 0], [0.6, 0.8, 0.4]),
    mesh(box, m.light, [0, 1.3, 0], [0.5, 0.5, 0.5]),
    mesh(box, m.dark, [0, 1.32, 0.24], [0.38, 0.18, 0.06]),
    mesh(box, m.dark, [0, 0.65, -0.32], [0.5, 0.65, 0.25]),
    nozzle,
    ...arms,
    ...legs,
  );
  // The body pivots at the hips so leaning tips the torso, not the feet.
  body.position.y = 0.75;
  const root = group(body);
  return { root, body, arms, legs, flame };
}

function buildStars(layout: WorldLayout, material: PointsMaterial): Points {
  const lo = new Vector3(Infinity, Infinity, Infinity);
  const hi = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const a of layout.anchors) {
    lo.min(new Vector3(a.x, a.y, a.z));
    hi.max(new Vector3(a.x, a.y, a.z));
  }
  const margin = 45;
  // A fixed seed keeps the sky identical between visits and screenshots.
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const behind = ISO_DIRECTION.clone().multiplyScalar(-90);
  const positions: number[] = [];
  for (let i = 0; i < 900; i++) {
    positions.push(
      lo.x - margin + random() * (hi.x - lo.x + 2 * margin) + behind.x,
      lo.y - margin + random() * (hi.y - lo.y + 2 * margin) + behind.y,
      lo.z - margin + random() * (hi.z - lo.z + 2 * margin) + behind.z,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new Points(geometry, material);
}

function shortestAngleLerp(a: number, b: number, w: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * w;
}

function poseCharacter(c: Character, layout: WorldLayout, state: TimelineState): Vec3 {
  if (state.phase === 'dwell') {
    const anchor = layout.anchors[state.scene]!;
    c.root.position.set(anchor.x, anchor.y, anchor.z);
    c.root.rotation.y = IDLE_YAW;
    c.body.rotation.x = 0;
    for (const limb of [...c.arms, ...c.legs]) limb.rotation.x = 0;
    c.flame.visible = false;
    return anchor;
  }

  const segment = layout.segments[state.from]!;
  const { t } = state;
  const p = pointOnSegment(segment, t);
  const tangent = segmentTangent(segment, t);
  // Peaks mid-flight and is zero at both islands, so the pose meets the idle pose at each end.
  const flight = Math.sin(Math.PI * t);
  const swing = Math.sin(t * 2 * Math.PI * SWINGS_PER_TRAVEL) * flight;

  c.root.position.set(p.x, p.y, p.z);
  c.root.rotation.y = shortestAngleLerp(IDLE_YAW, Math.atan2(tangent.x, tangent.z), Math.min(1, 2 * flight));
  c.body.rotation.x = LEAN * flight;
  c.arms[0].rotation.x = 0.7 * swing;
  c.arms[1].rotation.x = -0.7 * swing;
  c.legs[0].rotation.x = 0.5 * flight + 0.25 * swing;
  c.legs[1].rotation.x = 0.5 * flight - 0.25 * swing;
  c.flame.visible = flight > 0.02;
  c.flame.scale.y = flight;
  return p;
}

export function createStage(canvas: HTMLCanvasElement, scenes: readonly Scene[], layout: WorldLayout): Stage {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);

  const materials: Materials = {
    dark: new MeshLambertMaterial({ color: 0x4a4e58, flatShading: true }),
    mid: new MeshLambertMaterial({ color: 0x7a7f8a, flatShading: true }),
    light: new MeshLambertMaterial({ color: 0xa9adb6, flatShading: true }),
  };

  const world = new ThreeScene();
  world.add(new HemisphereLight(0xdfe3ff, 0x1a1c2a, 1.6));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-4, 10, 6);
  world.add(sun);

  scenes.forEach((scene, i) => {
    const anchor = layout.anchors[i]!;
    const islandObject = ISLANDS[scene.kind](materials);
    islandObject.position.set(anchor.x, anchor.y, anchor.z);
    world.add(islandObject);
  });
  world.add(buildStars(layout, new PointsMaterial({ color: 0xc8ccd6, size: 1.6, sizeAttenuation: false })));

  const character = buildCharacter(materials);
  world.add(character.root);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, CAMERA_DISTANCE * 5);
  const target = new Vector3();
  let aspect = 1;
  let focus: Focus = { x: 0.5, y: 0.5 };

  return {
    ready: renderer.compileAsync(world, camera),

    resize(width, height, nextFocus) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      aspect = width / height;
      focus = nextFocus;
    },

    render(state) {
      const subject = poseCharacter(character, layout, state);
      const zoom = state.phase === 'travel' ? 1 + TRAVEL_ZOOM_OUT * Math.sin(Math.PI * state.t) : 1;
      // The free part of the screen is the largest band centered on `focus` along each axis.
      const freeX = Math.max(0.2, 2 * Math.min(focus.x, 1 - focus.x));
      const freeY = Math.max(0.2, 2 * Math.min(focus.y, 1 - focus.y));
      const viewHeight = Math.max(FRAME / freeY, FRAME / (aspect * freeX)) * zoom;
      const viewWidth = viewHeight * aspect;
      camera.left = -focus.x * viewWidth;
      camera.right = (1 - focus.x) * viewWidth;
      camera.top = focus.y * viewHeight;
      camera.bottom = -(1 - focus.y) * viewHeight;
      camera.updateProjectionMatrix();

      target.set(subject.x, subject.y + LOOK_HEIGHT, subject.z);
      camera.position.copy(target).addScaledVector(ISO_DIRECTION, CAMERA_DISTANCE);
      camera.lookAt(target);

      renderer.render(world, camera);
    },
  };
}
