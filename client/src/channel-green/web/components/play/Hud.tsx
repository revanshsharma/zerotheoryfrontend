import Link from 'next/link';
import { useEffect, useState } from 'react';
import { registry } from '@cg/lib/registry';
import { audio } from '@cg/game/audio';
import type { Controls } from '@cg/game/controls';
import type { PanelId } from '@cg/game/session';
import { useGame, useSnap } from '@cg/game/useSession';
import { AvatarPanel } from './panels/AvatarPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConfessionPanel } from './panels/ConfessionPanel';
import { HelpPanel } from './panels/HelpPanel';
import { ListenDriver, ListenPanel } from './panels/ListenPanel';
import { PeoplePanel } from './panels/PeoplePanel';
import { RoomsPanel } from './panels/RoomsPanel';
import { VoicePanel } from './panels/VoicePanel';
import { WatchPanel } from './panels/WatchPanel';

export function Hud({ controls }: { controls: Controls }) {
  const game = useGame();
  const s = useSnap();
  const [sound, setSound] = useState(false);
  useEffect(() => {
    const a = audio();
    setSound(a.enabled);
    return a.onChange(() => setSound(a.enabled));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        if (e.key === 'Escape') (el as HTMLElement).blur();
        return;
      }
      if (e.key === 'Escape') game.closePanel();
      if (e.key === 'Enter') {
        e.preventDefault();
        game.openPanel('chat');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  const map = registry.maps[s.mapId];
  const features = map?.features ?? [];
  const btn = (id: Exclude<PanelId, null>, label: string, badge?: number, aria?: string) => (
    <button key={id} className={`btn btn-sm ${s.panel === id ? 'btn-primary' : ''}`} onClick={() => game.openPanel(id)} aria-pressed={s.panel === id} aria-label={aria}>
      {label}
      {badge ? <span className="ml-1 rounded bg-orange px-1 text-ink">{badge}</span> : null}
    </button>
  );

  if (s.status === 'connecting' || s.status === 'idle') {
    return <Overlay title="Walking in..." text="Finding the square." />;
  }
  if (s.status === 'kicked') {
    return (
      <Overlay title="You were asked to leave" text={s.error || 'A host or guide asked you to step out for now.'}>
        <Link href="/" className="btn">Back to the start</Link>
      </Overlay>
    );
  }
  if ((s.status === 'offline' || s.status === 'error') && !s.me) {
    return (
      <Overlay title={s.status === 'error' ? 'Could not walk in' : 'The square is asleep'} text={s.error || 'The server is not answering right now.'}>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => location.reload()}>Try again</button>
          <Link href="/" className="btn">Back</Link>
        </div>
      </Overlay>
    );
  }

  const stop = () => (controls.touch = { x: 0, y: 0 });
  const dpad = (dx: number, dy: number, label: string) => (
    <button
      type="button"
      className="touch-pad"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        controls.touch = { x: dx, y: dy };
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden="true">{dx < 0 ? '\u25C0' : dx > 0 ? '\u25B6' : dy < 0 ? '\u25B2' : '\u25BC'}</span>
    </button>
  );

  return (
    <>
      <ListenDriver />
      {s.status === 'offline' && <div role="status" className="absolute inset-x-0 top-0 z-30 bg-orange-deep py-1 text-center text-sm text-offwhite">{s.error}</div>}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-2">
        <div className="panel pointer-events-auto flex items-center gap-3 px-3 py-1.5" aria-label="Where you are">
          <Link href="/" className="font-pixel text-neon" title="Leave Channel Green" aria-label="Leave Channel Green">CG</Link>
          <div>
            <div className="font-pixel leading-tight">{s.room?.mode === 'invite' ? `${s.room.name || map?.name} (private)` : map?.name}</div>
            <div className="text-xs text-olive-soft">
              {s.room ? `${s.room.population} here` : ''}
              {s.room?.mode === 'invite' && s.room.code ? ` - code ${s.room.code}` : ''}
              {s.room?.locked ? ' - locked' : ''}
              {s.room?.silenced ? ' - quiet hour' : ''}
            </div>
          </div>
        </div>
        <nav aria-label="Panels" className="pointer-events-auto flex flex-wrap justify-end gap-1">
          {btn('chat', 'Chat', s.unread)}
          {btn('people', 'People', s.players.length > 0 ? s.players.length : undefined)}
          {features.includes('watch') && btn('watch', 'Watch')}
          {features.includes('listen') && btn('listen', 'Listen')}
          {features.includes('confession') && btn('confession', 'Wall')}
          {btn('voice', 'Voice')}
          {btn('rooms', 'Rooms')}
          {btn('avatar', 'Me')}
          <button
            className="btn btn-sm"
            aria-pressed={sound}
            title="Sound is off until you turn it on"
            onClick={() => {
              const a = audio();
              a.toggle();
              if (a.enabled) a.setSoundscape(registry.soundscapes[map?.ambience ?? ''] ?? null);
            }}
          >
            Sound {sound ? 'on' : 'off'}
          </button>
          {btn('help', '?', undefined, 'How it works')}
        </nav>
      </div>

      {s.panel && s.panel !== 'noticeboard' && (
        <aside className="panel absolute bottom-2 right-2 top-14 z-30 flex w-[min(400px,calc(100vw-1rem))] flex-col overflow-hidden" aria-label={TITLES[s.panel]}>
          <div className="flex items-center justify-between border-b-2 border-moss px-3 py-1.5">
            <h2 className="font-pixel text-neon">{TITLES[s.panel]}</h2>
            <button className="btn btn-sm btn-quiet" onClick={() => game.closePanel()} aria-label="Close panel">x</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {s.panel === 'chat' && <ChatPanel />}
            {s.panel === 'people' && <PeoplePanel />}
            {s.panel === 'avatar' && <AvatarPanel />}
            {s.panel === 'rooms' && <RoomsPanel />}
            {s.panel === 'watch' && <WatchPanel />}
            {s.panel === 'listen' && <ListenPanel />}
            {s.panel === 'confession' && <ConfessionPanel />}
            {s.panel === 'voice' && <VoicePanel />}
            {s.panel === 'help' && <HelpPanel />}
          </div>
        </aside>
      )}

      {s.note && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => game.closeNote()} onKeyDown={(e) => e.key === 'Escape' && game.closeNote()}>
          <div className="panel max-w-sm p-4" role="dialog" aria-modal="true" aria-label={s.note.title} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-pixel text-lg text-orange">{s.note.title}</h3>
            <p className="mt-2 text-cream">{s.note.text}</p>
            <button className="btn btn-sm mt-3" onClick={() => game.closeNote()} autoFocus>Okay</button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-2 top-16 z-30 flex w-72 max-w-[70vw] flex-col gap-2">
        {s.requests.map((r) => (
          <div key={r.id} className="panel pointer-events-auto p-3" role="alert">
            <p className="text-sm">
              <strong className="text-neon">{r.from.name}</strong>{' '}
              {r.kind === 'wave' ? 'waves at you.' : r.kind === 'hug' ? 'would like to give you a hug.' : r.kind === 'sit' ? 'would like to sit with you.' : r.kind === 'chat' ? 'would like to chat privately.' : 'invited you to a private room.'}
            </p>
            {r.note && <p className="mt-1 text-sm text-cream">&ldquo;{r.note}&rdquo;</p>}
            <div className="mt-2 flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={() => void game.respond(r.id, true)}>{r.kind === 'wave' ? 'Wave back' : 'Yes'}</button>
              <button className="btn btn-sm" onClick={() => void game.respond(r.id, false)}>Not now</button>
              <button className="btn btn-sm btn-quiet" onClick={() => void game.block(r.from.uid).then(() => game.dropRequest(r.id))}>Block</button>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 z-20 flex w-full flex-col items-center gap-2 p-2">
        <div aria-live="polite" className="flex flex-col items-center gap-1">
          {s.toasts.map((t) => (
            <div key={t.id} className={`panel px-3 py-1 text-sm ${t.level === 'warn' ? 'border-orange' : ''}`}>{t.text}</div>
          ))}
        </div>
        <div className="pointer-events-auto flex max-w-full flex-col items-center gap-1">
          {s.nearby && (
            <button className="btn btn-primary" onClick={() => controls.trigger()}>
              {s.nearby.label} <span className="hidden text-xs opacity-70 sm:inline">[E]</span>
            </button>
          )}
          <div className="emote-bar flex items-center justify-center gap-1" role="group" aria-label="Emotes">
            {registry.emotes.map((em) => (
              <button key={em.id} className="btn btn-sm btn-quiet shrink-0" title={em.label} aria-label={em.label} onClick={() => game.emote(em.id)}>
                {em.glyph}
              </button>
            ))}
          </div>
        </div>
        {!s.panel && (
          <div className="touch-ui w-full items-end justify-between px-1 pb-1">
            <div className="pointer-events-auto grid grid-cols-3 gap-1" role="group" aria-label="Move">
              <span />
              {dpad(0, -1, 'Move up')}
              <span />
              {dpad(-1, 0, 'Move left')}
              {dpad(0, 1, 'Move down')}
              {dpad(1, 0, 'Move right')}
            </div>
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <button type="button" className="touch-pad !h-14 !w-14 font-pixel text-sm" aria-label="Chat" onClick={() => game.openPanel('chat')}>
                Chat
              </button>
              <button
                type="button"
                className="touch-pad !h-16 !w-16 font-pixel text-base"
                data-down={s.nearby ? 'true' : 'false'}
                aria-label={s.nearby ? s.nearby.label : 'Interact'}
                onClick={() => controls.trigger()}
              >
                {s.nearby ? 'Go' : 'E'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const TITLES: Record<Exclude<PanelId, null>, string> = {
  chat: 'Chat',
  people: 'People',
  avatar: 'Your look',
  rooms: 'Rooms',
  watch: 'Watch together',
  listen: 'Listening room',
  confession: 'Confession wall',
  voice: 'Voice and video',
  noticeboard: 'Noticeboard',
  help: 'How it works',
};

function Overlay({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-forest-deep p-6 text-center">
      <div>
        <h1 className="font-pixel text-3xl text-neon">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-cream">{text}</p>
        <div className="mt-4 flex justify-center">{children}</div>
      </div>
    </div>
  );
}
