import type { ReactNode } from "react";
import {
  LayoutGridIcon,
  ListChecksIcon,
  BarChart3Icon,
  MessageSquareTextIcon,
  UsersIcon,
  ReceiptTextIcon,
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
    label: "รายการ",
    items: [
      {
        title: "รายการทั้งหมด",
        path: "/dashboard/",
        icon: <ListChecksIcon />,
      },
      {
        title: "สถิติ",
        path: "/dashboard/insights",
        icon: <BarChart3Icon />,
      },
      {
        title: "เพื่อน",
        path: "/dashboard/friends",
        icon: <UsersIcon />,
      },
      {
        title: "เช็คสลิป",
        path: "/dashboard/slips",
        icon: <ReceiptTextIcon />,
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
          { title: "การแจ้งเตือน", path: "/dashboard/notification" },
          { title: "API keys", path: "/dashboard/api-keys" },
        ],
      },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  // {
  //   title: "Help Center",
  //   path: "#/help",
  //   icon: <HelpCircleIcon />,
  // },
  {
    title: "สถานะของระบบ",
    path: "https://status.ntdotjsx.site/",
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
