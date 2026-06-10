import * as THREE from 'three';

/**
 * The vortex is a single TRUMPET: a narrow tube at the top flaring smoothly
 * wider as it descends — one continuous monotonic curve, no pit/drain.
 * It is built as a stack of independent RINGS (cap → 2 tube sections → 10
 * terraced flare bands → outer skirt), each its own lathe profile so it can
 * rotate on its own, directions alternating. Terraced bands sit ON the curve:
 * each band takes a fraction of the local drop, a soft cliff takes the rest.
 *
 * A parallel "global" profile (all points in traversal order, top → bottom)
 * provides the arc-length table that maps every ring's UVs into one shared
 * texture atlas.
 */

export interface Band {
  rMid: number;
  yMid: number;
  /** profile-plane surface normal (x = radial component, y = vertical) */
  normal: THREE.Vector2;
  /** usable extent along the profile, for tile sizing */
  width: number;
  /** steep tube bands get world-up tiles; flat flare bands lean toward the axis */
  type: 'flare' | 'tube';
  /** index of the ring this band rides — tiles must match its liquid wobble */
  ringIndex: number;
  /** global profile index range of the band surface (for vMid, set post-build) */
  i0: number;
  i1: number;
  /** v-coordinate (flipped arc) at band middle — for the absorption ripple */
  vMid: number;
}

export interface RingDef {
  points: THREE.Vector2[];
  /** index of this ring's first point in the global profile (for UV lookup) */
  globalStart: number;
  /** signed rotation speed, rad/s — alternates per ring */
  spin: number;
  /** indices into `bands` whose tiles ride this ring */
  bandIndices: number[];
}

const R_TOP = 2.6; // tube radius at the very top
const R_TUBE_END = 3.6; // where the steep tube hands over to the terraced flare
const R_FLARE_END = 30;
const R_LIP = 30; // beyond here the floor curves back UP — fills the horizon, no sky
const R_RIM = 46;
const Y_TOP = 20;
const FLARE_K = 10.4;
const FLARE_Q = 0.32; // < 1 → vertical tangent at the tube, flattening outward — low q = TALL tower
const N_BANDS = 10;

/**
 * The trumpet curve: surface height at radius r. Vertical at r=R_TOP,
 * flattening outward, then rising again past R_LIP (the original's frame is
 * surface to all four corners — the distant floor wraps up around the camera).
 */
export const surfaceY = (r: number) =>
  Y_TOP -
  FLARE_K * Math.pow(Math.max(r - R_TOP, 0), FLARE_Q) +
  0.025 * Math.pow(Math.max(r - R_LIP, 0), 2.6);

const pts: THREE.Vector2[] = [];
export const bands: Band[] = [];
export const rings: RingDef[] = [];
const edgeIdx: number[] = []; // global indices of terrace lip edges (get glow lines)

let cur: RingDef | null = null;
function beginRing() {
  cur = { points: [], globalStart: pts.length, spin: 0, bandIndices: [] };
}
function addPt(x: number, y: number) {
  const p = new THREE.Vector2(x, y);
  pts.push(p);
  cur!.points.push(p);
}
function endRing() {
  rings.push(cur!);
  cur = null;
}

function pushBand(rA: number, yA: number, rB: number, yB: number, i0: number, i1: number) {
  const dir = new THREE.Vector2(rB - rA, yB - yA); // down + outward
  bands.push({
    rMid: (rA + rB) / 2,
    yMid: (yA + yB) / 2,
    normal: new THREE.Vector2(-dir.y, dir.x).normalize(), // up + outward
    width: dir.length(),
    type: Math.abs(dir.y) > Math.abs(dir.x) ? 'tube' : 'flare',
    ringIndex: rings.length,
    i0,
    i1,
    vMid: 0, // filled in after the arc-length table exists
  });
}

// --- rounded cap on the tube tip ---
beginRing();
addPt(0.02, Y_TOP + 0.6);
addPt(R_TOP * 0.55, Y_TOP + 0.45);
addPt(R_TOP * 0.92, Y_TOP + 0.15);
addPt(R_TOP, Y_TOP);
endRing();

