import MacroProgress from "@/components/macro-progress";
import MealCard from "@/components/meal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db/database";
import { useAppSession } from "@/lib/session";
import { google } from "@ai-sdk/google";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import {
	Bot,
	CheckCircle,
	Drumstick,
	Leaf,
	Plus,
	Send,
	Sparkles,
	Utensils,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";
import { getGoals } from "./settings";

// ── Types ──────────────────────────────────────────────

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

type MealSuggestion = {
	name: string;
	grams: number;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
};

type MealRecommendation = {
	breakfast: MealSuggestion[];
	lunch: MealSuggestion[];
	dinner: MealSuggestion[];
};

type ChatResponse = {
	answer: string;
	withinBudget: boolean;
	suggestion: string;
};

// ── Server Functions ───────────────────────────────────

const getToday = () => new Date().toISOString().split("T")[0];

const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	const result = await db.execute(
		"SELECT * FROM products WHERE deleted_at IS NULL ORDER BY name ASC",
	);
	return result.rows as unknown as Product[];
});

const getTodaysMeal = createServerFn({ method: "GET" }).handler(async () => {
	const session = await useAppSession();
	const userId = session.data.userId;
	if (!userId) throw new Error("Not authenticated");

	const today = getToday();
	let mealsResult = await db.execute({
		sql: "SELECT * FROM meals WHERE date = ? AND user_id = ? LIMIT 1",
		args: [today, userId],
	});
	if (mealsResult.rows.length === 0) {
		await db.execute({
			sql: "INSERT INTO meals (name, date, user_id) VALUES (?, ?, ?)",
			args: ["Daily Log", today, userId],
		});
		mealsResult = await db.execute({
			sql: "SELECT * FROM meals WHERE date = ? AND user_id = ? LIMIT 1",
			args: [today, userId],
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
	return { id: mealRow.id as number, name: mealRow.name as string, items };
});

const addMealItem = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { mealId: number; productId: number; grams: number }) => data,
	)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const userId = session.data.userId;
		if (!userId) throw new Error("Not authenticated");

		const meal = await db.execute({
			sql: "SELECT id FROM meals WHERE id = ? AND user_id = ?",
			args: [data.mealId, userId],
		});
		if (meal.rows.length === 0) throw new Error("Meal not found");

		await db.execute({
			sql: "INSERT INTO meal_items (meal_id, product_id, grams) VALUES (?, ?, ?)",
			args: [data.mealId, data.productId, data.grams],
		});
	});

const removeMealItem = createServerFn({ method: "POST" })
	.inputValidator((data: { itemId: number }) => data)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const userId = session.data.userId;
		if (!userId) throw new Error("Not authenticated");

		await db.execute({
			sql: `DELETE FROM meal_items WHERE id = ? AND meal_id IN (
				SELECT id FROM meals WHERE user_id = ?
			)`,
			args: [data.itemId, userId],
		});
	});

const suggestionItem = z.object({
	name: z.string().describe("Food item name"),
	grams: z.number().describe("Serving size in grams"),
	calories: z.number().describe("Calories"),
	protein: z.number().describe("Protein in grams"),
	carbs: z.number().describe("Carbs in grams"),
	fats: z.number().describe("Fats in grams"),
});

const mealSuggestionSchema = z.object({
	breakfast: z.array(suggestionItem),
	lunch: z.array(suggestionItem),
	dinner: z.array(suggestionItem),
});

const recommendMeal = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			remainingCalories: number;
			remainingProtein: number;
			remainingCarbs: number;
			remainingFats: number;
			dietPreference: "veg" | "non-veg";
		}) => data,
	)
	.handler(async ({ data }) => {
		const { object } = await generateObject({
			model: google("gemini-flash-latest"),
			schema: mealSuggestionSchema,
			prompt: `You are a nutrition expert. Suggest meals for the rest of the day based on the remaining macro budget.

Remaining macros:
- Calories: ${data.remainingCalories} kcal
- Protein: ${data.remainingProtein}g
- Carbs: ${data.remainingCarbs}g
- Fats: ${data.remainingFats}g

Diet preference: ${data.dietPreference === "veg" ? "Vegetarian only (no meat, no fish, eggs and dairy are OK)" : "Non-vegetarian (include meat, fish, eggs, etc.)"}

Distribute the remaining macros across breakfast, lunch, and dinner. Each meal should have 2-4 food items.
Keep suggestions realistic and practical. Use common Indian and international foods.
Make sure the total across all meals roughly matches the remaining macro budget.`,
		});
		return object;
	});

