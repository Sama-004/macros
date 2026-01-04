import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db/database";
import { google } from "@ai-sdk/google";

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
		console.log("data message", data.message);
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
		console.log("object", object);
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
		if (!formData.name.trim()) {
			return;
		}
		const qty = Number(formData.quantity) || 1;
		const totalGrams = Number(formData.grams) || 100;
		const totalCalories = Number.parseFloat(formData.calories) || 0;
		const totalProtein = Number.parseFloat(formData.protein) || 0;
		const totalCarbs = Number.parseFloat(formData.carbs) || 0;
		const totalFats = Number.parseFloat(formData.fats) || 0;

		// Store per-unit values (divide by quantity) and keep quantity for display
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

	return (
		<div className="p-8 h-full flex flex-col">
			<div className="mb-6">
				<h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
					Add Product
				</h2>
				<p className="text-muted-foreground mt-1">
					Add new foods to your database
				</p>
			</div>

			<div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-5 rounded-xl border border-violet-200 dark:border-violet-800 mb-6">
				<label className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3 block flex items-center gap-2">
					<Sparkles className="size-4" />
					Generate with AI
				</label>
				<div className="flex gap-3">
					<Input
						type="text"
						placeholder="Describe a food (e.g., '2 eggs', '100g chicken breast')"
						value={aiPrompt}
						onChange={(e) => setAiPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleGenerateMacros();
							}
						}}
						className="flex-1 bg-white dark:bg-background"
						disabled={isGenerating}
					/>
					<Button
						type="button"
						onClick={handleGenerateMacros}
						disabled={isGenerating || !aiPrompt.trim()}
						className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
					>
						{isGenerating ? "Generating..." : "Generate"}
					</Button>
				</div>
			</div>

			{showForm && (
				<form
					onSubmit={handleAddProduct}
					className="bg-card p-6 rounded-xl border border-border mb-6 shadow-sm"
				>
					<div className="grid grid-cols-3 gap-4 mb-6">
						<div className="col-span-3">
							<label className="text-sm font-medium text-foreground mb-2 block">
								Product Name
							</label>
							<Input
								type="text"
								name="name"
								placeholder="e.g., Egg, Chicken Breast"
								value={formData.name}
								onChange={handleInputChange}
								className="bg-slate-50 dark:bg-slate-900"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-foreground mb-2 block">
								Quantity
							</label>
							<Input
								type="number"
								name="quantity"
								placeholder="1"
								value={formData.quantity}
								onChange={handleInputChange}
								min={1}
								step={1}
								className="bg-slate-50 dark:bg-slate-900"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-foreground mb-2 block">
								Total Grams
							</label>
							<Input
								type="number"
								name="grams"
								placeholder="100"
								value={formData.grams}
								onChange={handleInputChange}
								className="bg-slate-50 dark:bg-slate-900"
							/>
						</div>
						<div className="flex flex-col justify-end">
							<div className="h-9 px-4 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center font-medium">
								={" "}
								{Math.round(
									((Number(formData.grams) || 0) /
										(Number(formData.quantity) || 1)) *
										10,
								) / 10}
								g per unit
							</div>
						</div>
						<div>
							<label className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">
								Calories
							</label>
							<Input
								type="number"
								name="calories"
								placeholder="0"
								value={formData.calories}
								onChange={handleInputChange}
								className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 block">
								Protein (g)
							</label>
							<Input
								type="number"
								name="protein"
								placeholder="0"
								value={formData.protein}
								onChange={handleInputChange}
								className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 block">
								Carbs (g)
							</label>
							<Input
								type="number"
								name="carbs"
								placeholder="0"
								value={formData.carbs}
								onChange={handleInputChange}
								className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-2 block">
								Fats (g)
							</label>
							<Input
								type="number"
								name="fats"
								placeholder="0"
								value={formData.fats}
								onChange={handleInputChange}
								className="bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
							/>
						</div>
						<div />
					</div>
					<div className="flex gap-3">
						<Button
							type="submit"
							className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
						>
							Add Product
						</Button>
						<Button
							type="button"
							variant="secondary"
							onClick={() => setShowForm(false)}
						>
							Cancel
						</Button>
					</div>
				</form>
			)}

			{!showForm && (
				<Button
					type="button"
					onClick={() => setShowForm(true)}
					className="self-start mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
				>
					Create New Product
				</Button>
			)}

			<div className="flex-1 overflow-auto">
				<div className="grid grid-cols-1 gap-3">
					{products.map((product) => (
						<div
							key={product.id}
							className="bg-card p-4 rounded-xl border border-border hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
						>
							<div className="flex justify-between items-start mb-3">
								<h3 className="font-semibold text-foreground">
									{product.name}
								</h3>
								<div className="flex items-center gap-3">
									{product.quantity && product.quantity > 1 ? (
										<span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
											{product.quantity}x {product.grams}g
										</span>
									) : (
										<span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
											{product.grams}g
										</span>
									)}
									<span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
										{product.calories} kcal
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => handleDeleteProduct(product.id)}
										className="text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-4 text-sm">
								<div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
									<p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
										Protein
									</p>
									<p className="font-bold text-emerald-700 dark:text-emerald-300">
										{product.protein}g
									</p>
								</div>
								<div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
									<p className="text-amber-600 dark:text-amber-400 text-xs font-medium">
										Carbs
									</p>
									<p className="font-bold text-amber-700 dark:text-amber-300">
										{product.carbs}g
									</p>
								</div>
								<div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg">
									<p className="text-rose-600 dark:text-rose-400 text-xs font-medium">
										Fats
									</p>
									<p className="font-bold text-rose-700 dark:text-rose-300">
										{product.fats}g
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
