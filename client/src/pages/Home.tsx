import { AnimatePresence, motion, useInView, useMotionValue, useSpring, type Variants } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ExternalLink, Menu, MoveUpRight, Sparkles, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { archiveItems, contactLinks, impactStats, partners, pillars, platformFeatures, siteContent } from "@/data/zeroTheory";
import { PromptWars } from "@/components/PromptWars";

// The gallery pulls in a dialog and a carousel; load it only when a visitor
// actually opens a card, so the landing page stays light.
const ArchiveGallery = lazy(() =>
  import("@/components/ArchiveGallery").then((module) => ({ default: module.ArchiveGallery }))
);

const reveal = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" as const } } } satisfies Variants;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } } satisfies Variants;

function SectionLabel({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return <div className={`mono flex items-center gap-3 text-[10px] font-medium tracking-[0.18em] ${inverse ? "text-white/60" : "text-black/55"}`}><span className={`h-2 w-2 rounded-full ${inverse ? "bg-[#fcea10]" : "bg-[#e6007e]"}`} />{children}</div>;
}

function ArrowButton({ children, href = "#join", inverse = false }: { children: React.ReactNode; href?: string; inverse?: boolean }) {
  return <a href={href} {...(/^https?:\/\//.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`focus-ring group inline-flex items-center gap-4 rounded-full border px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97] ${inverse ? "border-white/35 bg-white hover:bg-[#fcea10]" : "border-[#1d1d1b] bg-[#1d1d1b] text-white hover:bg-[#e6007e] hover:text-white"}`}><span style={{ color: inverse ? "#1d1d1b" : "#ffffff" }}>{children}</span><span className="grid h-7 w-7 place-items-center rounded-full bg-[#fcea10] text-[#1d1d1b] transition-transform duration-200 group-hover:rotate-45"><ArrowUpRight size={14} strokeWidth={2.5} /></span></a>;
}

function Logo({ className = "h-12" }: { className?: string }) {
  return <a href="#top" aria-label="ZeroTheory home" className="focus-ring group inline-flex items-center"><picture><source srcSet="/images/zerotheory-logo.webp" type="image/webp" /><img src="/images/zerotheory-logo.png" alt="ZeroTheory" width={720} height={396} decoding="async" className={`${className} w-auto transition-transform duration-300 group-hover:-rotate-2`} /></picture></a>;
}

function Counter({ value, numeric }: { value: string; numeric?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 70, damping: 18 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { const unsubscribe = spring.on("change", (latest) => setDisplay(Math.round(latest))); return unsubscribe; }, [spring]);
  useEffect(() => { if (inView && numeric) motionValue.set(numeric); }, [inView, numeric, motionValue]);
  const suffix = value.replace(/^[\d,.]+/, "");
  return <span ref={ref}>{numeric ? `${display}${suffix}` : value}</span>;
}

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [["About", "#about"], ["Impact", "#impact"], ["Archive", "#archive"], ["2.0", "#next"], ["PromptWars", "#promptwars"], ["Community", "#community"], ["Contact", "#contact"]];
  return <header className="absolute left-0 right-0 top-0 z-50"><div className="container flex h-20 items-center justify-between"><Logo className="h-12 md:h-14" /><nav className="hidden items-center gap-6 md:flex">{links.map(([label, href]) => <a key={label} href={href} className="focus-ring text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 transition-colors hover:text-[#fcea10]">{label}</a>)}<a href="#join" className="focus-ring rounded-full bg-[#fcea10] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1d1d1b] transition-transform hover:-translate-y-0.5 active:scale-[0.97]">Join the community</a></nav><button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white md:hidden">{open ? <X size={19} /> : <Menu size={19} />}</button></div><AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mx-4 mt-1 rounded-2xl border border-white/15 bg-[#1d1d1b]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">{links.map(([label, href]) => <a onClick={() => setOpen(false)} key={label} href={href} className="block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white/85 hover:bg-white/10">{label}</a>)}<a onClick={() => setOpen(false)} href="#join" className="mt-2 block rounded-xl bg-[#fcea10] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.12em] text-[#1d1d1b]">Join the community</a></motion.div>}</AnimatePresence></header>;
}

function Hero() {
  return <section id="top" className="grain relative min-h-[760px] overflow-hidden bg-[#1d1d1b] text-white"><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(29,29,27,0.96)_0%,rgba(29,29,27,0.86)_32%,rgba(29,29,27,0.12)_78%,rgba(29,29,27,0.4)_100%)]" /><motion.div initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/zerotheory-hero.jpg')" }} /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(29,29,27,0.95)_0%,rgba(29,29,27,0.78)_29%,rgba(29,29,27,0.12)_75%)]" /><Nav /><div className="container relative z-10 flex min-h-[760px] items-end pb-20 pt-36"><div className="max-w-[760px]"><motion.div initial="hidden" animate="show" variants={stagger}><motion.div variants={reveal} className="mono mb-7 flex items-center gap-3 text-[10px] text-[#fcea10]"><span className="h-px w-10 bg-[#fcea10]" />{siteContent.launch}</motion.div><motion.h1 variants={reveal} className="display max-w-[740px] text-[clamp(4.6rem,10.5vw,10rem)]">START AT<br /><span className="text-[#fcea10]">ZERO.</span><br />BUILD<br /><span className="relative inline-block text-[#e6007e]">SOMETHING<span className="absolute -right-7 top-0 text-[1.5rem] text-[#fcea10]">↗</span></span></motion.h1><motion.p variants={reveal} className="mt-8 max-w-[470px] text-base leading-relaxed text-white/72 md:text-lg">{siteContent.heroBody}</motion.p><motion.div variants={reveal} className="mt-9 flex flex-wrap items-center gap-3"><ArrowButton href="#about" inverse>Explore ZeroTheory</ArrowButton><a href="#join" className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#fcea10] hover:text-[#fcea10]">Join the community <ArrowDownRight size={15} /></a></motion.div></motion.div></div></div><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: .7 }} className="absolute bottom-7 right-6 hidden items-center gap-4 text-[10px] text-white/60 md:flex"><span className="mono">Scroll to explore</span><span className="grid h-8 w-8 place-items-center rounded-full border border-white/25"><ChevronDown size={14} /></span></motion.div><div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#f5f1e7] to-transparent" /></section>;
}

