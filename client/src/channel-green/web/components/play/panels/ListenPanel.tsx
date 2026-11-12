import { useEffect, useRef, useState } from 'react';
import { currentPosition } from '@channel-green/shared';
import { audio } from '@cg/game/audio';
import { useGame, useSnap } from '@cg/game/useSession';
import { registry } from '@cg/lib/registry';
import { MediaControls } from './MediaControls';

/** Stays mounted in the HUD so music keeps playing while the panel is closed. Only plays when sound is on. */
export function ListenDriver() {
  const game = useGame();
  const s = useSnap();
  const st = s.media.listen;
  const [sound, setSound] = useState(false);
  const el = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = audio();
    setSound(a.enabled);
    return a.onChange(() => setSound(a.enabled));
  }, []);

  useEffect(() => {
    const a = audio();
    const stopFile = () => {
      el.current?.pause();
      el.current = null;
    };
    if (!sound || !st?.source || !st.playing) {
      a.stopTapePlayback();
      if (!st?.playing || !st?.source) stopFile();
      else el.current?.pause();
      return;
    }
    const pos = currentPosition(st, game.serverNow());
    if (st.source.kind === 'tape') {
      stopFile();
      const tape = registry.tapes[st.source.ref];
      if (tape) a.playTape(tape, pos);
    } else if (st.source.kind === 'audio') {
      a.stopTapePlayback();
      if (!el.current || el.current.src !== st.source.ref) {
        stopFile();
        el.current = new Audio(st.source.ref);
        el.current.crossOrigin = 'anonymous';
      }
      const e = el.current;
      e.volume = a.volume;
      if (Math.abs(e.currentTime - pos) > 1.5) e.currentTime = pos;
      void e.play().catch(() => game.toast('Your browser blocked the music. Tap Play in the Listening panel.', 'warn'));
    }
  }, [st, sound, game]);

  useEffect(
    () => () => {
      audio().stopTapePlayback();
      el.current?.pause();
    },
    [],
  );
  return null;
}

export function ListenPanel() {
  const s = useSnap();
  const game = useGame();
  const a = audio();
  const st = s.media.listen;
  const tapes = Object.values(registry.tapes);
  const [sound, setSound] = useState(a.enabled);
  useEffect(() => a.onChange(() => setSound(a.enabled)), [a]);

  return (
    <div className="space-y-4 text-sm">
      {!sound && (
        <div className="rounded border-2 border-orange p-3">
          <p>Sound is off, so you will not hear the music yet.</p>
          <button className="btn btn-sm btn-primary mt-2" onClick={() => a.enable()}>Turn sound on</button>
        </div>
      )}
      <section>
        <h3 className="font-pixel text-orange">The tape shelf</h3>
        <p className="text-olive-soft">Little original tunes made on the spot. Pick one for the whole room.</p>
        <ul className="mt-2 space-y-1">
          {tapes.map((t) => (
            <li key={t.id}>
              <button
                className={`btn btn-sm w-full justify-between text-left ${st?.source?.ref === t.id ? 'btn-primary' : ''}`}
                onClick={async () => {
                  if (await game.mediaSet('listen', 'tape', t.id)) await game.mediaControl('listen', 'play', 0);
                }}
              >
                <span>{t.title}</span>
                <span className="text-xs opacity-70">{t.artist} - {t.mood}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <MediaControls channel="listen" placeholder="Or paste a link to an mp3 / ogg file" kinds={[{ kind: 'audio', label: 'Audio file link' }]} />
    </div>
  );
}
