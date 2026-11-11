import {
  BufferGeometry,
  DepthTexture,
  Float32BufferAttribute,
  LinearSRGBColorSpace,
  Matrix4,
  MeshBasicMaterial,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  Scene as ThreeScene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import type { Scene } from '../content/scenes';
import type { TimelineState } from '../lib/timeline';
import { stageFor } from './art';
import type { Character } from './art/character';
import type { Cast, StageBuilder } from './art/kit';
import { screenMaterial, shadowUniforms, SUN } from './art/materials';
import type { WorldLayout } from './layout';

/** Where on screen the subject is framed, as fractions of width and of height from the top. */
export interface Focus {
  x: number;
  y: number;
}

export interface Stage {
  /** Resolves once shaders are compiled, so the first render does not block on them. */
  ready: Promise<unknown>;
  /** `focuses[i]` is where scene i frames its subject. */
  resize(width: number, height: number, focuses: readonly Focus[]): void;
  render(state: TimelineState): void;
}

const ISO_DIRECTION = new Vector3(1, 1, 1).normalize();
const CAMERA_DISTANCE = 100;
/** World units that must fit across the free part of the screen. */
const FRAME = 22;
/** A three-quarter view: turned from the camera, which looks from +x +z, so one side shows. */
const IDLE_YAW = Math.PI / 4 + 0.5;
/** How the character stands in a scene whose stage does not cast it. */
const IDLE_CAST: Cast = { pose: 'stand', yaw: IDLE_YAW };
/** CSS pixels per art pixel: chunky enough to read as pixel art, fine enough for the character's detail. */
const PIXEL_SIZE = 2;
const NEAR = 0.1;
const FAR = CAMERA_DISTANCE * 5;
/** Depth steps smaller than this many art pixels are surface slope, not a silhouette. */
const OUTLINE_PIXELS = 3;
/** Half the width of ground the shadow map covers around the character, and its resolution. */
const SHADOW_REACH = 44;
const SHADOW_SIZE = 1024;
const SHADOW_DEPTH = 300;
/** The scene buffer grows in steps of this many art pixels, so small viewport changes do not reallocate it. */
const BUFFER_STEP = 64;
/** Maps clip space to texture space, so the shader can look up the shadow map. */
const TO_TEXTURE = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

const right = new Vector3();
const up = new Vector3();

/** Points `camera` at `target` from `distance` along `direction`, shifted to the nearest multiple of `unit` across its view. */
function aimSnapped(camera: OrthographicCamera, target: Vector3, direction: Vector3, distance: number, unit: number) {
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const r = camera.position.dot(right);
  const u = camera.position.dot(up);
  camera.position.addScaledVector(right, Math.round(r / unit) * unit - r).addScaledVector(up, Math.round(u / unit) * unit - u);
  camera.updateMatrixWorld();
}

export function createStage(
  canvas: HTMLCanvasElement,
  scenes: readonly Scene[],
  layout: WorldLayout,
  character: Character,
  /** Stages loaded from scene models, keyed by scene id. */
  loaded: Partial<Record<string, StageBuilder>> = {},
): Stage {
  // Scenes render at art-pixel resolution into one buffer, the outgoing scene in
  // its left half and the incoming one in its right; the screen pass inks them,
  // wipes from one to the other and writes that same resolution to the canvas,
  // and CSS scales the canvas up with hard pixel edges. Fewer pixels make it
  // cheaper than a full-size render. The buffer grows in steps and never
  // shrinks, because phones resize the viewport on almost every frame of a
  // scroll as their toolbars slide away, and reallocating it each time is slow.
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const buffer = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthTexture: new DepthTexture(1, 1),
  });
  buffer.scissorTest = true;
  /** Width of each half of the buffer, and its height, in art pixels. */
  let half = 1;
  let bufferHeight = 1;

  const world = new ThreeScene();
  const looks: Vector3[] = [];
  const casts: Cast[] = [];
  scenes.forEach((scene, i) => {
    const anchor = layout.anchors[i]!;
    const { object: stageObject, look, cast = IDLE_CAST } = stageFor(scene, loaded)();
    looks.push(new Vector3(...look));
    casts.push(cast);
    stageObject.position.set(anchor.x, anchor.y, anchor.z);
    world.add(stageObject);
  });
  world.add(character.root);

  // Sunlight shadows come from a depth map rendered from the sun, centered on the character.
  const sunCamera = new OrthographicCamera(-SHADOW_REACH, SHADOW_REACH, SHADOW_REACH, -SHADOW_REACH, 1, SHADOW_DEPTH);
  const shadowTarget = new WebGLRenderTarget(SHADOW_SIZE, SHADOW_SIZE, { depthTexture: new DepthTexture(SHADOW_SIZE, SHADOW_SIZE) });
  const depthOnly = new MeshBasicMaterial({ colorWrite: false });
  shadowUniforms.tShadow.value = shadowTarget.depthTexture;
  shadowUniforms.shadowBias.value = (2.5 * (2 * SHADOW_REACH)) / SHADOW_SIZE / (SHADOW_DEPTH - 1);

  const post = new ThreeScene();
  const triangle = new BufferGeometry();
  triangle.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const screen = new Mesh(triangle, screenMaterial);
  screen.frustumCulled = false;
  post.add(screen);
  const uniforms = screenMaterial.uniforms;
  uniforms.tColor!.value = buffer.texture;
  uniforms.tDepth!.value = buffer.depthTexture;

  const camera = new OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
  const look = new Vector3();
  let aspect = 1;
  let columns = 1;
  let rows = 1;
  let focuses: readonly Focus[] = [];

  /** Sets the camera's view for a subject framed at `focus`, and returns world units per art pixel. */
  function frame({ x, y }: Focus): number {
    // The free part of the screen is the largest band centered on the focus along each axis.
    const freeX = Math.max(0.2, 2 * Math.min(x, 1 - x));
    const freeY = Math.max(0.2, 2 * Math.min(y, 1 - y));
    const viewHeight = Math.max(FRAME / freeY, FRAME / (aspect * freeX));
    const viewWidth = viewHeight * aspect;
    camera.left = -x * viewWidth;
    camera.right = (1 - x) * viewWidth;
    camera.top = y * viewHeight;
    camera.bottom = -(1 - y) * viewHeight;
    camera.updateProjectionMatrix();
    return viewHeight / rows;
  }

  /** Renders scene `i` into half `side` of the buffer (0 left, 1 right), the character cast at its anchor, and returns world units per art pixel. */
  function draw(i: number, side: 0 | 1): number {
    const unit = frame(focuses[i] ?? { x: 0.5, y: 0.5 });
    const anchor = layout.anchors[i]!;
    const cast = casts[i]!;
    character.root.position.set(anchor.x, anchor.y, anchor.z);
    character.root.rotation.y = cast.yaw;
    character.pose(cast.pose);
    look.set(anchor.x, anchor.y, anchor.z).add(looks[i]!);
    // Snapped to whole art pixels and whole shadow texels, so the picture is the same every time the scene is shown.
    aimSnapped(camera, look, ISO_DIRECTION, CAMERA_DISTANCE, unit);
    aimSnapped(sunCamera, look, SUN, SHADOW_DEPTH / 2, (2 * SHADOW_REACH) / SHADOW_SIZE);
    shadowUniforms.shadowMatrix.value.copy(TO_TEXTURE).multiply(sunCamera.projectionMatrix).multiply(sunCamera.matrixWorldInverse);

    world.overrideMaterial = depthOnly;
    renderer.setRenderTarget(shadowTarget);
    renderer.render(world, sunCamera);
    world.overrideMaterial = null;
    buffer.viewport.set(side * half, 0, columns, rows);
    buffer.scissor.set(side * half, 0, columns, rows);
    renderer.setRenderTarget(buffer);
    renderer.render(world, camera);
    return unit;
  }

  return {
    ready: Promise.all([renderer.compileAsync(world, camera), renderer.compileAsync(post, camera)]),

    resize(width, height, nextFocuses) {
      columns = Math.max(1, Math.round(width / PIXEL_SIZE));
      rows = Math.max(1, Math.round(height / PIXEL_SIZE));
      renderer.setPixelRatio(1);
      renderer.setSize(columns, rows, false);
      const step = (n: number) => Math.ceil(n / BUFFER_STEP) * BUFFER_STEP;
      if (columns > half || rows > bufferHeight) {
        half = Math.max(half, step(columns));
        bufferHeight = Math.max(bufferHeight, step(rows));
        buffer.setSize(2 * half, bufferHeight);
      }
      uniforms.texel!.value.set(1 / (2 * half), 1 / bufferHeight);
      uniforms.extent!.value.set(columns / (2 * half), rows / bufferHeight);
      aspect = width / height;
      focuses = nextFocuses;
    },

    render(state) {
      // Mirrored framings share a scale, so one outline threshold suits both scenes in a wipe.
      let unit: number;
      if (state.phase === 'dwell') {
        unit = draw(state.scene, 0);
        uniforms.progress!.value = 0;
      } else {
        unit = draw(state.from, 0);
        draw(state.to, 1);
        uniforms.progress!.value = state.t;
      }
      uniforms.threshold!.value = (OUTLINE_PIXELS * unit) / (FAR - NEAR);
      renderer.setRenderTarget(null);
      renderer.render(post, camera);
    },
  };
}
