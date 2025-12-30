import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db/database";
import { useAppSession, type User } from "./session";

// User registration
export const registerFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { username: string; password: string; confirmPassword: string }) =>
			data,
	)
	.handler(async ({ data }) => {
		const { username, password, confirmPassword } = data;

		if (!username || !password || !confirmPassword) {
			return { error: "All fields are required" };
		}

		if (password !== confirmPassword) {
			return { error: "Passwords do not match" };
		}

		if (password.length < 6) {
			return { error: "Password must be at least 6 characters" };
		}

		if (username.length < 3) {
			return { error: "Username must be at least 3 characters" };
		}

		// Check if user exists
		const existingUser = await getUserByUsername(username);
		if (existingUser) {
			return { error: "Username already taken" };
		}

		// Hash password with Bun
		const hashedPassword = await Bun.password.hash(password);

		// Create user
		const user = await createUser({
			username,
			password: hashedPassword,
		});

		// Create session
		const session = await useAppSession();
		await session.update({ userId: user.id, username: user.username });

		return { success: true, user: { id: user.id, username: user.username } };
	});

// User login
export const loginFn = createServerFn({ method: "POST" })
	.inputValidator((data: { username: string; password: string }) => data)
	.handler(async ({ data }) => {
		const { username, password } = data;

		if (!username || !password) {
			return { error: "Username and password are required" };
		}

		// Authenticate user
		const user = await authenticateUser(username, password);
		if (!user) {
			return { error: "Invalid username or password" };
		}

		// Create session
		const session = await useAppSession();
		await session.update({
			userId: user.id,
			username: user.username,
		});

		return { success: true, user: { id: user.id, username: user.username } };
	});

// Logout
export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	const session = await useAppSession();
	await session.clear();
	return { success: true };
});

// Get current user
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
	async (): Promise<User | null> => {
		const session = await useAppSession();
		const userId = session.data.userId;

		if (!userId) {
			return null;
		}

		return {
			id: userId,
			username: session.data.username!,
		};
	},
);

// Helper functions
async function getUserByUsername(username: string) {
	const result = await db.execute({
		sql: "SELECT * FROM users WHERE username = ?",
		args: [username],
	});
	return result.rows[0] || null;
}

async function createUser(data: { username: string; password: string }) {
	const result = await db.execute({
		sql: "INSERT INTO users (username, password) VALUES (?, ?)",
		args: [data.username, data.password],
	});

	return {
		id: Number(result.lastInsertRowid),
		username: data.username,
	};
}

async function authenticateUser(username: string, password: string) {
	const user = await getUserByUsername(username);
	if (!user) return null;

	const isValid = await Bun.password.verify(password, user.password as string);
	return isValid
		? { id: user.id as number, username: user.username as string }
		: null;
}
