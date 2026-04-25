import db from "./db";
import type { Habit }
from "../types/habit";

export function getHabits():Habit[]{

return db.prepare(`
SELECT
id,
name,
color,
max_per_day as maxPerDay
FROM habits
`).all() as Habit[];

}


export function incrementHabit(
habitId:number,
date:string,
max:number
){

db.prepare(`
INSERT INTO habit_logs(
 habit_id,
 log_date,
 count
)

VALUES(
 ?,?,1
)

ON CONFLICT(
 habit_id,
 log_date
)

DO UPDATE SET count=

CASE

WHEN count >= ?
THEN 0

ELSE count+1

END
`)
.run(
habitId,
date,
max
)

}
