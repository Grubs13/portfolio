import { Matrix4, ShaderMaterial, Vector2, Vector3 } from 'three';

/** Where sunlight comes from. The lit shader and the shadow camera share it. */
export const SUN = new Vector3(-0.4, 0.82, 0.48).normalize();

// A 4x4 ordered-dither threshold for the current art pixel, in (0, 1).
const BAYER = /* glsl */ `
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer() {
  ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.));
  return (BAYER[p.x + p.y * 4] + 0.5) / 16.;
}
`;

const vertexShader = /* glsl */ `
uniform mat4 shadowMatrix;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
void main() {
  vColor = color;
  vec4 world = modelMatrix * vec4(position, 1.);
  vWorld = world.xyz;
  vShadow = (shadowMatrix * world).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// Three bands of light: the sun-facing top, the camera-facing front and the
// shaded side, with cast shadows falling into the shaded band. Shadows shift
// toward violet, highlights toward warm, and band edges dither so the steps
// read as pixel art rather than flat fills.
const litFragment = /* glsl */ `
uniform vec3 sun;
uniform sampler2D tShadow;
uniform float shadowBias;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
${BAYER}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float light = dot(n, sun) + (bayer() - 0.5) * 0.14;
  bool inMap = all(greaterThan(vShadow, vec3(0.))) && all(lessThan(vShadow, vec3(1.)));
  if (inMap && vShadow.z - shadowBias > texture2D(tShadow, vShadow.xy).r) light = min(light, -0.3);
  vec3 shade = mix(vColor * 0.62, vec3(0.24, 0.2, 0.5), 0.36);
  vec3 lit = min(vColor * 1.14 + vec3(0.05, 0.035, 0.), 1.);
  vec3 c = light > 0.62 ? lit : light > -0.2 ? vColor : shade;
  if (n.y > 0.9 && hash(floor(vWorld.xz * 6.)) > 0.93) c *= 0.84;
  gl_FragColor = vec4(c, 1.);
}
`;

const glowFragment = /* glsl */ `
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, 1.); }
`;

/** Shared by every lit surface; the stage updates them each frame from its shadow camera. */
export const shadowUniforms = {
  sun: { value: SUN },
  tShadow: { value: null as unknown },
  shadowMatrix: { value: new Matrix4() },
  shadowBias: { value: 0 },
};

export const litMaterial = new ShaderMaterial({
  uniforms: shadowUniforms,
  vertexShader,
  fragmentShader: litFragment,
  vertexColors: true,
});
export const glowMaterial = new ShaderMaterial({
  uniforms: { shadowMatrix: shadowUniforms.shadowMatrix },
  vertexShader,
  fragmentShader: glowFragment,
  vertexColors: true,
});

/**
 * Puts the frame together from two passes: the world at art-pixel resolution
 * and the character at `detail` times finer, so he keeps a face, hands and
 * the folds of his limbs while the world stays chunky. The character shows
 * wherever he is nearer than the world. The world's silhouettes are inked on
 * their outer pixel, where a neighbor lies farther away by more than
 * `threshold` in depth; the character's are inked just outside, where a
 * neighbor lies nearer by more than `figureThreshold`.
 */
export const compositeMaterial = new ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    tFigure: { value: null },
    tFigureDepth: { value: null },
    texel: { value: new Vector2() },
    figureTexel: { value: new Vector2() },
    threshold: { value: 0 },
    figureThreshold: { value: 0 },
    /** Depth by which the character may sit behind the world and still show, so his soles meet the ground cleanly. */
    contact: { value: 0 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0., 1.);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tFigure;
uniform sampler2D tFigureDepth;
uniform vec2 texel;
uniform vec2 figureTexel;
uniform float threshold;
uniform float figureThreshold;
uniform float contact;
varying vec2 vUv;
const vec3 INK = vec3(0.07, 0.06, 0.16);

float farthest(sampler2D depth, vec2 uv, vec2 step) {
  return max(
    max(texture2D(depth, uv + vec2(step.x, 0.)).r, texture2D(depth, uv - vec2(step.x, 0.)).r),
    max(texture2D(depth, uv + vec2(0., step.y)).r, texture2D(depth, uv - vec2(0., step.y)).r)
  );
}

// The character's depth where he shows, and the far plane where the world hides him.
float figure(vec2 uv) {
  float d = texture2D(tFigureDepth, uv).r;
  return d < 1. && d < texture2D(tDepth, uv).r + contact ? d : 1.;
}

float nearest(vec2 uv) {
  return min(
    min(figure(uv + vec2(figureTexel.x, 0.)), figure(uv - vec2(figureTexel.x, 0.))),
    min(figure(uv + vec2(0., figureTexel.y)), figure(uv - vec2(0., figureTexel.y)))
  );
}

void main() {
  float f = figure(vUv);
  // The character's ink goes on the far side of each edge, around his
  // silhouette rather than inside it, so a hand two pixels wide stays skin.
  bool figureInk = f - nearest(vUv) > figureThreshold;
  if (f < 1.) {
    vec4 c = texture2D(tFigure, vUv);
    if (figureInk) c.rgb = mix(c.rgb, INK, 0.78);
    gl_FragColor = vec4(c.rgb, 1.);
    return;
  }
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).r;
  if (figureInk || (d < 1. && farthest(tDepth, vUv, texel) - d > threshold)) c.rgb = mix(c.rgb, INK, 0.78);
  // Around him against the sky the ink is opaque, where the world is clear.
  if (figureInk) c.a = 1.;
  gl_FragColor = c;
}
`,
  depthTest: false,
  depthWrite: false,
});
