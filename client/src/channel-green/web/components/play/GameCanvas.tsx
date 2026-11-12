import { useEffect, useRef } from 'react';
import type { GameSession } from '@cg/game/session';
import type { Controls } from '@cg/game/controls';

/** Phaser is only ever loaded in the browser, and only once someone walks in. */
export function GameCanvas({ session, controls }: { session: GameSession; controls: Controls }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: import('phaser').Game | null = null;
    let cancelled = false;
    (async () => {
      const [Phaser, { WorldScene }] = await Promise.all([import('phaser'), import('@cg/game/WorldScene')]);
      try {
        await Promise.all([document.fonts.load('7px "Pixelify Sans"'), document.fonts.load('12px "Pixelify Sans"')]);
      } catch {
        /* fall back to the system font */
      }
      if (cancelled || !host.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        backgroundColor: '#0b1f15',
        pixelArt: true,
        roundPixels: true,
        antialias: false,
        banner: false,
        audio: { noAudio: true },
        disableContextMenu: true,
        scale: { mode: Phaser.Scale.RESIZE, width: host.current.clientWidth || 800, height: host.current.clientHeight || 600 },
        scene: [],
      });
      game.scene.add('world', WorldScene, true, { session, controls });
    })();
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [session, controls]);

  return <div ref={host} className="absolute inset-0 touch-none" aria-label="The Channel Green world" role="application" />;
}
