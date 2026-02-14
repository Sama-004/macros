import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db/database";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Flame,
	Target,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getGoals } from "./settings";

type DailyData = {
	date: string;
	calories: number;
	protein: number;
};

type GoalHistoryRow = {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	effective_date: string;
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

const getGoalHistory = createServerFn({ method: "GET" })
	.inputValidator((data: { startDate: string; endDate: string }) => data)
	.handler(async ({ data }) => {
		const result = await db.execute({
			sql: `SELECT calories, protein, carbs, fats, effective_date
				  FROM goal_history
				  WHERE effective_date <= ?
				  ORDER BY effective_date ASC`,
			args: [data.endDate],
		});
		return result.rows as unknown as GoalHistoryRow[];
	});

function getGoalForDate(
	date: string,
	goalHistory: GoalHistoryRow[],
	fallbackGoal: { calories: number; protein: number },
): { calories: number; protein: number } {
	let activeGoal = fallbackGoal;
	for (const entry of goalHistory) {
		if (entry.effective_date <= date) {
			activeGoal = { calories: entry.calories, protein: entry.protein };
		} else {
			break;
		}
	}
	return activeGoal;
}

export const Route = createFileRoute("/_sidebar/calendar")({
	component: RouteComponent,
	loader: async () => {
		const goals = await getGoals();
		return { goals };
	},
});

type DayStats = { calories: number; protein: number };

function RouteComponent() {
	const navigate = useNavigate();
	const loaderData = Route.useLoaderData();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [dailyData, setDailyData] = useState<Record<number, DayStats>>({});
	const [goalHistory, setGoalHistory] = useState<GoalHistoryRow[]>([]);
	const defaultGoal = loaderData.goals;

	const today = new Date();
	const isCurrentMonth =
		currentDate.getFullYear() === today.getFullYear() &&
		currentDate.getMonth() === today.getMonth();

	const daysInMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), 1).getDay();

	const getDateStr = (day: number) => {
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		return `${year}-${month}-${String(day).padStart(2, "0")}`;
	};

	const loadMonthData = async (date: Date) => {
		const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
		const endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-31`;
		const [data, history] = await Promise.all([
			getMonthlyData({
				data: { year: date.getFullYear(), month: date.getMonth() },
			}),
			getGoalHistory({ data: { startDate, endDate } }),
		]);
		const dataMap: Record<number, DayStats> = {};
		for (const row of data) {
			const day = Number.parseInt(row.date.split("-")[2], 10);
			dataMap[day] = {
				calories: Math.round(row.calories),
				protein: Math.round(row.protein),
			};
		}
		setDailyData(dataMap);
		setGoalHistory(history);
	};

	const isCalorieGoalMet = (actual: number, goal: number) =>
		actual >= goal * 0.9 && actual <= goal * 1.1;

	const getDayGoal = (day: number) => {
		const dateStr = getDateStr(day);
		return getGoalForDate(dateStr, goalHistory, defaultGoal);
	};

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

	const goToToday = () => {
		const newDate = new Date();
		setCurrentDate(newDate);
		loadMonthData(newDate);
	};

	const handleDayClick = (day: number) => {
		navigate({ to: "/history", search: { date: getDateStr(day) } });
	};

	useEffect(() => {
		loadMonthData(currentDate);
	}, []);

	const days: (number | null)[] = [];
	const totalDays = daysInMonth(currentDate);
	const startingDayOfWeek = firstDayOfMonth(currentDate);
	for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
	for (let i = 1; i <= totalDays; i++) days.push(i);

	const trackedDays = Object.keys(dailyData).length;
	const daysOnGoal = Object.entries(dailyData).filter(([dayStr, d]) => {
		const day = Number.parseInt(dayStr, 10);
		const goal = getDayGoal(day);
		return isCalorieGoalMet(d.calories, goal.calories);
	}).length;

	const avgCalories =
		trackedDays > 0
			? Math.round(
					Object.values(dailyData).reduce((sum, d) => sum + d.calories, 0) /
						trackedDays,
				)
			: 0;

	const avgProtein =
		trackedDays > 0
			? Math.round(
					Object.values(dailyData).reduce((sum, d) => sum + d.protein, 0) /
						trackedDays,
				)
			: 0;

	const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const dayHeadersMobile = ["S", "M", "T", "W", "T", "F", "S"];

	return (
		<div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
			{/* Header */}
			<div className="mb-5">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground">
					Calendar
				</h2>
				<p className="text-sm text-muted-foreground mt-0.5">
					Track your daily nutrition goals
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
				<Card className="py-3">
					<CardContent className="flex items-center gap-3 py-0">
						<div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
							<Flame className="size-4 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Avg Cal</p>
							<p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
								{avgCalories}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="py-3">
					<CardContent className="flex items-center gap-3 py-0">
						<div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
							<TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Avg Protein</p>
							<p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
								{avgProtein}g
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="py-3">
					<CardContent className="flex items-center gap-3 py-0">
						<div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
							<Target className="size-4 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">On Goal</p>
							<p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
								{daysOnGoal}
								<span className="text-xs font-normal text-muted-foreground ml-0.5">
									/ {trackedDays}
								</span>
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="py-3">
					<CardContent className="flex items-center gap-3 py-0">
						<div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
							<CalendarDays className="size-4 text-violet-600 dark:text-violet-400" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Tracked</p>
							<p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
								{trackedDays}
								<span className="text-xs font-normal text-muted-foreground ml-0.5">
									days
								</span>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Calendar */}
			<Card className="flex-1">
				<CardContent className="p-4 sm:p-6">
					{/* Month nav */}
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg sm:text-xl font-semibold text-foreground">
							{currentDate.toLocaleDateString("en-US", {
								month: "long",
								year: "numeric",
							})}
						</h3>
						<div className="flex items-center gap-1.5">
							{!isCurrentMonth && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={goToToday}
								>
									Today
								</Button>
							)}
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={prevMonth}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={nextMonth}
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>

					{/* Day headers */}
					<div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
						{dayHeaders.map((day, i) => (
							<div
								key={`header-${day}-${i}`}
								className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2"
							>
								<span className="hidden sm:inline">{day}</span>
								<span className="sm:hidden">{dayHeadersMobile[i]}</span>
							</div>
						))}
					</div>

					{/* Days grid */}
					<div className="grid grid-cols-7 gap-1 sm:gap-1.5">
						{days.map((day, idx) => {
							if (!day) {
								return (
									<div
										key={`empty-${idx}`}
										className="aspect-square rounded-lg"
									/>
								);
							}
							const stats = dailyData[day];
							const hasData = stats && stats.calories > 0;
							const dayGoal = getDayGoal(day);
							const isGoal =
								hasData && isCalorieGoalMet(stats.calories, dayGoal.calories);
							const isToday = isCurrentMonth && day === today.getDate();
							const pct = hasData
								? Math.min(
										Math.round((stats.calories / dayGoal.calories) * 100),
										150,
									)
								: 0;

							return (
								<button
									type="button"
									key={`day-${day}`}
									onClick={() => handleDayClick(day)}
									title={
										hasData
											? `${stats.calories} / ${dayGoal.calories} kcal (${pct}%)`
											: `Goal: ${dayGoal.calories} kcal`
									}
									className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative overflow-hidden group ${
										isGoal
											? "bg-emerald-500 text-white hover:bg-emerald-600"
											: hasData
												? "bg-red-400 dark:bg-red-500 text-white hover:bg-red-500 dark:hover:bg-red-600"
												: "bg-secondary/50 text-foreground hover:bg-secondary"
									} ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
								>
									<span
										className={`font-semibold text-xs sm:text-sm relative z-10 ${isToday && !hasData ? "text-primary" : ""}`}
									>
										{day}
									</span>
									{hasData && (
										<span className="text-[9px] sm:text-[11px] font-medium opacity-80 relative z-10 tabular-nums leading-tight">
											{stats.calories}
										</span>
									)}
								</button>
							);
						})}
					</div>

					{/* Legend */}
					<div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-border">
						<div className="flex items-center gap-1.5">
							<div className="size-3 rounded-sm bg-emerald-500" />
							<span className="text-xs text-muted-foreground">On goal</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="size-3 rounded-sm bg-red-400 dark:bg-red-500" />
							<span className="text-xs text-muted-foreground">Off goal</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="size-3 rounded-sm bg-secondary" />
							<span className="text-xs text-muted-foreground">No data</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="size-3 rounded-sm ring-2 ring-primary" />
							<span className="text-xs text-muted-foreground">Today</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