const chatResponseSchema = z.object({
	answer: z
		.string()
		.describe("A concise answer about whether the user can eat the food"),
	withinBudget: z
		.boolean()
		.describe("Whether eating this food stays within the macro budget"),
	suggestion: z
		.string()
		.describe(
			"A brief suggestion or alternative if over budget, or encouragement if within budget",
		),
});

const askMealQuestion = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			question: string;
			consumedCalories: number;
			consumedProtein: number;
			consumedCarbs: number;
			consumedFats: number;
			goalCalories: number;
			goalProtein: number;
			goalCarbs: number;
			goalFats: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		const { object } = await generateObject({
			model: google("gemini-flash-latest"),
			schema: chatResponseSchema,
			prompt: `You are a nutrition advisor. The user wants to know if they can eat something.

Current consumption today:
- Calories: ${data.consumedCalories} / ${data.goalCalories} kcal
- Protein: ${data.consumedProtein} / ${data.goalProtein}g
- Carbs: ${data.consumedCarbs} / ${data.goalCarbs}g
- Fats: ${data.consumedFats} / ${data.goalFats}g

Remaining budget:
- Calories: ${data.goalCalories - data.consumedCalories} kcal
- Protein: ${data.goalProtein - data.consumedProtein}g
- Carbs: ${data.goalCarbs - data.consumedCarbs}g
- Fats: ${data.goalFats - data.consumedFats}g

User's question: "${data.question}"

Evaluate whether eating the mentioned food fits within their remaining macro budget. Be concise and helpful.`,
		});
		return object;
	});

// ── Route ──────────────────────────────────────────────

export const Route = createFileRoute("/_sidebar/home")({
	component: RouteComponent,
	loader: async () => {
		const [meal, products, goals] = await Promise.all([
			getTodaysMeal(),
			getProducts(),
			getGoals(),
		]);
		return { meal, products, goals };
	},
});

