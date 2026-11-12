import type { CSSProperties } from 'react';
import { moodFor } from '@cg/game/mood';
import { useSnap } from '@cg/game/useSession';

/** Screen-space finish over the world: sunset wash, soft vignette and a little film grain. Never blocks clicks. */
export function MoodOverlay() {
  const { mapId } = useSnap();
  if (!mapId) return null;
  const m = moodFor(mapId).screen;
  const style = {
    '--mood-top': m.top,
    '--mood-bottom': m.bottom,
    '--mood-vignette': String(m.vignette),
    '--mood-grain': String(m.grain),
  } as CSSProperties;
  return (
    <div key={mapId} className="mood" style={style} aria-hidden="true">
      <div className="mood-wash" />
      <div className="mood-vignette" />
      <div className="mood-grain" />
    </div>
  );
}
