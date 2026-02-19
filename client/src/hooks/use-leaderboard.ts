import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LeaderboardListResponse } from "@shared/routes";

export function useLeaderboard() {
  return useQuery({
    queryKey: [api.leaderboard.list.path],
    queryFn: async () => {
      const res = await fetch(api.leaderboard.list.path);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data = await res.json();
      return api.leaderboard.list.responses[200].parse(data);
    },
  });
}

// Just in case we want to support creating/seeding entries via UI later
export function useCreateLeaderboardEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      // Intentionally omitting full implementation as it's an admin feature 
      // but scaffolding structure for completeness
      const res = await fetch(api.leaderboard.create.path, {
        method: api.leaderboard.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leaderboard.list.path] });
    },
  });
}
