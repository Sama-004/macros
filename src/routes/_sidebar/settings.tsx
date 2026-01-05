import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "@/db/database";

type Goals = {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
};

export const getGoals = createServerFn({ method: "GET" }).handler(async () => {
	const result = await db.execute("SELECT * FROM user_goals LIMIT 1");

	if (result.rows.length === 0) {
		await db.execute(
			"INSERT INTO user_goals (calories, protein, carbs, fats) VALUES (2000, 150, 200, 65)",
		);
		return { calories: 2000, protein: 150, carbs: 200, fats: 65 };
	}

	const row = result.rows[0];
	return {
		calories: row.calories as number,
		protein: row.protein as number,
		carbs: row.carbs as number,
		fats: row.fats as number,
	};
});

const updateGoals = createServerFn({ method: "POST" })
	.inputValidator((data: Goals) => data)
	.handler(async ({ data }) => {
		const result = await db.execute("SELECT id FROM user_goals LIMIT 1");

		if (result.rows.length === 0) {
			await db.execute({
				sql: "INSERT INTO user_goals (calories, protein, carbs, fats) VALUES (?, ?, ?, ?)",
				args: [data.calories, data.protein, data.carbs, data.fats],
			});
		} else {
			await db.execute({
				sql: "UPDATE user_goals SET calories = ?, protein = ?, carbs = ?, fats = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				args: [data.calories, data.protein, data.carbs, data.fats, result.rows[0].id as number],
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
		await updateGoals({ data: goals });
		setIsSaving(false);
		setIsSaved(true);
		setTimeout(() => setIsSaved(false), 2000);
	};

	return (
		<div className="p-8 h-full flex flex-col">
			<div className="mb-6">
				<h2 className="text-3xl font-bold text-foreground">Settings</h2>
				<p className="text-muted-foreground mt-1">
					Configure your daily nutrition goals
				</p>
			</div>

			<div className="bg-card rounded-lg border border-border p-8 max-w-2xl">
				<div className="space-y-6">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Daily Calorie Goal
						</label>
						<input
							type="number"
							name="calories"
							value={goals.calories}
							onChange={handleChange}
							className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-border"
						/>
						<p className="text-xs text-muted-foreground mt-1">kcal</p>
					</div>

					<div className="grid grid-cols-3 gap-6">
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Protein Goal
							</label>
							<input
								type="number"
								name="protein"
								value={goals.protein}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-border"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Carbs Goal
							</label>
							<input
								type="number"
								name="carbs"
								value={goals.carbs}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-border"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Fats Goal
							</label>
							<input
								type="number"
								name="fats"
								value={goals.fats}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-border"
							/>
							<p className="text-xs text-muted-foreground mt-1">g</p>
						</div>
					</div>
				</div>

				<div className="mt-8 flex gap-3">
					<button
						onClick={handleSave}
						disabled={isSaving}
						className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
					>
						{isSaving ? "Saving..." : "Save Goals"}
					</button>
					{isSaved && (
						<span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
							Saved successfully!
						</span>
					)}
				</div>

				<div className="mt-8 pt-8 border-t border-border">
					<h3 className="text-lg font-semibold text-foreground mb-4">
						Macronutrient Breakdown
					</h3>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Protein (4 cal/g)</span>
							<span className="font-medium text-emerald-600">
								{Math.round(((goals.protein * 4) / goals.calories) * 100)}%
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Carbs (4 cal/g)</span>
							<span className="font-medium text-amber-600">
								{Math.round(((goals.carbs * 4) / goals.calories) * 100)}%
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Fats (9 cal/g)</span>
							<span className="font-medium text-rose-600">
								{Math.round(((goals.fats * 9) / goals.calories) * 100)}%
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
