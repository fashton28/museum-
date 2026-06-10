import { Effect } from 'postprocessing';
import { Uniform } from 'three';

/**
 * Chunky animated film grain. Brighter areas get extra speckle (emulsion-like),
 * but the base grain is visible on the dark blue too — matching the original's
 * gritty CRT look better than the stock Noise effect.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uStrength;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // ~1.5px cells at full res for a chunky, slightly digital speckle
  vec2 cell = floor(uv * resolution / 1.5);
  float n = hash(cell + floor(uTime * 24.0) * 17.31);
  float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  float amount = uStrength * (0.3 + luma * 1.4); // mostly on midtones/highlights, like film
  vec3 col = inputColor.rgb + (n - 0.5) * amount;
  outputColor = vec4(col, inputColor.a);
}
`;

export class GrainEffect extends Effect {
  constructor(strength = 0.16) {
    super('GrainEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uStrength', new Uniform(strength)],
      ]),
    });
  }
}
