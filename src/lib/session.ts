import { useSession } from "@tanstack/react-start/server";

export type User = {
	id: number;
	username: string;
};

type SessionData = {
	userId?: number;
	username?: string;
};

export function useAppSession() {
	return useSession<SessionData>({
		password: process.env.BETTER_AUTH_SECRET!,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			httpOnly: true,
		},
	});
}