function About() {
  return <section id="about" className="grain bg-[#f5f1e7] py-28 md:py-36"><div className="container"><div className="grid gap-14 md:grid-cols-[0.8fr_1.2fr] md:items-end"><motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={reveal}><SectionLabel>01 / The idea</SectionLabel><h2 className="display mt-8 max-w-[420px] text-[clamp(3.5rem,7vw,7rem)]">WHAT IS<br /><span className="text-[#1d71b8]">ZERO<br className="md:hidden" /> THEORY?</span></h2></motion.div><motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={reveal} className="max-w-[610px] md:pb-2"><p className="text-[clamp(1.55rem,2.5vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.04em]">{siteContent.aboutBody}</p><div className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-[0.14em] text-black/55"><span className="h-px w-14 bg-[#e6007e]" />Learning should leave a trace.</div></motion.div></div><motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="mt-20 grid gap-3 md:grid-cols-3">{pillars.map((pillar) => <motion.div key={pillar.index} variants={reveal} className={`hover-lift group relative min-h-[280px] overflow-hidden rounded-[1.5rem] p-7 ${pillar.color === "yellow" ? "bg-[#fcea10]" : pillar.color === "blue" ? "bg-[#1d71b8] text-white" : "bg-[#e6007e] text-white"}`}><div className="flex items-start justify-between"><span className="mono text-[10px] opacity-60">{pillar.index} / 03</span><ArrowUpRight size={21} className="transition-transform duration-300 group-hover:rotate-45" /></div><div className="absolute bottom-7 left-7 right-7"><h3 className="display text-5xl uppercase">{pillar.title}</h3><p className="mt-3 max-w-[260px] text-sm leading-relaxed opacity-75">{pillar.body}</p></div><span className="absolute -bottom-8 -right-3 text-[10rem] font-bold leading-none opacity-[0.09]">{pillar.index}</span></motion.div>)}</motion.div></div></section>;
}

function Impact() {
  return <section id="impact" className="grain overflow-hidden bg-[#fcea10] py-24"><div className="container"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><SectionLabel>02 / Proof of work</SectionLabel><h2 className="display mt-7 max-w-[610px] text-[clamp(3.5rem,8vw,8.3rem)]">BUILT<br /><span className="text-[#e6007e]">FROM ZERO.</span></h2></div><p className="max-w-[260px] text-sm leading-relaxed text-black/65 md:pb-2">Impact is a work in progress. These are the verified signals we can share today.</p></div><div className="mt-16 grid border-t border-black/25 sm:grid-cols-2 lg:grid-cols-4">{impactStats.map((stat, index) => <motion.div key={stat.label} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={reveal} transition={{ delay: index * .06 }} className="border-b border-black/25 py-7 sm:border-r sm:px-5 lg:border-b-0 lg:first:pl-0"><div className="display text-[clamp(3.6rem,6vw,5.8rem)]"><Counter value={stat.value} numeric={stat.numeric} /></div><div className="mt-2 text-sm font-bold uppercase tracking-[0.06em]">{stat.label}</div>{stat.note && <div className="mono mt-2 text-[9px] text-black/50">{stat.note}</div>}</motion.div>)}</div></div><div className="mt-20 overflow-hidden border-y border-black/20 py-3"><div className="marquee flex w-max gap-8 text-[clamp(2rem,4vw,4rem)] font-bold uppercase tracking-[-0.07em]"><span>LEARN</span><span className="text-[#1d71b8]">→</span><span>BUILD</span><span className="text-[#e6007e]">→</span><span>GROW</span><span className="text-[#1d71b8]">→</span><span>LEARN</span><span className="text-[#1d71b8]">→</span><span>BUILD</span><span className="text-[#e6007e]">→</span><span>GROW</span></div></div></section>;
}

type ArchiveItem = (typeof archiveItems)[number];

const ARCHIVE_SPANS = ["md:col-span-7 md:min-h-[460px]", "md:col-span-5", "md:col-span-5", "md:col-span-7"];

function archiveTone(tone: string) {
  if (tone === "yellow") return "bg-gradient-to-t from-[#1d1d1b]/90 via-[#1d1d1b]/10 to-[#fcea10]/10";
  if (tone === "pink") return "bg-gradient-to-t from-[#e6007e]/90 via-[#e6007e]/10 to-transparent";
  return "bg-gradient-to-t from-[#1d1d1b]/90 via-[#1d1d1b]/20 to-transparent";
}

function ArchiveCard({ item, index, onOpen }: { item: ArchiveItem; index: number; onOpen: (trigger: HTMLButtonElement) => void }) {
  const photos = item.gallery;
  const hasGallery = photos.length > 0;
  const imageClass = "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110";

  return (
    <motion.article
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      variants={reveal}
      className={`group relative min-h-[330px] overflow-hidden rounded-[1.25rem] border border-black/10 ${ARCHIVE_SPANS[index]}`}
    >
      <img src={item.image} alt="" loading="lazy" decoding="async" className={imageClass} />
      <div className={`absolute inset-0 ${archiveTone(item.tone)}`} />
      <div className="relative flex h-full min-h-[330px] flex-col justify-between p-6 text-white md:min-h-0">
        <div className="flex items-start justify-between">
          <span className="mono rounded-full border border-white/40 bg-black/15 px-3 py-1.5 text-[9px]">{item.category}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#1d1d1b] transition-transform duration-300 group-hover:rotate-45">
            <ArrowUpRight size={16} />
          </span>
        </div>
        <div>
          <div className="mono mb-3 text-[9px] text-white/65">{item.date}</div>
          <h3 className="display max-w-[420px] text-4xl uppercase md:text-5xl">{item.title}</h3>
          <p className="mt-3 max-w-[390px] text-sm leading-relaxed text-white/75">{item.description}</p>
          {hasGallery && (
            <div className="mono mt-4 text-[10px] text-[#fcea10]">
              {photos.length} photo{photos.length === 1 ? "" : "s"} · open gallery
            </div>
          )}
        </div>
      </div>
      {hasGallery && (
        <button type="button" onClick={(event) => onOpen(event.currentTarget)} className="focus-ring absolute inset-0 z-10 h-full w-full">
          <span className="sr-only">{`Open the ${item.title} gallery, ${photos.length} photo${photos.length === 1 ? "" : "s"}`}</span>
        </button>
      )}
    </motion.article>
  );
}

function Archive() {
  // `activeItem` stays set after closing so the dialog can hand focus back to
  // the card that opened it.
  const [activeItem, setActiveItem] = useState<ArchiveItem | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section id="archive" className="grain bg-[#f5f1e7] py-28 md:py-36">
      <div className="container">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <SectionLabel>03 / The archive</SectionLabel>
            <h2 className="display mt-7 text-[clamp(3.6rem,8vw,8rem)]">THE<br /><span className="text-[#1d71b8]">ARCHIVE.</span></h2>
          </div>
          <div className="max-w-[300px] md:pb-2">
            <p className="text-sm leading-relaxed text-black/60">A visual collection of the ZeroTheory journey. Real documentation arrives as the next chapters land.</p>
            <div className="mono mt-5 text-[10px] text-[#e6007e]">Workshops · Hackathons · Events · Projects</div>
          </div>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-12">
          {archiveItems.map((item, index) => (
            <ArchiveCard
              key={item.title}
              item={item}
              index={index}
              onOpen={(trigger) => {
                triggerRef.current = trigger;
                setActiveItem(item);
                setGalleryOpen(true);
              }}
            />
          ))}
        </div>
      </div>
      {activeItem && (
        <Suspense fallback={null}>
          <ArchiveGallery
            open={galleryOpen}
            onOpenChange={(open) => {
              setGalleryOpen(open);
              // Hand focus back to the card that opened the gallery.
              if (!open) requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            title={activeItem.title}
            category={activeItem.category}
            photos={activeItem.gallery}
          />
        </Suspense>
      )}
    </section>
  );
}

function NextVersion() {
  return <section id="next" className="grain relative overflow-hidden bg-[#1d71b8] py-28 text-white md:py-36"><div className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/20 pulse-ring" /><div className="absolute -left-32 bottom-8 h-64 w-64 rounded-full border border-white/10" /><div className="container relative"><div className="grid gap-16 md:grid-cols-[0.9fr_1.1fr] md:items-center"><motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal}><SectionLabel inverse>04 / Under construction</SectionLabel><h2 className="display mt-8 max-w-[560px] text-[clamp(3.7rem,7.4vw,8rem)]">THE NEXT<br />VERSION<br /><span className="text-[#fcea10]">IS BEING BUILT.</span></h2><p className="mt-8 max-w-[460px] text-base leading-relaxed text-white/75">A new platform for students is coming. ZeroTheory 2.0 is a gamified platform designed around learning, building, challenges and progression.</p><div className="mt-9 flex items-center gap-3"><span className="rounded-full bg-[#fcea10] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1d1d1b]">Coming soon</span><span className="mono text-[9px] text-white/55">Curiosity mode: on</span></div></motion.div><motion.div initial={{ opacity: 0, y: 35, rotate: 3 }} whileInView={{ opacity: 1, y: 0, rotate: 3 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: .8, ease: "easeOut" }} className="relative mx-auto w-full max-w-[560px]"><div className="absolute -left-6 -top-6 z-10 grid h-14 w-14 place-items-center rounded-full bg-[#e6007e] text-white shadow-[5px_5px_0_#1d1d1b]"><Sparkles size={22} /></div><div className="relative overflow-hidden rounded-[1.5rem] border border-white/35 bg-[#102d59] p-3 shadow-[12px_15px_0_rgba(29,29,27,0.55)]"><div className="glass relative min-h-[420px] overflow-hidden rounded-[1rem] p-5"><div className="flex items-center justify-between border-b border-white/15 pb-4"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e6007e]" /><span className="h-2 w-2 rounded-full bg-[#fcea10]" /><span className="h-2 w-2 rounded-full bg-[#5edc9b]" /></div><span className="mono text-[8px] text-white/50">zt / 2.0 preview</span></div><div className="mt-9 grid grid-cols-[1fr_1.25fr] gap-4"><div><div className="mono text-[9px] text-white/50">your path</div><div className="mt-3 h-24 rounded-xl bg-[#fcea10] p-4 text-[#1d1d1b]"><div className="text-[10px] font-bold uppercase">starter quest</div><div className="mt-5 text-2xl font-bold">01</div></div><div className="mt-3 h-14 rounded-xl bg-white/10" /></div><div><div className="mono text-[9px] text-white/50">level zero → next</div><div className="relative mt-3 h-40 overflow-hidden rounded-xl bg-[#e6007e] p-4"><div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border-8 border-white/20" /><div className="absolute bottom-4 left-4 h-12 w-12 rounded-full bg-[#1d71b8]" /><div className="text-[10px] font-bold uppercase">build streak</div><div className="mt-5 text-3xl font-bold">07</div></div><div className="mt-3 h-14 rounded-xl bg-[#fcea10]/90" /></div></div><div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-white/15 bg-[#1d1d1b]/30 px-4 py-3"><span className="mono text-[8px] text-white/55">something is loading...</span><span className="h-2 w-2 rounded-full bg-[#fcea10]" /></div></div></div><div className="absolute -bottom-7 -right-4 z-10 rotate-[-10deg] bg-[#fcea10] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1d1d1b] shadow-[5px_5px_0_#1d1d1b]">Not a game. A way in.</div></motion.div></div><div className="mt-20 grid gap-3 border-t border-white/20 pt-5 sm:grid-cols-2 lg:grid-cols-5">{platformFeatures.map((feature, index) => <div key={feature} className="flex items-center justify-between border-b border-white/15 py-3 text-sm font-bold uppercase tracking-[0.06em] last:border-b-0 lg:border-b-0"><span className="text-white/80">{feature}</span><span className="text-[#fcea10]">0{index + 1}</span></div>)}</div></div></section>;
}

function Ecosystem() {
  return <section className="grain bg-[#f5f1e7] py-24"><div className="container"><div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr] md:items-end"><div><SectionLabel>06 / The ecosystem</SectionLabel><h2 className="display mt-7 text-[clamp(3.5rem,7vw,7rem)]">BUILT<br /><span className="text-[#e6007e]">TOGETHER.</span></h2></div><div><p className="max-w-[510px] text-xl leading-snug tracking-[-0.03em]">Built with communities, institutions and organizations that believe in creating opportunities.</p></div></div><div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{partners.map((partner, index) => <a key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer" className="focus-ring group flex min-h-[170px] flex-col justify-between rounded-2xl border border-black/15 bg-white/30 p-6 transition-colors hover:bg-[#fcea10]"><div className="flex items-start justify-between"><span className="mono text-[10px] text-black/45">0{index + 1} / collaborator</span><ArrowUpRight size={18} className="transition-transform duration-300 group-hover:rotate-45" /></div><div><div className="text-3xl font-bold tracking-[-0.08em]">{partner.name}</div><div className="mono mt-2 text-[9px] text-black/50">{[partner.note, new URL(partner.url).hostname.replace(/^www\./, "")].filter(Boolean).join(" · ")}</div></div></a>)}</div></div></section>;
}

function Community() {
  return <section id="community" className="grain bg-[#e6007e] py-28 text-white md:py-36"><div className="container"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><SectionLabel inverse>07 / People in motion</SectionLabel><h2 className="display mt-7 text-[clamp(3.6rem,8vw,8.2rem)]">ZERO THEORY,<br /><span className="text-[#fcea10]">IRL.</span></h2></div><p className="max-w-[300px] text-sm leading-relaxed text-white/75 md:pb-2">The people, moments and experiences behind the community. Photo documentation slots in here next.</p></div><div className="mt-16 grid gap-3 sm:grid-cols-2 md:grid-cols-12"><div className="relative min-h-[360px] overflow-hidden rounded-[1.5rem] bg-[#1d71b8] p-7 sm:col-span-2 md:col-span-5 md:min-h-[430px]"><div className="absolute -right-16 top-10 h-60 w-60 rounded-full border-[22px] border-[#fcea10]" /><div className="absolute bottom-7 left-7 right-7"><div className="mono text-[10px] text-white/60">photo slot / 01</div><div className="mt-3 text-3xl font-bold tracking-[-0.07em]">Students<br />making noise.</div><div className="mt-4 text-sm text-white/70">Replace with a real ZeroTheory image when supplied.</div></div></div><div className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] bg-[#fcea10] p-7 text-[#1d1d1b] sm:col-span-1 md:col-span-4 md:min-h-[310px]"><div className="mono text-[10px] text-black/50">photo slot / 02</div><div className="absolute bottom-6 left-7 right-7"><div className="text-4xl font-bold uppercase leading-none tracking-[-0.08em]">Workshops<br />that stick.</div><div className="mt-4 text-sm text-black/60">Real moments. Real people. Coming soon.</div></div></div><div className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] bg-[#1d1d1b] p-7 sm:col-span-1 md:col-span-3 md:min-h-[310px]"><div className="mono text-[10px] text-white/50">photo slot / 03</div><div className="absolute bottom-6 left-7 right-7"><div className="text-3xl font-bold uppercase leading-none tracking-[-0.08em] text-[#fcea10]">Behind<br />the build.</div><MoveUpRight className="mt-5 text-white" size={24} /></div></div></div></div></section>;
}

function Join() {
  return <section id="join" className="grain bg-[#fcea10] py-28 md:py-36"><div className="container"><div className="grid gap-12 md:grid-cols-[1.25fr_0.75fr] md:items-end"><div><SectionLabel>08 / Your move</SectionLabel><h2 className="display mt-7 max-w-[750px] text-[clamp(4.1rem,9vw,9rem)]">START AT<br /><span className="text-[#1d71b8]">ZERO.</span></h2></div><div className="md:pb-3"><p className="text-xl leading-snug tracking-[-0.04em]">{siteContent.joinBody}</p><div className="mt-8"><ArrowButton href={siteContent.joinUrl}>Join ZeroTheory</ArrowButton></div><p className="mono mt-5 text-[9px] text-black/45">Opens the ZeroTheory WhatsApp community</p></div></div></div></section>;
}

function Contact() {
  return <section id="contact" className="grain bg-[#1d1d1b] py-28 text-white md:py-36"><div className="container"><div className="grid gap-16 md:grid-cols-[1fr_0.72fr] md:items-end"><div><SectionLabel inverse>09 / Open channel</SectionLabel><h2 className="display mt-8 text-[clamp(4.2rem,9vw,9rem)]">LET'S<br /><span className="text-[#fcea10]">BUILD.</span></h2><p className="mt-8 max-w-[460px] text-base leading-relaxed text-white/65">For partnerships, schools, collaborations, opportunities and related inquiries, get in touch with ZeroTheory.</p></div><div className="border-t border-white/20 pt-4 md:border-t-0 md:border-l md:pl-9"><div className="mono text-[10px] text-white/45">Revansh Sharma / Founder, ZeroTheory</div><div className="mt-7 space-y-2">{contactLinks.map((link) => <a key={link.label} href={link.href} {...(/^https?:\/\//.test(link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="focus-ring group flex items-center justify-between border-b border-white/15 py-4 transition-colors hover:border-[#fcea10]"><span className="text-sm font-bold uppercase tracking-[0.08em] text-white/80 group-hover:text-[#fcea10]">{link.label}</span><span className="ml-auto max-w-[210px] truncate pl-4 text-right text-xs text-white/45 group-hover:text-white/75">{link.value}</span><ExternalLink size={14} className="ml-3 shrink-0 text-[#fcea10]" /></a>)}</div></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#1d1d1b] px-6 pb-8 text-white md:px-10"><div className="border-t border-white/15 pt-7"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><Logo className="h-16 md:h-20" /><p className="mt-4 text-xs text-white/45">{siteContent.tagline}</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{[["About", "#about"], ["Archive", "#archive"], ["Community", "#community"], ["Contact", "#contact"]].map(([label, href]) => <a key={label} href={href} className="hover:text-[#fcea10]">{label}</a>)}</div><div className="mono text-[9px] text-white/35">© 2026 ZeroTheory</div></div><div className="mt-10 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] text-white/30"><span>{siteContent.philosophy}</span><span>Made from zero / for what's next</span></div></div></footer>;
}

export default function Home() {
  return <main><Hero /><About /><Impact /><Archive /><NextVersion /><PromptWars /><Ecosystem /><Community /><Join /><Contact /><Footer /></main>;
}
