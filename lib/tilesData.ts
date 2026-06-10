export interface TileData {
  id: string;
  name: string;
  role: string;
  img: string;
  bandIndex: number; // tube bands 0–1 (top), flare bands 2–11 (inner→outer)
  angleDeg: number;
  /** design treatment: 0 = dashed frame + translucent · 1 = hot screen · 2 = dark slab, thin frame */
  variant: 0 | 1 | 2;
}

/**
 * THE MUSEUM — exhibits of humanity's technological ascent, arranged
 * chronologically: the past at the tower's tip, flowing outward and down
 * toward the future at the rim.
 */
export const TILES: TileData[] = [
  // — the age of electricity and machines —
  { id: 'edison', name: 'THOMAS EDISON', role: 'THE ELECTRIC LIGHT — 1879', img: '/tiles/edison.jpg', bandIndex: 0, angleDeg: 80, variant: 2 },
  { id: 'tesla', name: 'NIKOLA TESLA', role: 'ALTERNATING CURRENT — THE GRID', img: '/tiles/tesla.jpg', bandIndex: 1, angleDeg: 230, variant: 0 },
  { id: 'wright', name: 'THE WRIGHT BROTHERS', role: 'FIRST POWERED FLIGHT — KITTY HAWK, 1903', img: '/tiles/wright.jpg', bandIndex: 2, angleDeg: 300, variant: 1 },
  { id: 'modelt', name: 'FORD MODEL T', role: 'MOTION FOR THE MULTITUDE — 1908', img: '/tiles/modelt.jpg', bandIndex: 3, angleDeg: 140, variant: 2 },
  // — the age of computing —
  { id: 'eniac', name: 'ENIAC', role: 'THE FIRST GENERAL-PURPOSE COMPUTER — 1945', img: '/tiles/eniac.jpg', bandIndex: 4, angleDeg: 200, variant: 0 },
  { id: 'transistor', name: 'THE TRANSISTOR', role: 'BELL LABS — 1947', img: '/tiles/transistor.jpg', bandIndex: 5, angleDeg: 15, variant: 1 },
  { id: 'feynman', name: 'RICHARD FEYNMAN', role: 'PHYSICIST AND NOBEL LAUREATE', img: '/tiles/feynman.jpg', bandIndex: 6, angleDeg: 130, variant: 2 },
  { id: 'lhc', name: 'CERN', role: 'THE LARGE HADRON COLLIDER', img: '/tiles/lhc.jpg', bandIndex: 6, angleDeg: 310, variant: 0 },
  // — the space age —
  { id: 'earthrise', name: 'EARTHRISE', role: 'APOLLO 8 — 1968', img: '/tiles/earthrise.jpg', bandIndex: 7, angleDeg: 250, variant: 1 },
  { id: 'apollo11', name: 'APOLLO 11', role: 'FIRST HUMANS ON THE MOON — 1969', img: '/tiles/apollo11.jpg', bandIndex: 7, angleDeg: 30, variant: 2 },
  { id: 'apple1', name: 'APPLE I', role: 'STEVE JOBS & STEVE WOZNIAK — 1976', img: '/tiles/apple1.jpg', bandIndex: 8, angleDeg: 60, variant: 0 },
  // — the future —
  { id: 'palmer', name: 'PALMER LUCKEY', role: 'FOUNDER OF OCULUS AND ANDURIL', img: '/tiles/palmer.jpeg', bandIndex: 9, angleDeg: 320, variant: 2 },
  { id: 'falconheavy', name: 'FALCON HEAVY', role: 'SPACEX — 2018', img: '/tiles/falconheavy.jpg', bandIndex: 9, angleDeg: 100, variant: 1 },
  { id: 'starman', name: 'STARMAN', role: 'A ROADSTER AMONG THE STARS — 2018', img: '/tiles/starman.jpg', bandIndex: 10, angleDeg: 170, variant: 0 },
  { id: 'starship', name: 'SPACEX', role: 'STARSHIP — THE ROAD TO MARS', img: '/tiles/spaceX.jpg', bandIndex: 11, angleDeg: 220, variant: 1 },
  { id: 'jwst', name: 'JAMES WEBB SPACE TELESCOPE', role: "WEBB'S FIRST DEEP FIELD — 2022", img: '/tiles/jwst.jpg', bandIndex: 11, angleDeg: 10, variant: 2 },
];

export const getTileById = (id: string) => TILES.find((t) => t.id === id);
