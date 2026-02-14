import MacroProgress from "@/components/macro-progress";
import MealCard from "@/components/meal-card";
import { db } from "@/db/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getGoals } from "./settings";

type Product = {
	id: number;
	name: string;
	grams: number;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
};

type MealItem = {
	id: number;
	product: string;
	grams: number;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
};

type Meal = {
	id: number;
	name: string;
	items: MealItem[];
};

const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	const result = await db.execute("SELECT * FROM products ORDER BY name ASC");
	return result.rows as unknown as Product[];
});

const getMealsByDate = createServerFn({ method: "GET" })
	.inputValidator((data: { date: string }) => data)
	.handler(async ({ data }) => {
		const mealsResult = await db.execute({
			sql: "SELECT * FROM meals WHERE date = ? ORDER BY created_at ASC",
			args: [data.date],
		});

		const meals: Meal[] = [];

		for (const mealRow of mealsResult.rows) {
			const itemsResult = await db.execute({
				sql: `SELECT mi.id, mi.grams as consumed_grams, p.name as product,
						p.grams as product_grams, p.calories, p.protein, p.carbs, p.fats
					  FROM meal_items mi
					  JOIN products p ON mi.product_id = p.id
					  WHERE mi.meal_id = ?
					  ORDER BY mi.created_at ASC`,
				args: [mealRow.id as number],
			});

			const items: MealItem[] = itemsResult.rows.map((row) => {
				const consumedGrams = row.consumed_grams as number;
				const productGrams = row.product_grams as number;
				const ratio = consumedGrams / productGrams;

				return {
					id: row.id as number,
					product: row.product as string,
					grams: consumedGrams,
					calories: Math.round((row.calories as number) * ratio),
					protein: Math.round((row.protein as number) * ratio * 10) / 10,
					carbs: Math.round((row.carbs as number) * ratio * 10) / 10,
					fats: Math.round((row.fats as number) * ratio * 10) / 10,
				};
			});

			meals.push({
				id: mealRow.id as number,
				name: mealRow.name as string,
				items,
			});
		}

		return meals;
	});

const addMealForDate = createServerFn({ method: "POST" })
	.inputValidator((data: { name: string; date: string }) => data)
	.handler(async ({ data }) => {
		const result = await db.execute({
			sql: "INSERT INTO meals (name, date) VALUES (?, ?) RETURNING id",
			args: [data.name, data.date],
		});
		return result.rows[0].id as number;
	});

const addMealItem = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { mealId: number; productId: number; grams: number }) => data,
	)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "INSERT INTO meal_items (meal_id, product_id, grams) VALUES (?, ?, ?)",
			args: [data.mealId, data.productId, data.grams],
		});
	});

const removeMealItem = createServerFn({ method: "POST" })
	.inputValidator((data: { itemId: number }) => data)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "DELETE FROM meal_items WHERE id = ?",
			args: [data.itemId],
		});
	});

const deleteMeal = createServerFn({ method: "POST" })
	.inputValidator((data: { mealId: number }) => data)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "DELETE FROM meals WHERE id = ?",
			args: [data.mealId],
		});
	});

const getGoalForDate = createServerFn({ method: "GET" })
	.inputValidator((data: { date: string }) => data)
	.handler(async ({ data }) => {
		const result = await db.execute({
			sql: `SELECT calories, protein, carbs, fats FROM goal_history
				  WHERE effective_date <= ?
				  ORDER BY effective_date DESC LIMIT 1`,
			args: [data.date],
		});
		if (result.rows.length > 0) {
			const row = result.rows[0];
			return {
				calories: row.calories as number,
				protein: row.protein as number,
				carbs: row.carbs as number,
				fats: row.fats as number,
			};
		}
		const fallback = await db.execute(
			"SELECT calories, protein, carbs, fats FROM user_goals LIMIT 1",
		);
		if (fallback.rows.length > 0) {
			const row = fallback.rows[0];
			return {
				calories: row.calories as number,
				protein: row.protein as number,
				carbs: row.carbs as number,
				fats: row.fats as number,
			};
		}
		return { calories: 2000, protein: 150, carbs: 200, fats: 65 };
	});

export const Route = createFileRoute("/_sidebar/history")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			date: (search.date as string) || undefined,
		};
	},
	loader: async () => {
		const [products, defaultGoals] = await Promise.all([
			getProducts(),
			getGoals(),
		]);
		return { products, defaultGoals };
	},
});

