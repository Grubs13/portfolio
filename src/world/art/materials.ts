import { Matrix4, ShaderMaterial, Vector2, Vector3 } from 'three';
import { LOOK_ID } from '../look';

const DEFINES = `#define LOOK ${LOOK_ID}\n`;

/** Where sunlight comes from. The lit shader and the shadow camera share it. */
export const SUN = (LOOK_ID >= 3 ? new Vector3(-0.62, 0.5, 0.42) : new Vector3(-0.4, 0.82, 0.48)).normalize();

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
attribute float surface;
varying float vSurface;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
varying vec3 vNormal;
void main() {
  vColor = color;
  vSurface = surface;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.);
  vWorld = world.xyz;
  vShadow = (shadowMatrix * world).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// Characters keep their vertex normals, so rounded forms shade in smooth bands
// rather than per facet. Skinned meshes bend those normals with the bones.
const smoothVertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
uniform mat4 shadowMatrix;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
varying vec3 vNormal;
void main() {
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vColor = color;
  vec4 world = modelMatrix * vec4(transformed, 1.);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * objectNormal);
  vShadow = (shadowMatrix * world).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// Three bands of light: the sun-facing top, the camera-facing front and the
// shaded side, with cast shadows falling into the shaded band. Shadows shift
// toward violet, highlights toward warm, and band edges dither so the steps
// read as pixel art rather than flat fills. The world's flat ground also gets
// blotches of checker dither and speckle, fixed in world space so they hold
// still as the camera pans.
const litFragment = (smooth: boolean) => /* glsl */ `
${smooth ? '' : 'varying float vSurface;'}
uniform vec3 sun;
uniform sampler2D tShadow;
uniform float shadowBias;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
${smooth ? 'varying vec3 vNormal;' : ''}
${BAYER}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float blotches(vec2 p) {
  vec2 i = floor(p);
  vec2 f = smoothstep(0., 1., fract(p));
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
}
${
  smooth
    ? ''
    : `
