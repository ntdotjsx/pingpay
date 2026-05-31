import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2Icon } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function DashboardGuard({ children }: Props) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // ไม่มี session → กลับไป /auth
      window.location.replace("/auth/signin");
    }
  }, [user, loading]);

  // ─── States ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    // กำลัง redirect อยู่ ไม่ render อะไร
    return null;
  }

  // ─── Authenticated ────────────────────────────────────────────────────────
  return <>{children}</>;
}