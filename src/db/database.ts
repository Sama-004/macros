import { createClient, type InValue } from "@libsql/client";

let dbInstance: ReturnType<typeof createClient> | null = null;
let initialized = false;

function getDb() {
	if (!dbInstance) {
		dbInstance = createClient({
			url: process.env.DATABASE_URL ?? "file:database.db",
			authToken: process.env.DATABASE_AUTH_TOKEN,
		});
	}
	return dbInstance;
}

async function initDatabase() {
	if (initialized) return;

	const database = getDb();
	const schemaStatements = [
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
	];

	for (const statement of schemaStatements) {
		await database.execute(statement);
	}

	initialized = true;
}

export const db = {
	async execute(query: string | { sql: string; args: InValue[] }) {
		await initDatabase();
		return getDb().execute(query);
	},
};