// Pixel texture by surface type (see SURFACE in palette.ts), all fixed in world space so it holds still as the camera pans.
vec3 surfaceTexture(vec3 c, vec3 n, int kind) {
  bool checker = mod(gl_FragCoord.x + gl_FragCoord.y, 2.) < 1.;
  if (n.y > 0.9) {
    vec2 p = vWorld.xz;
    vec2 cell = floor(p * 9.);
    float b = blotches(p * 0.7) * 0.7 + blotches(p * 2.3) * 0.3;
    if (b > 0.7 || (b > 0.6 && checker)) c *= 0.92;
    else if (b < 0.24 && checker) c = min(c * 1.05, 1.);
    if (hash(cell) > 0.96) c *= 0.84;
    if (kind == 4) {
      // Gravel: dense pebbles in a dark and a light tone, and tyre-worn bands.
      float h = hash(floor(p * 14.));
      if (h > 0.86) c *= 0.82; else if (h < 0.1) c = min(c * 1.1, 1.);
    } else if (kind == 5) {
      // Grass and crop: flecks of lighter and darker blades, and mown swaths.
      float h = hash(floor(p * 12.) + 7.);
      if (h > 0.82) c = min(c * 1.13 + vec3(0.02, 0.03, 0.), 1.); else if (h < 0.16) c *= 0.86;
      if (blotches(p * 0.18) > 0.62 && checker) c *= 0.94;
    } else if (kind == 6) {
      // Water: dithered ripple lines catching the sky, and deeper patches.
      float r = fract(p.y * 1.3 + sin(p.x * 0.9) * 0.35 + blotches(p * 0.5) * 0.6);
      if (r < 0.07 && checker) c = min(c * 1.25 + 0.06, 1.);
      if (blotches(p * 0.25) > 0.6) c *= 0.9;
    } else if (kind == 7) {
      // Concrete and asphalt: stains and hairline joints.
      if (fract(p.x * 0.25) < 0.025 || fract(p.y * 0.25) < 0.025) c *= 0.88;
      if (blotches(p * 1.1) > 0.68 && checker) c *= 0.93;
    }
    return c;
  }
  if (abs(n.y) > 0.5) return c;
  // Walls: u runs along the wall, v up it.
  float u = dot(vWorld.xz, vec2(-n.z, n.x));
  float v = vWorld.y;
  if (kind == 1) {
    // Cladding ribs, with a darker drip line under every sheet lap.
    if (fract(u * 3.) < 0.34) c *= 0.88;
    if (fract(v * 0.22) < 0.03) c *= 0.85;
  } else if (kind == 2) {
    // Bolted panels, rust streaking down from the seams.
    bool seam = fract(u / 1.4) < 0.06 || fract(v / 1.1) < 0.07;
    if (seam) c *= 0.78;
    float streak = blotches(vec2(u * 3.2, v * 0.35)) * blotches(vec2(u * 0.9, v * 0.9 + 3.));
    if (streak > 0.38) c = mix(c, c * vec3(0.78, 0.6, 0.5), checker ? 0.7 : 0.45);
    else if (streak < 0.06 && checker) c = min(c * 1.07, 1.);
  } else if (kind == 3) {
    // Rolled shell courses with staggered vertical welds.
    float course = floor(v / 1.5);
    if (fract(v / 1.5) < 0.04) c *= 0.84;
    if (fract(u / 2.2 + course * 0.5) < 0.02) c *= 0.88;
    if (blotches(vec2(u * 0.8, v * 0.5)) > 0.7 && checker) c *= 0.94;
  }
  return c;
}`
}
void main() {
  vec3 n = ${smooth ? 'normalize(vNormal)' : 'normalize(cross(dFdx(vWorld), dFdy(vWorld)))'};
  // Characters get a lift, so only the side turned right away from the sun falls into deep shade.
  float light = dot(n, sun)${smooth ? ' + 0.35' : ''} + (bayer() - 0.5) * 0.14;
  bool inMap = all(greaterThan(vShadow, vec3(0.))) && all(lessThan(vShadow, vec3(1.)));
  if (inMap && vShadow.z - shadowBias > texture2D(tShadow, vShadow.xy).r) light = min(light, -0.3);
  vec3 shade = mix(vColor * 0.62, vec3(0.24, 0.2, 0.5), 0.36);
  vec3 lit = min(vColor * 1.14 + vec3(0.05, 0.035, 0.), 1.);
  vec3 c = light > 0.62 ? lit : light > -0.2 ? vColor : shade;
  ${
    smooth
      ? ''
      : `c = surfaceTexture(c, n, int(vSurface + 0.5));`
  }
  gl_FragColor = vec4(c, 1.);
}
`;


