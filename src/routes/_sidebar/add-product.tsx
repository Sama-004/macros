import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db/database";
import { google } from "@ai-sdk/google";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

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

const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	const result = await db.execute(
		"SELECT * FROM products ORDER BY created_at DESC",
	);
	return result.rows as unknown as Product[];
});

const addProduct = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			name: string;
			quantity: number;
			grams: number;
			calories: number;
			protein: number;
			carbs: number;
			fats: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "INSERT INTO products (name, quantity, grams, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?)",
			args: [
				data.name,
				data.quantity,
				data.grams,
				data.calories,
				data.protein,
				data.carbs,
				data.fats,
			],
		});
	});

const deleteProduct = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "DELETE FROM products WHERE id = ?",
			args: [data.id],
		});
	});

const productSchema = z.object({
	name: z.string().describe("The name of the food product"),
	quantity: z
		.number()
		.describe("The quantity/number of items (e.g., 2 for '2 eggs')"),
	grams: z.number().describe("Total weight in grams for all items"),
	calories: z.number().describe("Total calories for all items"),
	protein: z.number().describe("Total protein in grams for all items"),
	carbs: z.number().describe("Total carbohydrates in grams for all items"),
	fats: z.number().describe("Total fats in grams for all items"),
});

const generateProductMacros = createServerFn({ method: "POST" })
	.inputValidator((data: { message: string }) => data)
	.handler(async ({ data }) => {
		const { object } = await generateObject({
			model: google("gemini-flash-latest"),
			schema: productSchema,
			prompt: `Generate accurate nutritional information for: "${data.message}"

			Important:
			- If the user specifies a quantity (e.g., "2 eggs", "3 slices of bread"), use that quantity
			- If no quantity is specified, assume 1
			- Provide realistic macro values based on standard food databases
			- All values should be for the total quantity specified`,
		});
		return object;
	});

export const Route = createFileRoute("/_sidebar/add-product")({
	component: RouteComponent,
	loader: () => getProducts(),
});

