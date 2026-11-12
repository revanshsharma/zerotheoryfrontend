import { useEffect } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import "@fontsource/jost/400.css";
import "@fontsource/jost/600.css";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/600.css";
import "@cg/globals.scoped.css";
import Credits from "@cg/pages/Credits";
import Guidelines from "@cg/pages/Guidelines";
import { Landing } from "./Landing";
import { PlayRoute } from "./PlayRoute";
import { BASE } from "./config";

const TITLES: Record<string, string> = {
  "": "Channel Green - Somewhere to belong | ZeroTheory",
  "/play": "Channel Green - walk in | ZeroTheory",
  "/guidelines": "Community guidelines - Channel Green | ZeroTheory",
  "/credits": "Credits - Channel Green | ZeroTheory",
};

/** Everything under /channel-green. Loaded on demand, so the ZeroTheory home page does not pay for it. */
export default function ChannelGreenPage() {
  const [location] = useLocation();
  const sub = location.slice(BASE.length).replace(/\/+$/, "");

  useEffect(() => {
    const before = document.title;
    document.title = TITLES[sub] ?? TITLES[""];
    window.scrollTo(0, 0);
    return () => {
      document.title = before;
    };
  }, [sub]);

  let view;
  if (sub === "") view = <Landing />;
  else if (sub === "/play") view = <PlayRoute />;
  else if (sub === "/guidelines") view = <Guidelines />;
  else if (sub === "/credits") view = <Credits />;
  else
    view = (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="font-pixel text-3xl text-neon">Nothing here</h1>
          <WouterLink href={BASE} className="btn mt-4 inline-block">Back to Channel Green</WouterLink>
        </div>
      </main>
    );

  return <div className="cg-root">{view}</div>;
}
