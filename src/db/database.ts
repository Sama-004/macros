import { createClient, type InValue } from "@libsql/client/web";

let dbInstance: ReturnType<typeof createClient> | null = null;
let initialized = false;

function getDb() {
	if (!dbInstance) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error("DATABASE_URL environment variable is required");
		}
		dbInstance = createClient({
			url,
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
	{
		id: 2,
		name: "create_meals_table",
		sql: `CREATE TABLE IF NOT EXISTS meals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			date TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	},
	{
		id: 3,
		name: "create_meal_items_table",
		sql: `CREATE TABLE IF NOT EXISTS meal_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			meal_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			grams REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
		)`,
	},
	{
		id: 4,
		name: "create_meals_indexes",
		sql: "CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date)",
	},
	{
		id: 5,
		name: "create_meal_items_indexes",
		sql: "CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id)",
	},
	{
		id: 6,
		name: "add_quantity_to_products",
		sql: "ALTER TABLE products ADD COLUMN quantity REAL DEFAULT 1",
	},
	{
		id: 8,
		name: "create_goal_history_table",
		sql: `CREATE TABLE IF NOT EXISTS goal_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			calories INTEGER NOT NULL,
			protein INTEGER NOT NULL,
			carbs INTEGER NOT NULL,
			fats INTEGER NOT NULL,
			effective_date TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	},
	{
		id: 9,
		name: "create_goal_history_index",
		sql: "CREATE INDEX IF NOT EXISTS idx_goal_history_date ON goal_history(effective_date)",
	},
	{
		id: 10,
		name: "add_user_id_to_meals",
		sql: "ALTER TABLE meals ADD COLUMN user_id INTEGER REFERENCES users(id)",
	},
	{
		id: 11,
		name: "create_meals_user_date_index",
		sql: "CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date)",
	},
	{
		id: 12,
		name: "add_goal_columns_to_users",
		sql: "ALTER TABLE users ADD COLUMN goal_calories INTEGER NOT NULL DEFAULT 2000",
	},
	{
		id: 13,
		name: "add_goal_protein_to_users",
		sql: "ALTER TABLE users ADD COLUMN goal_protein INTEGER NOT NULL DEFAULT 150",
	},
	{
		id: 14,
		name: "add_goal_carbs_to_users",
		sql: "ALTER TABLE users ADD COLUMN goal_carbs INTEGER NOT NULL DEFAULT 200",
	},
	{
		id: 15,
		name: "add_goal_fats_to_users",
		sql: "ALTER TABLE users ADD COLUMN goal_fats INTEGER NOT NULL DEFAULT 65",
	},
	{
		id: 16,
		name: "add_user_id_to_goal_history",
		sql: "ALTER TABLE goal_history ADD COLUMN user_id INTEGER REFERENCES users(id)",
	},
	{
		id: 17,
		name: "create_goal_history_user_index",
		sql: "CREATE INDEX IF NOT EXISTS idx_goal_history_user_date ON goal_history(user_id, effective_date)",
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

		`CREATE TABLE IF NOT EXISTS meals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			date TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS meal_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			meal_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			grams REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
		)`,

		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
		`CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date)`,
		`CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id)`,
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
