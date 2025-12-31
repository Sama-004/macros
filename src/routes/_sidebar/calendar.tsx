import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db/database";

type DailyData = {
	date: string;
	calories: number;
	protein: number;
};

const getMonthlyData = createServerFn({ method: "GET" })
	.inputValidator((data: { year: number; month: number }) => data)
	.handler(async ({ data }) => {
		const startDate = `${data.year}-${String(data.month + 1).padStart(2, "0")}-01`;
		const endDate = `${data.year}-${String(data.month + 1).padStart(2, "0")}-31`;

		const result = await db.execute({
			sql: `SELECT m.date,
					SUM((mi.grams / p.grams) * p.calories) as calories,
					SUM((mi.grams / p.grams) * p.protein) as protein
				  FROM meals m
				  JOIN meal_items mi ON m.id = mi.meal_id
				  JOIN products p ON mi.product_id = p.id
				  WHERE m.date >= ? AND m.date <= ?
				  GROUP BY m.date`,
			args: [startDate, endDate],
		});

		return result.rows as unknown as DailyData[];
	});

export const Route = createFileRoute("/_sidebar/calendar")({
	component: RouteComponent,
});

type DayStats = {
	calories: number;
	protein: number;
};

function RouteComponent() {
	const navigate = useNavigate();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [dailyData, setDailyData] = useState<Record<number, DayStats>>({});
	const calorieGoal = 2000;
	const proteinGoal = 150;

	const daysInMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), 1).getDay();

	const loadMonthData = async (date: Date) => {
		const data = await getMonthlyData({
			data: { year: date.getFullYear(), month: date.getMonth() },
		});
		const dataMap: Record<number, DayStats> = {};
		for (const row of data) {
			const day = Number.parseInt(row.date.split("-")[2], 10);
			dataMap[day] = {
				calories: Math.round(row.calories),
				protein: Math.round(row.protein),
			};
		}
		setDailyData(dataMap);
	};

	const isCalorieGoalMet = (actual: number) =>
		actual >= calorieGoal * 0.95 && actual <= calorieGoal * 1.05;

	const prevMonth = () => {
		const newDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() - 1,
		);
		setCurrentDate(newDate);
		loadMonthData(newDate);
	};

	const nextMonth = () => {
		const newDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
		);
		setCurrentDate(newDate);
		loadMonthData(newDate);
	};

	const handleDayClick = (day: number) => {
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		const dayStr = String(day).padStart(2, "0");
		const dateStr = `${year}-${month}-${dayStr}`;
		navigate({ to: "/history", search: { date: dateStr } });
	};

	// Load data on mount
	useEffect(() => {
		loadMonthData(currentDate);
	}, []);

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

						const stats = dailyData[day];
						const hasData = stats && stats.calories > 0;
						const isGoal = hasData && isCalorieGoalMet(stats.calories);

						return (
							<button
								type="button"
								key={day}
								onClick={() => handleDayClick(day)}
								className={`aspect-square p-1 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${
									isGoal
										? "bg-accent border-accent text-white"
										: hasData
											? "bg-secondary border-border text-foreground"
											: "bg-card border-border text-foreground hover:bg-secondary"
								}`}
							>
								<div className="flex flex-col items-center justify-center h-full gap-0">
									<span className="font-bold text-sm">{day}</span>
									{hasData ? (
										<>
											<span
												className={`text-xs ${isGoal ? "text-green-100" : "text-blue-500"}`}
											>
												{stats.calories}
											</span>
											<span
												className={`text-xs ${isGoal ? "text-green-100" : "text-emerald-500"}`}
											>
												{stats.protein}g
											</span>
										</>
									) : (
										<span className="text-xs text-muted-foreground">-</span>
									)}
								</div>
							</button>
						);
					})}
				</div>

				<div className="mt-6 pt-6 border-t border-border">
					<div className="grid grid-cols-4 gap-4">
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Avg Calories</p>
							<p className="text-2xl font-bold text-blue-500">
								{Object.keys(dailyData).length > 0
									? Math.round(
											Object.values(dailyData).reduce(
												(sum, d) => sum + d.calories,
												0,
											) / Object.keys(dailyData).length,
										)
									: 0}
							</p>
						</div>
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Avg Protein</p>
							<p className="text-2xl font-bold text-emerald-500">
								{Object.keys(dailyData).length > 0
									? Math.round(
											Object.values(dailyData).reduce(
												(sum, d) => sum + d.protein,
												0,
											) / Object.keys(dailyData).length,
										)
									: 0}
								g
							</p>
						</div>
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Days on Goal</p>
							<p className="text-2xl font-bold text-accent text-black">
								{
									Object.values(dailyData).filter((d) =>
										isCalorieGoalMet(d.calories),
									).length
								}
							</p>
						</div>
						<div className="bg-secondary p-4 rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Days Tracked</p>
							<p className="text-2xl font-bold text-foreground">
								{Object.keys(dailyData).length}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
