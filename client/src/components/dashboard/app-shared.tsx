import type { ReactNode } from "react";
import {
  LayoutGridIcon,
  ListChecksIcon,
  BarChart3Icon,
  MessageSquareTextIcon,
  UsersIcon,
  PlugIcon,
  SettingsIcon,
  HelpCircleIcon,
  ActivityIcon,
} from "lucide-react";

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  isActive?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    items: [
      {
        title: "ภาพรวมทั้งหมด",
        path: "/dashboard/",
        icon: <LayoutGridIcon />,
        isActive: true,
      },
    ],
  },
  {
    label: "รายการ",
    items: [
      {
        title: "รายการทั้งหมด",
        path: "#/queue",
        icon: <ListChecksIcon />,
      },
      {
        title: "สถิติ",
        path: "#/team-insights",
        icon: <BarChart3Icon />,
      },
      {
        title: "เพื่อน",
        path: "/dashboard/friends",
        icon: <UsersIcon />,
      },
    ],
  },
  {
    label: "ขั้นสูง",
    items: [
      {
        title: "ตั้งค่า",
        icon: <SettingsIcon />,
        subItems: [
          { title: "การแจ้งเตือน", path: "#/workspace/branding" },
          { title: "Team & roles", path: "#/workspace/team" },
          { title: "API keys", path: "#/workspace/api-keys" },
          { title: "Webhooks", path: "#/workspace/webhooks" },
          { title: "Billing", path: "#/workspace/billing" },
        ],
      },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  {
    title: "Help Center",
    path: "#/help",
    icon: <HelpCircleIcon />,
  },
  {
    title: "System status",
    path: "#/status",
    icon: <ActivityIcon />,
  },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) =>
      item.subItems?.length ? [item, ...item.subItems] : [item],
    ),
  ),
  ...footerNavLinks,
];
