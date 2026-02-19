import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegisterUser } from "@/hooks/use-users";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = insertUserSchema;

export function JoinForm() {
  const { mutate, isPending } = useRegisterUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      interest: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values, {
      onSuccess: () => form.reset()
    });
  }

  return (
    <Section id="join">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-primary/20 shadow-2xl bg-card/95 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 text-primary">
                <Sparkles />
              </div>
              <CardTitle className="text-2xl">Initialize Sequence</CardTitle>
              <CardDescription>
                Join the waiting list for the next cohort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codename (Name)</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background/50 border-white/10 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comms Channel (Email)</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} className="bg-background/50 border-white/10 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Specialization</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-white/10">
                              <SelectValue placeholder="Select your path" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="web">Full Stack Web</SelectItem>
                            <SelectItem value="ai">AI & Machine Learning</SelectItem>
                            <SelectItem value="game">Game Development</SelectItem>
                            <SelectItem value="devops">Cloud & DevOps</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Join Mission"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Section>
  );
}
