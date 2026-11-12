import { useState } from 'react';
import Link from 'next/link';
import { BRAND, NAME_MAX, randomAvatar, sanitizeAvatar, sanitizeName, type AvatarConfig } from '@channel-green/shared';
import { registry } from '@cg/lib/registry';
import type { LocalProfile } from '@cg/lib/profile';
import { AvatarEditor } from './AvatarEditor';

const ADJ = ['Quiet', 'Mossy', 'Amber', 'Soft', 'Little', 'Dusk', 'Sleepy', 'Wandering'];
const NOUN = ['Fern', 'Moth', 'Lantern', 'Finch', 'Kettle', 'Pebble', 'Willow', 'Comet'];
const suggest = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}`;

export function Gate({ compact, initial, onDone, title = 'Who are you today?', cta = 'Walk in' }: { compact?: boolean; initial?: LocalProfile | null; onDone: (p: LocalProfile) => void; title?: string; cta?: string }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [placeholder] = useState(suggest);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => sanitizeAvatar(initial?.avatar ?? randomAvatar(registry.avatar), registry.avatar));
  const [err, setErr] = useState('');

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const n = sanitizeName(name.trim() || placeholder);
    if (!n) {
      setErr('That name will not work. Try letters, numbers and spaces.');
      return;
    }
    onDone({ name: n, avatar, blocks: initial?.blocks ?? [] });
  };

  return (
    <form onSubmit={go} className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-pixel text-3xl text-neon">{title}</h1>
      <p className="mt-1 text-cream">Pick a name and a look. You can change both whenever you like. They are saved in this browser only, no account needed.</p>
      <label className="mt-5 block">
        <span className="font-pixel text-sm text-orange">Name</span>
        <input className="field mt-1" value={name} maxLength={NAME_MAX} placeholder={placeholder} onChange={(e) => { setName(e.target.value); setErr(''); }} autoFocus />
      </label>
      {err && <p role="alert" className="mt-1 text-orange">{err}</p>}
      <div className="panel mt-5 p-4">
        <AvatarEditor value={avatar} onChange={setAvatar} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary px-6 py-3 text-xl">{cta}</button>
        <Link href="/guidelines" className="text-sm text-olive-soft underline underline-offset-4">By walking in you agree to the community guidelines</Link>
      </div>
      <p className="mt-8 text-center font-pixel text-base text-olive-soft">{BRAND.quote}</p>
    </form>
  );
}
