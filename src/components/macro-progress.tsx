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
	const firstLetter = label.charAt(0).toUpperCase();

	return (
		<div className="flex flex-col items-center">
			<div
				className="w-20 h-20 rounded-full flex items-center justify-center mb-3 relative"
				style={{ borderColor: "var(--border)" }}
			>
				<svg
					className="absolute w-20 h-20 -rotate-90"
					viewBox="0 0 80 80"
				>
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="var(--border)"
						strokeWidth="4"
					/>
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						className={color.replace("bg-", "stroke-")}
						strokeWidth="4"
						strokeLinecap="round"
						strokeDasharray={`${2 * Math.PI * 36}`}
						strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
					/>
				</svg>
				<div className="text-center z-10 flex flex-col items-center">
					<span
						className={`text-lg font-bold ${color.replace("bg-", "text-")}`}
					>
						{firstLetter}
					</span>
					<span className="text-xs text-muted-foreground">
						{Math.round(percentage)}%
					</span>
				</div>
			</div>
			<p className="text-sm font-medium text-foreground">{label}</p>
			<p className="text-xs text-muted-foreground mt-0.5">
				{current} / {goal}
				{unit}
			</p>
		</div>
	);
}
