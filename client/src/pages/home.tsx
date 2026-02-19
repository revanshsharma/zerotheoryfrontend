import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Progression } from "@/components/progression";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { JoinForm } from "@/components/join-form";
import { Founder } from "@/components/founder";
import { Footer } from "@/components/footer";
import { motion, useScroll, useSpring } from "framer-motion";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left"
        style={{ scaleX }}
      />
      
      <Navbar />
      
      <main>
        <Hero />
        <Features />
        <Progression />
        <LeaderboardSection />
        
        {/* Community Benefits / Cards Grid */}
        <section id="community" className="py-20 relative">
           <div className="container mx-auto px-4 text-center mb-12">
              <h2 className="text-3xl font-bold font-display mb-4">Community Perks</h2>
              <p className="text-muted-foreground">Why many developers call ZeroTheory home.</p>
           </div>
           
           <div className="container mx-auto px-4 grid md:grid-cols-3 gap-6">
              {[
                { title: "Weekly Hackathons", desc: "Build fast, break things, win prizes." },
                { title: "Code Reviews", desc: "Get feedback from senior engineers." },
                { title: "Career Network", desc: "Direct intros to hiring partners." }
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
                   <h3 className="font-bold text-xl mb-2 text-primary">{item.title}</h3>
                   <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
           </div>
        </section>

        <JoinForm />
        <Founder />
      </main>

      <Footer />
    </div>
  );
}
