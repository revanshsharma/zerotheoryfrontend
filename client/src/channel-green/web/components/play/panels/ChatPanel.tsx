import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS } from '@channel-green/shared';
import { EMOJI } from '@cg/lib/emoji';
import { registry } from '@cg/lib/registry';
import { useGame, useSnap } from '@cg/game/useSession';

export function ChatPanel() {
  const game = useGame();
  const s = useSnap();
  const [tab, setTab] = useState<'room' | 'private'>('room');
  const [text, setText] = useState('');
  const [to, setTo] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const quiet = !!registry.maps[s.mapId]?.quiet;
  const max = quiet ? LIMITS.noteMax : LIMITS.chatMax;

  const visible = useMemo(
    () =>
      s.chat.filter((m) => {
        if (m.from && (s.blocks.includes(m.from.uid) || s.muted.includes(m.from.uid))) return false;
        return tab === 'room' ? m.scope !== 'dm' : m.scope === 'dm';
      }),
    [s.chat, s.blocks, s.muted, tab],
  );
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, tab]);

  // a person picked on the People panel becomes the private chat target
  useEffect(() => {
    if (s.selected && tab === 'private') setTo(s.selected);
  }, [s.selected, tab]);

  const others = s.players.filter((p) => p.pid !== s.me?.pid);
  const canSend = text.trim().length > 0 && !busy && (tab === 'room' || !!to);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    const ok = await game.say(text, tab === 'private' ? to : undefined);
    setBusy(false);
    if (ok) {
      setText('');
      setEmoji(false);
    }
  };

  return (
    <div className="flex h-full min-h-[300px] flex-col">
      <div className="mb-2 flex gap-1" role="tablist">
        {(['room', 'private'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
            {t === 'room' ? 'Room' : 'Private'}
          </button>
        ))}
      </div>
      {quiet && <p className="mb-2 text-sm text-olive-soft">This is a quiet room. Short notes only, one every few seconds.</p>}
      {s.room?.silenced && <p className="mb-2 text-sm text-orange">The host has turned on a quiet hour.</p>}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-live="polite">
        {visible.length === 0 && <p className="text-sm text-olive-soft">{tab === 'room' ? 'Nothing said yet. Say hi.' : 'Private messages show up here. Pick someone below to start.'}</p>}
        {visible.map((m) => (
          <p key={m.id} className={`break-words text-sm ${m.scope === 'system' ? 'italic text-olive-soft' : ''}`}>
            {m.from && (
              <button className="mr-1 font-semibold text-neon hover:underline" onClick={() => m.from && game.select(m.from.pid)}>
                {m.scope === 'dm' && m.to ? `${m.from.name} to ${m.to.name}` : m.from.name}
              </button>
            )}
            {m.text}
          </p>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="mt-2 space-y-2">
        {tab === 'private' && (
          <select className="field" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Send to">
            <option value="">Send to...</option>
            {others.map((p) => (
              <option key={p.pid} value={p.pid}>{p.name}</option>
            ))}
          </select>
        )}
        {emoji && (
          <div className="grid grid-cols-8 gap-1 rounded border-2 border-moss p-1" role="group" aria-label="Emoji">
            {EMOJI.map((e) => (
              <button type="button" key={e} className="rounded p-1 text-lg hover:bg-moss" onClick={() => setText((t) => (t + e).slice(0, max))}>{e}</button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <button type="button" className="btn btn-sm" aria-label="Emoji" aria-pressed={emoji} onClick={() => setEmoji((v) => !v)}>:)</button>
          <input className="field flex-1" value={text} maxLength={max} onChange={(e) => setText(e.target.value)} placeholder={quiet ? 'A small note...' : 'Say something kind'} aria-label="Message" />
          <button type="submit" className="btn btn-sm btn-primary" disabled={!canSend}>Send</button>
        </div>
        <p className="text-right text-xs text-olive-soft">{text.length}/{max}</p>
      </form>
    </div>
  );
}
