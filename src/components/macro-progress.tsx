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
	const isMetPercent = percentage >= 100;

	return (
		<div className="flex flex-col items-center">
			<div
				className="w-20 h-20 rounded-full border-4 flex items-center justify-center mb-3 relative"
				style={{ borderColor: "var(--border)" }}
			>
				<svg className="absolute w-20 h-20 progress-circle" viewBox="0 0 80 80">
					<circle
						cx="40"
						cy="40"
						r="36"
						className="progress-circle-bg"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<circle
						cx="40"
						cy="40"
						r="36"
						className="progress-circle-fill"
						stroke="currentColor"
						strokeWidth="4"
						strokeDasharray={`${2 * Math.PI * 36}`}
						strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
						style={{ color }}
					/>
				</svg>
				<div className="text-center z-10">
					<p className="text-sm font-bold text-[color:var(--foreground)]">
						{Math.round(percentage)}%
					</p>
				</div>
			</div>
			<p className="text-sm font-medium text-[color:var(--foreground)]">
				{label}
			</p>
			<p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
				{current} / {goal}
				{unit}
			</p>
		</div>
	);
}
