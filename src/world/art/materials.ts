import { ShaderMaterial, Vector2 } from 'three';

// A 4x4 ordered-dither threshold for the current art pixel, in (0, 1).
const BAYER = /* glsl */ `
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer() {
  ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.));
  return (BAYER[p.x + p.y * 4] + 0.5) / 16.;
}
`;

const vertexShader = /* glsl */ `
varying vec3 vColor;
varying vec3 vWorld;
void main() {
  vColor = color;
  vec4 world = modelMatrix * vec4(position, 1.);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// Three bands of light: the sun-facing top, the camera-facing front and the
// shaded side. Shadows shift toward violet, highlights toward warm, and the
// band edges dither so the steps read as pixel art rather than flat fills.
const litFragment = /* glsl */ `
varying vec3 vColor;
varying vec3 vWorld;
${BAYER}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float light = dot(n, normalize(vec3(-0.4, 0.82, 0.48))) + (bayer() - 0.5) * 0.14;
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

export const litMaterial = new ShaderMaterial({ vertexShader, fragmentShader: litFragment, vertexColors: true });
export const glowMaterial = new ShaderMaterial({ vertexShader, fragmentShader: glowFragment, vertexColors: true });

/** A checkerboard-dithered dark disc. It writes no depth, so it never earns an outline. */
export const blobShadowMaterial = new ShaderMaterial({
  vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: /* glsl */ `
${BAYER}
void main() {
  if (bayer() < 0.5) discard;
  gl_FragColor = vec4(0.1, 0.08, 0.22, 1.);
}
`,
  depthWrite: false,
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
