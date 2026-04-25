export interface Habit {
 id:number
 name:string
 color:string
 maxPerDay:number
}

export interface HabitLog {
 habitId:number
 logDate:string
 count:number
}