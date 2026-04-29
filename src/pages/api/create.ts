import type { APIRoute } from "astro";
import { createHabit } from "../../lib/habits.service";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const { name, color, maxPerDay } = body;

  if (!name || !color) {
    return new Response(
      JSON.stringify({ error: "name and color are required" }),
      { status: 400 }
    );
  }

  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));

  createHabit(name, color, max);

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 201 }
  );
};
