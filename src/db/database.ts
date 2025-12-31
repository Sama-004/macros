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

type Migration = {
	id: number;
	name: string;
	sql: string;
};

const migrations: Migration[] = [
	{
		id: 1,
		name: "add_grams_to_products",
		sql: "ALTER TABLE products ADD COLUMN grams REAL NOT NULL DEFAULT 100",
	},
];

async function runMigrations(database: ReturnType<typeof createClient>) {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	const applied = await database.execute("SELECT id FROM migrations");
	const appliedIds = new Set(applied.rows.map((row) => row.id));

	for (const migration of migrations) {
		if (appliedIds.has(migration.id)) continue;

		try {
			await database.execute(migration.sql);
			await database.execute({
				sql: "INSERT INTO migrations (id, name) VALUES (?, ?)",
				args: [migration.id, migration.name],
			});
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("duplicate column")
			) {
				await database.execute({
					sql: "INSERT INTO migrations (id, name) VALUES (?, ?)",
					args: [migration.id, migration.name],
				});
			} else {
				throw error;
			}
		}
	}
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

		`CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			grams REAL NOT NULL DEFAULT 100,
			calories REAL NOT NULL,
			protein REAL NOT NULL,
			carbs REAL NOT NULL,
			fats REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
	];

	for (const statement of schemaStatements) {
		await database.execute(statement);
	}

	await runMigrations(database);

	initialized = true;
}

export const db = {
	async execute(query: string | { sql: string; args: InValue[] }) {
		await initDatabase();
		return getDb().execute(query);
	},
};
