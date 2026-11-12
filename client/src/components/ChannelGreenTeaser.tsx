import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const reveal = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } } } satisfies Variants;

// A small pixel-art town at dusk, drawn in CSS so the home page loads nothing extra for it.
const WINDOWS = [
  [14, 52], [14, 64], [26, 52], [26, 64], [52, 44], [52, 58], [64, 44], [64, 58], [78, 56], [78, 68],
];

/** Front-door teaser for the Channel Green section. The game itself loads only on /channel-green. */
export function ChannelGreenTeaser() {
  return (
    <section id="channel-green" className="grain relative overflow-hidden bg-[#0b1f15] py-28 text-white md:py-36">
      <div className="container relative">
        <div className="grid gap-14 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
            <div className="mono flex items-center gap-3 text-[10px] font-medium tracking-[0.18em] text-white/60">
              <span className="h-2 w-2 rounded-full bg-[#9dff6a]" />Open source / Channel Green
            </div>
            <h2 className="display mt-8 max-w-[640px] text-[clamp(3.4rem,7vw,7rem)]">
              SOMEWHERE<br /><span className="text-[#e8955a]">TO BELONG.</span>
            </h2>
            <p className="mt-8 max-w-[480px] text-base leading-relaxed text-white/72 md:text-lg">
              Channel Green is a small, cozy pixel town at dusk, made by ZeroTheory and open to everyone to build on. Walk around, sit by a fire, watch something together. No feed, no score, no pressure.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="/channel-green" className="focus-ring group inline-flex items-center gap-4 rounded-full bg-[#9dff6a] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#0b1f15] transition-transform hover:-translate-y-0.5 active:scale-[0.97]">
                Visit Channel Green <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:rotate-45" />
              </a>
              <span className="mono rounded-full border border-white/25 px-4 py-2.5 text-[9px] text-white/60">Live town: coming soon</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative mx-auto w-full max-w-[520px]" aria-hidden="true">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.5rem] border border-white/25 shadow-[12px_15px_0_rgba(0,0,0,0.45)]" style={{ background: "linear-gradient(180deg,#2b2347 0%,#6b3f63 38%,#e8955a 72%,#f1e3c1 100%)", imageRendering: "pixelated" }}>
              <div className="absolute right-[14%] top-[12%] h-10 w-10 bg-[#faf5e8] shadow-[0_0_0_6px_rgba(250,245,232,0.18)]" />
              <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[#14301f]" />
              <div className="absolute inset-x-0 bottom-[34%] h-[6%] bg-[#264a30]" />
              {[
                { l: "8%", w: "26%", h: "38%" },
                { l: "40%", w: "22%", h: "30%" },
                { l: "68%", w: "26%", h: "42%" },
              ].map((b) => (
                <div key={b.l} className="absolute bottom-[34%] bg-[#0b1f15]" style={{ left: b.l, width: b.w, height: b.h }} />
              ))}
              {WINDOWS.map(([x, y]) => (
                <div key={`${x}-${y}`} className="absolute h-[5%] w-[4%] bg-[#fcea10]" style={{ left: `${x}%`, bottom: `${y - 14}%`, opacity: 0.9 }} />
              ))}
              <div className="absolute bottom-[12%] left-[46%] h-3 w-3 bg-[#9dff6a]" />
              <div className="absolute bottom-[12%] left-[56%] h-3 w-3 bg-[#e8955a]" />
              <div className="mono absolute bottom-3 left-4 text-[8px] text-white/55">a small town at dusk</div>
            </div>
            <div className="absolute -bottom-6 -right-3 z-10 rotate-[-6deg] bg-[#fcea10] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1d1d1b] shadow-[5px_5px_0_#1d1d1b]">Such is life.</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