// Prototype: continuous sun and sky light, soft shadows, a metal sheen and fine world-space texture.
const fineFragment = (smooth: boolean) => /* glsl */ `
${smooth ? '' : 'varying float vSurface;'}
uniform vec3 sun;
uniform sampler2D tShadow;
uniform float shadowBias;
uniform float shadowTexel;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
varying vec3 vNormal;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = smoothstep(0., 1., fract(p));
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
}
float fbm(vec2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.1 + 3.) * 0.3 + vnoise(p * 4.3 + 7.) * 0.2; }
float softShadow() {
  if (any(lessThan(vShadow, vec3(0.))) || any(greaterThan(vShadow, vec3(1.)))) return 1.;
  float s = 0.;
  for (int x = 0; x < 4; x++) for (int y = 0; y < 4; y++) {
    vec2 o = (vec2(float(x), float(y)) - 1.5) * shadowTexel * 1.3;
    s += vShadow.z - shadowBias > texture2D(tShadow, vShadow.xy + o).r ? 0. : 1.;
  }
  return s / 16.;
}
vec3 fineTexture(vec3 c, vec3 n, int kind) {
  c *= 0.9 + 0.2 * fbm(vWorld.xz * 0.9 + vWorld.y * 0.6);
  if (n.y > 0.9) {
    vec2 p = vWorld.xz;
    c *= 0.95 + 0.1 * hash(floor(p * 22.));
    c *= 0.9 + 0.2 * fbm(p * 0.35);
    if (kind == 4) {
      float h = hash(floor(p * 26.));
      c *= h > 0.9 ? 0.8 : h < 0.07 ? 1.08 : 1.;
      c *= 0.96 + 0.06 * smoothstep(0.35, 0.65, fbm(vec2(p.x * 0.5, p.y * 3.)));
    } else if (kind == 5) {
      c *= 0.84 + 0.3 * hash(floor(p * vec2(34., 14.)));
      c = mix(c, c * vec3(1.12, 1.06, 0.78), smoothstep(0.4, 0.7, fbm(p * 0.22)));
    } else if (kind == 6) {
      float r = sin(p.y * 7. + sin(p.x * 1.7) * 2. + fbm(p * 0.8) * 6.);
      c = c * (0.82 + 0.2 * fbm(p * 0.3)) + 0.1 * smoothstep(0.82, 1., r);
    } else if (kind == 7) {
      vec2 j = abs(fract(p * 0.25) - 0.5);
      c *= 1. - 0.16 * (1. - smoothstep(0.485, 0.497, max(j.x, j.y)) ) * 0. - 0.14 * smoothstep(0.487, 0.497, max(j.x, j.y));
      c *= 0.86 + 0.2 * fbm(p * 1.1);
    }
    return c;
  }
  if (abs(n.y) > 0.5) return c;
  float u = dot(vWorld.xz, normalize(vec2(-n.z, n.x) + 1e-5));
  float v = vWorld.y;
  // Grime running down every wall.
  c *= 0.84 + 0.22 * fbm(vec2(u * 4.5, v * 0.45));
  if (kind == 1) {
    c *= 0.84 + 0.16 * smoothstep(0.0, 0.5, abs(fract(u * 3.) - 0.5) * 2.);
    c *= 1. - 0.14 * (1. - smoothstep(0., 0.04, fract(v * 0.22)));
  } else if (kind == 2) {
    float seam = min(fract(u / 1.4), fract(v / 1.1));
    c *= 1. - 0.24 * (1. - smoothstep(0.0, 0.05, seam));
    float streak = fbm(vec2(u * 3.2, v * 0.35)) * fbm(vec2(u * 0.9, v * 0.9 + 3.));
    c = mix(c, c * vec3(0.74, 0.52, 0.4), smoothstep(0.22, 0.42, streak));
  } else if (kind == 3) {
    float course = floor(v / 1.5);
    c *= 1. - 0.16 * (1. - smoothstep(0., 0.035, fract(v / 1.5)));
    c *= 1. - 0.1 * (1. - smoothstep(0., 0.015, fract(u / 2.2 + course * 0.5)));
  }
  return c;
}
void main() {
  vec3 n = normalize(vNormal);
  if (dot(n, n) < 0.5) n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float ndl = dot(n, sun);
  float direct = max(ndl, 0.) * softShadow();
  vec3 sky = mix(vec3(0.40, 0.36, 0.50), vec3(0.60, 0.68, 0.88), n.y * 0.5 + 0.5);
  // Sunlit ground throws a little warm light back up under things.
  vec3 bounce = vec3(0.30, 0.24, 0.16) * max(-n.y * 0.6 + 0.25, 0.) * (1. - abs(n.y));
  vec3 albedo = ${smooth ? 'vColor' : 'fineTexture(vColor, n, int(vSurface + 0.5))'};
#if LOOK == 4
  // Cel light: the sun lands in three hard steps with a dithered edge, like shaded sprite art.
  vec2 cell = mod(floor(gl_FragCoord.xy), 2.);
  float bayer = (cell.x * 2. + cell.y * 3. - cell.x * cell.y * 4. + 0.5) / 4. - 0.5;
  direct = floor(direct * 3. + 0.5 + bayer * 0.25) / 3.;
#endif
#if LOOK >= 3
  // Late sun: warm and strong, with dim blue-violet sky light filling the shade.
  sky = mix(vec3(0.20, 0.19, 0.34), vec3(0.36, 0.44, 0.70), n.y * 0.5 + 0.5);
  vec3 c = albedo * (sky * 0.62 + bounce * 1.3 + vec3(1.25, 0.92, 0.58) * 0.95 * direct);
#else
  vec3 c = albedo * (sky * 0.68 + bounce + vec3(1.0, 0.9, 0.72) * 0.7 * direct);
#endif
  vec3 h = normalize(sun + vec3(0.577));
  c += vec3(1., 0.95, 0.85) * pow(max(dot(n, h), 0.), 48.) * 0.22 * direct;
  gl_FragColor = vec4(c, 1.);
}
`;

