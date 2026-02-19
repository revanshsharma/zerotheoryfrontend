import { Section, SectionHeader } from "@/components/ui/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Trophy, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSection() {
  const { data: leaderboard, isLoading } = useLeaderboard();

  return (
    <Section id="leaderboard" className="bg-white/5">
      <SectionHeader 
        title="Top Contributors" 
        subtitle="Legends of the ZeroTheory community."
      />

      <div className="max-w-4xl mx-auto bg-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500 w-5 h-5" />
            <h3 className="font-bold">Current Standings</h3>
          </div>
          <span className="text-xs text-muted-foreground">Updated Live</span>
        </div>

        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="w-[100px] text-center">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : leaderboard?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No heroes yet. Be the first to join!
                </TableCell>
              </TableRow>
            ) : (
              leaderboard?.map((entry, index) => (
                <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="text-center font-mono font-bold">
                    {index === 0 ? <Medal className="w-5 h-5 text-yellow-500 mx-auto" /> : 
                     index === 1 ? <Medal className="w-5 h-5 text-gray-400 mx-auto" /> :
                     index === 2 ? <Medal className="w-5 h-5 text-amber-700 mx-auto" /> :
                     `#${index + 1}`}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                        {entry.name.slice(0, 2).toUpperCase()}
                      </div>
                      {entry.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Lvl {entry.level}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {entry.xp.toLocaleString()} XP
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}
