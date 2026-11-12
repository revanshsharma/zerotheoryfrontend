import { useEffect, useState } from 'react';
import { LIMITS, type Confession } from '@channel-green/shared';
import { useGame } from '@cg/game/useSession';

export function ConfessionPanel() {
  const game = useGame();
  const [items, setItems] = useState<Confession[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [hearted, setHearted] = useState<Set<string>>(new Set());
  const [reporting, setReporting] = useState<string | null>(null);

  useEffect(() => {
    const off = game.onConfessions(setItems);
    void game.loadConfessions();
    return off;
  }, [game]);

  return (
    <div className="space-y-4 text-sm">
      <p className="text-olive-soft">Anonymous. No names, no replies. Be gentle. Posts that are cruel or unsafe get removed.</p>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setBusy(true);
          const ok = await game.confess(text.trim());
          setBusy(false);
          if (ok) setText('');
        }}
      >
        <textarea className="field" rows={3} maxLength={LIMITS.confessionMax} value={text} onChange={(e) => setText(e.target.value)} placeholder="Something you want to put down..." aria-label="Your confession" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-olive-soft">{text.length}/{LIMITS.confessionMax}</span>
          <button className="btn btn-sm btn-primary" type="submit" disabled={busy || !text.trim()}>Pin it up</button>
        </div>
      </form>
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-olive-soft">The wall is empty. Be the first.</li>}
        {items.map((c) => (
          <li key={c.id} className="rounded border-2 border-moss p-2">
            <p className="whitespace-pre-wrap break-words">{c.text}</p>
            <div className="mt-1 flex items-center gap-1">
              <button
                className="btn btn-sm btn-quiet"
                disabled={hearted.has(c.id)}
                aria-label="Send a heart"
                onClick={() => {
                  setHearted(new Set(hearted).add(c.id));
                  void game.heart(c.id);
                }}
              >
                {'\u{1F49A}'} {c.hearts}
              </button>
              <button className="btn btn-sm btn-quiet" onClick={() => setReporting(reporting === c.id ? null : c.id)}>Report</button>
            </div>
            {reporting === c.id && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(['harassment', 'hate', 'sexual', 'self-harm', 'spam', 'other'] as const).map((r) => (
                  <button
                    key={r}
                    className="btn btn-sm"
                    onClick={async () => {
                      await game.report(undefined, r, undefined, c.id);
                      setReporting(null);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
