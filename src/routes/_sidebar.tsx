import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";

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
				<SidebarTrigger />
				<Outlet />
			</main>
		</SidebarProvider>
	);
}
