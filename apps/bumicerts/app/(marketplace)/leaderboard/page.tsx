import { LeaderboardClient } from "./_components/LeaderboardClient";

export const metadata = {
  title: "Leaderboard — Bumicerts",
  description: "See the top donors making an impact on Bumicerts. Our Impact Champions are ranked by their total funding contributions.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
