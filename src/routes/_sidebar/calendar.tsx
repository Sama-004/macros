import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_sidebar/calendar")({
	component: RouteComponent,
});

interface DayData {
	date: number;
	calories: number;
	goal: number;
}

function RouteComponent() {
	const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1));

	const daysInMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), 1).getDay();

	// Hardcoded daily data
	const dailyData: Record<number, DayData> = {
		1: { date: 1, calories: 1850, goal: 2000 },
		2: { date: 2, calories: 2050, goal: 2000 },
		3: { date: 3, calories: 1900, goal: 2000 },
		4: { date: 4, calories: 2200, goal: 2000 },
		5: { date: 5, calories: 1950, goal: 2000 },
		6: { date: 6, calories: 2000, goal: 2000 },
		7: { date: 7, calories: 2100, goal: 2000 },
		8: { date: 8, calories: 1800, goal: 2000 },
		9: { date: 9, calories: 2150, goal: 2000 },
		10: { date: 10, calories: 1950, goal: 2000 },
		11: { date: 11, calories: 2050, goal: 2000 },
		12: { date: 12, calories: 2100, goal: 2000 },
		13: { date: 13, calories: 1900, goal: 2000 },
		14: { date: 14, calories: 2000, goal: 2000 },
		15: { date: 15, calories: 2200, goal: 2000 },
		16: { date: 16, calories: 1850, goal: 2000 },
		17: { date: 17, calories: 2050, goal: 2000 },
		18: { date: 18, calories: 1950, goal: 2000 },
		19: { date: 19, calories: 2000, goal: 2000 },
		20: { date: 20, calories: 2100, goal: 2000 },
		21: { date: 21, calories: 1800, goal: 2000 },
		22: { date: 22, calories: 2150, goal: 2000 },
		23: { date: 23, calories: 1950, goal: 2000 },
		24: { date: 24, calories: 2050, goal: 2000 },
		25: { date: 25, calories: 2100, goal: 2000 },
		26: { date: 26, calories: 1900, goal: 2000 },
		27: { date: 27, calories: 2000, goal: 2000 },
		28: { date: 28, calories: 2200, goal: 2000 },
		29: { date: 29, calories: 1850, goal: 2000 },
		30: { date: 30, calories: 2050, goal: 2000 },
		31: { date: 31, calories: 1950, goal: 2000 },
	};

	const getProgressPercentage = (actual: number, goal: number) => {
		return Math.min((actual / goal) * 100, 100);
	};

	const isGoalMet = (actual: number, goal: number) =>
		actual >= goal * 0.95 && actual <= goal * 1.05;

	const prevMonth = () =>
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
		);
	const nextMonth = () =>
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
		);

	const days = [];
	const totalDays = daysInMonth(currentDate);
	const startingDayOfWeek = firstDayOfMonth(currentDate);

	for (let i = 0; i < startingDayOfWeek; i++) {
		days.push(null);
	}
	for (let i = 1; i <= totalDays; i++) {
		days.push(i);
	}

	return (
		<div className="p-8 h-full flex flex-col">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-3xl font-bold text-foreground">Goals Tracker</h2>
					<p className="text-muted-foreground mt-1">
						Monitor your daily progress
					</p>
				</div>
			</div>

			<div className="bg-card rounded-lg border border-border p-6">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-semibold text-foreground">
						{currentDate.toLocaleDateString("en-US", {
							month: "long",
							year: "numeric",
						})}
					</h3>
					<div className="flex gap-2">
						<Button
							type="button"
							onClick={prevMonth}
							className="p-2 hover:bg-secondary rounded-lg transition-colors"
						>
							<ChevronLeft size={20} />
						</Button>
						<Button
							onClick={nextMonth}
							className="p-2 hover:bg-secondary rounded-lg transition-colors"
						>
							<ChevronRight size={20} />
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-7 gap-2 mb-4">
					{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
						<div
							key={day}
							className="text-center font-semibold text-sm text-muted-foreground py-2"
						>
							{day}
						</div>
					))}
				</div>

				<div className="grid grid-cols-7 gap-2">
					{days.map((day, idx) => {
						if (!day) {
							return <div key={`empty-${idx}`} className="aspect-square" />;
						}

						const data = dailyData[day];
						const isGoal = isGoalMet(data.calories, data.goal);
						const progress = getProgressPercentage(data.calories, data.goal);

						return (
							<div
								key={day}
								className={`aspect-square p-2 rounded-lg border transition-all ${
									isGoal
										? "bg-accent border-accent text-white"
										: "bg-secondary border-border text-foreground"
								}`}
							>
								<div className="flex flex-col items-center justify-center h-full gap-0.5">
									<span className="font-bold text-sm">{day}</span>
									<span
										className={`text-xs ${isGoal ? "text-green-100" : "text-muted-foreground"}`}
									>
										{data.calories}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				<div className="mt-6 pt-6 border-t border-border">
					<div className="grid grid-cols-3 gap-4">
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">
								Average Intake
							</p>
							<p className="text-2xl font-bold text-foreground">
								{Math.round(
									Object.values(dailyData).reduce(
										(sum, d) => sum + d.calories,
										0,
									) / Object.keys(dailyData).length,
								)}
							</p>
						</div>
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Days on Goal</p>
							<p className="text-2xl font-bold text-accent">
								{
									Object.values(dailyData).filter((d) =>
										isGoalMet(d.calories, d.goal),
									).length
								}
							</p>
						</div>
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Consistency</p>
							<p className="text-2xl font-bold text-foreground">
								{Math.round(
									(Object.values(dailyData).filter((d) =>
										isGoalMet(d.calories, d.goal),
									).length /
										Object.keys(dailyData).length) *
										100,
								)}
								%
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
