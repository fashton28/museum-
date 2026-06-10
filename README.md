# The Scaling Era 

A one-to-one frontend replica of the Stripe Press ["The Scaling Era"](https://press.stripe.com) experience: a terraced text vortex with a central column, scroll-driven descent with a liquid warp distortion, glowing clickable interview tiles, and a fullscreen modal over a blurred live scene.

Stack: **Next.js (App Router) + React Three Fiber + drei + postprocessing**. Frontend only.

```bash
npm run dev    # http://localhost:3000
npm run build  # production build
```

## How it works

| Piece | Where | Notes |
| --- | --- | --- |
| Ring stack | `lib/funnelProfile.ts` | The vortex is a single TRUMPET curve `surfaceY(r)` — narrow tube at top flaring smoothly wider downward (NO steps/terraces — bands sit exactly on the curve), rising again past r=30 into a steep outer wall that wraps the horizon (the frame is surface to every corner, no sky). ~14 independent lathe RINGS share one arc-length UV atlas; each spins on its own, directions alternating; tiles ride their ring as children. `applyLiquidWobble` adds the per-ring organic undulation. |
| The pour (∞) | `components/Funnel.tsx` | Infinite scroll = LIQUID POURING: scroll depth is unbounded; it streams `texture.offset.y` AND travels the wobble phases in the rings' vertex shader, so the SURFACE itself churns downstream with the text stuck to it. Tiles bob with the same waves (per-frame `getTileTransform(.., flow)`). The camera path saturates and NEVER resets. ⚠ the GLSL wobble in Funnel.tsx must stay in sync with `wobbleAt`/`wobblePhases` in funnelProfile.ts. |
| Text fidelity | shader patch in `Funnel.tsx` | The atlas is baked at uniform aspect; the fragment shader repeats it `round(r·REPS_PER_R)`× around each radius (crossfading between integer levels) → glyphs keep a true 1:1 aspect at EVERY radius, flowing or not. The v-axis is flipped (`applyRingUVs`) so text is unmirrored from outside AND reads upright on near sides. No flipped rows. |
| Funnel render | `components/Funnel.tsx` | One `RingGroup` per ring: per-ring tint variation, spin damped to a near-stop while a tile is open. |
| Text texture | `lib/textTexture.ts` | 2048×4096 `CanvasTexture`, variable-height rows: big Helvetica display rows + small mono rows (Plex/Space Mono/VT323), some flipped. Per-row horizontal pre-stretch `sx = uScale/vScale` keeps glyph aspect 1:1 at every radius (this is what makes the text legible — without it, text compresses as the funnel narrows). Rows under a terrace lip stay text-free and carry a cream glow line. |
| Liquid warp | `shaders/LiquidWarpEffect.ts` | Fullscreen `mainUv` distortion (simplex noise, radial + swirl) driven by damped scroll+drag velocity (`uVelocity`) and the click-dive envelope (`uBoost`). |
| Grain | `shaders/GrainEffect.ts` | Custom chunky animated speckle, luminance-weighted. |
| Camera | `components/CameraRig.tsx` | Wheel scroll = descend/pour; pointer drag = orbit (dx) + depth (dy), with click suppression past 8px of drag. Dive targets capture the tile's live world pose (rings rotate). Single palette — the original blue only. ⚠ pose dummies must be `PerspectiveCamera` — `Object3D.lookAt` points +Z, cameras look −Z. |
| Audio | `lib/audioEngine.ts` | WebAudio: ambient loop + brown-noise warp layer through a shared lowpass. Motion (velocity/boost) raises warp gain, bends ambient pitch, and opens the filter — the "harder warping sound". |
| Modal | `components/ui/Overlay.tsx` | CSS `backdrop-filter` blur over the still-rendering canvas. ESC or ✕ to close. |
| State | `lib/store.ts` | zustand; per-frame values written transiently via `setState` (no React re-renders in the frame loop). |

## Replacing the placeholders

- **Tile images** — drop portraits into `public/tiles/01.jpg … 12.jpg` (600×800-ish, any grayscale/color — they're duotoned in-shader) and edit names/roles/positions in `lib/tilesData.ts`.
- **Audio** — replace `public/audio/ambient.wav` (base loop) and `public/audio/warp.wav` (motion layer) with any seamless loops.
- **Copy** — phrases live at the top of `lib/textTexture.ts`.

## Dev screenshots

`node scripts/shot.mjs out.png [scrollDelta] [clickX,clickY] [waitMs]` screenshots the running app headlessly (requires `npx playwright install chromium`). Note: headless uses SwiftShader software GL, so FPS there is not representative.
# museum-
