export const DAYS_BACK=90;

export function
getDatesArray(){

const dates=[]

const today=
new Date()

for(
let i=
DAYS_BACK-1;
i>=0;
i--
){

const d=
new Date(today)

d.setDate(
today.getDate()-i
)

dates.push(
d.toISOString()
.split("T")[0]
)

}

return dates

}