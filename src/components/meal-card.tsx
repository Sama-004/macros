import { Button } from "@/components/ui/button";
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
		<div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm">
			<div className="flex-1">
				<div className="flex items-center gap-3 mb-3">
					<h4 className="font-semibold text-foreground">{item.product}</h4>
					<span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
						{item.grams}g
					</span>
				</div>
				<div className="grid grid-cols-4 gap-3 text-sm">
					<div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
						<p className="text-blue-600 dark:text-blue-400 text-xs font-medium">
							Calories
						</p>
						<p className="font-bold text-blue-700 dark:text-blue-300">
							{item.calories}
						</p>
					</div>
					<div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
						<p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
							Protein
						</p>
						<p className="font-bold text-emerald-700 dark:text-emerald-300">
							{item.protein}g
						</p>
					</div>
					<div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
						<p className="text-amber-600 dark:text-amber-400 text-xs font-medium">
							Carbs
						</p>
						<p className="font-bold text-amber-700 dark:text-amber-300">
							{item.carbs}g
						</p>
					</div>
					<div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg">
						<p className="text-rose-600 dark:text-rose-400 text-xs font-medium">
							Fats
						</p>
						<p className="font-bold text-rose-700 dark:text-rose-300">
							{item.fats}g
						</p>
					</div>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onRemove}
				className="ml-4 text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
			>
				<Trash2 className="size-4" />
			</Button>
		</div>
	);
}
