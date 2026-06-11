import * as THREE from 'three';

export const BLUE = '#1a0dd9';
export const CREAM = '#efe7d2';

const PHRASES = ['THE FUTURE OF HUMANITY', 'AD ASTRA PER ASPERA'];
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function monoFamilies(): string[] {
  if (typeof document === 'undefined') return ['monospace'];
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return [
    read('--font-mono', '"Courier New", monospace'), // IBM Plex Mono
    read('--font-mono-2', '"Courier New", monospace'), // Space Mono
    read('--font-mono-3', 'monospace'), // VT323 — CRT retro
  ];
}

/**
 * Repeating-typography atlas for the liquid. The canvas v-axis maps 1:1 onto
 * the profile arc length (see applyRingUVs), so rows are constant-height rings.
 *
 * Everything is baked at a UNIFORM aspect: the ring shader repeats the atlas
 * `round(r · REPS_PER_R)` times around each radius, which keeps glyphs at a
 * true 1:1 aspect everywhere — even while the pour streams rows across radii.
 * All rows are upright (no flips); each tiles its row seamlessly.
 */
export function createFunnelTexture(edgeVs: number[] = []): THREE.CanvasTexture {
  const W = 2048;
  const H = 4096;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, W, H);

  // deterministic PRNG so the texture is stable across regenerations
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const families = monoFamilies();
  const baseRowH = H / 96;
  ctx.textBaseline = 'middle';

  let y = 0;
  while (y < H - baseRowH * 0.5) {
    // mixed row heights: mostly small, with occasional big display rows
    const hRoll = rand();
    const hMul = hRoll < 0.14 ? 2.2 : hRoll < 0.28 ? 1.5 : hRoll < 0.55 ? 1 : 0.78;
    const rowH = baseRowH * hMul;
    const yMid = y + rowH / 2;
    const v = yMid / H; // arc position of this row (v-flipped mapping)
    y += rowH;

    // rows holding a ring glow line stay text-free — clean flowing separators
    if (edgeVs.some((ev) => Math.abs(ev - v) < (0.4 * rowH) / H)) continue;

    const isBig = hMul >= 1.5;
    const family = isBig ? SANS : families[rand() < 0.55 ? 0 : rand() < 0.6 ? 1 : 2] ?? families[0];
    const weight = isBig ? 700 : rand() < 0.5 ? 500 : 700;
    const fontPx = rowH * (isBig ? 0.84 : 0.72);
    ctx.font = `${weight} ${fontPx.toFixed(1)}px ${family}`;

    const phrase = (rand() < 0.72 ? PHRASES[0] : PHRASES[1]) + (isBig ? '  ' : '   ');
    const wRaw = Math.max(ctx.measureText(phrase).width, 8);
    const k = Math.max(1, Math.floor(W / wRaw));
    const stride = W / k; // exact division → the u = 0/1 seam tiles cleanly
    const stagger = rand() * stride;

    ctx.fillStyle = CREAM;
    ctx.globalAlpha = 0.85 + rand() * 0.15;
    for (let j = -1; j <= k; j++) {
      ctx.fillText(phrase, j * stride + stagger, yMid);
    }
  }

  // faint ring lines — whisper-thin streaks in the liquid. Kept dim on purpose:
  // bright rims at every seam made the trumpet read as stacked discs instead of
  // one continuous pour. (v-axis is flipped: arc position ev sits at y = ev·H)
  ctx.globalAlpha = 1;
  for (const ev of edgeVs) {
    const ly = ev * H;
    ctx.fillStyle = 'rgba(239, 231, 210, 0.28)';
    ctx.fillRect(0, ly - 1, W, 2);
    ctx.fillStyle = 'rgba(239, 231, 210, 0.09)';
    ctx.fillRect(0, ly - 4, W, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping; // u: shader-driven radius-adaptive repetitions
  texture.wrapT = THREE.RepeatWrapping; // v: the pour streams offset.y
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
