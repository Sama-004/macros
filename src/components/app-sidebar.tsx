import { Home, Plus, Calendar, Settings, LogOut } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useRouter } from "@tanstack/react-router";
import { logoutFn } from "@/lib/auth";
import type { User } from "@/lib/session";

const menuItems = [
	{ id: "Home", label: "Home", icon: Home, to: "/home" },
	{ id: "add-product", label: "Add Product", icon: Plus, to: "/add-product" },
	{ id: "calendar", label: "Calendar", icon: Calendar, to: "/calendar" },
	{ id: "settings", label: "Settings", icon: Settings, to: "/settings" },
] as const;

type AppSidebarProps = {
	user: User;
};

export function AppSidebar({ user }: AppSidebarProps) {
	const router = useRouter();

	const handleLogout = async () => {
		const result = await logoutFn();
		if (result.success) {
			router.navigate({ to: "/auth/login" });
		}
	};

	return (
		<Sidebar>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="text-2xl font-bold px-4 pt-2 pb-1">
						MacroTrack
					</SidebarGroupLabel>
					<p className="text-sm text-muted-foreground px-4 pb-4">
						Track your nutrition
					</p>

					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => {
								const Icon = item.icon;
								return (
									<SidebarMenuItem key={item.id}>
										<SidebarMenuButton asChild className="w-full">
											<Link to={item.to}>
												<Icon size={20} />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-border p-4">
				<div className="flex items-center justify-between">
					<div className="text-sm">
						<p className="font-medium">{user.username}</p>
						<p className="text-muted-foreground">Logged in</p>
					</div>
					<button
						onClick={handleLogout}
						className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
						title="Logout"
					>
						<LogOut size={18} />
					</button>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
