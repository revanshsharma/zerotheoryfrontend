import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room as LKRoom, RemoteParticipant, Track } from 'livekit-client';
import { useGame, useSnap } from '@cg/game/useSession';
import {
  classifyMediaError,
  connectErrorMessage,
  disconnectMessage,
  joinNames,
  liveBanner,
  permissionText,
  proximityVolume,
  shouldReceive,
  type MediaKindName,
  type PermState,
} from '@cg/game/voiceLogic';

type Phase = 'off' | 'joining' | 'on' | 'reconnecting';
type LK = typeof import('livekit-client');

interface Person {
  pid: string;
  name: string;
  self: boolean;
  speaking: boolean;
  mic: boolean;
  cam: boolean;
  volume: number;
}
interface Tile {
  pid: string;
  name: string;
  self: boolean;
  speaking: boolean;
  track: Track;
}

async function queryPermission(name: MediaKindName): Promise<PermState> {
  try {
    const st = await navigator.permissions.query({ name: name as PermissionName });
    return st.state as PermState;
  } catch {
    return 'unknown'; // some browsers cannot be asked without prompting
  }
}

function VideoTile({ tile }: { tile: Tile }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    tile.track.attach(el);
    return () => {
      tile.track.detach(el);
    };
  }, [tile.track]);
  return (
    <figure data-testid="video-tile" data-pid={tile.pid} data-self={tile.self ? '1' : '0'} className={`rounded border-2 ${tile.speaking ? 'border-neon' : 'border-moss'} overflow-hidden bg-black`}>
      <video ref={ref} autoPlay playsInline muted={tile.self} className="w-full" style={tile.self ? { transform: 'scaleX(-1)' } : undefined} aria-label={tile.self ? 'Your camera preview' : `Camera of ${tile.name}`} />
      <figcaption className="px-2 py-1 text-xs text-cream">{tile.self ? 'You (this is what others see)' : tile.name}</figcaption>
    </figure>
  );
}

