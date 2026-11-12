import { z } from 'zod';

/**
 * Content-pack schemas. A pack is a folder of JSON files (see docs/CONTENT-PACKS.md).
 * `npm run content:build` validates every pack against these schemas and merges them
 * into one registry that the realtime server and the web app both load.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/, 'ids are lowercase letters, digits and dashes');
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use #rrggbb');
/** A colour token (one letter such as H, S, C) or a literal #rrggbb. */
const colorRef = z.string().regex(/^([A-Za-z]|#[0-9a-fA-F]{6})$/);
const text = (max: number) => z.string().min(1).max(max);

export const RectSchema = z.tuple([z.number().int(), z.number().int(), z.number().int().positive(), z.number().int().positive(), colorRef]);
export type ArtRect = z.infer<typeof RectSchema>;

export const ArtSchema = z.object({
  rects: z.array(RectSchema).max(200).optional(),
  /** ASCII art: each character is a colour token, "." is transparent. */
  rows: z.array(z.string().max(64)).max(64).optional(),
  at: z.tuple([z.number().int(), z.number().int()]).optional(),
  /** colours for `rows` characters that are not standard tokens, e.g. {"x":"#ff0000"} */
  palette: z.record(z.string().length(1), hex).optional(),
});
export type Art = z.infer<typeof ArtSchema>;

export const AVATAR_SLOTS = ['hair', 'hat', 'face', 'neck', 'top', 'bottom', 'shoes'] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

export const AvatarPartSchema = z.object({
  id,
  name: text(40),
  slot: z.enum(AVATAR_SLOTS),
  /** Which view the art is for. `side` is the left-facing view; right is mirrored. */
  views: z.object({ down: ArtSchema.optional(), up: ArtSchema.optional(), side: ArtSchema.optional() }).optional(),
  /** top: sleeves cover arms. */
  sleeves: z.enum(['none', 'short', 'long']).optional(),
  /** bottom: fraction of the leg covered, 0..1. */
  coverage: z.number().min(0).max(1).optional(),
  /** bottom: draw a flared skirt below the torso. */
  flare: z.boolean().optional(),
  /** shoes: rows tall. */
  height: z.number().int().min(0).max(4).optional(),
  /** shoes: sole colour token or hex. */
  sole: colorRef.optional(),
  /** hat: hides hair art under it. */
  hidesHair: z.boolean().optional(),
  /** Fixed colour for shoes / parts that ignore the colour pickers. */
  color: colorRef.optional(),
  /** If false the colour picker for this slot is hidden (art uses fixed colours). */
  tintable: z.boolean().optional(),
  credit: text(120).optional(),
});
export type AvatarPart = z.infer<typeof AvatarPartSchema>;

export const BodySchema = z.object({
  id,
  name: text(40),
  legLength: z.number().int().min(3).max(9),
  torsoWidth: z.number().int().min(8).max(10),
});
export type BodyDef = z.infer<typeof BodySchema>;

export const SwatchSchema = z.object({ id, name: text(40), main: hex, shade: hex.optional() });
export type Swatch = z.infer<typeof SwatchSchema>;

export const TileSchema = z.object({
  id,
  name: text(40),
  solid: z.boolean().optional(),
  base: hex,
  colors: z.array(hex).max(6).optional(),
  pattern: z.enum(['flat', 'speckle', 'grass', 'cobble', 'planks', 'brick', 'checker', 'waves', 'carpet', 'tiles', 'soil', 'roof', 'wallpaper']).default('flat'),
  density: z.number().min(0).max(1).optional(),
  /** Hand-drawn 16x16 art overrides `pattern`. Characters are palette keys. */
  art: ArtSchema.optional(),
  /** Water-like tiles shimmer in the renderer. */
  shimmer: z.boolean().optional(),
});
export type TileDef = z.infer<typeof TileSchema>;

export const InteractionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('inspect'), text: text(240) }),
  z.object({ kind: z.literal('sit'), dir: z.enum(['down', 'up', 'left', 'right']).optional() }),
  z.object({ kind: z.literal('panel'), panel: z.enum(['watch', 'listen', 'confession', 'noticeboard']) }),
  z.object({ kind: z.literal('wish') }),
]);
export type InteractionDef = z.infer<typeof InteractionSchema>;

export const LightSchema = z.object({
  x: z.number(),
  y: z.number(),
  radius: z.number().min(4).max(200),
  color: hex,
  intensity: z.number().min(0).max(1).default(0.5),
  flicker: z.number().min(0).max(1).optional(),
});
export type LightDef = z.infer<typeof LightSchema>;

export const FurnitureSchema = z.object({
  id,
  name: text(40),
  /** size in pixels */
  size: z.tuple([z.number().int().positive().max(256), z.number().int().positive().max(256)]),
  parts: z.array(RectSchema).max(400).optional(),
  art: ArtSchema.optional(),
  /** solid footprint in pixels relative to the sprite's top-left: [x, y, w, h] */
  footprint: z.tuple([z.number().int(), z.number().int(), z.number().int().positive(), z.number().int().positive()]).optional(),
  interaction: InteractionSchema.optional(),
  light: LightSchema.optional(),
  anim: z.enum(['sway', 'flicker', 'bob', 'smoke', 'glow', 'tv']).optional(),
  /** Always draw below players (rugs, flowers). */
  flat: z.boolean().optional(),
  prompt: text(40).optional(),
});
export type FurnitureDef = z.infer<typeof FurnitureSchema>;

