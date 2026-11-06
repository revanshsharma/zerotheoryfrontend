import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { promptWars } from "@/data/zeroTheory";

const reveal = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } } } satisfies Variants;

// Yellow to pink, the same sweep as the official banner.
const GRADIENT = "bg-[linear-gradient(90deg,#fcea10_0%,#ff9a3c_45%,#e6007e_100%)]";

// Rows of 0s and 1s behind the section. Built once, deterministically, so the
// pattern never jumps between renders.
const BINARY_ROWS = Array.from({ length: 16 }, (_, row) =>
  Array.from({ length: 120 }, (_, col) => ((row * 7 + col * 13 + ((row * col) % 5)) % 3 === 0 ? "1" : "0")).join(" ")
);

// The registration button. Same look whether it is live or still waiting for
// its link, so nothing shifts when the link arrives. The typography sits on an
// inner span because index.css resets `button { font: inherit }` and
// `a { color: inherit }` outside any layer, which beats Tailwind's font and
// colour utilities on the button or link itself.
const CTA_BASE = `focus-ring inline-flex items-center ${GRADIENT} shadow-[4px_4px_0_#000] transition-transform`;
const CTA_LABEL = "whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-[#1d1d1b]";

const BADGE_TEXT = "PROMPT · BUILD · SHOW · PROMPT · BUILD · SHOW · ";

/**
 * Types each prompt out, holds it, then moves to the next. Pauses while the
 * terminal is off screen. With reduced motion it just shows the first prompt.
 */
function useTypedPrompts(prompts: readonly string[], active: boolean, reduced: boolean) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(reduced ? prompts[0].length : 0);

  useEffect(() => {
    if (!active || reduced) return;
    const full = prompts[index];
    const done = length >= full.length;
    const timer = window.setTimeout(
      () => {
        if (!done) {
          setLength(length + 1);
        } else {
          setIndex((index + 1) % prompts.length);
          setLength(0);
        }
      },
      done ? 1900 : 36
    );
    return () => window.clearTimeout(timer);
  }, [active, reduced, index, length, prompts]);

  const full = prompts[index];
  return { text: full.slice(0, length), done: length >= full.length, index };
}

