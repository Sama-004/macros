import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "@/db/database";

type Product = {
	id: number;
	name: string;
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
			grams: number;
			calories: number;
			protein: number;
			carbs: number;
			fats: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		await db.execute({
			sql: "INSERT INTO products (name, grams, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?)",
			args: [data.name, data.grams, data.calories, data.protein, data.carbs, data.fats],
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

export const Route = createFileRoute("/_sidebar/add-product")({
	component: RouteComponent,
	loader: () => getProducts(),
});

function RouteComponent() {
	const initialProducts = Route.useLoaderData();
	const [products, setProducts] = useState(initialProducts);
	const [formData, setFormData] = useState({
		name: "",
		grams: 100,
		calories: "",
		protein: "",
		carbs: "",
		fats: "",
	});
	const [showForm, setShowForm] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
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
		await addProduct({
			data: {
				name: formData.name.trim(),
				grams: Number(formData.grams) || 100,
				calories: Number.parseFloat(formData.calories) || 0,
				protein: Number.parseFloat(formData.protein) || 0,
				carbs: Number.parseFloat(formData.carbs) || 0,
				fats: Number.parseFloat(formData.fats) || 0,
			},
		});
		const updated = await getProducts();
		setProducts(updated);
		setFormData({
			name: "",
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
				<h2 className="text-3xl font-bold text-foreground">Add Product</h2>
				<p className="text-muted-foreground mt-1">
					Add new foods to your database
				</p>
			</div>

			{showForm && (
				<form
					onSubmit={handleAddProduct}
					className="bg-card p-6 rounded-lg border border-border mb-6"
				>
					<div className="grid grid-cols-2 gap-4 mb-4">
						<input
							type="text"
							name="name"
							placeholder="Product name"
							value={formData.name}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
						<input
							type="number"
							name="grams"
							placeholder="Grams"
							value={formData.grams}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
						<input
							type="number"
							name="calories"
							placeholder="Calories (per 100g)"
							value={formData.calories}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
						<input
							type="number"
							name="protein"
							placeholder="Protein (g)"
							value={formData.protein}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
						<input
							type="number"
							name="carbs"
							placeholder="Carbs (g)"
							value={formData.carbs}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
						<input
							type="number"
							name="fats"
							placeholder="Fats (g)"
							value={formData.fats}
							onChange={handleInputChange}
							className="px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border"
						/>
					</div>
					<div className="flex gap-3">
						<button
							type="submit"
							className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
						>
							Add Product
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{!showForm && (
				<button
					type="button"
					onClick={() => setShowForm(true)}
					className="self-start mb-6 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
				>
					Create New Product
				</button>
			)}

			<div className="flex-1 overflow-auto">
				<div className="grid grid-cols-1 gap-3">
					{products.map((product) => (
						<div
							key={product.id}
							className="bg-card p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
						>
							<div className="flex justify-between items-start mb-2">
								<h3 className="font-semibold text-foreground">
									{product.name}
								</h3>
								<div className="flex items-center gap-3">
									<span className="text-sm text-muted-foreground">
										{product.grams}g
									</span>
									<span className="text-sm font-medium text-blue-600">
										{product.calories} kcal
									</span>
									<button
										type="button"
										onClick={() => handleDeleteProduct(product.id)}
										className="text-sm text-red-500 hover:text-red-700 font-medium"
									>
										Delete
									</button>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground">Protein</p>
									<p className="font-medium text-emerald-600">
										{product.protein}g
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Carbs</p>
									<p className="font-medium text-amber-600">{product.carbs}g</p>
								</div>
								<div>
									<p className="text-muted-foreground">Fats</p>
									<p className="font-medium text-rose-600">{product.fats}g</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
