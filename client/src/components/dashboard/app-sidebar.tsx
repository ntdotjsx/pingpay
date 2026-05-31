import { LogoIcon } from "@/components/landing/logo";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "./nav-group";
import { footerNavLinks, navGroups } from "@/components/dashboard/app-shared";
import { LatestChange } from "@/components/dashboard/latest-change";
import { PlusIcon, SearchIcon } from "lucide-react";

export function AppSidebar() {
	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader className="h-14 justify-center">
				<SidebarMenuButton asChild>
					<a href="/">
						<LogoIcon />
						<span className="font-medium">PINGPAY</span>
					</a>
				</SidebarMenuhttps://github.com/ntdotjsx/pingpay/pull/1/conflict?name=client%252Fsrc%252Fcomponents%252Fdashboard%252Fapp-sidebar.tsx&base_oid=8f1a64654e1e5f56bf3d7ce230b95c3fbd52e1cb&head_oid=b0cbd3b215b84c76720702940e2e006539ce5fdcButton>
			</SidebarHeader>
			<SidebarContent>
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter>
				<LatestChange />
				<SidebarMenu className="mt-2">
					{footerNavLinks.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								className="text-muted-foreground"
								isActive={item.isActive}
								size="sm"
							>
								<a href={item.path}>
									{item.icon}
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
