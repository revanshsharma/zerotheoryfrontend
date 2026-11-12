import { useLocation } from "wouter";
import { cgPath } from "../config";

// Stand-in for next/navigation, only what Channel Green uses.
export function useRouter() {
  const [, navigate] = useLocation();
  return { push: (to: string) => navigate(cgPath(to)), replace: (to: string) => navigate(cgPath(to), { replace: true }) };
}
