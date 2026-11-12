import { useEffect, useMemo, useRef } from 'react';
import {
  FRAME_H,
  FRAME_W,
  NONE,
  partsFor,
  randomAvatar,
  renderAvatarSheet,
  sanitizeAvatar,
  type AvatarConfig,
  type AvatarSlot,
} from '@channel-green/shared';
import { bufToCanvas } from '@cg/lib/art';
import { registry } from '@cg/lib/registry';

const reg = registry.avatar;

type ColorKey = 'skin' | 'hairColor' | 'hatColor' | 'neckColor' | 'topColor' | 'bottomColor' | 'shoesColor';
const SLOTS: { slot: AvatarSlot; label: string; color?: ColorKey; colors: 'skins' | 'hairColors' | 'clothColors' }[] = [
  { slot: 'hair', label: 'Hair', color: 'hairColor', colors: 'hairColors' },
  { slot: 'hat', label: 'Hat', color: 'hatColor', colors: 'clothColors' },
  { slot: 'face', label: 'Face' , colors: 'clothColors'},
  { slot: 'neck', label: 'Neck', color: 'neckColor', colors: 'clothColors' },
  { slot: 'top', label: 'Top', color: 'topColor', colors: 'clothColors' },
  { slot: 'bottom', label: 'Bottom', color: 'bottomColor', colors: 'clothColors' },
  { slot: 'shoes', label: 'Shoes', color: 'shoesColor', colors: 'clothColors' },
];

export function Preview({ avatar, scale = 4, dir = 0 }: { avatar: AvatarConfig; scale?: number; dir?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const sheet = bufToCanvas(renderAvatarSheet(avatar, reg));
    let n = 0;
    const draw = () => {
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      const col = n % 2 === 0 ? 0 : 1;
      ctx.drawImage(sheet, col * FRAME_W, dir * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W * scale, FRAME_H * scale);
      n++;
    };
    draw();
    const t = setInterval(draw, 700);
    return () => clearInterval(t);
  }, [avatar, scale, dir]);
  return <canvas ref={ref} width={FRAME_W * scale} height={FRAME_H * scale} className="pixelated" aria-label="Your avatar" role="img" />;
}

export function AvatarEditor({ value, onChange }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void }) {
  const set = (patch: Partial<AvatarConfig>) => onChange(sanitizeAvatar({ ...value, ...patch }, reg));
  const dirs = useMemo(() => [0, 2, 1], []);
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="panel bg-moss p-3">
          <Preview avatar={value} scale={6} />
        </div>
        <div className="flex gap-1">
          {dirs.map((d) => (
            <div key={d} className="panel p-1">
              <Preview avatar={value} scale={2} dir={d} />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm" onClick={() => onChange(randomAvatar(reg, Math.floor(Math.random() * 1e9)))}>
          Surprise me
        </button>
      </div>
      <div className="grid gap-3 content-start">
        <Row label="Body">
          {reg.bodies.map((b) => (
            <Chip key={b.id} active={value.body === b.id} onClick={() => set({ body: b.id })}>{b.name}</Chip>
          ))}
        </Row>
        <Row label="Skin">
          <Swatches list={reg.skins} value={value.skin} onPick={(id) => set({ skin: id })} />
        </Row>
        {SLOTS.map(({ slot, label, color, colors }) => {
          const parts = partsFor(reg, slot);
          const cur = value[slot as keyof AvatarConfig] as string;
          const optional = slot === 'hair' || slot === 'hat' || slot === 'face' || slot === 'neck';
          const part = parts.find((p) => p.id === cur);
          const tint = color && part?.tintable !== false && cur !== NONE;
          return (
            <Row key={slot} label={label}>
              {optional && (
                <Chip active={cur === NONE} onClick={() => set({ [slot]: NONE } as Partial<AvatarConfig>)}>none</Chip>
              )}
              {parts.map((p) => (
                <Chip key={p.id} active={cur === p.id} onClick={() => set({ [slot]: p.id } as Partial<AvatarConfig>)}>{p.name}</Chip>
              ))}
              {tint && color && (
                <div className="w-full">
                  <Swatches list={reg[colors]} value={value[color]} onPick={(id) => set({ [color]: id } as Partial<AvatarConfig>)} />
                </div>
              )}
            </Row>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="font-pixel text-sm text-orange mb-1">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-quiet'}`}>
      {children}
    </button>
  );
}

function Swatches({ list, value, onPick }: { list: { id: string; name: string; main: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          title={s.name}
          aria-label={s.name}
          aria-pressed={value === s.id}
          onClick={() => onPick(s.id)}
          className="h-6 w-6 rounded-sm border-2"
          style={{ background: s.main, borderColor: value === s.id ? '#9dff6a' : '#0b1f15', outline: value === s.id ? '2px solid #faf5e8' : 'none' }}
        />
      ))}
    </div>
  );
}
