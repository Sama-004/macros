import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
		<div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-2">
					<h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
						{item.product}
					</h4>
					<Badge variant="secondary" className="shrink-0 text-xs">
						{item.grams}g
					</Badge>
				</div>
				<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm">
					<span className="text-blue-600 dark:text-blue-400 font-medium">
						{item.calories} kcal
					</span>
					<span className="text-emerald-600 dark:text-emerald-400">
						P: {item.protein}g
					</span>
					<span className="text-amber-600 dark:text-amber-400">
						C: {item.carbs}g
					</span>
					<span className="text-rose-600 dark:text-rose-400">
						F: {item.fats}g
					</span>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={onRemove}
				className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
			>
				<Trash2 className="size-4" />
			</Button>
		</div>
	);
}