function RouteComponent() {
	const initialProducts = Route.useLoaderData();
	const [products, setProducts] = useState(initialProducts);
	const [formData, setFormData] = useState({
		name: "",
		quantity: 1,
		grams: 100,
		calories: "",
		protein: "",
		carbs: "",
		fats: "",
	});
	const [showForm, setShowForm] = useState(false);
	const [aiPrompt, setAiPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleGenerateMacros = async () => {
		if (!aiPrompt.trim() || isGenerating) return;
		setIsGenerating(true);
		try {
			const result = await generateProductMacros({
				data: { message: aiPrompt.trim() },
			});
			setFormData({
				name: result.name,
				quantity: result.quantity,
				grams: result.grams,
				calories: String(result.calories),
				protein: String(result.protein),
				carbs: String(result.carbs),
				fats: String(result.fats),
			});
			setShowForm(true);
			setAiPrompt("");
		} catch (error) {
			console.error("Failed to generate macros:", error);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleDeleteProduct = async (id: number) => {
		await deleteProduct({ data: { id } });
		setProducts(products.filter((p) => p.id !== id));
	};

	const handleAddProduct = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return;
		const qty = Number(formData.quantity) || 1;
		const totalGrams = Number(formData.grams) || 100;
		const totalCalories = Number.parseFloat(formData.calories) || 0;
		const totalProtein = Number.parseFloat(formData.protein) || 0;
		const totalCarbs = Number.parseFloat(formData.carbs) || 0;
		const totalFats = Number.parseFloat(formData.fats) || 0;

		await addProduct({
			data: {
				name: formData.name.trim(),
				quantity: qty,
				grams: Math.round((totalGrams / qty) * 10) / 10,
				calories: Math.round((totalCalories / qty) * 10) / 10,
				protein: Math.round((totalProtein / qty) * 100) / 100,
				carbs: Math.round((totalCarbs / qty) * 100) / 100,
				fats: Math.round((totalFats / qty) * 100) / 100,
			},
		});
		const updated = await getProducts();
		setProducts(updated);
		setFormData({
			name: "",
			quantity: 1,
			grams: 100,
			calories: "",
			protein: "",
			carbs: "",
			fats: "",
		});
		setShowForm(false);
	};

	const filteredProducts = searchQuery
		? products.filter((p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: products;

	return (
		<div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
			<div className="mb-5">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground">
					Products
				</h2>
				<p className="text-sm text-muted-foreground mt-0.5">
					Manage your food database
				</p>
			</div>

			{/* AI Generate */}
			<div className="flex gap-2 mb-4">
				<div className="relative flex-1">
					<Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-violet-500" />
					<Input
						type="text"
						placeholder="Generate with AI — e.g. '2 eggs', '100g paneer'"
						value={aiPrompt}
						onChange={(e) => setAiPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleGenerateMacros();
							}
						}}
						disabled={isGenerating}
						className="pl-9"
					/>
				</div>
				<Button
					type="button"
					onClick={handleGenerateMacros}
					disabled={isGenerating || !aiPrompt.trim()}
					className="shrink-0"
				>
					{isGenerating ? (
						<span className="size-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
					) : (
						"Generate"
					)}
				</Button>
			</div>

			{/* Create / Form */}
			{showForm ? (
				<Card className="mb-4 py-4">
					<CardContent>
						<form onSubmit={handleAddProduct} className="space-y-4">
							<div>
								<label
									htmlFor="ap-name"
									className="text-sm font-medium text-foreground mb-1.5 block"
								>
									Name
								</label>
								<Input
									id="ap-name"
									type="text"
									name="name"
									placeholder="e.g., Egg, Chicken Breast"
									value={formData.name}
									onChange={handleInputChange}
								/>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
								<div>
									<label
										htmlFor="ap-qty"
										className="text-sm font-medium text-foreground mb-1.5 block"
									>
										Qty
									</label>
									<Input
										id="ap-qty"
										type="number"
										name="quantity"
										value={formData.quantity}
										onChange={handleInputChange}
										min={1}
										step={1}
									/>
								</div>
								<div>
									<label
										htmlFor="ap-grams"
										className="text-sm font-medium text-foreground mb-1.5 block"
									>
										Total Grams
									</label>
									<Input
										id="ap-grams"
										type="number"
										name="grams"
										value={formData.grams}
										onChange={handleInputChange}
									/>
								</div>
								<div className="flex items-end col-span-2 sm:col-span-1">
									<span className="h-9 px-3 rounded-md bg-muted text-muted-foreground text-sm flex items-center w-full sm:w-auto">
										={" "}
										{Math.round(
											((Number(formData.grams) || 0) /
												(Number(formData.quantity) || 1)) *
												10,
										) / 10}
										g / unit
									</span>
								</div>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div>
									<label
										htmlFor="ap-cal"
										className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1.5 block"
									>
										Calories
									</label>
									<Input
										id="ap-cal"
										type="number"
										name="calories"
										placeholder="0"
										value={formData.calories}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<label
										htmlFor="ap-protein"
										className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1.5 block"
									>
										Protein (g)
									</label>
									<Input
										id="ap-protein"
										type="number"
										name="protein"
										placeholder="0"
										value={formData.protein}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<label
										htmlFor="ap-carbs"
										className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1.5 block"
									>
										Carbs (g)
									</label>
									<Input
										id="ap-carbs"
										type="number"
										name="carbs"
										placeholder="0"
										value={formData.carbs}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<label
										htmlFor="ap-fats"
										className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1.5 block"
									>
										Fats (g)
									</label>
									<Input
										id="ap-fats"
										type="number"
										name="fats"
										placeholder="0"
										value={formData.fats}
										onChange={handleInputChange}
									/>
								</div>
							</div>
							<div className="flex gap-2">
								<Button type="submit">Save Product</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowForm(false)}
								>
									Cancel
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			) : (
				<Button
					type="button"
					variant="outline"
					className="mb-4 border-2 border-dashed h-10 w-full"
					onClick={() => setShowForm(true)}
				>
					<Plus className="size-4" />
					Create New Product
				</Button>
			)}

			{/* Search */}
			<div className="relative mb-4">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search products..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						<X className="size-4" />
					</button>
				)}
			</div>

			{/* Product List */}
			<div className="flex-1 overflow-auto">
				<div className="space-y-2">
					{filteredProducts.map((product) => (
						<div
							key={product.id}
							className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<h4 className="font-medium text-sm sm:text-base text-foreground truncate">
										{product.name}
									</h4>
									<span className="text-xs sm:text-sm text-muted-foreground shrink-0">
										{product.quantity && product.quantity > 1
											? `${product.quantity}x ${product.grams}g`
											: `${product.grams}g`}
									</span>
								</div>
								<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:text-sm">
									<span className="text-blue-600 dark:text-blue-400 font-medium">
										{product.calories} kcal
									</span>
									<span className="text-emerald-600 dark:text-emerald-400">
										P: {product.protein}g
									</span>
									<span className="text-amber-600 dark:text-amber-400">
										C: {product.carbs}g
									</span>
									<span className="text-rose-600 dark:text-rose-400">
										F: {product.fats}g
									</span>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={() => handleDeleteProduct(product.id)}
								className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}
					{filteredProducts.length === 0 && (
						<div className="text-center py-12">
							<p className="text-sm text-muted-foreground">
								{searchQuery
									? "No products match your search."
									: "No products yet. Create one above."}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
