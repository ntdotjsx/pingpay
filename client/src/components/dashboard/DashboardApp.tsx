import { AuthProvider } from "@/hooks/useAuth";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { FriendsContent } from "@/components/dashboard/FriendsContent";
import { ApiKeysContent } from "@/components/dashboard/ApiKeysContent";
import { NotificationContent } from "@/components/dashboard/NotificationContent";
import { InsightsContent } from "@/components/dashboard/InsightsContent";
import { SlipChecksContent } from "@/components/dashboard/SlipChecksContent";

interface Props {
  page?: "dashboard" | "friends" | "api-keys" | "notification" | "insights" | "slips";
}

export function DashboardApp({ page = "dashboard" }: Props) {
  const content = {
    dashboard: <DashboardContent />,
    friends: <FriendsContent />,
    "api-keys": <ApiKeysContent />,
    notification: <NotificationContent />,
    insights: <InsightsContent />,
    slips: <SlipChecksContent />,
  }[page];

  return (
    <AuthProvider>
      <DashboardGuard>
        {content}
      </DashboardGuard>
    </AuthProvider>
  );
}
