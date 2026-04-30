import { useState, useEffect } from "react";

function getTimeInArgentina() {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const offset = argentinaTime.getTime() - now.getTime();
  return new Date(now.getTime() + offset);
}

function formatDateArgentina(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getWeekDays() {
  const days = [];
  const today = getTimeInArgentina();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      date: d,
      dateStr: d.toISOString().split("T")[0],
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      isToday: i === 0,
    });
  }
  return days;
}

export default function HabitDashboard() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [observations, setObservations] = useState({});
  const [newHabit, setNewHabit] = useState("");
  const [habitColor, setHabitColor] = useState("#8b5cf6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showObsModal, setShowObsModal] = useState(null);
  const [obsText, setObsText] = useState("");
  const weekDays = getWeekDays();

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

  async function toggleHabit(habitId, dateStr) {
    setSaving(`${habitId}-${dateStr}`);
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: dateStr }),
      });
      
      const isCompleted = logs[habitId]?.[dateStr] > 0;
      
      if (!isCompleted) {
        setShowObsModal({ habitId, dateStr });
        setObsText(observations[`${habitId}-${dateStr}`] || "");
      } else {
        loadData();
      }
    } catch (err) {
      console.error("Error toggling habit:", err);
    } finally {
      setSaving(null);
    }
  }

  async function saveObservation() {
    if (!showObsModal) return;
    
    const key = `${showObsModal.habitId}-${showObsModal.dateStr}`;
    setObservations((prev) => ({ ...prev, [key]: obsText }));
    
    setShowObsModal(null);
    setObsText("");
    loadData();
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando hábitos...</p>
      </div>
    );
  }

  return (
    <div className="habit-dashboard">
      <div className="creator-card">
        <div className="creator-inputs">
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Nuevo hábito..."
            aria-label="Nombre del nuevo hábito"
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
          />
          <input
            type="color"
            value={habitColor}
            onChange={(e) => setHabitColor(e.target.value)}
            aria-label="Color del hábito"
            title="Elegir color"
          />
        </div>
        <button className="add-btn" onClick={addHabit} disabled={!newHabit.trim()}>
          <span className="btn-icon">+</span>
          <span className="btn-text">Agregar</span>
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p className="empty-title">No hay hábitos registrados</p>
          <p className="empty-subtitle">Crea uno para empezar tu seguimiento</p>
        </div>
      ) : (
        <div className="days-container">
          {weekDays.map((day) => (
            <div key={day.dateStr} className={`day-card ${day.isToday ? "today" : ""}`}>
              <div className="day-header">
                <span className="day-label">{day.isToday ? "Hoy" : day.dayName}</span>
                <span className="day-date">{formatDateArgentina(day.date)}</span>
              </div>
              
              <div className="habits-list">
                {habits.map((habit) => {
                  const count = logs[habit.id]?.[day.dateStr] || 0;
                  const isCompleted = count > 0;
                  const obs = observations[`${habit.id}-${day.dateStr}`];
                  const isSaving = saving === `${habit.id}-${day.dateStr}`;
                  
                  return (
                    <div key={habit.id} className={`habit-item ${isCompleted ? "completed" : ""}`}>
                      <div className="habit-main">
                        <button
                          className={`check-btn ${isCompleted ? "checked" : ""}`}
                          style={isCompleted ? { backgroundColor: habit.color, borderColor: habit.color } : {}}
                          onClick={() => toggleHabit(habit.id, day.dateStr)}
                          disabled={isSaving}
                          aria-label={isCompleted ? "Desmarcar" : "Completar"}
                        >
                          {isSaving ? (
                            <span className="spinner"></span>
                          ) : isCompleted ? (
                            <span className="check-mark">✓</span>
                          ) : null}
                        </button>
                        <div className="habit-info">
                          <span className="habit-name" style={{ color: isCompleted ? "#fff" : "#e5e7eb" }}>
                            {habit.name}
                          </span>
                          {obs && (
                            <span className="habit-obs">"{obs}"</span>
                          )}
                        </div>
                        <button
                          className="delete-habit-btn"
                          onClick={() => deleteHabit(habit.id)}
                          aria-label={`Eliminar ${habit.name}`}
                          title="Eliminar hábito"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showObsModal && (
        <div className="modal-overlay" onClick={() => setShowObsModal(null)}>
          <div className="obs-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">¿Qué sentías o pensabas antes de hacerlo?</h3>
            <p className="modal-subtitle">Una nota breve sobre tu estado mental o emocional</p>
            <textarea
              className="obs-input"
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Ej: Estaba ansioso, necesitaba relajarme..."
              rows={4}
              autoFocus
            />
            <div className="modal-actions">
              <button className="skip-btn" onClick={() => { setShowObsModal(null); loadData(); }}>
                Omitir
              </button>
              <button className="save-btn" onClick={saveObservation}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .habit-dashboard {
          width: 100%;
          padding: 0.5rem 0;
        }

        .dashboard-loading {
          text-align: center;
          padding: 3rem;
          color: #888;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #2a2a35;
          border-top-color: #5b8ff9;
          border-radius: 50%;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .creator-card {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: linear-gradient(145deg, #1a1a2e, #16162a);
          border-radius: 16px;
          border: 1px solid #2a2a35;
          flex-wrap: wrap;
        }

        .creator-inputs {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          min-width: 200px;
        }

        .creator-inputs input[type="text"] {
          flex: 1;
          min-width: 120px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #2a2a35;
          background: #0d0d1a;
          color: #fff;
          font-size: 0.95rem;
        }

        .creator-inputs input[type="text"]:focus {
          outline: none;
          border-color: #5b8ff9;
        }

        .creator-inputs input[type="color"] {
          width: 48px;
          height: 48px;
          border: 1px solid #2a2a35;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          padding: 2px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 1.25rem;
          font-weight: bold;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          background: linear-gradient(145deg, #1a1a2e, #16162a);
          border-radius: 16px;
          border: 1px dashed #2a2a35;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #e5e7eb;
          margin: 0 0 0.5rem;
        }

        .empty-subtitle {
          color: #6b7280;
          margin: 0;
        }

        .days-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .day-card {
          background: linear-gradient(145deg, #16162a 0%, #1a1a2e 100%);
          border-radius: 16px;
          border: 1px solid #2a2a35;
          overflow: hidden;
          transition: all 0.3s;
        }

        .day-card.today {
          border-color: #5b8ff9;
          box-shadow: 0 0 20px rgba(91, 143, 249, 0.15);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid #252540;
        }

        .day-label {
          font-size: 1rem;
          font-weight: 700;
          color: #e5e7eb;
        }

        .day-card.today .day-label {
          color: #5b8ff9;
        }

        .day-date {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }

        .habits-list {
          padding: 0.5rem;
        }

        .habit-item {
          border-radius: 12px;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
        }

        .habit-item:last-child {
          margin-bottom: 0;
        }

        .habit-item:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .habit-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
        }

        .check-btn {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 10px;
          border: 2px solid #3a3a50;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: bold;
          color: white;
        }

        .check-btn:hover:not(:disabled) {
          transform: scale(1.1);
          border-color: #5b8ff9;
        }

        .check-btn.checked {
          border-color: transparent;
        }

        .check-mark {
          font-size: 1.1rem;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .habit-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }

        .habit-name {
          font-size: 0.95rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .habit-obs {
          font-size: 0.8rem;
          color: #9ca3af;
          font-style: italic;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .delete-habit-btn {
          background: transparent;
          border: none;
          color: #4b5563;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          opacity: 0;
          transition: all 0.2s;
        }

        .habit-item:hover .delete-habit-btn {
          opacity: 1;
        }

        .delete-habit-btn:hover {
          background: #dc2626;
          color: white;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }

        .obs-modal {
          background: linear-gradient(145deg, #1a1a2e, #16162a);
          border: 1px solid #2a2a35;
          border-radius: 20px;
          padding: 1.75rem;
          width: 100%;
          max-width: 400px;
        }

        .modal-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: #fff;
          margin: 0 0 0.5rem;
        }

        .modal-subtitle {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0 0 1.25rem;
        }

        .obs-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          border: 1px solid #2a2a35;
          background: #0d0d1a;
          color: #fff;
          font-size: 0.95rem;
          resize: vertical;
          min-height: 80px;
          margin-bottom: 1rem;
        }

        .obs-input:focus {
          outline: none;
          border-color: #5b8ff9;
        }

        .obs-input::placeholder {
          color: #4b5563;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .skip-btn {
          background: transparent;
          border: 1px solid #3a3a50;
          color: #9ca3af;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .skip-btn:hover {
          border-color: #4b5563;
          color: #d1d5db;
        }

        .save-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        @media (max-width: 640px) {
          .creator-card {
            flex-direction: column;
          }
          
          .creator-inputs {
            width: 100%;
          }
          
          .add-btn {
            width: 100%;
            justify-content: center;
          }

          .day-header {
            padding: 0.875rem 1rem;
          }

          .check-btn {
            width: 32px;
            height: 32px;
            min-width: 32px;
          }
        }
      `}</style>
    </div>
  );
}