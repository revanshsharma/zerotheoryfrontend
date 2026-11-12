import { useEffect, useState } from 'react';
import { GameSession } from '@cg/game/session';
import { SessionContext } from '@cg/game/useSession';
import { Controls } from '@cg/game/controls';
import { loadProfile, saveProfile, type LocalProfile } from '@cg/lib/profile';
import { audio } from '@cg/game/audio';
import { Gate } from './Gate';
import { GameCanvas } from './GameCanvas';
import { Hud } from './Hud';
import { MoodOverlay } from './MoodOverlay';

export function PlayClient() {
  const [profile, setProfile] = useState<LocalProfile | null | undefined>(undefined);
  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  if (profile === undefined) return <div className="grid min-h-dvh place-items-center font-pixel text-neon blink">loading...</div>;
  if (!profile) {
    return (
      <Gate
        onDone={(p) => {
          saveProfile(p);
          setProfile(p);
        }}
      />
    );
  }
  return <World profile={profile} />;
}

function World({ profile }: { profile: LocalProfile }) {
  const [boot, setBoot] = useState<{ session: GameSession; controls: Controls } | null>(null);

  useEffect(() => {
    const session = new GameSession(profile);
    const controls = new Controls();
    setBoot({ session, controls });
    void session.start();
    return () => {
      controls.destroy();
      session.dispose();
      audio().stopTapePlayback();
    };
    // the profile is only read once; later edits go through session.changeAvatar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!boot) return null;
  return (
    <SessionContext.Provider value={boot.session}>
      <div className="fixed inset-0 overflow-hidden bg-forest-deep">
        <GameCanvas session={boot.session} controls={boot.controls} />
        <MoodOverlay />
        <Hud controls={boot.controls} />
      </div>
    </SessionContext.Provider>
  );
}
