import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_sidebar/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	const [goals, setGoals] = useState({
		calories: 2000,
		protein: 150,
		carbs: 200,
		fats: 65,
	});

	const [isSaved, setIsSaved] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setGoals((prev) => ({ ...prev, [name]: Number.parseInt(value) }));
		setIsSaved(false);
	};

	const handleSave = () => {
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
						className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
					>
						Save Goals
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
