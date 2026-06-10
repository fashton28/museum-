export const duotoneVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Maps the photo's luminance onto the blue→cream ramp. Tiles come in design
 * variants like the original:
 *   uFrame  0 = none · 1 = thin solid frame · 2 = dashed technical frame
 *   uBrightness — hot screens (≈1.85) blow out and bloom; dark slabs ≈1.0
 *   uAlpha  — translucent tiles let the funnel text read through
 */
export const duotoneFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uHover;
uniform vec3 uBlue;
uniform vec3 uCream;
uniform float uBrightness;
uniform float uFrame;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(uBlue, uCream, luma);
  col *= uBrightness + uHover * 0.55;

  if (uFrame > 0.5) {
    vec2 d = min(vUv, 1.0 - vUv);
    float m = min(d.x, d.y);
    float edge = 1.0 - step(0.03, m);                    // border band
    float inset = step(0.012, m);                        // small corner inset
    float per = (d.x < d.y) ? vUv.y * 9.6 : vUv.x * 16.0; // dash coordinate
    float dash = uFrame > 1.5 ? step(0.42, fract(per)) : 1.0;
    col = mix(col, uCream * 1.5, edge * inset * dash * 0.95);
  }

  gl_FragColor = vec4(col, uAlpha + uHover * (1.0 - uAlpha));
}
`;
