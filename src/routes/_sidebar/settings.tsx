import { db } from "@/db/database";
import { useAppSession } from "@/lib/session";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

type Goals = {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
};

export const getGoals = createServerFn({ method: "GET" }).handler(async () => {
	const session = await useAppSession();
	const userId = session.data.userId;
	if (!userId) throw new Error("Not authenticated");

	const result = await db.execute({
		sql: "SELECT goal_calories, goal_protein, goal_carbs, goal_fats FROM users WHERE id = ?",
		args: [userId],
	});

	if (result.rows.length === 0) throw new Error("User not found");

	const row = result.rows[0];
	return {
		calories: row.goal_calories as number,
		protein: row.goal_protein as number,
		carbs: row.goal_carbs as number,
		fats: row.goal_fats as number,
	};
});

const updateGoals = createServerFn({ method: "POST" })
	.inputValidator((data: Goals & { today: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const userId = session.data.userId;
		if (!userId) throw new Error("Not authenticated");

		await db.execute({
			sql: "UPDATE users SET goal_calories = ?, goal_protein = ?, goal_carbs = ?, goal_fats = ? WHERE id = ?",
			args: [data.calories, data.protein, data.carbs, data.fats, userId],
		});

		const today = data.today;
		const existing = await db.execute({
			sql: "SELECT id FROM goal_history WHERE effective_date = ? AND user_id = ?",
			args: [today, userId],
		});
		if (existing.rows.length > 0) {
			await db.execute({
				sql: "UPDATE goal_history SET calories = ?, protein = ?, carbs = ?, fats = ? WHERE id = ?",
				args: [
					data.calories,
					data.protein,
					data.carbs,
					data.fats,
					existing.rows[0].id as number,
				],
			});
		} else {
			await db.execute({
				sql: "INSERT INTO goal_history (calories, protein, carbs, fats, effective_date, user_id) VALUES (?, ?, ?, ?, ?, ?)",
				args: [
					data.calories,
					data.protein,
					data.carbs,
					data.fats,
					today,
					userId,
				],
			});
		}

		return data;
	});

export const Route = createFileRoute("/_sidebar/settings")({
	component: RouteComponent,
	loader: async () => {
		const goals = await getGoals();
		return { goals };
	},
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [goals, setGoals] = useState<Goals>(loaderData.goals);
	const [isSaved, setIsSaved] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setGoals((prev) => ({ ...prev, [name]: Number.parseInt(value) || 0 }));
		setIsSaved(false);
	};

	const handleSave = async () => {
		setIsSaving(true);
		const now = new Date();
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		await updateGoals({ data: { ...goals, today } });
		setIsSaving(false);
		setIsSaved(true);
		setTimeout(() => setIsSaved(false), 2000);
	};

	return (
		<div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
			<div className="mb-5">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground">
					Settings
				</h2>
				<p className="text-sm text-muted-foreground mt-0.5">
					Configure your daily nutrition goals
				</p>
			</div>

			<div className="bg-card rounded-xl border border-border p-4 sm:p-6 lg:p-8 max-w-2xl">
				<div className="space-y-5">
					<div>
						<label
							htmlFor="goal-calories"
							className="block text-sm font-medium text-foreground mb-1.5"
						>
							Daily Calorie Goal
						</label>
						<input
							id="goal-calories"
							type="number"
							name="calories"
							value={goals.calories}
							onChange={handleChange}
							className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input text-sm"
						/>
						<p className="text-xs text-muted-foreground mt-1">kcal</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div>
							<label
								htmlFor="goal-protein"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Protein Goal
							</label>
							<input
								id="goal-protein"
								type="number"
								name="protein"
								value={goals.protein}
								onChange={handleChange}
								className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input text-sm"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
						<div>
							<label
								htmlFor="goal-carbs"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Carbs Goal
							</label>
							<input
								id="goal-carbs"
								type="number"
								name="carbs"
								value={goals.carbs}
								onChange={handleChange}
								className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input text-sm"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
						<div>
							<label
								htmlFor="goal-fats"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Fats Goal
							</label>
							<input
								id="goal-fats"
								type="number"
								name="fats"
								value={goals.fats}
								onChange={handleChange}
								className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input text-sm"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
					</div>
				</div>

				<div className="mt-6 flex flex-col sm:flex-row gap-3">
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving}
						className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
					>
						{isSaving ? "Saving..." : "Save Goals"}
					</button>
					{isSaved && (
						<span className="h-9 px-4 inline-flex items-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md text-sm font-medium">
							Saved successfully!
						</span>
					)}
				</div>

				<div className="mt-6 pt-6 border-t border-border">
					<h3 className="text-base font-semibold text-foreground mb-3">
						Macronutrient Breakdown
					</h3>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Protein (4 cal/g)</span>
							<span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
								{Math.round(((goals.protein * 4) / goals.calories) * 100)}%
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Carbs (4 cal/g)</span>
							<span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
								{Math.round(((goals.carbs * 4) / goals.calories) * 100)}%
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Fats (9 cal/g)</span>
							<span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">
								{Math.round(((goals.fats * 9) / goals.calories) * 100)}%
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
