import { useEffect, useRef, useState } from 'react';
import { currentPosition, type MediaState } from '@channel-green/shared';
import { useGame, useSnap } from '@cg/game/useSession';
import { MediaControls } from './MediaControls';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow: boolean): void;
  getCurrentTime(): number;
  loadVideoById(id: string, start?: number): void;
  destroy(): void;
}
interface YTApi {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoading: Promise<YTApi> | null = null;
function loadYT(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytLoading) return ytLoading;
  ytLoading = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.onerror = () => {
      ytLoading = null;
      reject(new Error('Could not load the video player.'));
    };
    document.head.appendChild(sc);
  });
  return ytLoading;
}

const DRIFT = 1.5;

export function WatchPanel() {
  const s = useSnap();
  const st = s.media.watch;
  return (
    <div className="space-y-4">
      {st?.source && <Screen st={st} />}
      <MediaControls
        channel="watch"
        placeholder="Paste a YouTube or video link"
        kinds={[
          { kind: 'youtube', label: 'YouTube link' },
          { kind: 'video', label: 'Direct video file (mp4 / webm)' },
        ]}
      />
    </div>
  );
}

function Screen({ st }: { st: MediaState }) {
  const src = st.source!;
  if (src.kind === 'youtube') return <YouTubeScreen st={st} id={src.ref} />;
  return <VideoScreen st={st} url={src.ref} />;
}

function VideoScreen({ st, url }: { st: MediaState; url: string }) {
  const game = useGame();
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const want = currentPosition(st, game.serverNow());
    if (Math.abs(v.currentTime - want) > DRIFT) v.currentTime = want;
    if (st.playing) {
      v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else v.pause();
  }, [st, game]);

  useEffect(() => {
    if (!st.playing) return;
    const t = setInterval(() => {
      const v = ref.current;
      if (!v) return;
      const want = currentPosition(st, game.serverNow());
      if (Math.abs(v.currentTime - want) > DRIFT) v.currentTime = want;
    }, 4000);
    return () => clearInterval(t);
  }, [st, game]);

  return (
    <div>
      <video ref={ref} src={url} playsInline preload="metadata" className="w-full rounded border-2 border-moss bg-black" aria-label="Shared video" />
      {blocked && <button className="btn btn-primary mt-2" onClick={() => ref.current?.play().then(() => setBlocked(false))}>Join the screening</button>}
    </div>
  );
}

function YouTubeScreen({ st, id }: { st: MediaState; id: string }) {
  const game = useGame();
  const [on, setOn] = useState(false);
  const [err, setErr] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const idRef = useRef(id);
  const stRef = useRef(st);
  stRef.current = st;

  const apply = (p: YTPlayer, s: MediaState) => {
    const want = currentPosition(s, game.serverNow());
    try {
      if (Math.abs(p.getCurrentTime() - want) > DRIFT) p.seekTo(want, true);
      if (s.playing) p.playVideo();
      else p.pauseVideo();
    } catch {
      /* player not ready yet */
    }
  };

  useEffect(() => {
    if (!on || !host.current) return;
    let dead = false;
    const hostEl = host.current;
    const el = document.createElement('div');
    hostEl.appendChild(el);
    loadYT()
      .then((YT) => {
        if (dead) return;
        player.current = new YT.Player(el, {
          host: 'https://www.youtube-nocookie.com',
          videoId: idRef.current,
          width: '100%',
          height: '210',
          playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1, modestbranding: 1, start: Math.floor(currentPosition(stRef.current, game.serverNow())) },
          events: { onReady: () => player.current && apply(player.current, stRef.current) },
        });
      })
      .catch((e: Error) => setErr(e.message));
    return () => {
      dead = true;
      try {
        player.current?.destroy();
      } catch {
        /* ignore */
      }
      player.current = null;
      hostEl.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (idRef.current !== id) {
      idRef.current = id;
      p.loadVideoById(id, currentPosition(st, game.serverNow()));
    }
    apply(p, st);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, id]);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => player.current && stRef.current.playing && apply(player.current, stRef.current), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  if (!on)
    return (
      <div className="rounded border-2 border-moss p-3 text-sm">
        <p>The video plays from YouTube. Nothing is loaded from them until you say so.</p>
        <button className="btn btn-primary mt-2" onClick={() => setOn(true)}>Load the player</button>
      </div>
    );
  return (
    <div>
      <div ref={host} className="overflow-hidden rounded border-2 border-moss bg-black" style={{ minHeight: 210 }} />
      {err && <p role="alert" className="mt-1 text-orange">{err}</p>}
      <button className="btn btn-sm mt-2" onClick={() => player.current?.playVideo()}>Tap here if it is not playing</button>
    </div>
  );
}
