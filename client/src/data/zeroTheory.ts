// EDIT ZERO THEORY CONTENT HERE
export const siteContent = {
  brand: "ZERO THEORY",
  tagline: "Start at Zero. Build Something.",
  philosophy: "Simple to build. Hard to forget.",
  launch: "REBRAND / 22 SEP 2026",
  heroBody: "A student-led technology and innovation community focused on learning, building, and creating opportunities.",
  aboutBody: "ZeroTheory is a student-driven technology and innovation community focused on turning curiosity into practical skills, projects, and opportunities.",
  joinBody: "Whether you're starting your first project or already building something of your own, ZeroTheory is a place to learn, build, and grow.",
  joinUrl: "https://chat.whatsapp.com/GizlmYwizaNBAQxTvV942Z", // WhatsApp community invite used by the Join button
};

// PROMPTWARS × ZEROTHEORY. Paste the registration link into `registerUrl` when
// it is ready: the "Register for the hackathon" button drops its "link coming
// soon" tag and starts opening that link on its own. Leave it as "" until then.
export const promptWars = {
  registerUrl: "",
  steps: [
    { index: "01", title: "Prompt it", body: "Start from an idea, not a blank editor." },
    { index: "02", title: "Build it", body: "Shape it with AI until it actually works." },
    { index: "03", title: "Show it", body: "Share what you built and the prompts behind it." },
  ],
  // Typed out, one after another, in the terminal on the right of the section.
  prompts: [
    "build me a study planner that roasts me when I skip a day",
    "turn my class notes into a quiz game",
    "make a bot that explains code like a friend would",
    "design a poster for our next meetup",
  ],
};

// EDIT IMPACT NUMBERS HERE — `value` is what shows (add "+" for "or more"), `numeric` drives the count-up animation, `note` is optional.
export const impactStats = [
  { value: "700+", numeric: 700, label: "Students mentored", note: "Worldwide" },
  { value: "5+", numeric: 5, label: "Mini hackathons", note: "Hands-on builds" },
  { value: "20", numeric: 20, label: "Workshops & sessions" },
  { value: "5+", numeric: 5, label: "Collaborations" },
];

export const pillars = [
  { index: "01", title: "Learn", body: "Learn technology through practical experiences.", color: "yellow" },
  { index: "02", title: "Build", body: "Turn knowledge into real projects.", color: "blue" },
  { index: "03", title: "Grow", body: "Connect with people, opportunities, and communities.", color: "pink" },
];

// ARCHIVE CARDS.
export type ArchivePhoto = {
  /** File in client/public/images. */
  src: string;
  /** Read aloud by screen readers. Describe what the photo shows. */
  alt: string;
  /** Optional line shown under the photo when the gallery is open. */
  caption?: string;
};

/**
 * The four Archive cards.
 *
 * `image` is the picture on the card itself, cropped to the card's shape.
 * `gallery` is what opens when a visitor clicks the card. Leave `gallery`
 * empty and the card simply does not open.
 *
 * To change a photo: drop the file in client/public/images and point at it
 * here. Keep photos under about 300 KB.
 */
export const archiveItems = [
  {
    title: "The starting point",
    date: "ZERO THEORY / 01",
    category: "FOUNDATIONS",
    description: "A visual study of the early ideas that shaped the community.",
    tone: "yellow",
    image: "/images/archive-01-from-zero-talk.jpg",
    gallery: [
      {
        src: "/images/photo-from-zero-talk.jpg",
        alt: "Revansh Sharma presenting the From Zero to Hero session on stage",
        caption: "From Zero to Hero: how curiosity, consistency and community change everything.",
      },
    ],
  },
  {
    title: "Make it real",
    date: "ZERO THEORY / 02",
    category: "PROJECTS",
    description: "A reminder that practical work is the fastest way to learn.",
    tone: "blue",
    image: "/images/photo-lab-session.jpg",
    gallery: [
      {
        src: "/images/photo-lab-session.jpg",
        alt: "Students at workstations during a hands-on ZeroTheory lab session",
        caption: "A hands-on session, one workstation per student.",
      },
      {
        src: "/images/photo-online-session.jpg",
        alt: "Twenty-seven participants in a ZeroTheory online session",
        caption: "Twenty-seven people in one online session.",
      },
    ],
  },
  {
    title: "Build together",
    date: "ZERO THEORY / 03",
    category: "COMMUNITY",
    description: "A visual study of the people and moments behind the work.",
    tone: "pink",
    image: "/images/archive-03-school-session.jpg",
    gallery: [
      {
        src: "/images/photo-school-audience.jpg",
        alt: "School students listening during a ZeroTheory school session",
        caption: "A full hall for a ZeroTheory school session.",
      },
      {
        src: "/images/photo-school-questions.jpg",
        alt: "A ZeroTheory mentor passing the microphone to a student during questions",
        caption: "The questions are the best part.",
      },
    ],
  },
  {
    title: "Next up: 2.0",
    date: "ZERO THEORY / 04",
    category: "FUTURE",
    description: "The next version is being built in public, one thoughtful detail at a time.",
    tone: "cream",
    image: "/images/photo-podcast.jpg",
    gallery: [
      {
        src: "/images/photo-podcast.jpg",
        alt: "A ZeroTheory podcast interview being recorded in the studio",
        caption: "Talking about what comes next.",
      },
    ],
  },
] satisfies ReadonlyArray<{
  title: string;
  date: string;
  category: string;
  description: string;
  tone: string;
  image: string;
  gallery: ArchivePhoto[];
}>;


// Contact channels. `value` is the short text shown next to each label; http(s) links open in a new tab.
export const contactLinks = [
  { label: "Email", value: "hr.zerotheory@gmail.com", href: "mailto:hr.zerotheory@gmail.com" },
  { label: "LinkedIn", value: "zerotheory-zeroes-to-heroes", href: "https://www.linkedin.com/company/zerotheory-zeroes-to-heroes/" },
  { label: "Instagram", value: "@zerotheoryorg", href: "https://www.instagram.com/zerotheoryorg/" },
  { label: "GitHub", value: "zeroes-to-heroes", href: "https://github.com/revanshsharma/zeroes-to-heroes" },
];

export const platformFeatures = ["GAMIFIED LEARNING", "CHALLENGES", "PROJECTS", "ACHIEVEMENTS", "PROGRESSION"];

// Partner cards in the Built Together section. Each card links to `url` and
// shows its domain underneath; `note` is an optional word in front of it.
export const partners = [
  { name: "HACK2SKILL", url: "https://hack2skill.com/" },
  { name: "MOUNT LITERA ZEE SCHOOL", note: "Jabalpur", url: "https://mountliterajabalpur.com/" },
  { name: "GOOGLE FOR DEVELOPERS", url: "https://developers.google.com/" },
  { name: "MUMBAI ONCHAIN WEEK", url: "https://www.mumbaionchain.site/" },
];
