import { useState } from 'react';
import { LIMITS } from '@channel-green/shared';
import { useGame, useSnap } from '@cg/game/useSession';

const REASONS: [string, string][] = [
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate'],
  ['spam', 'Spam'],
  ['sexual', 'Sexual content'],
  ['self-harm', 'Self-harm worry'],
  ['impersonation', 'Pretending to be someone'],
  ['other', 'Something else'],
];

export function PeoplePanel() {
  const game = useGame();
  const s = useSnap();
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const sel = s.players.find((p) => p.pid === s.selected);
  const canMod = s.moderator || (!!s.me && s.room?.hostPid === s.me.pid);

  const list = s.players.filter((p) => p.pid !== s.me?.pid);
  return (
    <div className="space-y-4 text-sm">
      {sel && sel.pid !== s.me?.pid ? (
        <section className="rounded border-2 border-moss p-3">
          <div className="flex items-center justify-between">
            <strong className="font-pixel text-neon">{sel.name}</strong>
            <button className="btn btn-sm btn-quiet" onClick={() => game.select(null)}>Back</button>
          </div>
          {sel.role !== 'player' && <p className="text-xs text-olive-soft">{sel.role === 'guide' ? 'Guide' : 'Host'}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="btn btn-sm" onClick={() => void game.sendRequest(sel.pid, 'wave')}>Wave</button>
            <button className="btn btn-sm" onClick={() => void game.sendRequest(sel.pid, 'hug')}>Hug</button>
            <button className="btn btn-sm" onClick={() => void game.sendRequest(sel.pid, 'sit')}>Sit together</button>
            <button className="btn btn-sm" onClick={() => void game.sendRequest(sel.pid, 'chat')}>Ask to chat</button>
            {s.room?.mode === 'invite' && <button className="btn btn-sm" onClick={() => void game.sendRequest(sel.pid, 'invite')}>Invite</button>}
            <button className="btn btn-sm" onClick={() => { game.openPanel('chat'); game.select(sel.pid); }}>Message</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="btn btn-sm btn-quiet" onClick={() => game.mute(sel.uid, !s.muted.includes(sel.uid))}>{s.muted.includes(sel.uid) ? 'Unmute' : 'Mute'}</button>
            <button className="btn btn-sm btn-quiet" onClick={() => void game.block(sel.uid)}>Block</button>
            <button className="btn btn-sm btn-quiet" onClick={() => setReporting(sel.pid)}>Report</button>
          </div>
          {canMod && sel.role !== 'guide' && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-moss pt-2">
              <button className="btn btn-sm btn-warm" onClick={() => void game.mod('silence-player', sel.pid)}>Silence</button>
              <button className="btn btn-sm btn-warm" onClick={() => void game.mod('unsilence-player', sel.pid)}>Unsilence</button>
              <button className="btn btn-sm btn-warm" onClick={() => void game.mod('kick', sel.pid)}>Kick</button>
              <button className="btn btn-sm btn-warm" onClick={() => void game.mod('ban', sel.pid)}>Ban</button>
              <button className="btn btn-sm btn-warm" onClick={() => void game.mod('make-host', sel.pid)}>Make host</button>
            </div>
          )}
          {reporting === sel.pid && (
            <form
              className="mt-3 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await game.report(sel.pid, reason, details.trim() || undefined)) {
                  setReporting(null);
                  setDetails('');
                }
              }}
            >
              <label className="block">Why?
                <select className="field mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">Anything else we should know?
                <textarea className="field mt-1" rows={3} maxLength={LIMITS.reportReasonMax} value={details} onChange={(e) => setDetails(e.target.value)} />
              </label>
              <div className="flex gap-1">
                <button className="btn btn-sm btn-primary" type="submit">Send report</button>
                <button className="btn btn-sm" type="button" onClick={() => setReporting(null)}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <section>
          <h3 className="font-pixel text-orange">In this room</h3>
          {list.length === 0 ? <p className="text-olive-soft">Just you for now.</p> : (
            <ul className="mt-1 space-y-1">
              {list.map((p) => (
                <li key={p.pid}>
                  <button className="btn btn-sm btn-quiet w-full justify-start text-left" onClick={() => game.select(p.pid)}>
                    {p.name}{p.role !== 'player' ? ` (${p.role})` : ''}{s.muted.includes(p.uid) ? ' - muted' : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h3 className="font-pixel text-orange">Blocked</h3>
        {s.blocks.length === 0 ? <p className="text-olive-soft">Nobody. Blocking hides someone from you for good.</p> : (
          <ul className="mt-1 space-y-1">
            {s.blocks.map((uid) => (
              <li key={uid} className="flex items-center justify-between">
                <span className="text-olive-soft">Someone ({uid.slice(0, 4)})</span>
                <button className="btn btn-sm" onClick={() => void game.unblock(uid)}>Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
