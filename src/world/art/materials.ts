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
attribute float surface;
varying float vSurface;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vShadow;
void main() {
  vColor = color;
  vSurface = surface;
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
  fragmentShader: litFragment(false),
  vertexColors: true,
});
/** The lit shading for characters: smooth normals, no ground texture, and bones when the mesh has them. */
export const smoothMaterial = new ShaderMaterial({
  uniforms: shadowUniforms,
  vertexShader: smoothVertexShader,
  fragmentShader: litFragment(true),
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
 * outline when a neighbor lies farther away by more than `threshold` in depth.
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
    threshold: { value: 0 },
    progress: { value: 0 },
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
uniform vec2 texel;
uniform vec2 extent;
uniform float threshold;
uniform float progress;
varying vec2 vUv;
const vec3 INK = vec3(0.07, 0.06, 0.16);
// Depth at a neighbor, kept inside the scene's own region so the halves never ink each other's edges.
float depthAt(vec2 uv, vec2 lo, vec2 hi) {
  return texture2D(tDepth, clamp(uv, lo, hi)).r;
}
// Scene A (side 0) or B (side 1) at a screen position, inked.
vec4 inked(float side, vec2 screen) {
  vec2 origin = vec2(side * 0.5, 0.);
  vec2 lo = origin + texel * 0.5;
  vec2 hi = origin + extent - texel * 0.5;
  vec2 uv = origin + screen * extent;
  vec4 c = texture2D(tColor, uv);
  float d = texture2D(tDepth, uv).r;
  float far = max(
    max(depthAt(uv + vec2(texel.x, 0.), lo, hi), depthAt(uv - vec2(texel.x, 0.), lo, hi)),
    max(depthAt(uv + vec2(0., texel.y), lo, hi), depthAt(uv - vec2(0., texel.y), lo, hi))
  );
  if (d < 1. && far - d > threshold) c.rgb = mix(c.rgb, INK, 0.78);
  return c;
}
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
void main() {
  if (progress <= 0.) {
    gl_FragColor = inked(0., vUv);
    return;
  }
  ivec2 cell = ivec2(mod(floor(gl_FragCoord.xy / 3.), 4.));
  float dither = (BAYER[cell.x + cell.y * 4] + 0.5) / 16.;
  float along = vUv.y + (vUv.x - 0.5) * 0.3;
  float edge = progress * 1.54 - 0.22 + (dither - 0.5) * 0.14;
  gl_FragColor = along < edge ? inked(1., vUv) : inked(0., vUv);
}
`,
  depthTest: false,
  depthWrite: false,
});
