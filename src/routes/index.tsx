import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const user = await getCurrentUser();
		if (user) {
			throw redirect({ to: "/home" });
		} else {
			throw redirect({ to: "/auth/login" });
		}
	},
});
