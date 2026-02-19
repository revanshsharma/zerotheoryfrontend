import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  containerClassName?: string;
}

export function Section({ children, className, containerClassName, ...props }: SectionProps) {
  return (
    <section 
      className={cn("py-20 relative overflow-hidden", className)} 
      {...props}
    >
      <div className={cn("container px-4 mx-auto relative z-10", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({ title, subtitle, className }: { title: string, subtitle?: string, className?: string }) {
  return (
    <div className={cn("text-center mb-16 space-y-4", className)}>
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
