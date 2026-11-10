import {
  BufferGeometry,
  CircleGeometry,
  DepthTexture,
  Float32BufferAttribute,
  LinearSRGBColorSpace,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene as ThreeScene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import type { Scene } from '../content/scenes';
import type { TimelineState } from '../lib/timeline';
import { islandFor } from './art';
import { buildCharacter, type Character } from './art/character';
import { blobShadowMaterial, outlineMaterial } from './art/materials';
import { pointOnSegment, segmentTangent, type Vec3, type WorldLayout } from './layout';

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

const ISO_DIRECTION = new Vector3(1, 1, 1).normalize();
const CAMERA_DISTANCE = 100;
/** World units that must fit across the free part of the screen. */
const FRAME = 10;
const LOOK_HEIGHT = 1;
const TRAVEL_ZOOM_OUT = 0.3;
/** A three-quarter view: turned from the camera, which looks from +x +z, so one side shows. */
const IDLE_YAW = Math.PI / 4 + 0.5;
const LEAN = 0.45;
const SWINGS_PER_TRAVEL = 3;
/** CSS pixels per art pixel. Phones get finer pixels so the character keeps its detail. */
const pixelSize = (width: number) => (width < 768 ? 2 : 3);
const NEAR = 0.1;
const FAR = CAMERA_DISTANCE * 5;
/** Depth steps smaller than this many art pixels are surface slope, not a silhouette. */
const OUTLINE_PIXELS = 3;

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
  // The world renders at art-pixel resolution into a target, the outline pass
  // writes that same resolution to the canvas, and CSS scales the canvas up
  // with hard pixel edges. Fewer pixels make it cheaper than a full-size render.
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const target = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthTexture: new DepthTexture(1, 1),
  });

  const world = new ThreeScene();
  scenes.forEach((scene, i) => {
    const anchor = layout.anchors[i]!;
    const islandObject = islandFor(scene)();
    islandObject.position.set(anchor.x, anchor.y, anchor.z);
    world.add(islandObject);
  });
  // Stars write no depth, so the outline pass treats them as sky.
  world.add(buildStars(layout, new PointsMaterial({ color: 0xd9dcf2, size: 1, sizeAttenuation: false, depthWrite: false })));

  const character = buildCharacter();
  const shadow = new Mesh(new CircleGeometry(0.42, 10).rotateX(-Math.PI / 2), blobShadowMaterial);
  world.add(character.root, shadow);

  const post = new ThreeScene();
  const triangle = new BufferGeometry();
  triangle.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const outline = new Mesh(triangle, outlineMaterial);
  outline.frustumCulled = false;
  post.add(outline);
  outlineMaterial.uniforms.tColor!.value = target.texture;
  outlineMaterial.uniforms.tDepth!.value = target.depthTexture;

  const camera = new OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
  const look = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  let aspect = 1;
  let rows = 1;
  let focus: Focus = { x: 0.5, y: 0.5 };

  return {
    ready: Promise.all([renderer.compileAsync(world, camera), renderer.compileAsync(post, camera)]),

    resize(width, height, nextFocus) {
      const px = pixelSize(width);
      const columns = Math.max(1, Math.round(width / px));
      rows = Math.max(1, Math.round(height / px));
      renderer.setPixelRatio(1);
      renderer.setSize(columns, rows, false);
      target.setSize(columns, rows);
      outlineMaterial.uniforms.texel!.value.set(1 / columns, 1 / rows);
      aspect = width / height;
      focus = nextFocus;
    },

    render(state) {
      const subject = poseCharacter(character, layout, state);
      shadow.visible = state.phase === 'dwell';
      shadow.position.set(subject.x, subject.y + 0.01, subject.z);

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

      look.set(subject.x, subject.y + LOOK_HEIGHT, subject.z);
      camera.position.copy(look).addScaledVector(ISO_DIRECTION, CAMERA_DISTANCE);
      camera.lookAt(look);
      // Snapping the camera to whole art pixels keeps still geometry from shimmering as it pans.
      const unit = viewHeight / rows;
      camera.updateMatrixWorld();
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      const r = camera.position.dot(right);
      const u = camera.position.dot(up);
      camera.position
        .addScaledVector(right, Math.round(r / unit) * unit - r)
        .addScaledVector(up, Math.round(u / unit) * unit - u);
      camera.updateMatrixWorld();

      outlineMaterial.uniforms.threshold!.value = (OUTLINE_PIXELS * unit) / (FAR - NEAR);
      renderer.setRenderTarget(target);
      renderer.render(world, camera);
      renderer.setRenderTarget(null);
      renderer.render(post, camera);
    },
  };
}
