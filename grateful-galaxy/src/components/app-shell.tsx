"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { DashboardSkeleton } from "./dashboard-skeleton";

export function AppShell() {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            <DashboardSkeleton />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}