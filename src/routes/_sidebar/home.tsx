import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { useState } from "react";
import MacroProgress from "@/components/macro-progress";
import MealCard from "@/components/meal-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db/database";

type Product = {
	id: number;
	name: string;
	quantity: number | null;
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

const getToday = () => new Date().toISOString().split("T")[0];

const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	const result = await db.execute("SELECT * FROM products ORDER BY name ASC");
	return result.rows as unknown as Product[];
});

const getTodaysMeal = createServerFn({ method: "GET" }).handler(async () => {
	const today = getToday();

	// Check if a meal exists for today, if not create one
	let mealsResult = await db.execute({
		sql: "SELECT * FROM meals WHERE date = ? LIMIT 1",
		args: [today],
	});

	if (mealsResult.rows.length === 0) {
		// Auto-create today's meal
		await db.execute({
			sql: "INSERT INTO meals (name, date) VALUES (?, ?)",
			args: ["Daily Log", today],
		});
		mealsResult = await db.execute({
			sql: "SELECT * FROM meals WHERE date = ? LIMIT 1",
			args: [today],
		});
	}

	const mealRow = mealsResult.rows[0];

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

	return {
		id: mealRow.id as number,
		name: mealRow.name as string,
		items,
	};
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

export const Route = createFileRoute("/_sidebar/home")({
	component: RouteComponent,
	loader: async () => {
		const [meal, products] = await Promise.all([
			getTodaysMeal(),
			getProducts(),
		]);
		return { meal, products };
	},
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [meal, setMeal] = useState<Meal>(loaderData.meal);
	const [products] = useState<Product[]>(loaderData.products);
	const [showAddItem, setShowAddItem] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
	const [itemGrams, setItemGrams] = useState(100);
	const [inputMode, setInputMode] = useState<"grams" | "quantity">("grams");
	const [itemQuantity, setItemQuantity] = useState(1);

	const totalStats = meal.items.reduce(
		(acc, item) => ({
			calories: acc.calories + item.calories,
			protein: acc.protein + item.protein,
			carbs: acc.carbs + item.carbs,
			fats: acc.fats + item.fats,
		}),
		{ calories: 0, protein: 0, carbs: 0, fats: 0 },
	);

	const goals = { calories: 2000, protein: 150, carbs: 200, fats: 65 };

	const handleAddItem = async () => {
		if (!selectedProduct) return;

		let grams: number;
		if (inputMode === "quantity") {
			if (itemQuantity <= 0) return;
			const product = products.find((p) => p.id === selectedProduct);
			if (!product) return;
			grams = itemQuantity * product.grams;
		} else {
			if (itemGrams <= 0) return;
			grams = itemGrams;
		}

		await addMealItem({
			data: { mealId: meal.id, productId: selectedProduct, grams },
		});
		const updated = await getTodaysMeal();
		setMeal(updated);
		setShowAddItem(false);
		setSelectedProduct(null);
		setItemGrams(100);
		setItemQuantity(1);
		setInputMode("grams");
	};

	const handleRemoveItem = async (itemId: number) => {
		await removeMealItem({ data: { itemId } });
		const updated = await getTodaysMeal();
		setMeal(updated);
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
				<div className="space-y-4">
					{showAddItem ? (
						<div className="bg-card p-4 rounded-lg border border-border">
							<div className="flex gap-3 items-end">
								<div className="flex-1">
									<label className="text-sm font-medium text-foreground mb-2 block">
										Product
									</label>
									<select
										value={selectedProduct || ""}
										onChange={(e) =>
											setSelectedProduct(Number(e.target.value) || null)
										}
										className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input"
									>
										<option value="">Select a product</option>
										{products.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name} ({p.grams}g = {p.calories} kcal)
											</option>
										))}
									</select>
								</div>
								<div className="flex gap-1">
									<Button
										type="button"
										variant={inputMode === "grams" ? "default" : "secondary"}
										size="sm"
										onClick={() => setInputMode("grams")}
									>
										Grams
									</Button>
									<Button
										type="button"
										variant={inputMode === "quantity" ? "default" : "secondary"}
										size="sm"
										onClick={() => setInputMode("quantity")}
									>
										Qty
									</Button>
								</div>
								<div className="w-24">
									<label className="text-sm font-medium text-foreground mb-2 block">
										{inputMode === "grams" ? "Grams" : "Quantity"}
									</label>
									<Input
										type="number"
										value={inputMode === "grams" ? itemGrams : itemQuantity}
										onChange={(e) =>
											inputMode === "grams"
												? setItemGrams(Number(e.target.value))
												: setItemQuantity(Number(e.target.value))
										}
										min={inputMode === "grams" ? 1 : 0.5}
										step={inputMode === "grams" ? 1 : 0.5}
									/>
								</div>
								<Button onClick={handleAddItem}>Add</Button>
								<Button
									variant="secondary"
									onClick={() => {
										setShowAddItem(false);
										setSelectedProduct(null);
										setItemGrams(100);
										setItemQuantity(1);
										setInputMode("grams");
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<Button
							variant="outline"
							className="w-full border-2 border-dashed"
							onClick={() => setShowAddItem(true)}
						>
							<Plus className="size-4 mr-2" />
							Add Item
						</Button>
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
							<p className="text-sm text-muted-foreground italic text-center py-8">
								No items yet. Add your first food item above.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
