import {useState} from "react";

const days = Array.from({length:30}, (_,i)=> i+1);

export default function HabitDashboard(){

const [habits,setHabits]=useState([
{
id:1,
name:"Meditar",
color:"#34d399",
logs:{1:1,2:3,4:2}
},
{
id:2,
name:"Leer",
color:"#60a5fa",
logs:{1:2,3:1}
}
]);

const [newHabit,setNewHabit]=useState("");
const [habitColor,setHabitColor]=useState("#8b5cf6");


function addHabit(){

if(!newHabit.trim()) return;

setHabits([
...habits,
{
id:Date.now(),
name:newHabit,
color:habitColor,
logs:{}
}
]);

setNewHabit("");
}


function incrementHabit(habitId,day){

setHabits(
habits.map(h=>
h.id===habitId
?{
...h,
logs:{
...h.logs,
[day]:(h.logs[day]||0)+1
}
}
:h
)
)

}


function intensity(base,count){
let opacity=Math.min(count*.2,.95);

return `${base}${Math.floor(opacity*255)
.toString(16)
.padStart(2,"0")}`;
}


return(
<div>

<div className="creator">
<input
value={newHabit}
onChange={e=>setNewHabit(e.target.value)}
placeholder="Nuevo hábito"
/>

<input
type="color"
value={habitColor}
onChange={e=>setHabitColor(e.target.value)}
/>

<button onClick={addHabit}>
Agregar
</button>
</div>


<div className="dashboard">

{habits.map(habit=>(
<div key={habit.id} className="row">

<div className="label">
<h3>{habit.name}</h3>
</div>

<div className="grid">

{days.map(day=>{

const count=habit.logs[day]||0

return(
<button
key={day}
className="cell"
style={{
background:
count
? intensity(habit.color,count)
:"#111827"
}}
onClick={()=>incrementHabit(habit.id,day)}
title={`${count} repeticiones`}
>
{count || ""}
</button>
)

})}

</div>

</div>
))}

</div>

<style>{`

.creator{
display:flex;
gap:1rem;
margin-bottom:2rem;
flex-wrap:wrap;
}

input{
padding:.8rem 1rem;
border-radius:12px;
border:1px solid #333;
background:#111827;
color:white;
}

button{
cursor:pointer;
}

.creator button{
background:#2563eb;
color:white;
border:none;
padding:.8rem 1.3rem;
border-radius:12px;
}

.row{
margin-bottom:2rem;
}

.label h3{
margin-bottom:1rem;
}

.grid{
display:grid;
grid-template-columns:repeat(10,1fr);
gap:.5rem;
}

.cell{
height:48px;
border:none;
border-radius:10px;
color:white;
font-weight:bold;
}

.cell:hover{
transform:scale(1.05);
}

`}</style>

</div>
)

}