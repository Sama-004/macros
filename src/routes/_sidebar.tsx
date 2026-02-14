import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_sidebar")({
	beforeLoad: async () => {
		const user = await getCurrentUser();
		if (!user) {
			throw redirect({ to: "/auth/login" });
		}
		return { user };
	},
	component: SidebarLayout,
});

function SidebarLayout() {
	const { user } = Route.useRouteContext();

	return (
		<SidebarProvider>
			<AppSidebar user={user} />
			<main className="flex flex-col h-screen w-full">
				<div className="flex items-center h-10 px-2 border-b border-border shrink-0 md:hidden">
					<SidebarTrigger />
				</div>
				<div className="hidden md:flex items-center h-10 px-2 shrink-0">
					<SidebarTrigger />
				</div>
				<Outlet />
			</main>
		</SidebarProvider>
	);
}
