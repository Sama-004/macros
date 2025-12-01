import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import MacroProgress from "@/components/macro-progress";
import MealCard from "@/components/meal-card";

export const Route = createFileRoute("/_sidebar/home")({
	component: RouteComponent,
});

interface Meal {
	id: string;
	name: string;
	items: Array<{
		product: string;
		grams: number;
		calories: number;
		protein: number;
		carbs: number;
		fats: number;
	}>;
}

function RouteComponent() {
	const [meals, setMeals] = useState<Meal[]>([
		{
			id: "1",
			name: "Breakfast",
			items: [
				{
					product: "Oatmeal",
					grams: 50,
					calories: 190,
					protein: 5,
					carbs: 27,
					fats: 5,
				},
				{
					product: "Banana",
					grams: 120,
					calories: 107,
					protein: 1,
					carbs: 27,
					fats: 0,
				},
				{
					product: "Almond Butter",
					grams: 32,
					calories: 190,
					protein: 7,
					carbs: 7,
					fats: 16,
				},
			],
		},
		{
			id: "2",
			name: "Lunch",
			items: [
				{
					product: "Chicken Breast",
					grams: 150,
					calories: 248,
					protein: 53,
					carbs: 0,
					fats: 3,
				},
				{
					product: "Brown Rice",
					grams: 150,
					calories: 195,
					protein: 4,
					carbs: 43,
					fats: 1,
				},
			],
		},
		{
			id: "3",
			name: "Snack",
			items: [
				{
					product: "Greek Yogurt",
					grams: 100,
					calories: 59,
					protein: 10,
					carbs: 3,
					fats: 0,
				},
			],
		},
	]);

	const totalStats = meals.reduce(
		(acc, meal) => {
			const mealTotals = meal.items.reduce(
				(mealAcc, item) => ({
					calories: mealAcc.calories + item.calories,
					protein: mealAcc.protein + item.protein,
					carbs: mealAcc.carbs + item.carbs,
					fats: mealAcc.fats + item.fats,
				}),
				{ calories: 0, protein: 0, carbs: 0, fats: 0 },
			);
			return {
				calories: acc.calories + mealTotals.calories,
				protein: acc.protein + mealTotals.protein,
				carbs: acc.carbs + mealTotals.carbs,
				fats: acc.fats + mealTotals.fats,
			};
		},
		{ calories: 0, protein: 0, carbs: 0, fats: 0 },
	);

	const goals = { calories: 2000, protein: 150, carbs: 200, fats: 65 };

	const removeMeal = (mealId: string, itemIndex: number) => {
		setMeals(
			meals
				.map((meal) =>
					meal.id === mealId
						? { ...meal, items: meal.items.filter((_, i) => i !== itemIndex) }
						: meal,
				)
				.filter((meal) => meal.items.length > 0),
		);
	};

	return (
		<div className="flex-1 flex flex-col">
			<div className="p-8 border-b border-border">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-3xl font-bold text-foreground">Today</h2>
						<p className="text-muted-foreground mt-1">
							{new Date().toLocaleDateString("en-US", {
								weekday: "long",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-5 gap-6">
					<MacroProgress
						label="Calories"
						current={totalStats.calories}
						goal={goals.calories}
						color="bg-blue-500"
					/>
					<MacroProgress
						label="Protein"
						current={totalStats.protein}
						goal={goals.protein}
						color="bg-emerald-500"
						unit="g"
					/>
					<MacroProgress
						label="Carbs"
						current={totalStats.carbs}
						goal={goals.carbs}
						color="bg-amber-500"
						unit="g"
					/>
					<MacroProgress
						label="Fats"
						current={totalStats.fats}
						goal={goals.fats}
						color="bg-rose-500"
						unit="g"
					/>
					<div className="flex flex-col items-center justify-center">
						<p className="text-sm text-muted-foreground mb-2">Remaining</p>
						<p className="text-2xl font-bold text-foreground">
							{Math.max(0, goals.calories - totalStats.calories)}
						</p>
						<p className="text-xs text-muted-foreground mt-1">kcal</p>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-auto p-8">
				<div className="space-y-6">
					{meals.map((meal) => (
						<div key={meal.id}>
							<h3 className="text-lg font-semibold text-foreground mb-3">
								{meal.name}
							</h3>
							<div className="space-y-3">
								{meal.items.map((item, idx) => (
									<MealCard
										key={idx}
										item={item}
										onRemove={() => removeMeal(meal.id, idx)}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
