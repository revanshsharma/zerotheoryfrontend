import { Link as WouterLink } from "wouter";
import { BASE } from "./config";

/** Shown instead of the game when no live server is connected. There is never a pretend game. */
export function NotConnected() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="panel max-w-xl p-6 text-center">
        <p className="eyebrow text-cream-dim">not connected</p>
        <h1 className="font-pixel mt-2 text-3xl text-neon">The town is not open yet</h1>
        <p className="mt-4 text-lg text-cream">
          Channel Green needs its live server to let people walk around and talk to each other, and that server is not connected to this site yet. Until it is, there is nothing to walk into, and we would rather say so than show you a fake.
        </p>
        <p className="mt-3 text-sm text-olive-soft">You can still look around the rooms, read the house rules and see how it is built.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <WouterLink href={BASE} className="btn btn-primary">Back to Channel Green</WouterLink>
          <WouterLink href="/" className="btn">ZeroTheory home</WouterLink>
        </div>
      </div>
    </main>
  );
}