function PromptTerminal() {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const { text, done, index } = useTypedPrompts(promptWars.prompts, inView, reduced);
  const total = promptWars.prompts.length;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[560px]">
      {/* Spinning badge */}
      <div aria-hidden="true" className="absolute -right-5 -top-10 z-20 h-28 w-28 md:-right-10 md:-top-12 md:h-32 md:w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full animate-[spin_18s_linear_infinite]">
          <defs>
            <path id="pw-badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <circle cx="60" cy="60" r="58" fill="#fcea10" />
          <text className="mono" fill="#1d1d1b" fontSize="10.5" fontWeight="600" letterSpacing="1.2">
            <textPath href="#pw-badge-circle">{BADGE_TEXT}</textPath>
          </text>
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e6007e] text-white shadow-[3px_3px_0_#1d1d1b]">
            <Sparkles size={19} />
          </span>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 35, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: -2 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#121211] shadow-[7px_9px_0_#e6007e] md:shadow-[12px_15px_0_#e6007e]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e6007e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fcea10]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5edc9b]" />
            <span className="mono ml-3 text-[9px] text-white/45">promptwars / zt</span>
          </div>
        </div>

        <p className="sr-only">
          Example prompts: {promptWars.prompts.join("; ")}.
        </p>

        <div aria-hidden="true" className="min-h-[300px] px-5 pb-6 pt-5 font-['DM_Mono',monospace] text-[13px] leading-relaxed md:min-h-[320px] md:px-7 md:text-[15px]">
          <div className="text-white/35">zerotheory@promptwars ~ %</div>
          <div className="mt-4 flex gap-3">
            <span className="shrink-0 text-[#fcea10]">&gt;</span>
            <span className="text-white">
              {text}
              <span className={`ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-[#fcea10] ${done ? "animate-pulse" : ""}`} />
            </span>
          </div>
          <div className={`mt-5 transition-opacity duration-300 ${done ? "opacity-100" : "opacity-0"}`}>
            <div className="text-[#5edc9b]">✓ built. looks good.</div>
            <div className="mt-1 text-white/40">next prompt loading...</div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
          <span className="mono text-[9px] text-white/45">round {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span className="flex gap-1.5">
            {promptWars.prompts.map((prompt, i) => (
              <span key={prompt} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? `w-6 ${GRADIENT}` : "w-1.5 bg-white/20"}`} />
            ))}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export function PromptWars() {
  const hasLink = promptWars.registerUrl.trim().length > 0;

  return (
    <section id="promptwars" className="grain relative overflow-hidden bg-[#1d1d1b] py-28 text-white md:py-36">
      {/* Binary backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden font-['DM_Mono',monospace] text-[11px] leading-[2.6] tracking-[0.3em] text-white/[0.06] [mask-image:linear-gradient(to_bottom,#000_0%,#000_35%,transparent_75%)]">
        {BINARY_ROWS.map((row, i) => (
          <div key={i} className={`whitespace-nowrap ${i % 2 ? "translate-x-[-3%]" : ""}`}>{row}</div>
        ))}
      </div>

      {/* Halftone arc, like the banner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-52 -top-44 hidden h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_30%_70%,#fcea10_0%,#ff9a3c_38%,#e6007e_72%)] opacity-90 [mask-image:radial-gradient(circle,#000_1.1px,transparent_1.6px)] [mask-size:6px_6px] md:block"
      />

      <div className="container relative">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
          <div className="mono flex items-center gap-3 text-[10px] font-medium tracking-[0.18em] text-white/60">
            <span className="h-2 w-2 rounded-full bg-[#fcea10]" />
            05 / Community edition
          </div>
          <h2 className="display mt-8 text-[clamp(3rem,11vw,8.5rem)]">
            PROMPTWARS
            <br />
            <span className={`${GRADIENT} bg-clip-text pr-2 text-transparent`}>× ZEROTHEORY.</span>
          </h2>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#ff7eb3,#fcea10)] px-5 py-2.5 text-sm font-bold text-[#1d1d1b] shadow-[4px_4px_0_#000]">
            <Sparkles size={16} />
            Welcome to the new era of building
          </div>
        </motion.div>

        <div className="mt-16 grid gap-20 md:grid-cols-[1fr_1fr] md:items-center md:gap-14">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
            <p className="max-w-[500px] text-lg leading-relaxed text-white/80 md:text-xl">
              PromptWars is a hackathon format from Google for Developers and Hack2skill where you build with AI, one prompt at a
              time. We're bringing it to the ZeroTheory community.
            </p>

            <ol className="mt-10 max-w-[520px] border-t border-white/15">
              {promptWars.steps.map((step) => (
                <li key={step.index} className="group flex items-baseline gap-5 border-b border-white/15 py-4">
                  <span className="mono text-[10px] text-[#fcea10]">{step.index}</span>
                  <span className="text-2xl font-bold uppercase tracking-[-0.06em] transition-colors group-hover:text-[#fcea10]">{step.title}</span>
                  <span className="ml-auto hidden max-w-[220px] text-right text-sm text-white/55 sm:block">{step.body}</span>
                </li>
              ))}
            </ol>

            {/* One button, built in its final shape. While registerUrl is empty it
                is disabled and says the link is on its way; once the link is set
                the same button goes live and opens the registration page. */}
            <div className="mt-10">
              {hasLink ? (
                <a
                  href={promptWars.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${CTA_BASE} group gap-4 rounded-full py-2.5 pl-6 pr-2.5 active:scale-[0.97]`}
                >
                  <span className={CTA_LABEL}>Register for the hackathon</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1d1d1b] text-[#fcea10] transition-transform duration-200 group-hover:rotate-45">
                    <ArrowUpRight size={15} strokeWidth={2.5} />
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-describedby="pw-register-note"
                  className={`${CTA_BASE} w-full cursor-not-allowed flex-col gap-3 rounded-[1.75rem] px-6 py-4 sm:w-auto sm:flex-row sm:gap-4 sm:rounded-full sm:py-2.5 sm:pl-6 sm:pr-2.5`}
                >
                  <span className={CTA_LABEL}>Register for the hackathon</span>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#1d1d1b] px-3 py-1.5 font-['DM_Mono',monospace] text-[10px] font-medium uppercase tracking-[0.1em] text-[#fcea10]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fcea10] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#fcea10]" />
                    </span>
                    Link coming soon
                  </span>
                </button>
              )}
              {!hasLink && (
                <p id="pw-register-note" className="mono mt-4 text-[9px] text-white/45">
                  Registration opens soon. The link will appear right here.
                </p>
              )}
            </div>
          </motion.div>

          <PromptTerminal />
        </div>

        <motion.figure
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative mt-24"
        >
          <div className="overflow-hidden rounded-[1.25rem] border border-white/15 shadow-[10px_12px_0_rgba(0,0,0,0.55)]">
            <picture>
              <source srcSet="/images/promptwars-banner.webp" type="image/webp" />
              <img
                src="/images/promptwars-banner.jpg"
                alt="PromptWars x ZeroTheory, a Build with AI event with Google for Developers and H2S. Welcome to the new era of building."
                width={1243}
                height={240}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
            </picture>
          </div>
          <figcaption className="mono mt-4 text-[9px] text-white/40">Official banner · Google for Developers × H2S × ZeroTheory</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
