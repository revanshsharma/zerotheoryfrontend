/**
 * Per-room mood: a dusk colour-grade, soft lamp pools and drifting specks.
 * Mood only: warm sunset oranges, pool-water blues and greens, quiet cream light. Pure data, easy to extend.
 */
export type GradeStop = [offset: number, color: string, alpha: number];

export interface Glow {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
  /** slow breathing instead of a steady glow */
  breathe?: boolean;
}

export interface Motes {
  type: 'dust' | 'fireflies' | 'pollen' | 'embers';
  count: number;
  color: string;
}

export interface Mood {
  /** gradient laid over the whole room, top to bottom */
  grade: GradeStop[];
  glows?: Glow[];
  motes?: Motes[];
  /** map effects replaced by the mood (so they are not drawn twice) */
  skipEffects?: string[];
  /** rooftop: sunset slowly sinks into a night of stars */
  sunset?: { night: GradeStop[]; stars: number };
  /** screen-space finish: vignette strength 0..1, film grain 0..1, and a warm/cool wash */
  screen: { vignette: number; grain: number; top: string; bottom: string };
}

export const MOODS: Record<string, Mood> = {
  'town-square': {
    grade: [
      [0, '#ff9a5a', 0.26],
      [0.5, '#d9684e', 0.14],
      [1, '#1c4a58', 0.3],
    ],
    motes: [
      { type: 'fireflies', count: 18, color: '#e9ffb0' },
      { type: 'dust', count: 22, color: '#ffe2b8' },
    ],
    screen: { vignette: 0.5, grain: 0.5, top: 'rgba(255,150,80,0.18)', bottom: 'rgba(24,70,84,0.22)' },
  },
  rooftop: {
    grade: [
      [0, '#ff8a46', 0.4],
      [0.45, '#c4507c', 0.3],
      [1, '#3a2a5e', 0.34],
    ],
    sunset: {
      night: [
        [0, '#0a0f3a', 0.55],
        [0.6, '#16205a', 0.45],
        [1, '#1a2a50', 0.4],
      ],
      stars: 70,
    },
    glows: [{ x: 360, y: 40, r: 150, color: '#ffa05a', alpha: 0.4, breathe: true }],
    motes: [{ type: 'dust', count: 16, color: '#ffd9b0' }],
    skipEffects: ['stars'],
    screen: { vignette: 0.55, grain: 0.55, top: 'rgba(255,120,60,0.2)', bottom: 'rgba(30,26,80,0.3)' },
  },
  'rain-room': {
    grade: [
      [0, '#2a7a78', 0.3],
      [1, '#0a3040', 0.42],
    ],
    glows: [
      { x: 28, y: 96, r: 80, color: '#ff9a4a', alpha: 0.5, breathe: true },
      { x: 332, y: 112, r: 70, color: '#ff9a4a', alpha: 0.35, breathe: true },
    ],
    motes: [{ type: 'dust', count: 14, color: '#bfe8dc' }],
    screen: { vignette: 0.6, grain: 0.55, top: 'rgba(40,120,120,0.2)', bottom: 'rgba(8,44,60,0.3)' },
  },
  'living-room': {
    grade: [
      [0, '#ff9d5c', 0.24],
      [1, '#6a2a14', 0.28],
    ],
    glows: [
      { x: 42, y: 56, r: 100, color: '#ffb264', alpha: 0.5, breathe: true },
      { x: 346, y: 56, r: 100, color: '#ffb264', alpha: 0.4, breathe: true },
      { x: 176, y: 158, r: 70, color: '#ffc88a', alpha: 0.3, breathe: true },
    ],
    motes: [{ type: 'dust', count: 24, color: '#ffe2b8' }],
    screen: { vignette: 0.5, grain: 0.5, top: 'rgba(255,160,90,0.18)', bottom: 'rgba(100,44,20,0.28)' },
  },
  'listening-room': {
    grade: [
      [0, '#7a3a0c', 0.4],
      [1, '#240e04', 0.55],
    ],
    glows: [
      { x: 104, y: 194, r: 70, color: '#e8955a', alpha: 0.35, breathe: true },
      { x: 248, y: 194, r: 70, color: '#e8955a', alpha: 0.35, breathe: true },
      { x: 164, y: 130, r: 60, color: '#ffb070', alpha: 0.3, breathe: true },
    ],
    motes: [{ type: 'dust', count: 14, color: '#f1d2a0' }],
    screen: { vignette: 0.75, grain: 0.6, top: 'rgba(120,56,14,0.28)', bottom: 'rgba(30,12,4,0.4)' },
  },
  'confession-wall': {
    grade: [
      [0, '#1a1830', 0.42],
      [1, '#0a0a14', 0.5],
    ],
    glows: [
      { x: 142, y: 130, r: 64, color: '#ffb866', alpha: 0.5, breathe: true },
      { x: 164, y: 80, r: 90, color: '#f1e3c1', alpha: 0.16 },
    ],
    motes: [
      { type: 'dust', count: 12, color: '#f1e3c1' },
      { type: 'embers', count: 6, color: '#ffb060' },
    ],
    screen: { vignette: 0.8, grain: 0.6, top: 'rgba(24,22,48,0.3)', bottom: 'rgba(8,8,14,0.45)' },
  },
  garden: {
    grade: [
      [0, '#ffc060', 0.3],
      [0.55, '#9aa04a', 0.12],
      [1, '#26402c', 0.28],
    ],
    glows: [{ x: 320, y: 20, r: 170, color: '#ffc470', alpha: 0.42, breathe: true }],
    motes: [
      { type: 'pollen', count: 26, color: '#ffe6a0' },
      { type: 'fireflies', count: 8, color: '#e9ffb0' },
    ],
    screen: { vignette: 0.4, grain: 0.45, top: 'rgba(255,190,90,0.2)', bottom: 'rgba(30,60,40,0.24)' },
  },
  cafe: {
    grade: [
      [0, '#ffa862', 0.24],
      [1, '#5a2a14', 0.26],
    ],
    motes: [{ type: 'dust', count: 20, color: '#ffe2b8' }],
    screen: { vignette: 0.5, grain: 0.5, top: 'rgba(255,170,100,0.16)', bottom: 'rgba(90,42,20,0.26)' },
  },
  'tv-lounge': {
    grade: [
      [0, '#3a2a5a', 0.3],
      [1, '#0a1a2a', 0.42],
    ],
    motes: [{ type: 'dust', count: 14, color: '#d8e4ff' }],
    screen: { vignette: 0.65, grain: 0.55, top: 'rgba(60,42,100,0.22)', bottom: 'rgba(8,20,36,0.36)' },
  },
  'quiet-nook': {
    grade: [
      [0, '#1c5a68', 0.3],
      [1, '#06143a', 0.46],
    ],
    motes: [{ type: 'fireflies', count: 10, color: '#d9ffc0' }],
    screen: { vignette: 0.7, grain: 0.5, top: 'rgba(30,100,120,0.2)', bottom: 'rgba(6,16,58,0.4)' },
  },
};

export const DEFAULT_MOOD: Mood = MOODS['town-square'];
export const moodFor = (id: string): Mood => MOODS[id] ?? DEFAULT_MOOD;
