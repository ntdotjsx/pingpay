"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

interface Props {
  children: ReactNode;
}

export function AppShellLayout({ children }: Props) {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar />

        <SidebarInset>
          <AppHeader />

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
