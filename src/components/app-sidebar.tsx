import { Home, Plus, Calendar, Settings } from "lucide-react";
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
import { Link } from "@tanstack/react-router";

const menuItems = [
	{ id: "Home", label: "Home", icon: Home, to: "/home" },
	{ id: "add-product", label: "Add Product", icon: Plus, to: "/add-product" },
	{ id: "calendar", label: "Calendar", icon: Calendar, to: "/calendar" },
	{ id: "settings", label: "Settings", icon: Settings, to: "/settings" },
] as const;

export function AppSidebar() {
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
				<div className="text-sm text-muted-foreground space-y-1">
					<p>Goal: 2000 kcal</p>
					<p>Protein: 150g | Carbs: 200g | Fats: 65g</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