// --- steep tube: two ring sections following the curve, each carrying tiles ---
for (const [rA, rB] of [
  [R_TOP, 3.0],
  [3.0, R_TUBE_END],
] as const) {
  beginRing();
  const SAMPLES = 5;
  const i0 = pts.length;
  for (let s = 0; s <= SAMPLES; s++) {
    const r = THREE.MathUtils.lerp(rA, rB, s / SAMPLES);
    addPt(r, surfaceY(r));
  }
  cur!.bandIndices.push(bands.length);
  pushBand(rA, surfaceY(rA), rB, surfaceY(rB), i0, pts.length - 1);
  edgeIdx.push(pts.length - 1);
  endRing();
}

// --- terraced flare bands riding the trumpet curve ---
const edges: number[] = [];
for (let i = 0; i <= N_BANDS; i++) {
  edges.push(R_TUBE_END + (R_FLARE_END - R_TUBE_END) * Math.pow(i / N_BANDS, 1.55));
}

for (let i = 0; i < N_BANDS; i++) {
  const rA = edges[i]; // inner / upper
  const rB = edges[i + 1]; // outer / lower

  // completely smooth: every band sits exactly ON the trumpet curve — no
  // steps, no cliffs. Rings stay independent only for the alternating spin.
  beginRing();
  const SAMPLES = 8;
  const i0 = pts.length;
  for (let s = 0; s <= SAMPLES; s++) {
    const r = THREE.MathUtils.lerp(rA, rB, s / SAMPLES);
    addPt(r, surfaceY(r));
  }
  edgeIdx.push(pts.length - 1); // ring seam — gets a faint flowing glow line

  cur!.bandIndices.push(bands.length);
  pushBand(rA, surfaceY(rA), rB, surfaceY(rB), i0, pts.length - 1);
  endRing();
}

// --- outer wall, curving up around the camera into the foggy horizon ---
beginRing();
{
  const SAMPLES = 12;
  for (let s = 0; s <= SAMPLES; s++) {
    const r = THREE.MathUtils.lerp(R_FLARE_END, R_RIM, s / SAMPLES);
    addPt(r, surfaceY(r));
  }
}
endRing();

// --- alternating spin per ring, varied speeds ---
rings.forEach((r, i) => {
  const dir = i % 2 === 0 ? 1 : -1;
  r.spin = dir * (0.03 + 0.025 * (((i * 7919) % 97) / 97));
});

export const profilePoints = pts;

// --- cumulative normalized arc length per global profile point ---
const arcAbs: number[] = [0];
for (let i = 1; i < pts.length; i++) arcAbs.push(arcAbs[i - 1] + pts[i].distanceTo(pts[i - 1]));
export const totalArc = arcAbs[arcAbs.length - 1];
export const arcLen = arcAbs.map((a) => a / totalArc);

// band mid v-coordinates (flipped arc) — needed for the absorption ripple
for (const b of bands) b.vMid = 1 - (arcLen[b.i0] + arcLen[b.i1]) / 2;

/** The absorption ripple — keep in sync with the GLSL in Funnel.tsx! */
export const RIPPLE = { freq: 80, speed: 0.92, amp: 0.5 };

/** Normalized arc positions of terrace lip edges — drawn as glow lines in the texture. */
export const edgeVs = edgeIdx.map((i) => arcLen[i]);

/** Funnel radius at a normalized arc-length position v ∈ [0,1] along the profile. */
export function radiusAtArc(v: number): number {
  for (let i = 1; i < arcLen.length; i++) {
    if (v <= arcLen[i]) {
      const span = Math.max(arcLen[i] - arcLen[i - 1], 1e-6);
      const f = (v - arcLen[i - 1]) / span;
      return THREE.MathUtils.lerp(pts[i - 1].x, pts[i].x, f);
    }
  }
  return pts[pts.length - 1].x;
}

/**
 * LatheGeometry assigns uv.y = j/(points-1) within the ring's own profile.
 * Rewrite uv.y to 1 − GLOBAL arc length. This single v-axis flip does double
 * duty for the outside view: it un-mirrors the glyphs (one axis flip restores
 * chirality) AND makes glyph-up point INWARD, so text reads upright on the
 * near side of every ring, like the original. uv.x stays untouched.
 */
