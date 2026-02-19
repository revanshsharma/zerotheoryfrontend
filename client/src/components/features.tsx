import { Section, SectionHeader } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Code2, Gamepad2, Cloud, Server } from "lucide-react";
import { motion } from "framer-motion";

export function Features() {
  const features = [
    {
      icon: <Brain className="w-8 h-8 text-pink-500" />,
      title: "AI & Machine Learning",
      description: "Build neural networks and integrate LLMs into real-world applications."
    },
    {
      icon: <Code2 className="w-8 h-8 text-blue-500" />,
      title: "Full Stack Web",
      description: "Master React, Node, and modern frameworks to build scalable platforms."
    },
    {
      icon: <Gamepad2 className="w-8 h-8 text-purple-500" />,
      title: "Game Development",
      description: "Create immersive experiences using Unity, Unreal, or WebGL technologies."
    },
    {
      icon: <Cloud className="w-8 h-8 text-cyan-500" />,
      title: "Cloud & DevOps",
      description: "Deploy, scale, and manage infrastructure with Docker and Kubernetes."
    }
  ];

  return (
    <Section id="about" className="bg-white/5">
      <SectionHeader 
        title="Choose Your Class" 
        subtitle="Specialized tracks designed to take you from beginner to industry-ready."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-card/50 border-white/10 hover:border-primary/50 transition-colors duration-300 h-full">
              <CardHeader>
                <div className="mb-4 p-3 bg-background rounded-xl w-fit border border-white/5">
                  {feature.icon}
                </div>
                <CardTitle className="font-display text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
