import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_sidebar/add-product")({
	component: RouteComponent,
});

const COMMON_PRODUCTS = [
	{ name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6 },
	{ name: "Brown Rice", calories: 111, protein: 2.6, carbs: 23, fats: 0.9 },
	{ name: "Broccoli", calories: 34, protein: 2.8, carbs: 7, fats: 0.4 },
	{ name: "Salmon", calories: 208, protein: 22, carbs: 0, fats: 13 },
	{ name: "Eggs", calories: 155, protein: 13, carbs: 1.1, fats: 11 },
	{ name: "Oatmeal", calories: 389, protein: 17, carbs: 66, fats: 7 },
	{ name: "Almonds", calories: 579, protein: 21, carbs: 22, fats: 50 },
	{ name: "Banana", calories: 89, protein: 1.1, carbs: 23, fats: 0.3 },
];

function RouteComponent() {
	const [formData, setFormData] = useState({
		name: "",
		grams: 100,
		calories: "",
		protein: "",
		carbs: "",
		fats: "",
	});

	const [products, setProducts] = useState(COMMON_PRODUCTS);
	const [showForm, setShowForm] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleAddProduct = (e: React.FormEvent) => {
		e.preventDefault();
		if (
			formData.name &&
			formData.calories &&
			formData.protein &&
			formData.carbs &&
			formData.fats
		) {
			setProducts([
				...products,
				{
					name: formData.name,
					calories: Number.parseFloat(formData.calories),
					protein: Number.parseFloat(formData.protein),
					carbs: Number.parseFloat(formData.carbs),
					fats: Number.parseFloat(formData.fats),
				},
			]);
			setFormData({
				name: "",
				grams: 100,
				calories: "",
				protein: "",
				carbs: "",
				fats: "",
			});
			setShowForm(false);
		}
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
					onClick={() => setShowForm(true)}
					className="self-start mb-6 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90"
				>
					Create New Product
				</button>
			)}

			<div className="flex-1 overflow-auto">
				<div className="grid grid-cols-1 gap-3">
					{products.map((product, idx) => (
						<div
							key={idx}
							className="bg-card p-4 rounded-lg border border-border hover:bg-secondary transition-colors"
						>
							<div className="flex justify-between items-start mb-2">
								<h3 className="font-semibold text-foreground">
									{product.name}
								</h3>
								<span className="text-sm font-medium text-blue-600">
									{product.calories} kcal
								</span>
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
