import { useState, useEffect } from "react";

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return d.getDate();
});

function getMonthLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("es-ES", { month: "short" });
}

export default function HabitDashboard() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [newHabit, setNewHabit] = useState("");
  const [habitColor, setHabitColor] = useState("#8b5cf6");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/logs"),
      ]);
      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();
      setHabits(habitsData);

      const logsMap = {};
      logsData.forEach((l) => {
        if (!logsMap[l.habitId]) logsMap[l.habitId] = {};
        logsMap[l.habitId][l.logDate] = l.count;
      });
      setLogs(logsMap);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit() {
    if (!newHabit.trim()) return;
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHabit, color: habitColor, maxPerDay: 1 }),
      });
      if (res.ok) {
        setNewHabit("");
        loadData();
      }
    } catch (err) {
      console.error("Error adding habit:", err);
    }
  }

  async function deleteHabit(id) {
    if (!confirm("¿Eliminar este hábito?")) return;
    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  }

  async function incrementHabit(habitId, dayOffset) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - dayOffset));
    const dateStr = d.toISOString().split("T")[0];

    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: dateStr }),
      });
      loadData();
    } catch (err) {
      console.error("Error incrementing:", err);
    }
  }

  function intensity(base, count) {
    const opacity = Math.min(count * 0.25, 0.9);
    const r = parseInt(base.slice(1, 3), 16);
    const g = parseInt(base.slice(3, 5), 16);
    const b = parseInt(base.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Cargando hábitos...</p>
      </div>
    );
  }

  return (
    <div className="habit-dashboard">
      <div className="creator">
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Nuevo hábito"
          aria-label="Nombre del nuevo hábito"
        />
        <input
          type="color"
          value={habitColor}
          onChange={(e) => setHabitColor(e.target.value)}
          aria-label="Color del hábito"
        />
        <button onClick={addHabit} aria-label="Agregar hábito">
          Agregar
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <p>No hay hábitos registrados.</p>
          <p>Crea uno para empezar a hacer seguimiento.</p>
        </div>
      ) : (
        <div className="dashboard">
          {habits.map((habit) => (
            <div key={habit.id} className="habit-row">
              <div className="habit-header">
                <div className="habit-label">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: habit.color }}
                  />
                  <h3>{habit.name}</h3>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => deleteHabit(habit.id)}
                  aria-label={`Eliminar hábito ${habit.name}`}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
              <div className="grid" role="grid" aria-label={`Seguimiento de ${habit.name}`}>
                {days.map((day, idx) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (29 - idx));
                  const dateStr = d.toISOString().split("T")[0];
                  const count = logs[habit.id]?.[dateStr] || 0;

                  return (
                    <button
                      key={idx}
                      className="cell"
                      style={{
                        background: count ? intensity(habit.color, count) : "#111827",
                      }}
                      onClick={() => incrementHabit(habit.id, idx)}
                      title={`${dateStr}: ${count} veces`}
                      aria-label={`${day}: ${count} repeticiones`}
                    >
                      {count > 0 ? count : ""}
                    </button>
                  );
                })}
              </div>
              <div className="day-labels">
                {[0, 9, 19, 29].map((i) => (
                  <span key={i} className="month-label">
                    {getMonthLabel(29 - i)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .habit-dashboard {
          width: 100%;
          overflow-x: auto;
          padding: 1rem 0;
        }

        .dashboard-loading {
          text-align: center;
          padding: 2rem;
          color: #888;
        }

        .creator {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .creator input[type="text"] {
          flex: 1;
          min-width: 150px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #333;
          background: #111827;
          color: white;
          font-size: 0.95rem;
        }

        .creator input[type="color"] {
          width: 50px;
          height: 45px;
          border: 1px solid #333;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          padding: 2px;
        }

        .creator button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .creator button:hover {
          background: #1d4ed8;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          background: #111827;
          border-radius: 12px;
          border: 1px dashed #333;
          color: #888;
        }

        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .habit-row {
          background: #111827;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #2a2a35;
        }

        .habit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .habit-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .habit-label h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #fafafa;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #666;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          line-height: 1;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background: #e03131;
          color: white;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(30, 1fr);
          gap: 3px;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: repeat(10, 1fr);
          }
        }

        .cell {
          aspect-ratio: 1;
          min-width: 20px;
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 0.65rem;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .cell:hover {
          transform: scale(1.1);
        }

        .day-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding: 0 2px;
        }

        .month-label {
          font-size: 0.7rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}