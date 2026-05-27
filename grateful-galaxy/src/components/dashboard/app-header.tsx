import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { AppBreadcrumbs } from "@/components/dashboard/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/dashboard/custom-sidebar-trigger";

import { navLinks } from "@/components/dashboard/app-shared";

import { NavUser } from "@/components/dashboard/nav-user";

import { SendIcon, BellIcon } from "lucide-react";

import { isPathActive } from "@/lib/helper";

interface Props {
  pathname: string;
}

export function AppHeader({ pathname }: Props) {
  const allItems = navLinks.flatMap((item) => [item, ...(item.subItems || [])]);

  const activeItem = allItems.find((item) => isPathActive(pathname, item.path));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 px-4 md:px-6",
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />

        <Separator
          orientation="vertical"
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
        />

        <AppBreadcrumbs page={activeItem} />
      </div>

      <div className="flex items-center gap-3">
        <Button size="icon-sm" variant="outline">
          <SendIcon className="size-4" />
        </Button>

        <Button aria-label="Notifications" size="icon-sm" variant="outline">
          <BellIcon className="size-4" />
        </Button>

        <Separator
          orientation="vertical"
          className="h-4 data-[orientation=vertical]:self-center"
        />

        <NavUser />
      </div>
    </header>
  );
}