// ── Component ──────────────────────────────────────────

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [meal, setMeal] = useState<Meal>(loaderData.meal);
	const [products] = useState<Product[]>(loaderData.products);
	const [showAddItem, setShowAddItem] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
	const [itemGrams, setItemGrams] = useState(100);
	const [inputMode, setInputMode] = useState<"grams" | "quantity">("grams");
	const [itemQuantity, setItemQuantity] = useState(1);
	const [showSaved, setShowSaved] = useState(false);

	// AI Sheet
	const [aiOpen, setAiOpen] = useState(false);
	const [dietPreference, setDietPreference] = useState<"veg" | "non-veg">(
		"non-veg",
	);
	const [recommendation, setRecommendation] =
		useState<MealRecommendation | null>(null);
	const [isRecommending, setIsRecommending] = useState(false);
	const [chatQuestion, setChatQuestion] = useState("");
	const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
	const [isChatLoading, setIsChatLoading] = useState(false);

	const totalStats = meal.items.reduce(
		(acc, item) => ({
			calories: acc.calories + item.calories,
			protein: acc.protein + item.protein,
			carbs: acc.carbs + item.carbs,
			fats: acc.fats + item.fats,
		}),
		{ calories: 0, protein: 0, carbs: 0, fats: 0 },
	);

	const goals = loaderData.goals;
	const remaining = {
		calories: Math.max(0, goals.calories - totalStats.calories),
		protein: Math.max(0, goals.protein - totalStats.protein),
		carbs: Math.max(0, goals.carbs - totalStats.carbs),
		fats: Math.max(0, goals.fats - totalStats.fats),
	};

	const triggerSaved = useCallback(() => {
		setShowSaved(true);
		setTimeout(() => setShowSaved(false), 1500);
	}, []);

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
		triggerSaved();
	};

	const handleRemoveItem = async (itemId: number) => {
		await removeMealItem({ data: { itemId } });
		const updated = await getTodaysMeal();
		setMeal(updated);
		triggerSaved();
	};

	const handleRecommend = async () => {
		setIsRecommending(true);
		setRecommendation(null);
		try {
			const result = await recommendMeal({
				data: {
					remainingCalories: remaining.calories,
					remainingProtein: remaining.protein,
					remainingCarbs: remaining.carbs,
					remainingFats: remaining.fats,
					dietPreference,
				},
			});
			setRecommendation(result);
		} catch (error) {
			console.error("Failed to get recommendation:", error);
		} finally {
			setIsRecommending(false);
		}
	};

	const handleAskQuestion = async () => {
		if (!chatQuestion.trim() || isChatLoading) return;
		setIsChatLoading(true);
		setChatResponse(null);
		try {
			const result = await askMealQuestion({
				data: {
					question: chatQuestion.trim(),
					consumedCalories: Math.round(totalStats.calories),
					consumedProtein: Math.round(totalStats.protein),
					consumedCarbs: Math.round(totalStats.carbs),
					consumedFats: Math.round(totalStats.fats),
					goalCalories: goals.calories,
					goalProtein: goals.protein,
					goalCarbs: goals.carbs,
					goalFats: goals.fats,
				},
			});
			setChatResponse(result);
			setChatQuestion("");
		} catch (error) {
			console.error("Failed to get answer:", error);
		} finally {
			setIsChatLoading(false);
		}
	};

	return (
		<div className="flex-1 flex flex-col min-h-0">
			{/* Saved toast */}
			{showSaved && (
				<div className="fixed top-4 right-4 z-50 animate-fade-in-out">
					<Badge className="gap-1.5 bg-emerald-500 text-white px-3 py-1.5 text-sm shadow-lg">
						<CheckCircle className="size-3.5" />
						Saved
					</Badge>
				</div>
			)}

			{/* ── Header + Macros ── */}
			<div className="p-4 sm:p-6 lg:p-8 border-b border-border">
				<div className="flex items-center justify-between gap-3 mb-5">
					<div>
						<h2 className="text-2xl sm:text-3xl font-bold text-foreground">
							Today
						</h2>
						<p className="text-sm text-muted-foreground mt-0.5">
							{new Date().toLocaleDateString("en-US", {
								weekday: "long",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
					<Button
						onClick={() => setAiOpen(true)}
						size="icon"
						className="sm:hidden size-9 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shrink-0"
					>
						<Sparkles className="size-4" />
					</Button>
					<Button
						onClick={() => setAiOpen(true)}
						className="hidden sm:inline-flex bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
					>
						<Sparkles className="size-4" />
						AI Assistant
					</Button>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
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
				</div>
			</div>

			{/* ── Meal Items ── */}
			<div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
				<div className="space-y-3 max-w-3xl">
					{showAddItem ? (
						<Card className="py-4">
							<CardContent className="space-y-3">
								<div>
									<label
										htmlFor="product-select"
										className="text-sm font-medium text-foreground mb-1.5 block"
									>
										Product
									</label>
									<select
										id="product-select"
										value={selectedProduct || ""}
										onChange={(e) =>
											setSelectedProduct(Number(e.target.value) || null)
										}
										className="w-full h-9 px-3 rounded-md bg-secondary text-foreground border border-input text-sm"
									>
										<option value="">Select a product</option>
										{products.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name} ({p.grams}g = {p.calories} kcal)
											</option>
										))}
									</select>
								</div>
								<div className="flex flex-col sm:flex-row gap-3">
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
											variant={
												inputMode === "quantity" ? "default" : "secondary"
											}
											size="sm"
											onClick={() => setInputMode("quantity")}
										>
											Qty
										</Button>
									</div>
									<div className="flex-1">
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
											placeholder={inputMode === "grams" ? "Grams" : "Quantity"}
										/>
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={handleAddItem}
										className="flex-1 sm:flex-none"
									>
										Add
									</Button>
									<Button
										variant="outline"
										onClick={() => {
											setShowAddItem(false);
											setSelectedProduct(null);
											setItemGrams(100);
											setItemQuantity(1);
											setInputMode("grams");
										}}
										className="flex-1 sm:flex-none"
									>
										Cancel
									</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						<Button
							variant="outline"
							className="w-full border-2 border-dashed h-12"
							onClick={() => setShowAddItem(true)}
						>
							<Plus className="size-4" />
							Add Item
						</Button>
					)}

					<div className="space-y-2">
						{meal.items.map((item) => (
							<MealCard
								key={item.id}
								item={item}
								onRemove={() => handleRemoveItem(item.id)}
							/>
						))}
						{meal.items.length === 0 && (
							<div className="text-center py-12">
								<Utensils className="size-10 text-muted-foreground/30 mx-auto mb-3" />
								<p className="text-sm text-muted-foreground">
									No items yet. Add your first food item above.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── AI Assistant Sheet ── */}
			<Sheet open={aiOpen} onOpenChange={setAiOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
				>
					<SheetHeader className="p-5 pb-3">
						<SheetTitle className="flex items-center gap-2">
							<span className="size-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
								<Bot className="size-4 text-white" />
							</span>
							AI Assistant
						</SheetTitle>
						<SheetDescription>
							Get meal recommendations or ask about foods
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 flex flex-col min-h-0 px-5 pb-5">
						<Tabs
							defaultValue="recommend"
							className="flex-1 flex flex-col min-h-0"
						>
							<TabsList className="w-full">
								<TabsTrigger value="recommend" className="flex-1">
									<Sparkles className="size-3.5" />
									Recommend
								</TabsTrigger>
								<TabsTrigger value="ask" className="flex-1">
									<Send className="size-3.5" />
									Ask AI
								</TabsTrigger>
							</TabsList>

							{/* ─ Recommend tab ─ */}
							<TabsContent
								value="recommend"
								className="flex-1 flex flex-col min-h-0 mt-4"
							>
								<div className="space-y-4">
									{/* Diet toggle */}
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">Diet:</span>
										<div className="flex items-center bg-muted rounded-lg p-0.5">
											<button
												type="button"
												onClick={() => setDietPreference("veg")}
												className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
													dietPreference === "veg"
														? "bg-emerald-500 text-white shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												<Leaf className="size-3.5" />
												Veg
											</button>
											<button
												type="button"
												onClick={() => setDietPreference("non-veg")}
												className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
													dietPreference === "non-veg"
														? "bg-orange-500 text-white shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												<Drumstick className="size-3.5" />
												Non-veg
											</button>
										</div>
									</div>

									{/* Remaining budget card */}
									<Card className="py-3 bg-muted/50 border-dashed">
										<CardContent className="py-0">
											<p className="text-xs font-medium text-muted-foreground mb-2">
												Remaining Budget
											</p>
											<div className="grid grid-cols-4 gap-2 text-center">
												<div>
													<p className="text-sm font-bold text-blue-600 dark:text-blue-400">
														{remaining.calories}
													</p>
													<p className="text-[10px] text-muted-foreground">
														kcal
													</p>
												</div>
												<div>
													<p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
														{Math.round(remaining.protein)}g
													</p>
													<p className="text-[10px] text-muted-foreground">
														protein
													</p>
												</div>
												<div>
													<p className="text-sm font-bold text-amber-600 dark:text-amber-400">
														{Math.round(remaining.carbs)}g
													</p>
													<p className="text-[10px] text-muted-foreground">
														carbs
													</p>
												</div>
												<div>
													<p className="text-sm font-bold text-rose-600 dark:text-rose-400">
														{Math.round(remaining.fats)}g
													</p>
													<p className="text-[10px] text-muted-foreground">
														fats
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									<Button
										onClick={handleRecommend}
										disabled={isRecommending}
										className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
									>
										{isRecommending ? (
											<>
												<span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
												Generating...
											</>
										) : (
											<>
												<Sparkles className="size-4" />
												Generate Meal Plan
											</>
										)}
									</Button>
								</div>

								{/* Recommendation results */}
								{recommendation && (
									<div className="mt-4 flex-1 overflow-auto space-y-4">
										{(["breakfast", "lunch", "dinner"] as const).map(
											(mealType) => (
												<div key={mealType}>
													<h4 className="text-sm font-semibold text-foreground capitalize mb-2">
														{mealType}
													</h4>
													<div className="space-y-1.5">
														{recommendation[mealType].map((item) => (
															<div
																key={`${mealType}-${item.name}-${item.grams}`}
																className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
															>
																<div className="min-w-0 flex-1">
																	<p className="text-sm font-medium text-foreground truncate">
																		{item.name}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		{item.grams}g
																	</p>
																</div>
																<div className="flex gap-2 text-xs shrink-0 ml-2 tabular-nums">
																	<span className="text-blue-600 dark:text-blue-400 font-medium">
																		{item.calories}
																	</span>
																	<span className="text-emerald-600 dark:text-emerald-400">
																		P:{item.protein}
																	</span>
																	<span className="text-amber-600 dark:text-amber-400">
																		C:{item.carbs}
																	</span>
																	<span className="text-rose-600 dark:text-rose-400">
																		F:{item.fats}
																	</span>
																</div>
															</div>
														))}
													</div>
												</div>
											),
										)}
									</div>
								)}
							</TabsContent>

							{/* ─ Ask tab ─ */}
							<TabsContent
								value="ask"
								className="flex-1 flex flex-col min-h-0 mt-4"
							>
								<div className="flex-1 flex flex-col">
									{/* Response area */}
									<div className="flex-1 flex flex-col justify-end">
										{chatResponse && (
											<Card
												className={`py-3 ${
													chatResponse.withinBudget
														? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
														: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
												}`}
											>
												<CardContent className="py-0">
													<div className="flex items-start gap-3">
														{chatResponse.withinBudget ? (
															<CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
														) : (
															<XCircle className="size-5 text-red-500 mt-0.5 shrink-0" />
														)}
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-foreground">
																{chatResponse.withinBudget
																	? "Yes, go for it!"
																	: "Over budget"}
															</p>
															<p className="text-sm text-muted-foreground mt-1">
																{chatResponse.answer}
															</p>
															{chatResponse.suggestion && (
																<p className="text-xs text-muted-foreground mt-2 italic">
																	{chatResponse.suggestion}
																</p>
															)}
														</div>
														<Button
															variant="ghost"
															size="icon-sm"
															onClick={() => setChatResponse(null)}
														>
															<X className="size-3.5" />
														</Button>
													</div>
												</CardContent>
											</Card>
										)}

										{!chatResponse && !isChatLoading && (
											<div className="text-center py-8">
												<Bot className="size-10 text-muted-foreground/30 mx-auto mb-3" />
												<p className="text-sm text-muted-foreground">
													Ask me about any food and I'll tell you
													<br />
													if it fits your remaining budget.
												</p>
											</div>
										)}

										{isChatLoading && (
											<div className="flex items-center justify-center py-8">
												<div className="flex items-center gap-3 text-muted-foreground">
													<span className="size-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
													<span className="text-sm">Thinking...</span>
												</div>
											</div>
										)}
									</div>

									{/* Chat input */}
									<div className="flex gap-2 mt-4">
										<Input
											type="text"
											placeholder="Can I eat 3 bread with cheese?"
											value={chatQuestion}
											onChange={(e) => setChatQuestion(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													handleAskQuestion();
												}
											}}
											disabled={isChatLoading}
											className="flex-1"
										/>
										<Button
											onClick={handleAskQuestion}
											disabled={isChatLoading || !chatQuestion.trim()}
											size="icon"
											className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shrink-0"
										>
											<Send className="size-4" />
										</Button>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
