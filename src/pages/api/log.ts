// src/pages/api/log.ts

import type {APIRoute} from "astro"
import {incrementHabit}
from "../../lib/habits.service"

export const POST:APIRoute=
async ({request})=>{

const body=
await request.json()

incrementHabit(
body.habitId,
body.date,
body.maxPerDay
)

return new Response(
JSON.stringify({
ok:true
})
)

}