export function applyRingUVs(geo: THREE.BufferGeometry, ring: RingDef) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const n = ring.points.length;
  for (let i = 0; i < uv.count; i++) {
    const j = Math.round(uv.getY(i) * (n - 1));
    uv.setY(i, 1 - arcLen[ring.globalStart + j]);
  }
  uv.needsUpdate = true;
}

/**
 * THE LIQUID. The wobble is no longer baked: phases travel with scroll, so the
 * surface itself churns and flows — the text (texture) is carried along with
 * it. Evaluated in the rings' vertex shader (see Funnel.tsx) and on the CPU
 * for tiles, which must bob with the surface. Keep both in sync!
 */
export const liquidFlow = (depth: number, time: number) => depth * 0.55 + time * 0.05;

export function wobblePhases(ringIndex: number, flow: number): [number, number, number] {
  return [ringIndex * 2.39 + flow * 1.2, ringIndex * 4.71 + flow * 0.9, ringIndex * 1.13 + flow * 1.5];
}

export function wobbleAt(ringIndex: number, r: number, theta: number, flow = 0) {
  const [p1, p2, p3] = wobblePhases(ringIndex, flow);
  const w =
    Math.sin(2 * theta + p1) * 0.6 +
    Math.sin(3 * theta + p2) * 0.3 +
    Math.sin(5 * theta + p3) * 0.15;
  return {
    dy: w * 0.062 * r,
    rs: 1 + 0.018 * Math.sin(3 * theta + p2) + 0.01 * Math.sin(2 * theta + p1),
  };
}

/** v-range of a ring along the (v-flipped) profile — the shader tapers the
 *  wobble to zero at these ends so independently rotating rings keep meeting
 *  on clean circles. */
export function ringTaper(ring: RingDef): [number, number] {
  return [
    1 - arcLen[ring.globalStart + ring.points.length - 1],
    1 - arcLen[ring.globalStart],
  ];
}

/** Shader repetition density: reps(r) = round(r · REPS_PER_R) atlas tiles
 *  around a ring of radius r gives constant texel density → text keeps a true
 *  1:1 aspect at EVERY radius (outer rings simply repeat the phrase more). */
export const REPS_PER_R = (4 * Math.PI) / totalArc;

export interface TileTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3;
  width: number;
  height: number;
}

const _obj = new THREE.Object3D();

/**
 * Position/orientation/size for a tile on a band at a given azimuth.
 * Axis-space — used as a LOCAL transform inside the band's (rotating) ring
 * group. Pass the current `flow` (liquidFlow) so the tile bobs with the waves.
 */
export function getTileTransform(
  bandIndex: number,
  angleDeg: number,
  flow = 0,
  time = 0,
  lift = 0.5, // tiles hover clearly ABOVE the liquid, like the original
): TileTransform {
  const band = bands[bandIndex];
  const th = THREE.MathUtils.degToRad(angleDeg);
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const normal = new THREE.Vector3(band.normal.x * cos, band.normal.y, band.normal.x * sin).normalize();
  // follow the ring's liquid wobble (band surface sits at ~0.8 of the boundary taper)
  const TAPER = 0.8;
  const { dy, rs } = wobbleAt(band.ringIndex, band.rMid, th, flow);
  // ride the upward-traveling absorption swell too (same wave as the shader)
  const ripple = Math.sin(band.vMid * RIPPLE.freq - time * RIPPLE.speed + th * 2) * RIPPLE.amp;
  const rWob = band.rMid * (1 + (rs - 1) * TAPER);
  const position = new THREE.Vector3(
    rWob * cos,
    band.yMid + (dy + ripple * 0.062 * band.rMid) * TAPER,
    rWob * sin,
  ).addScaledVector(normal, lift);

  _obj.position.copy(position);
  if (band.type === 'flare') {
    _obj.up.set(-cos, 0.35, -sin).normalize(); // portrait top leans toward the axis
  } else {
    _obj.up.set(0, 1, 0);
  }
  _obj.lookAt(position.clone().add(normal));

  // landscape rectangles, like the original's video panels
  const height = Math.min(band.width * 0.98, band.rMid * 0.75);
  const width = height * 1.6;
  return { position, quaternion: _obj.quaternion.clone(), normal, width, height };
}
