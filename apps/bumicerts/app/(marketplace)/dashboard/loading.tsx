import { DashboardShell } from "./_components/DashboardShell";
import { DashboardSkeleton } from "./_components/DashboardSkeleton";

export default function DashboardLoading() {
  return (
    <DashboardShell animate={true}>
      <DashboardSkeleton />
    </DashboardShell>
  );
}
