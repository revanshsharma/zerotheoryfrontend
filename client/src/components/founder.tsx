import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Quote } from "lucide-react";

export function Founder() {
  const tags = ["AI & ML", "Game Development", "Cybersecurity", "Community Building"];

  return (
    <Section id="founder" className="border-t border-white/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          {/* Left Side: Image */}
          <div className="flex justify-center md:justify-end">
            <div className="relative group">
              {/* Glowing Ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse" />
              
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-background bg-card">
                <motion.img
                  src="/images/founder.png"
                  alt="Revansh Sharma"
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              
              <Badge 
                className="absolute bottom-4 right-4 bg-primary text-primary-foreground font-bold px-4 py-1 rounded-full shadow-lg"
              >
                Initiator
              </Badge>
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-bold font-display mb-2">Revansh Sharma</h2>
              <p className="text-xl text-primary font-medium">
                Founder of ZeroTheory — Zeroes to Heroes
              </p>
            </div>

            <p className="text-muted-foreground text-lg leading-relaxed">
              "Building a gamified ecosystem where students learn by creating, not memorizing. 
              ZeroTheory exists to turn curious beginners into confident builders through 
              challenges, collaboration, and real-world projects."
            </p>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <motion.div 
              className="relative p-6 rounded-xl bg-primary/5 border border-primary/20 group overflow-hidden"
              whileHover={{ boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
            >
              <Quote className="absolute top-2 left-2 w-8 h-8 text-primary/20" />
              <p className="relative z-10 text-lg font-medium italic text-white/90 italic">
                "Communities don’t grow from tutorials. They grow from shared progress."
              </p>
            </motion.div>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                View Vision
              </Button>
              <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5">
                Contact Founder
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
