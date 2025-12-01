import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_sidebar/home")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div
			className="
	bg-red-100"
		>
			test
		</div>
	);
}
