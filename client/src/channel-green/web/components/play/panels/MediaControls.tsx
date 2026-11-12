import { useState } from 'react';
import { currentPosition, type MediaChannel, type MediaKind } from '@channel-green/shared';
import { useGame, useSnap } from '@cg/game/useSession';

/** Shared transport + "set source" form for Watch and Listen. Anyone in the room may drive it; the server keeps one shared clock. */
export function MediaControls({ channel, kinds, placeholder }: { channel: MediaChannel; kinds: { kind: MediaKind; label: string }[]; placeholder: string }) {
  const game = useGame();
  const s = useSnap();
  const st = s.media[channel];
  const [kind, setKind] = useState<MediaKind>(kinds[0].kind);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const now = () => currentPosition(st ?? { playing: false, position: 0, at: 0 }, game.serverNow());

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    const ok = await game.mediaSet(channel, kind, input.trim());
    setBusy(false);
    if (ok) setInput('');
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-olive-soft">Now</p>
        <p className="font-semibold">{st?.source ? st.source.title : 'Nothing yet'}</p>
        {st?.source && (
          <div className="mt-2 flex flex-wrap gap-1">
            {st.playing ? (
              <button className="btn btn-sm" onClick={() => void game.mediaControl(channel, 'pause', now())}>Pause</button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => void game.mediaControl(channel, 'play', now())}>Play</button>
            )}
            <button className="btn btn-sm" onClick={() => void game.mediaControl(channel, 'seek', Math.max(0, now() - 15))}>-15s</button>
            <button className="btn btn-sm" onClick={() => void game.mediaControl(channel, 'seek', now() + 15)}>+15s</button>
            <button className="btn btn-sm btn-quiet" onClick={() => void game.mediaControl(channel, 'stop')}>Stop</button>
          </div>
        )}
      </div>
      <form onSubmit={load} className="space-y-2">
        {kinds.length > 1 && (
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as MediaKind)} aria-label="Kind">
            {kinds.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
        )}
        <div className="flex gap-1">
          <input className="field flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} aria-label="Link" />
          <button className="btn btn-sm btn-primary" type="submit" disabled={busy || !input.trim()}>Load</button>
        </div>
      </form>
      <p className="text-xs text-olive-soft">Everyone in this room sees and hears the same thing at the same time. Only links you paste are used; Channel Green does not host or copy media.</p>
    </div>
  );
}
