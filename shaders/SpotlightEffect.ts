import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

/**
 * Screen-space cursor spotlight. The scene is unlit (MeshBasicMaterial), so a
 * THREE light can't touch it — instead a soft gaussian pool of light follows
 * the pointer. It runs BEFORE bloom, so the brightened text under the cursor
 * blooms harder, reading as the surface catching a beam.
 */
const fragmentShader = /* glsl */ `
uniform vec2 uMouse;     // uv coords, damped
uniform float uStrength;
uniform float uRadius;   // in units of viewport height

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = uv - uMouse;
  d.x *= resolution.x / resolution.y; // circular spot regardless of aspect
  float spot = exp(-dot(d, d) / (2.0 * uRadius * uRadius));
  vec3 col = inputColor.rgb * (1.0 + spot * uStrength);
  col += spot * vec3(0.045, 0.04, 0.10); // faint cool lift so even dark blue glows
  outputColor = vec4(col, inputColor.a);
}
`;

export class SpotlightEffect extends Effect {
  constructor() {
    super('SpotlightEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uMouse', new Uniform(new Vector2(0.5, 0.5))],
        ['uStrength', new Uniform(1.25)],
        ['uRadius', new Uniform(0.2)],
      ]),
    });
  }
}