const fragmentFor = (smooth: boolean) => DEFINES + (LOOK_ID > 0 ? fineFragment(smooth) : litFragment(smooth));

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
  shadowTexel: { value: 1 / 1024 },
};

export const litMaterial = new ShaderMaterial({
  uniforms: shadowUniforms,
  vertexShader,
  fragmentShader: fragmentFor(false),
  vertexColors: true,
});
/** The lit shading for characters: smooth normals, no ground texture, and bones when the mesh has them. */
export const smoothMaterial = new ShaderMaterial({
  uniforms: shadowUniforms,
  vertexShader: smoothVertexShader,
  fragmentShader: fragmentFor(true),
  vertexColors: true,
});
export const glowMaterial = new ShaderMaterial({
  uniforms: { shadowMatrix: shadowUniforms.shadowMatrix },
  vertexShader,
  fragmentShader: glowFragment,
  vertexColors: true,
});

/**
 * Draws the frame to the screen from one buffer that holds scene A in its left
 * half and scene B in its right. Each scene is inked first: a pixel becomes
 * outline when a neighbor lies farther away by more than its half's `threshold`
 * in depth (x for scene A, y for scene B, since the two can be framed at different scales).
 * While `progress` is above zero, scene B wipes in over scene A behind a
 * slanted edge that breaks up into chunky dither, rising with the scroll.
 * `extent` is the part of each half a scene fills, since the buffer is
 * allocated a little larger than the screen so it need not reallocate as the
 * screen resizes.
 */
