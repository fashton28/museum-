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

const SPACEX = { name: 'SPACEX', role: 'STARSHIP — THE ROAD TO MARS', img: '/tiles/spaceX.jpg' };
const PALMER = { name: 'PALMER LUCKEY', role: 'FOUNDER OF OCULUS AND ANDURIL', img: '/tiles/palmer.jpeg' };
const WRIGHT = { name: 'THE WRIGHT BROTHERS', role: 'FIRST POWERED FLIGHT — KITTY HAWK, 1903', img: '/tiles/wright.jpg' };
const FEYNMAN = { name: 'RICHARD FEYNMAN', role: 'PHYSICIST AND NOBEL LAUREATE', img: '/tiles/feynman.jpg' };

export const TILES: TileData[] = [
  { id: 'spacex-1', ...SPACEX, bandIndex: 0, angleDeg: 80, variant: 1 },
  { id: 'palmer-1', ...PALMER, bandIndex: 1, angleDeg: 230, variant: 0 },
  { id: 'wright-1', ...WRIGHT, bandIndex: 3, angleDeg: 300, variant: 2 },
  { id: 'feynman-1', ...FEYNMAN, bandIndex: 4, angleDeg: 200, variant: 0 },
  { id: 'spacex-2', ...SPACEX, bandIndex: 5, angleDeg: 15, variant: 0 },
  { id: 'palmer-2', ...PALMER, bandIndex: 6, angleDeg: 130, variant: 2 },
  { id: 'wright-2', ...WRIGHT, bandIndex: 7, angleDeg: 250, variant: 1 },
  { id: 'feynman-2', ...FEYNMAN, bandIndex: 7, angleDeg: 30, variant: 2 },
  { id: 'spacex-3', ...SPACEX, bandIndex: 8, angleDeg: 60, variant: 2 },
  { id: 'palmer-3', ...PALMER, bandIndex: 9, angleDeg: 320, variant: 1 },
  { id: 'wright-3', ...WRIGHT, bandIndex: 10, angleDeg: 170, variant: 0 },
  { id: 'feynman-3', ...FEYNMAN, bandIndex: 11, angleDeg: 220, variant: 1 },
];

export const getTileById = (id: string) => TILES.find((t) => t.id === id);
