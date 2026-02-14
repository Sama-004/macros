import { cn } from "@/lib/utils";

interface MacroProgressProps {
	label: string;
	current: number;
	goal: number;
	color: string;
	unit?: string;
}

export default function MacroProgress({
	label,
	current,
	goal,
	color,
	unit = "",
}: MacroProgressProps) {
	const percentage = Math.min((current / goal) * 100, 100);
	const isOver = current > goal;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
				<span className="text-xs tabular-nums text-muted-foreground">
					{Math.round(percentage)}%
				</span>
			</div>
			<div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500",
						isOver ? "bg-red-500" : color,
					)}
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
			<div className="flex items-baseline gap-1">
				<span
					className={cn(
						"text-lg font-bold tabular-nums",
						isOver ? "text-red-500" : color.replace("bg-", "text-"),
					)}
				>
					{Math.round(current)}
				</span>
				<span className="text-xs text-muted-foreground">
					/ {goal}
					{unit}
				</span>
			</div>
		</div>
	);
}