export const screenMaterial = new ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    texel: { value: new Vector2() },
    extent: { value: new Vector2(0.5, 1) },
    threshold: { value: new Vector2() },
    progress: { value: 0 },
    aoRadius: { value: new Vector2() },
    depthRange: { value: 1 },
    scale: { value: 1 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0., 1.);
}
`,
  fragmentShader: DEFINES + /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform vec2 extent;
uniform vec2 threshold;
uniform float progress;
uniform vec2 aoRadius;
uniform float depthRange;
uniform float scale;
varying vec2 vUv;
const vec3 INK = vec3(0.07, 0.06, 0.16);
// Depth at a neighbor, kept inside the scene's own region so the halves never ink each other's edges.
float depthAt(vec2 uv, vec2 lo, vec2 hi) {
  return texture2D(tDepth, clamp(uv, lo, hi)).r;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = smoothstep(0., 1., fract(p));
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
}
#if LOOK > 0
// Creases and contact: how far the surface here sits behind the average of opposite neighbors, which is zero on any flat plane.
vec2 hollow(vec2 uv, vec2 lo, vec2 hi, float d, float radius) {
  float occ = 0.;
  float crease = 0.;
  float spin = hash(gl_FragCoord.xy) * 6.283;
  for (int i = 0; i < 8; i++) {
    float a = spin + float(i) * 0.785;
    float r = radius * (0.25 + 0.75 * fract(float(i) * 0.618 + 0.3));
    vec2 o = vec2(cos(a), sin(a)) * r * texel;
    float gap = (d - 0.5 * (depthAt(uv + o, lo, hi) + depthAt(uv - o, lo, hi))) * depthRange;
    occ += smoothstep(0.03, 0.5, gap) * (1. - smoothstep(0.8, 2., gap));
    crease = max(crease, abs(gap));
  }
  return vec2(occ / 8., crease);
}
float hatch(vec2 p, float angle, float spacing) {
  vec2 dir = vec2(cos(angle), sin(angle));
  float wob = vnoise(p / (40. * scale)) * 6. * scale;
  float t = abs(fract((dot(p, dir) + wob) / (spacing * scale)) - 0.5) * 2.;
  return 1. - smoothstep(0.55, 0.8, t + (vnoise(p / (3. * scale)) - 0.5) * 0.5);
}
#endif
// Scene A (side 0) or B (side 1) at a screen position, inked.
vec4 inked(float side, vec2 screen) {
  vec2 origin = vec2(side * 0.5, 0.);
  vec2 lo = origin + texel * 0.5;
  vec2 hi = origin + extent - texel * 0.5;
  vec2 uv = origin + screen * extent;
  float limit = side < 0.5 ? threshold.x : threshold.y;
#if LOOK == 2
  // A hand that wobbles: every lookup is nudged by slow noise, so lines waver like pencil.
  uv += (vec2(vnoise(gl_FragCoord.xy / (9. * scale)), vnoise(gl_FragCoord.yx / (9. * scale) + 5.)) - 0.5) * 2.2 * scale * texel;
#endif
  vec4 c = texture2D(tColor, uv);
  float d = texture2D(tDepth, uv).r;
  float far = max(
    max(depthAt(uv + vec2(texel.x, 0.), lo, hi), depthAt(uv - vec2(texel.x, 0.), lo, hi)),
    max(depthAt(uv + vec2(0., texel.y), lo, hi), depthAt(uv - vec2(0., texel.y), lo, hi))
  );
#if LOOK == 0
  if (d < 1. && far - d > limit) c.rgb = mix(c.rgb, INK, 0.78);
  return c;
#else
  if (d >= 1.) return c;
  vec2 h = hollow(uv, lo, hi, d, side < 0.5 ? aoRadius.x : aoRadius.y);
  float ao = 1. - 0.7 * h.x;
  // Wider lookups for the line, so it is a soft stroke about a CSS pixel wide.
  float w = max(1., scale * 0.75);
  float farWide = max(
    max(depthAt(uv + vec2(texel.x, 0.) * w, lo, hi), depthAt(uv - vec2(texel.x, 0.) * w, lo, hi)),
    max(depthAt(uv + vec2(0., texel.y) * w, lo, hi), depthAt(uv - vec2(0., texel.y) * w, lo, hi))
  );
  float outline = smoothstep(limit * 2., limit * 6., max(far, farWide) - d);
#if LOOK == 4
  c.rgb *= mix(vec3(0.3, 0.26, 0.46), vec3(1.), floor(ao * 3. + 0.5) / 3.);
  // A hard ink line a pixel wide round every silhouette, then a short palette: 9 steps a channel, dithered.
  if (far - d > limit) c.rgb = mix(c.rgb, INK, 0.85);
  c.rgb = c.rgb / (c.rgb + 0.85) * 1.72;
  c.rgb = mix(c.rgb, c.rgb * c.rgb * (3. - 2. * c.rgb), 0.6);
  float grey = dot(c.rgb, vec3(0.3, 0.59, 0.11));
  c.rgb = mix(vec3(grey), c.rgb, 1.25);
  vec2 cell = mod(floor(gl_FragCoord.xy), 2.);
  float bayer = (cell.x * 2. + cell.y * 3. - cell.x * cell.y * 4. + 0.5) / 4. - 0.5;
  c.rgb = floor(c.rgb * 12. + 0.5 + bayer * 0.3) / 12.;
  c.rgb *= 1. - 0.5 * dot(screen - 0.5, screen - 0.5);
  return c;
#elif LOOK == 3
  c.rgb *= mix(vec3(0.28, 0.24, 0.42), vec3(1.), ao);
  c.rgb = mix(c.rgb, INK, outline * 0.55);
  // Filmic contrast, then a small palette: each channel snaps to 24 steps with ordered dither, so gradients band like painted pixel art.
  c.rgb = c.rgb / (c.rgb + 0.85) * 1.72;
  c.rgb = mix(c.rgb, c.rgb * c.rgb * (3. - 2. * c.rgb), 0.55);
  vec2 cell = mod(floor(gl_FragCoord.xy), 2.);
  float bayer = (cell.x * 2. + cell.y * 3. - cell.x * cell.y * 4. + 0.5) / 4. - 0.5;
  c.rgb = floor(c.rgb * 24. + 0.5 + bayer * 0.9) / 24.;
  return c;
#elif LOOK == 1
  c.rgb *= mix(vec3(0.42, 0.36, 0.5), vec3(1.), ao);
  c.rgb = mix(c.rgb, c.rgb * 0.35, outline * 0.6);
  // A gentle filmic curve and a touch of warmth in the lights.
  c.rgb = c.rgb * (1.06 + vec3(0.03, 0.01, -0.03) * dot(c.rgb, vec3(0.33)));
  c.rgb = c.rgb * c.rgb * (3. - 2. * c.rgb) * 0.45 + c.rgb * 0.55;
  return c;
#else
  float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11)) * (1. - 0.35 * h.x);
  float dark = 1. - lum;
  vec2 p = gl_FragCoord.xy;
  vec3 paper = vec3(0.93, 0.9, 0.83) * (0.95 + 0.05 * vnoise(p / (2. * scale))) * (0.97 + 0.03 * vnoise(p / (60. * scale)));
  // A light watercolor wash of the scene's own colors under the pencil.
  vec3 wash = mix(vec3(lum), c.rgb, 0.75);
  vec3 col = paper * mix(vec3(1.), 0.5 + 0.72 * wash, 0.7);
  float pencil = 0.;
  pencil = max(pencil, hatch(p, 0.7, 5.) * smoothstep(0.52, 0.66, dark));
  pencil = max(pencil, hatch(p, -0.85, 5.5) * smoothstep(0.68, 0.8, dark));
  pencil = max(pencil, hatch(p, 0.15, 4.) * smoothstep(0.82, 0.93, dark));
  vec2 sx = vec2(texel.x, 0.) * w;
  vec2 sy = vec2(0., texel.y) * w;
  float bend = max(
    abs(d - 0.5 * (depthAt(uv + sx, lo, hi) + depthAt(uv - sx, lo, hi))),
    abs(d - 0.5 * (depthAt(uv + sy, lo, hi) + depthAt(uv - sy, lo, hi)))
  );
  float crease = smoothstep(limit * 0.25, limit * 0.8, bend) * 0.6;
  float line = max(outline, crease) * (0.75 + 0.25 * vnoise(p / (4. * scale)));
  col = mix(col, vec3(0.2, 0.19, 0.24), max(pencil * 0.38, line * 0.85));
  return vec4(col, 1.);
#endif
#endif
}
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
void main() {
  if (progress <= 0.) {
    gl_FragColor = inked(0., vUv);
    return;
  }
  ivec2 cell = ivec2(mod(floor(gl_FragCoord.xy / (3. * scale)), 4.));
  float dither = (BAYER[cell.x + cell.y * 4] + 0.5) / 16.;
  float along = vUv.y + (vUv.x - 0.5) * 0.3;
  float edge = progress * 1.54 - 0.22 + (dither - 0.5) * 0.14;
  gl_FragColor = along < edge ? inked(1., vUv) : inked(0., vUv);
}
`,
  depthTest: false,
  depthWrite: false,
});
