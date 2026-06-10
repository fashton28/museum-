import { useStore } from './store';

/**
 * WebAudio engine, lazily created on the first sound-toggle click (autoplay-safe).
 *
 *   ambient.wav (loop) ─ ambientGain ─┐
 *                                     ├─ lowpass filter ─ master ─ destination
 *   warp.wav   (loop) ─ warpGain ────┘
 *
 * Reactivity (per animation frame, from store velocity + dive boost):
 *  - warpGain rises with motion → the "harder warping sound"
 *  - ambient playbackRate bends up slightly → pitch swells while warping
 *  - lowpass opens with motion → the whole mix gets brighter and harsher
 */

let ctx: AudioContext | null = null;
let master: GainNode;
let filter: BiquadFilterNode;
let ambientGain: GainNode;
let warpGain: GainNode;
let ambientSrc: AudioBufferSourceNode;
let raf = 0;

async function loadLoop(url: string, gain: GainNode): Promise<AudioBufferSourceNode> {
  const buf = await fetch(url)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx!.decodeAudioData(b));
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  gain.connect(filter);
  src.start();
  return src;
}

async function init() {
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 650;
  filter.connect(master);

  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.85;
  warpGain = ctx.createGain();
  warpGain.gain.value = 0;

  [ambientSrc] = await Promise.all([
    loadLoop('/audio/ambient.wav', ambientGain),
    loadLoop('/audio/warp.wav', warpGain),
  ]);

  const tick = () => {
    const st = useStore.getState();
    const drive = Math.min(1.5, st.velocity * 1.3 + st.boost * 1.5);
    warpGain.gain.value += (drive * 1.15 - warpGain.gain.value) * 0.12;
    ambientSrc.playbackRate.value += (1 + drive * 0.35 - ambientSrc.playbackRate.value) * 0.08;
    filter.frequency.value += (650 + drive * 2800 - filter.frequency.value) * 0.1;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

export async function setSound(on: boolean): Promise<void> {
  if (on && !ctx) await init();
  if (!ctx) return;
  if (on && ctx.state === 'suspended') await ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.8);
}

export function disposeAudio() {
  cancelAnimationFrame(raf);
  ctx?.close();
  ctx = null;
}
