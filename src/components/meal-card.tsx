import { Trash2 } from "lucide-react";

interface MealCardProps {
	item: {
		product: string;
		grams: number;
		calories: number;
		protein: number;
		carbs: number;
		fats: number;
	};
	onRemove: () => void;
}

export default function MealCard({ item, onRemove }: MealCardProps) {
	return (
		<div className="bg-card p-4 rounded-lg border border-border flex items-center justify-between hover:bg-secondary transition-colors">
			<div className="flex-1">
				<div className="flex items-center gap-3 mb-2">
					<h4 className="font-medium text-foreground">{item.product}</h4>
					<span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
						{item.grams}g
					</span>
				</div>
				<div className="grid grid-cols-4 gap-3 text-sm">
					<div>
						<p className="text-muted-foreground">Calories</p>
						<p className="font-medium text-foreground">{item.calories}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Protein</p>
						<p className="font-medium text-emerald-600">{item.protein}g</p>
					</div>
					<div>
						<p className="text-muted-foreground">Carbs</p>
						<p className="font-medium text-amber-600">{item.carbs}g</p>
					</div>
					<div>
						<p className="text-muted-foreground">Fats</p>
						<p className="font-medium text-rose-600">{item.fats}g</p>
					</div>
				</div>
			</div>
			<button
				type="button"
				onClick={onRemove}
				className="p-2 text-muted-foreground hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors ml-4"
			>
				<Trash2 size={18} />
			</button>
		</div>
	);
}