export function VoicePanel() {
  const game = useGame();
  const s = useSnap();
  const [consent, setConsent] = useState(false);
  const [camConsent, setCamConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>('off');
  const [err, setErr] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState<'' | 'mic' | 'cam'>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [perms, setPerms] = useState<Record<MediaKindName, PermState>>({ microphone: 'unknown', camera: 'unknown' });
  const [soundBlocked, setSoundBlocked] = useState(false);
  const room = useRef<LKRoom | null>(null);
  const lkRef = useRef<LK | null>(null);
  const audioHost = useRef<HTMLDivElement>(null);
  const prox = useRef(false);
  const alive = useRef(true);
  const policy = useRef({ blocks: s.blocks, muted: s.muted });
  policy.current = { blocks: s.blocks, muted: s.muted };

  const refreshPerms = useCallback(async () => {
    const [microphone, camera] = await Promise.all([queryPermission('microphone'), queryPermission('camera')]);
    if (alive.current) setPerms({ microphone, camera });
  }, []);

  /** Whether we may hear or see this participant right now. */
  const allowed = useCallback(
    (identity: string) => shouldReceive(game.players.get(identity)?.uid, policy.current.blocks, policy.current.muted),
    [game],
  );

  const volumeFor = useCallback(
    (identity: string) => {
      if (!prox.current) return 1;
      const o = game.players.get(identity);
      const me = game.me;
      if (!o || !me) return 0;
      return proximityVolume(Math.hypot(o.x - me.x, o.y - me.y));
    },
    [game],
  );

  /** Rebuild everything the panel shows from the room's real state. */
  const sync = useCallback(() => {
    const r = room.current;
    const lk = lkRef.current;
    if (!r || !lk || !alive.current) return;
    const lp = r.localParticipant;
    const people: Person[] = [
      { pid: lp.identity, name: 'You', self: true, speaking: lp.isSpeaking, mic: lp.isMicrophoneEnabled, cam: lp.isCameraEnabled, volume: 1 },
    ];
    const tiles: Tile[] = [];
    const camPub = lp.getTrackPublication(lk.Track.Source.Camera);
    if (lp.isCameraEnabled && camPub?.track) tiles.push({ pid: lp.identity, name: 'You', self: true, speaking: lp.isSpeaking, track: camPub.track });
    r.remoteParticipants.forEach((p: RemoteParticipant) => {
      const known = game.players.get(p.identity);
      const name = known?.name ?? (p.name || 'Someone');
      if (!allowed(p.identity)) return; // blocked or muted: not listed, not heard, not seen
      const volume = volumeFor(p.identity);
      const mic = p.getTrackPublication(lk.Track.Source.Microphone);
      const cam = p.getTrackPublication(lk.Track.Source.Camera);
      const camLive = !!cam && !cam.isMuted;
      people.push({ pid: p.identity, name, self: false, speaking: p.isSpeaking, mic: !!mic && !mic.isMuted, cam: camLive, volume });
      if (camLive && cam?.track && volume > 0) tiles.push({ pid: p.identity, name, self: false, speaking: p.isSpeaking, track: cam.track });
    });
    setPeople(people);
    setTiles((old) => {
      // keep object identity when nothing changed so the video elements are not re-attached
      if (old.length === tiles.length && old.every((t, i) => t.track === tiles[i].track && t.speaking === tiles[i].speaking && t.name === tiles[i].name)) return old;
      return tiles;
    });
    setMicOn(lp.isMicrophoneEnabled);
    setCamOn(lp.isCameraEnabled);
  }, [game, allowed, volumeFor]);

  /** Subscribe only to people we are allowed to hear or see, and drop everyone else. */
  const applyPolicy = useCallback(() => {
    const r = room.current;
    if (!r) return;
    r.remoteParticipants.forEach((p) => {
      const ok = allowed(p.identity);
      p.trackPublications.forEach((pub) => {
        if (pub.isSubscribed !== ok) pub.setSubscribed(ok);
      });
    });
    sync();
  }, [allowed, sync]);

  const leave = useCallback(
    (message = '') => {
      const r = room.current;
      room.current = null;
      if (r) {
        // stop every capture device first, then hang up
        r.localParticipant.trackPublications.forEach((pub) => pub.track?.stop());
        void r.disconnect(true);
      }
      if (audioHost.current) audioHost.current.innerHTML = '';
      game.setVoiceStop(null);
      if (!alive.current) return;
      setPhase('off');
      setMicOn(false);
      setCamOn(false);
      setPeople([]);
      setTiles([]);
      setSoundBlocked(false);
      setErr(message);
      void refreshPerms();
    },
    [game, refreshPerms],
  );

  // Closing the panel (or leaving the world) ends voice and releases the microphone and camera.
  useEffect(() => {
    alive.current = true;
    void refreshPerms();
    return () => {
      alive.current = false;
      leave();
    };
  }, [leave, refreshPerms]);

  // Blocks, mutes and the people list changed: re-check who we receive.
  useEffect(() => {
    if (phase === 'on' || phase === 'reconnecting') applyPolicy();
  }, [phase, s.blocks, s.muted, s.players, applyPolicy]);

  // Proximity: scale each voice by distance, and keep the tiles and rows fresh.
  useEffect(() => {
    if (phase !== 'on') return;
    const t = setInterval(() => {
      const r = room.current;
      if (!r) return;
      r.remoteParticipants.forEach((p) => p.setVolume(allowed(p.identity) ? volumeFor(p.identity) : 0));
      sync();
    }, 400);
    return () => clearInterval(t);
  }, [phase, allowed, volumeFor, sync]);

  const join = async () => {
    setErr('');
    setPhase('joining');
    const t = await game.voiceToken();
    if (!t) {
      setPhase('off');
      setErr('Could not ask for a voice seat just now. Please try again.');
      return;
    }
    if (!t.enabled) {
      setPhase('off');
      setErr(t.reason);
      return;
    }
    prox.current = t.proximity;
    let r: LKRoom | null = null;
    try {
      const lk = await import('livekit-client');
      lkRef.current = lk;
      r = new lk.Room({
        adaptiveStream: true,
        dynacast: true,
        // switching the microphone off really releases it, so the browser's recording light goes out
        publishDefaults: { stopMicTrackOnMute: true },
      });
      const room_ = r;
      const E = lk.RoomEvent;
      const here = () => room.current === room_;
      room_.on(E.TrackSubscribed, (track, _pub, participant) => {
        if (!here()) return;
        if (!allowed(participant.identity)) {
          _pub.setSubscribed(false);
          return;
        }
        if (track.kind === lk.Track.Kind.Audio) {
          const el = track.attach();
          el.dataset.pid = participant.identity;
          audioHost.current?.appendChild(el);
          participant.setVolume(volumeFor(participant.identity));
        }
        sync();
      });
      room_.on(E.TrackUnsubscribed, (track, _pub, participant) => {
        track.detach().forEach((el) => el.remove());
        // the client may already have detached the element; make sure no sound element is left behind
        if (track.kind === lk.Track.Kind.Audio) audioHost.current?.querySelectorAll<HTMLElement>(`[data-pid="${CSS.escape(participant.identity)}"]`).forEach((el) => el.remove());
        if (here()) sync();
      });
      for (const ev of [E.ActiveSpeakersChanged, E.TrackMuted, E.TrackUnmuted, E.LocalTrackPublished, E.LocalTrackUnpublished, E.ParticipantDisconnected]) {
        room_.on(ev, () => here() && sync());
      }
      for (const ev of [E.ParticipantConnected, E.TrackPublished]) room_.on(ev, () => here() && applyPolicy());
      room_.on(E.Reconnecting, () => here() && setPhase('reconnecting'));
      room_.on(E.Reconnected, () => {
        if (!here()) return;
        setPhase('on');
        setErr('');
        applyPolicy();
      });
      room_.on(E.Disconnected, (reason) => {
        if (here()) leave(disconnectMessage(reason as number | undefined));
      });
      room_.on(E.MediaDevicesError, (e, failedKind) => {
        const kind: MediaKindName = failedKind === 'videoinput' ? 'camera' : 'microphone';
        if (here()) setErr(classifyMediaError(e, kind).message);
      });
      room_.on(E.AudioPlaybackStatusChanged, () => here() && setSoundBlocked(!room_.canPlaybackAudio));
      room.current = room_; // set before connecting so a quick "leave" can cancel
      await room_.connect(t.url, t.token, { autoSubscribe: false });
      if (!alive.current || room.current !== room_) {
        void room_.disconnect(true);
        return;
      }
      game.setVoiceStop(() => leave());
      setPhase('on');
      setSoundBlocked(!room_.canPlaybackAudio);
      applyPolicy();
      void refreshPerms();
    } catch (e) {
      if (r && room.current === r) room.current = null;
      void r?.disconnect(true);
      if (alive.current) {
        setPhase('off');
        setErr(connectErrorMessage(e));
      }
    }
  };

  const toggle = async (kind: 'mic' | 'cam') => {
    const r = room.current;
    if (!r || busy) return;
    const lp = r.localParticipant;
    const turningOn = kind === 'mic' ? !lp.isMicrophoneEnabled : !lp.isCameraEnabled;
    if (turningOn && kind === 'cam' && !camConsent) return;
    setBusy(kind);
    setErr('');
    try {
      if (kind === 'mic') await lp.setMicrophoneEnabled(turningOn);
      else await lp.setCameraEnabled(turningOn);
    } catch (e) {
      setErr(classifyMediaError(e, kind === 'mic' ? 'microphone' : 'camera').message);
    } finally {
      if (alive.current) setBusy('');
      sync();
      void refreshPerms();
    }
  };

  if (!s.features.voice) {
    return (
      <div className="space-y-2 text-sm">
        <p className="rounded border-2 border-moss p-3">{s.features.voiceReason || 'Voice and video are switched off here.'}</p>
        <p className="text-olive-soft">Text chat, emotes and everything else still work. Voice and video only start when you choose to join.</p>
      </div>
    );
  }

  const inVoice = phase === 'on' || phase === 'reconnecting';
  const banner = liveBanner({ mic: micOn, camera: camOn });
  const speaking = people.filter((p) => p.speaking && !p.self).map((p) => p.name);
  const others = people.filter((p) => !p.self);

  return (
    <div className="space-y-3 text-sm" data-testid="voice-panel" data-phase={phase}>
      {!inVoice ? (
        <>
          <p>Talk with the people in this room. Nothing is sent from your microphone or camera until you turn each one on yourself, and your browser will ask too. Nothing is recorded or saved.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>I understand others in this room will hear my voice when I turn my microphone on, and I agree to the community guidelines.</span>
          </label>
          <button className="btn btn-primary" disabled={!consent || phase === 'joining'} onClick={() => void join()}>
            {phase === 'joining' ? 'Joining...' : 'Join voice (listen only)'}
          </button>
        </>
      ) : (
        <>
          {banner && (
            <p role="status" data-testid="live-banner" className="flex items-center gap-2 rounded border-2 border-orange-deep bg-orange-deep/20 p-2 font-semibold text-cream">
              <span aria-hidden className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-deep" />
              {banner}
            </p>
          )}
          <p className="text-neon" data-testid="voice-status">
            {phase === 'reconnecting' ? 'Connection lost. Trying to get back in...' : `You are in voice, listening${micOn ? ' and speaking' : ''}.`}
            {speaking.length ? ` Speaking: ${joinNames(speaking)}.` : ''}
          </p>
          <div className="flex flex-wrap gap-1">
            <button className="btn btn-sm" data-testid="mic-toggle" aria-pressed={micOn} disabled={busy !== '' || phase === 'reconnecting'} onClick={() => void toggle('mic')}>
              {micOn ? 'Turn microphone off' : 'Turn microphone on'}
            </button>
            <button className="btn btn-sm" data-testid="cam-toggle" aria-pressed={camOn} disabled={busy !== '' || phase === 'reconnecting' || (!camConsent && !camOn)} onClick={() => void toggle('cam')}>
              {camOn ? 'Turn camera off' : 'Turn camera on'}
            </button>
            <button className="btn btn-sm btn-warm" data-testid="leave-voice" onClick={() => leave()}>
              Leave voice
            </button>
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={camConsent}
              onChange={(e) => {
                setCamConsent(e.target.checked);
                if (!e.target.checked && camOn) void toggle('cam');
              }}
              className="mt-1"
            />
            <span>I am happy for people in this room to see my camera when I switch it on.</span>
          </label>
          {soundBlocked && (
            <button className="btn btn-sm btn-primary" onClick={() => void room.current?.startAudio().then(() => setSoundBlocked(!room.current?.canPlaybackAudio))}>
              Your browser is holding sound back. Press to hear others.
            </button>
          )}
          <ul className="space-y-1" aria-label="People in voice" data-testid="voice-people">
            {people.map((p) => (
              <li key={p.pid} data-testid="voice-person" data-self={p.self ? '1' : '0'} data-speaking={p.speaking ? '1' : '0'} data-cam={p.cam ? '1' : '0'} data-mic={p.mic ? '1' : '0'} data-volume={p.volume.toFixed(2)} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${p.speaking ? 'bg-neon' : 'bg-moss'}`} />
                  {p.name}
                </span>
                <span className="text-xs text-olive-soft">
                  {p.speaking ? 'speaking' : p.mic ? 'mic on' : 'mic off'}
                  {p.cam ? ', camera on' : ''}
                  {!p.self && prox.current ? (p.volume === 0 ? ', too far to hear' : p.volume < 1 ? ', faint' : '') : ''}
                </span>
              </li>
            ))}
            {others.length === 0 && <li className="text-olive-soft">No one else is in voice yet.</li>}
          </ul>
          <p className="text-xs text-olive-soft">{permissionText('microphone', perms.microphone)}. {permissionText('camera', perms.camera)}.</p>
          {prox.current && <p className="text-xs text-olive-soft">Voices here get quieter the further away people stand.</p>}
        </>
      )}
      {err && (
        <p role="alert" data-testid="voice-error" className="text-orange">
          {err}
        </p>
      )}
      {tiles.length > 0 && (
        <div className="space-y-2" data-testid="video-tiles">
          {tiles.map((t) => (
            <VideoTile key={t.pid} tile={t} />
          ))}
        </div>
      )}
      <div ref={audioHost} className="hidden" />
    </div>
  );
}
