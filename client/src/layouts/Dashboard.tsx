"use client";
import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

import { AppHeader } from "@/components/dashboard/app-header";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

interface Props {
  children: ReactNode;
  pathname: string;
}

export function AppShellLayout({ children, pathname }: Props) {
  return (
    <AuthProvider>
      <DashboardGuard>
        <div className="overflow-hidden">
          <SidebarProvider className="relative h-svh">
            <AppSidebar />

            <SidebarInset>
              <AppHeader pathname={pathname} />

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </DashboardGuard>
    </AuthProvider>
  );
}