import type { APIRoute } from "astro";
import { incrementHabit, getHabitById } from "../../lib/habits.service";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const { habitId, date } = body;

  if (!habitId || !date) {
    return new Response(
      JSON.stringify({ error: "habitId and date are required" }),
      { status: 400 }
    );
  }

  const habit = getHabitById(Number(habitId));
  if (!habit) {
    return new Response(
      JSON.stringify({ error: "Habit not found" }),
      { status: 404 }
    );
  }

  incrementHabit(Number(habitId), date, habit.maxPerDay);

  return new Response(
    JSON.stringify({ ok: true })
  );
};
