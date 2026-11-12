import { lazy, Suspense } from "react";
import { NotConnected } from "./NotConnected";
import { realtimeConfigured } from "./config";

// The game (Phaser, Socket.IO, voice) is a separate download and only starts in the browser
// after someone chooses to walk in.
const PlayClient = lazy(() => import("@cg/components/play/PlayClient").then((m) => ({ default: m.PlayClient })));

export function PlayRoute() {
  if (!realtimeConfigured) return <NotConnected />;
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center font-pixel text-neon blink">loading...</div>}>
      <PlayClient />
    </Suspense>
  );
}
