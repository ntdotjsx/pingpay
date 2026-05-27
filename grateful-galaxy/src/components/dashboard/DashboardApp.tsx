import { AuthProvider } from "@/hooks/useAuth";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

interface Props {
  children?: React.ReactNode;
}

export function DashboardApp({ children }: Props) {
  return (
    <AuthProvider>
      <DashboardGuard>
        {children ?? <DashboardSkeleton />}
      </DashboardGuard>
    </AuthProvider>
  );
}