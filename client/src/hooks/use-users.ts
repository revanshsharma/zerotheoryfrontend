import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type InsertUser = z.infer<typeof api.users.create.input>;

export function useRegisterUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.users.create.path, {
        method: api.users.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to register");
      }

      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Level Up! 🚀",
        description: "You've successfully joined ZeroTheory. Check your email for next steps.",
        variant: "default",
        className: "bg-primary text-primary-foreground border-none"
      });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
