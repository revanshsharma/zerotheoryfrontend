import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";

export function Hero() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-background z-0">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
      </div>

      <div className="container px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Season 1 is Live
          </div>

          <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
            Zeroes <span className="text-muted-foreground">to</span> <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary text-glow">
              Heroes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
            Learn tech by building. Compete in challenges. Collaborate with peers. 
            Level up your career in a gamified tech ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button 
              size="lg" 
              onClick={() => scrollTo("#join")}
              className="text-base h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 box-glow"
            >
              Join Community <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => scrollTo("#progression")}
              className="text-base h-12 px-8 border-white/10 hover:bg-white/5"
            >
              Explore Path
            </Button>
          </div>
        </motion.div>

        {/* Hero Illustration / Code Block */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-xl bg-[#0F1420] border border-white/10 shadow-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="font-mono text-sm space-y-2">
              <div className="flex gap-2">
                <span className="text-purple-400">const</span>
                <span className="text-blue-400">user</span>
                <span className="text-white">=</span>
                <span className="text-yellow-300">await</span>
                <span className="text-blue-400">zeroTheory</span>
                <span className="text-white">.</span>
                <span className="text-blue-300">join</span>
                <span className="text-white">();</span>
              </div>
              <div className="flex gap-2">
                <span className="text-purple-400">while</span>
                <span className="text-white">(</span>
                <span className="text-blue-400">user</span>
                <span className="text-white">.</span>
                <span className="text-blue-300">isLearning</span>
                <span className="text-white">) {"{"}</span>
              </div>
              <div className="pl-4 flex gap-2">
                <span className="text-yellow-300">await</span>
                <span className="text-blue-400">user</span>
                <span className="text-white">.</span>
                <span className="text-blue-300">buildProject</span>
                <span className="text-white">();</span>
              </div>
              <div className="pl-4 flex gap-2">
                <span className="text-blue-400">user</span>
                <span className="text-white">.</span>
                <span className="text-blue-300">levelUp</span>
                <span className="text-white">();</span>
              </div>
              <div>{"}"}</div>
              <div className="flex gap-2 pt-2">
                <span className="text-green-400">// Output: Hero Status Achieved 🚀</span>
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-6 -bottom-6 bg-card border border-primary/20 p-4 rounded-xl shadow-xl flex items-center gap-3"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Terminal className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Status</div>
                <div className="font-bold text-white">Level 1: Initiate</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
