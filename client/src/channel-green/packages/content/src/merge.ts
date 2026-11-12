import {
  AvatarDataSchema,
  AvatarPartSchema,
  BodySchema,
  EmoteSchema,
  FurnitureSchema,
  MapSchema,
  PackMetaSchema,
  SoundscapeSchema,
  SwatchSchema,
  TapeSchema,
  TileSchema,
  AVATAR_SLOTS,
  type Registry,
} from '@channel-green/shared';
import { z } from 'zod';

/** Raw, un-validated contents of one pack folder, keyed by the file's path relative to the pack. */
export interface RawPack {
  dir: string;
  files: Record<string, unknown>;
}

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

function parseAll<T extends z.ZodType>(schema: T, items: unknown[], where: string, errors: string[]): z.infer<T>[] {
  const out: z.infer<T>[] = [];
  items.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else {
      const label = (item as { id?: string } | null)?.id ?? `#${i}`;
      for (const issue of r.error.issues) errors.push(`${where} [${label}] ${issue.path.join('.')}: ${issue.message}`);
    }
  });
  return out;
}

function addUnique<T extends { id: string }>(into: Record<string, T>, items: T[], kind: string, pack: string, errors: string[]): void {
  for (const it of items) {
    if (into[it.id]) errors.push(`${pack}: duplicate ${kind} id "${it.id}"`);
    else into[it.id] = it;
  }
}

/** Validates every pack and merges them into one registry. Returns errors instead of throwing so tooling can list them all. */
export function mergePacks(packs: RawPack[]): { registry: Registry; errors: string[] } {
  const errors: string[] = [];
  const reg: Registry = {
    packs: [],
    tiles: {},
    furniture: {},
    maps: {},
    soundscapes: {},
    tapes: {},
    emotes: [],
    avatar: { skins: [], hairColors: [], clothColors: [], bodies: [], parts: [] },
  };
  const seen = <T extends { id: string }>(list: T[], items: T[], kind: string, pack: string) => {
    for (const it of items) {
      if (list.some((x) => x.id === it.id)) errors.push(`${pack}: duplicate ${kind} id "${it.id}"`);
      else list.push(it);
    }
  };
  for (const pack of packs) {
    const name = pack.dir;
    const metaRaw = pack.files['pack.json'];
    const meta = PackMetaSchema.safeParse(metaRaw);
    if (!meta.success) {
      for (const issue of meta.error.issues) errors.push(`${name}/pack.json ${issue.path.join('.')}: ${issue.message}`);
      continue;
    }
    reg.packs.push(meta.data);
    for (const [file, content] of Object.entries(pack.files)) {
      const where = `${name}/${file}`;
      if (file === 'pack.json') continue;
      if (file === 'tiles.json' || file.startsWith('tiles/')) addUnique(reg.tiles, parseAll(TileSchema, asList(content), where, errors), 'tile', name, errors);
      else if (file.startsWith('furniture/')) addUnique(reg.furniture, parseAll(FurnitureSchema, asList(content), where, errors), 'furniture', name, errors);
      else if (file.startsWith('maps/')) addUnique(reg.maps, parseAll(MapSchema, asList(content), where, errors), 'map', name, errors);
      else if (file === 'soundscapes.json' || file.startsWith('soundscapes/')) addUnique(reg.soundscapes, parseAll(SoundscapeSchema, asList(content), where, errors), 'soundscape', name, errors);
      else if (file === 'tapes.json' || file.startsWith('tapes/')) addUnique(reg.tapes, parseAll(TapeSchema, asList(content), where, errors), 'tape', name, errors);
      else if (file === 'emotes.json') seen(reg.emotes, parseAll(EmoteSchema, asList(content), where, errors), 'emote', name);
      else if (file === 'avatar/swatches.json') {
        const r = AvatarDataSchema.omit({ parts: true }).safeParse(content);
        if (!r.success) for (const issue of r.error.issues) errors.push(`${where} ${issue.path.join('.')}: ${issue.message}`);
        else {
          seen(reg.avatar.skins, r.data.skins, 'skin', name);
          seen(reg.avatar.hairColors, r.data.hairColors, 'hair colour', name);
          seen(reg.avatar.clothColors, r.data.clothColors, 'cloth colour', name);
          seen(reg.avatar.bodies, r.data.bodies, 'body', name);
        }
      } else if (file.startsWith('avatar/')) {
        const parts = parseAll(AvatarPartSchema, asList(content), where, errors);
        seen(reg.avatar.parts, parts, 'avatar part', name);
      } else errors.push(`${where}: file is not recognised (see docs/CONTENT-PACKS.md for the folder layout)`);
    }
  }
  errors.push(...checkReferences(reg));
  return { registry: reg, errors };
}

/** Cross-file checks: everything a map points at must exist. Portal reachability is covered by the unit tests. */
export function checkReferences(reg: Registry): string[] {
  const errors: string[] = [];
  for (const m of Object.values(reg.maps)) {
    const tag = `map "${m.id}"`;
    const cols = Math.max(...m.tiles.rows.map((r) => r.length));
    m.tiles.rows.forEach((r, y) => {
      if (r.length !== cols) errors.push(`${tag}: row ${y} has ${r.length} tiles, expected ${cols}`);
      for (const ch of r) if (!m.tiles.legend[ch]) errors.push(`${tag}: row ${y} uses "${ch}" which is not in the legend`);
    });
    for (const [ch, tile] of Object.entries(m.tiles.legend)) if (!reg.tiles[tile]) errors.push(`${tag}: legend "${ch}" -> unknown tile "${tile}"`);
    for (const o of m.objects) if (!reg.furniture[o.furniture]) errors.push(`${tag}: unknown furniture "${o.furniture}"`);
    if (m.ambience && !reg.soundscapes[m.ambience]) errors.push(`${tag}: unknown soundscape "${m.ambience}"`);
    for (const [name, [x, y]] of Object.entries(m.spawns)) if (x < 0 || y < 0 || x >= cols || y >= m.tiles.rows.length) errors.push(`${tag}: spawn "${name}" is outside the map`);
    for (const p of m.portals) {
      const target = reg.maps[p.to];
      if (!target) errors.push(`${tag}: portal "${p.id}" -> unknown map "${p.to}"`);
      else if (p.spawn && !target.spawns[p.spawn]) errors.push(`${tag}: portal "${p.id}" -> map "${p.to}" has no spawn "${p.spawn}"`);
      else if (!p.spawn && !target.spawns.start && !target.spawns.door) errors.push(`${tag}: portal "${p.id}" -> map "${p.to}" has no default spawn`);
    }
    if (!m.spawns.start && !m.spawns.door && Object.keys(m.spawns).length === 0) errors.push(`${tag}: needs at least one spawn`);
  }
  if (!reg.maps['town-square']) errors.push('the registry must contain a map called "town-square" (the arrival hub)');
  for (const p of reg.avatar.parts) {
    if (!p.views && !['bottom', 'shoes'].includes(p.slot)) errors.push(`avatar part "${p.id}" has no art`);
    if (!AVATAR_SLOTS.includes(p.slot)) errors.push(`avatar part "${p.id}" has an unknown slot`);
  }
  for (const slot of ['top', 'bottom', 'shoes', 'hair'] as const) if (!reg.avatar.parts.some((p) => p.slot === slot)) errors.push(`no avatar part for slot "${slot}"`);
  if (!reg.avatar.skins.length || !reg.avatar.hairColors.length || !reg.avatar.clothColors.length || !reg.avatar.bodies.length) errors.push('avatar swatches/bodies are empty');
  return errors;
}

export { SwatchSchema, BodySchema };