export const PlacementSchema = z.object({
  furniture: id,
  /** position in pixels (top-left of the sprite) */
  at: z.tuple([z.number().int(), z.number().int()]),
  text: text(240).optional(),
  label: text(40).optional(),
  /** Draw-order bias in pixels: positive draws in front of things whose feet are lower (items standing on a counter or table). */
  depth: z.number().int().min(-64).max(64).optional(),
});
export type Placement = z.infer<typeof PlacementSchema>;

export const PortalSchema = z.object({
  id,
  label: text(40),
  /** trigger area in tiles: [x, y, w, h] */
  rect: z.tuple([z.number().int(), z.number().int(), z.number().int().positive(), z.number().int().positive()]),
  to: id,
  spawn: z.string().optional(),
});
export type PortalDef = z.infer<typeof PortalSchema>;

export const EffectSchema = z.object({
  type: z.enum(['fireflies', 'leaves', 'stars', 'rain', 'dust', 'smoke', 'lanterns', 'petals', 'snow']),
  count: z.number().int().min(1).max(200).optional(),
  color: hex.optional(),
});
export type EffectDef = z.infer<typeof EffectSchema>;

export const MapSchema = z.object({
  id,
  name: text(40),
  blurb: text(200),
  category: z.enum(['hub', 'social', 'signature', 'quiet']),
  /** Which room-level features exist here. */
  features: z.array(z.enum(['watch', 'listen', 'confession'])).default([]),
  capacity: z.number().int().min(2).max(100).default(40),
  /** Players may open private/invite-only copies of this room. */
  allowPrivate: z.boolean().default(true),
  voice: z.enum(['proximity', 'room', 'off']).default('room'),
  /** quiet rooms: chat only through gentle emotes and short notes. */
  quiet: z.boolean().optional(),
  ambience: id.optional(),
  /** Colour wash over the world. */
  tint: z.object({ color: hex, alpha: z.number().min(0).max(0.8) }).optional(),
  background: hex.optional(),
  tiles: z.object({ legend: z.record(z.string().length(1), id), rows: z.array(z.string()).min(4).max(64) }),
  objects: z.array(PlacementSchema).max(300).default([]),
  portals: z.array(PortalSchema).max(16).default([]),
  spawns: z.record(z.string(), z.tuple([z.number().int(), z.number().int()])),
  effects: z.array(EffectSchema).max(8).default([]),
});
export type MapDef = z.infer<typeof MapSchema>;

export const SoundscapeSchema = z.object({
  id,
  name: text(40),
  layers: z
    .array(
      z.object({
        type: z.enum(['noise', 'drone', 'crickets', 'chimes', 'rain', 'hum']),
        gain: z.number().min(0).max(1),
        freq: z.number().min(20).max(12000).optional(),
        freqs: z.array(z.number().min(20).max(4000)).max(6).optional(),
        q: z.number().min(0.1).max(20).optional(),
        rate: z.number().min(0.01).max(20).optional(),
      }),
    )
    .max(6),
});
export type SoundscapeDef = z.infer<typeof SoundscapeSchema>;

export const TapeSchema = z.object({
  id,
  title: text(60),
  artist: text(60),
  bpm: z.number().min(40).max(140),
  root: z.number().int().min(24).max(72),
  scale: z.enum(['major', 'minor', 'dorian', 'pentatonic', 'lydian']),
  /** chord roots as scale degrees (0-based) */
  progression: z.array(z.number().int().min(0).max(6)).min(2).max(8),
  seed: z.number().int(),
  mood: text(60),
  bars: z.number().int().min(8).max(128).default(32),
});
export type TapeDef = z.infer<typeof TapeSchema>;

export const EmoteSchema = z.object({ id, label: text(24), glyph: z.string().min(1).max(8) });
export type EmoteDef = z.infer<typeof EmoteSchema>;

export const PackMetaSchema = z.object({
  id,
  name: text(60),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: text(80),
  /** SPDX id of the licence covering the art/data in this pack. */
  license: text(40),
  description: text(240).optional(),
  homepage: z.string().url().optional(),
});
export type PackMeta = z.infer<typeof PackMetaSchema>;

export const AvatarDataSchema = z.object({
  skins: z.array(SwatchSchema).default([]),
  hairColors: z.array(SwatchSchema).default([]),
  clothColors: z.array(SwatchSchema).default([]),
  bodies: z.array(BodySchema).default([]),
  parts: z.array(AvatarPartSchema).default([]),
});

export type Registry = {
  packs: PackMeta[];
  tiles: Record<string, TileDef>;
  furniture: Record<string, FurnitureDef>;
  maps: Record<string, MapDef>;
  soundscapes: Record<string, SoundscapeDef>;
  tapes: Record<string, TapeDef>;
  emotes: EmoteDef[];
  avatar: {
    skins: Swatch[];
    hairColors: Swatch[];
    clothColors: Swatch[];
    bodies: BodyDef[];
    parts: AvatarPart[];
  };
};
