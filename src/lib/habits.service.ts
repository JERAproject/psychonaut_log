import db from "./db";
import type { Habit, HabitLog } from "../types/habit";

export function getHabits(): Habit[] {
  return db.prepare(`
    SELECT id, name, color, max_per_day as maxPerDay
    FROM habits
  `).all() as Habit[];
}

export function getHabitById(id: number): Habit | undefined {
  return db.prepare(`
    SELECT id, name, color, max_per_day as maxPerDay
    FROM habits WHERE id = ?
  `).get(id) as Habit | undefined;
}

export function createHabit(name: string, color: string, maxPerDay: number): void {
  db.prepare(`
    INSERT INTO habits (name, color, max_per_day)
    VALUES (?, ?, ?)
  `).run(name, color, maxPerDay);
}

export function getLogs(habitId?: number): HabitLog[] {
  if (habitId !== undefined) {
    return db.prepare(`
      SELECT habit_id as habitId, log_date as logDate, count
      FROM habit_logs WHERE habit_id = ?
      ORDER BY log_date DESC
    `).all(habitId) as HabitLog[];
  }
  return db.prepare(`
    SELECT habit_id as habitId, log_date as logDate, count
    FROM habit_logs
    ORDER BY log_date DESC
  `).all() as HabitLog[];
}

export function getLogsByHabitAndDateRange(
  habitId: number,
  startDate: string,
  endDate: string
): { logDate: string; count: number }[] {
  return db.prepare(`
    SELECT log_date as logDate, count
    FROM habit_logs
    WHERE habit_id = ? AND log_date BETWEEN ? AND ?
  `).all(habitId, startDate, endDate) as { logDate: string; count: number }[];
}

export function incrementHabit(habitId: number, date: string, max: number): void {
  db.prepare(`
    INSERT INTO habit_logs (habit_id, log_date, count)
    VALUES (?, ?, 1)
    ON CONFLICT (habit_id, log_date)
    DO UPDATE SET count = MIN(count + 1, ?)
  `).run(habitId, date, max);
}

export function getHabitCountOnDate(habitId: number, date: string): number {
  const row = db.prepare(`
    SELECT count FROM habit_logs
    WHERE habit_id = ? AND log_date = ?
  `).get(habitId, date) as { count: number } | undefined;
  return row?.count ?? 0;
}
