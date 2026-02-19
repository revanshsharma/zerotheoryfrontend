import { Section, SectionHeader } from "@/components/ui/section";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

export function Progression() {
  const steps = [
    { title: "Hello World", description: "Learn the fundamentals of logic." },
    { title: "Version Control", description: "Master Git and GitHub workflows." },
    { title: "Build Project", description: "Create a real-world application." },
    { title: "Collaborate", description: "Work in a team environment." },
    { title: "Deploy", description: "Ship your code to production." }
  ];

  return (
    <Section id="progression">
      <SectionHeader 
        title="The Path to Glory" 
        subtitle="A proven roadmap to transform your skills."
      />

      <div className="relative py-10">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 hidden md:block" />
        <motion.div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-purple-500 -translate-y-1/2 hidden md:block origin-left" 
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div className="grid md:grid-cols-5 gap-8 relative z-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-background border-4 border-card flex items-center justify-center mb-4 group-hover:border-primary transition-colors duration-300 relative">
                 <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                 <span className="font-bold font-mono text-primary">{index + 1}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
