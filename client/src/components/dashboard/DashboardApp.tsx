import { AuthProvider } from "@/hooks/useAuth";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { FriendsContent } from "@/components/dashboard/FriendsContent";

interface Props {
  page?: "dashboard" | "friends";
}

export function DashboardApp({ page = "dashboard" }: Props) {
  return (
    <AuthProvider>
      <DashboardGuard>
        {page === "friends" ? <FriendsContent /> : <DashboardContent />}
      </DashboardGuard>
    </AuthProvider>
  );
}