function RouteComponent() {
	const { products, defaultGoals } = Route.useLoaderData();
	const { date: initialDate } = Route.useSearch();
	const [selectedDate, setSelectedDate] = useState(
		initialDate || new Date().toISOString().split("T")[0],
	);
	const [meals, setMeals] = useState<Meal[]>([]);
	const [goals, setGoals] = useState(defaultGoals);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [showAddMeal, setShowAddMeal] = useState(false);
	const [newMealName, setNewMealName] = useState("");
	const [addingToMeal, setAddingToMeal] = useState<number | null>(null);
	const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
	const [itemGrams, setItemGrams] = useState(100);

	const loadMeals = async (date: string) => {
		setIsLoading(true);
		const [mealsData, dateGoals] = await Promise.all([
			getMealsByDate({ data: { date } }),
			getGoalForDate({ data: { date } }),
		]);
		setMeals(mealsData);
		setGoals(dateGoals);
		setIsLoading(false);
		setHasLoaded(true);
	};

	// Auto-load if date was passed in URL
	useEffect(() => {
		if (initialDate) {
			loadMeals(initialDate);
		}
	}, [initialDate]);

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = e.target.value;
		setSelectedDate(newDate);
		setHasLoaded(false);
		setMeals([]);
	};

	const handleLoadDate = () => {
		loadMeals(selectedDate);
	};

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

	const handleAddMeal = async () => {
		if (!newMealName.trim()) return;
		await addMealForDate({
			data: { name: newMealName.trim(), date: selectedDate },
		});
		await loadMeals(selectedDate);
		setNewMealName("");
		setShowAddMeal(false);
	};

	const handleAddItem = async (mealId: number) => {
		if (!selectedProduct || itemGrams <= 0) return;
		await addMealItem({
			data: { mealId, productId: selectedProduct, grams: itemGrams },
		});
		await loadMeals(selectedDate);
		setAddingToMeal(null);
		setSelectedProduct(null);
		setItemGrams(100);
	};

	const handleRemoveItem = async (itemId: number) => {
		await removeMealItem({ data: { itemId } });
		await loadMeals(selectedDate);
	};

	const handleDeleteMeal = async (mealId: number) => {
		await deleteMeal({ data: { mealId } });
		await loadMeals(selectedDate);
	};

	const formatDisplayDate = (dateStr: string) => {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div className="flex-1 flex flex-col">
			<div className="p-8 border-b border-border">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-3xl font-bold text-foreground">Edit History</h2>
						<p className="text-muted-foreground mt-1">
							View and edit meals from any date
						</p>
					</div>
				</div>

				<div className="flex gap-4 items-end mb-6">
					<div>
						<label className="text-sm text-muted-foreground mb-1 block">
							Select Date
						</label>
						<input
							type="date"
							value={selectedDate}
							onChange={handleDateChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground border border-border"
						/>
					</div>
					<button
						type="button"
						onClick={handleLoadDate}
						className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
					>
						Load Date
					</button>
				</div>

				{hasLoaded && (
					<>
						<p className="text-lg font-medium text-foreground mb-4">
							{formatDisplayDate(selectedDate)}
						</p>
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
					</>
				)}
			</div>

			<div className="flex-1 overflow-auto p-8">
				{isLoading ? (
					<p className="text-muted-foreground">Loading meals...</p>
				) : !hasLoaded ? (
					<p className="text-muted-foreground">
						Select a date and click "Load Date" to view meals.
					</p>
				) : (
					<div className="space-y-6">
						{meals.map((meal) => (
							<div key={meal.id}>
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-lg font-semibold text-foreground">
										{meal.name}
									</h3>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() =>
												setAddingToMeal(
													addingToMeal === meal.id ? null : meal.id,
												)
											}
											className="text-sm text-accent hover:underline"
										>
											+ Add Item
										</button>
										<button
											type="button"
											onClick={() => handleDeleteMeal(meal.id)}
											className="text-sm text-red-500 hover:underline"
										>
											Delete
										</button>
									</div>
								</div>

								{addingToMeal === meal.id && (
									<div className="bg-card p-4 rounded-lg border border-border mb-3">
										<div className="flex gap-3 items-end">
											<div className="flex-1">
												<label className="text-sm text-muted-foreground mb-1 block">
													Product
												</label>
												<select
													value={selectedProduct || ""}
													onChange={(e) =>
														setSelectedProduct(Number(e.target.value) || null)
													}
													className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border"
												>
													<option value="">Select a product</option>
													{products.map((p) => (
														<option key={p.id} value={p.id}>
															{p.name} ({p.grams}g = {p.calories} kcal)
														</option>
													))}
												</select>
											</div>
											<div className="w-24">
												<label className="text-sm text-muted-foreground mb-1 block">
													Grams
												</label>
												<input
													type="number"
													value={itemGrams}
													onChange={(e) => setItemGrams(Number(e.target.value))}
													className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border"
												/>
											</div>
											<button
												type="button"
												onClick={() => handleAddItem(meal.id)}
												className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
											>
												Add
											</button>
											<button
												type="button"
												onClick={() => {
													setAddingToMeal(null);
													setSelectedProduct(null);
													setItemGrams(100);
												}}
												className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium"
											>
												Cancel
											</button>
										</div>
									</div>
								)}

								<div className="space-y-3">
									{meal.items.map((item) => (
										<MealCard
											key={item.id}
											item={item}
											onRemove={() => handleRemoveItem(item.id)}
										/>
									))}
									{meal.items.length === 0 && (
										<p className="text-sm text-muted-foreground italic">
											No items yet. Click "+ Add Item" to add food.
										</p>
									)}
								</div>
							</div>
						))}

						{showAddMeal ? (
							<div className="bg-card p-4 rounded-lg border border-border">
								<div className="flex gap-3">
									<input
										type="text"
										placeholder="Meal name (e.g., Breakfast, Lunch)"
										value={newMealName}
										onChange={(e) => setNewMealName(e.target.value)}
										className="flex-1 px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
									/>
									<button
										type="button"
										onClick={handleAddMeal}
										className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
									>
										Add Meal
									</button>
									<button
										type="button"
										onClick={() => {
											setShowAddMeal(false);
											setNewMealName("");
										}}
										className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium"
									>
										Cancel
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setShowAddMeal(true)}
								className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-accent hover:text-accent transition-colors"
							>
								+ Add Meal
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
