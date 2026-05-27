"use client";

import { useEffect, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import type { SidebarNavGroup } from "@/components/dashboard/app-shared";

import { ChevronRightIcon } from "lucide-react";
import { isPathActive } from "@/lib/helper";

export function NavGroup({ label, items }: SidebarNavGroup) {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    const updatePathname = () => {
      setPathname(window.location.pathname);
    };

    updatePathname();

    document.addEventListener("astro:page-load", updatePathname);

    return () => {
      document.removeEventListener("astro:page-load", updatePathname);
    };
  }, []);

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}

      <SidebarMenu>
        {items.map((item) => {
          const isActive = isPathActive(pathname, item.path);

          const hasActiveSubItem = item.subItems?.some((subItem) =>
            isPathActive(pathname, subItem.path),
          );

          return (
            <Collapsible
              key={item.title}
              className="group/collapsible"
              defaultOpen={hasActiveSubItem}
            >
              <SidebarMenuItem>
                {item.subItems?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isActive}>
                        {item.icon}

                        <span>{item.title}</span>

                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => {
                          const isSubActive = isPathActive(
                            pathname,
                            subItem.path,
                          );

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                              >
                                <a href={subItem.path}>
                                  {subItem.icon}

                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive}>
                    <a href={item.path}>
                      {item.icon}

                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
