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
      : `if (n.y > 0.9) {
    vec2 cell = floor(vWorld.xz * 9.);
    float b = blotches(vWorld.xz * 0.7) * 0.7 + blotches(vWorld.xz * 2.3) * 0.3;
    bool checker = mod(cell.x + cell.y, 2.) < 1.;
    if (b > 0.7 || (b > 0.6 && checker)) c *= 0.92;
    else if (b < 0.24 && checker) c = min(c * 1.05, 1.);
    if (hash(cell) > 0.96) c *= 0.84;
  }`
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
 * Darkens the outer pixel of every silhouette: a pixel becomes ink when a
 * neighbor lies farther away by more than `threshold` in depth.
 */
export const outlineMaterial = new ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    texel: { value: new Vector2() },
    threshold: { value: 0 },
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
uniform float threshold;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).r;
  float far = max(
    max(texture2D(tDepth, vUv + vec2(texel.x, 0.)).r, texture2D(tDepth, vUv - vec2(texel.x, 0.)).r),
    max(texture2D(tDepth, vUv + vec2(0., texel.y)).r, texture2D(tDepth, vUv - vec2(0., texel.y)).r)
  );
  if (d < 1. && far - d > threshold) c.rgb = mix(c.rgb, vec3(0.07, 0.06, 0.16), 0.78);
  gl_FragColor = c;
}
`,
  depthTest: false,
  depthWrite: false,
});
