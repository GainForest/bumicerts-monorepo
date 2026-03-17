import { LeaderboardShell } from "./_components/LeaderboardShell";
import { LeaderboardSkeleton } from "./_components/LeaderboardSkeleton";

export default function LeaderboardLoading() {
  return (
    <LeaderboardShell animate={true}>
      <LeaderboardSkeleton />
    </LeaderboardShell>
  );
}
