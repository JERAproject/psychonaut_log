import { useState, useEffect } from "react";

const API_BASE = "";

const COLORS = {
  violet: "#8b5cf6",
  cyan: "#00E5FF",
  green: "#32FF7E",
  pink: "#FF2D95",
  orange: "#FF7A00",
  yellow: "#FFD230",
  purple: "#A855F7",
};

function getARGDate() {
  const now = new Date();
  const argDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const offset = argDate.getTime() - now.getTime();
  return new Date(now.getTime() + offset);
}

function getWeekDays() {
  const today = getARGDate();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const days = [];
  const dayLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d,
      dateStr: d.toISOString().split("T")[0],
      label: dayLabels[i],
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      isFuture: d > today,
      isSaturday: d.getDay() === 6,
      isSunday: d.getDay() === 0,
    });
  }
  return days;
}

function getMonthDays(year, month) {
  const days = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = getARGDate();
  
  for (let i = 1; i <= lastDay; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateStr: d.toISOString().split("T")[0],
      dayNum: i,
      isToday: d.toDateString() === today.toDateString(),
      isFuture: d > today,
    });
  }
  return days;
}

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [allHabits, setAllHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("weekly");
  const [newHabit, setNewHabit] = useState("");
  const [habitColor, setHabitColor] = useState(COLORS.violet);
  const [saving, setSaving] = useState(null);
  const [userFilter, setUserFilter] = useState("all");
  const [users, setUsers] = useState([]);

  const weekDays = getWeekDays();
  const today = getARGDate();
  const monthDays = getMonthDays(today.getFullYear(), today.getMonth());

  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem("psy_user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch { return null; }
  }

  const currentUser = getCurrentUser();
  const canFilterUsers = currentUser?.role === "admin" || currentUser?.role === "psicologo";

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!canFilterUsers) {
      setHabits(allHabits);
      const logMap = {};
      allLogs.forEach(l => {
        if (!logMap[l.habitId]) logMap[l.habitId] = {};
        logMap[l.habitId][l.logDate] = l.count;
      });
      setLogs(logMap);
    } else if (users.length > 0) {
      if (userFilter === "all") {
        setHabits(allHabits);
        const logMap = {};
        allLogs.forEach(l => {
          if (!logMap[l.habitId]) logMap[l.habitId] = {};
          logMap[l.habitId][l.logDate] = l.count;
        });
        setLogs(logMap);
      } else {
        const userId = parseInt(userFilter);
        const filteredHabits = allHabits.filter(h => h.user_id === userId);
        setHabits(filteredHabits);
        const filteredLogs = allLogs.filter(l => {
          const habit = allHabits.find(h => h.id === l.habitId);
          return habit && habit.user_id === userId;
        });
        const logMap = {};
        filteredLogs.forEach(l => {
          if (!logMap[l.habitId]) logMap[l.habitId] = {};
          logMap[l.habitId][l.logDate] = l.count;
        });
        setLogs(logMap);
      }
    }
  }, [userFilter, users, allHabits, allLogs, canFilterUsers]);

  function getAuthHeaders() {
    const token = localStorage.getItem("psy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadData() {
    try {
      const [habitsRes, logsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/habits`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/logs`, { headers: getAuthHeaders() }),
        canFilterUsers ? fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() }) : Promise.resolve({ json: () => [] }),
      ]);
      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();
      const usersData = canFilterUsers ? await usersRes.json() : [];
      
      setAllHabits(habitsData);
      setHabits(habitsData);
      setAllLogs(logsData);
      const logsMap = {};
      logsData.forEach((l) => {
        if (!logsMap[l.habitId]) logsMap[l.habitId] = {};
        logsMap[l.habitId][l.logDate] = l.count;
      });
      setLogs(logsMap);
      setUsers(usersData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit() {
    if (!newHabit.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
      const res = await fetch(`${API_BASE}/api/habits/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) loadData();
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  }

  async function toggleHabit(habitId, dateStr) {
    if (new Date(dateStr) > getARGDate()) return;
    setSaving(`${habitId}-${dateStr}`);
    const isCompleted = logs[habitId]?.[dateStr] > 0;
    try {
      if (isCompleted) {
        await fetch(`${API_BASE}/api/log`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ habitId, date: dateStr }),
        });
      } else {
        await fetch(`${API_BASE}/api/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ habitId, date: dateStr }),
        });
      }
      loadData();
    } catch (err) {
      console.error("Error toggling habit:", err);
    } finally {
      setSaving(null);
    }
  }

  const getStreak = (habitId) => {
    let streak = 0;
    const current = new Date(getARGDate());
    while (true) {
      const dateStr = current.toISOString().split("T")[0];
      if (logs[habitId]?.[dateStr] > 0) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getWeeklyStats = () => {
    let completed = 0;
    let total = 0;
    weekDays.forEach((day) => {
      if (!day.isFuture) {
        habits.forEach((habit) => {
          total++;
          if (logs[habit.id]?.[day.dateStr] > 0) completed++;
        });
      }
    });
    return { completed, total };
  };

  const getMonthlyCompletion = () => {
    const data = [];
    monthDays.forEach((day) => {
      if (!day.isFuture) {
        let completed = 0;
        habits.forEach((habit) => {
          if (logs[habit.id]?.[day.dateStr] > 0) completed++;
        });
        const rate = habits.length > 0 ? (completed / habits.length) * 100 : 0;
        data.push({ day: day.dayNum, rate: Math.round(rate), completed });
      }
    });
    return data;
  };

  if (loading) {
    return (
      <div className="ht-loading">
        <div className="ht-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  const monthlyData = getMonthlyCompletion();
  const maxRate = Math.max(...monthlyData.map((d) => d.rate), 1);

  return (
    <div className="habit-tracker">
      {canFilterUsers && (
        <div className="filter-bar">
          <label className="filter-label">Filtrar:</label>
          <select 
            className="user-filter-select" 
            value={userFilter} 
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <span className="entry-count">{habits.length} hábito{habits.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      <div className="ht-header">
        <div className="ht-tabs">
          <button className={`ht-tab ${view === "weekly" ? "active" : ""}`} onClick={() => setView("weekly")}>
            <span className="tab-icon">▦</span>
            Semanal
          </button>
          <button className={`ht-tab ${view === "monthly" ? "active" : ""}`} onClick={() => setView("monthly")}>
            <span className="tab-icon">▩</span>
            Mensual
          </button>
        </div>

        <div className="ht-creator">
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Nuevo hábito..."
            className="ht-input"
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
          />
          <input
            type="color"
            value={habitColor}
            onChange={(e) => setHabitColor(e.target.value)}
            className="ht-color-input"
          />
          <button className="ht-add-btn" onClick={addHabit} disabled={!newHabit.trim()}>
            +
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="ht-empty">
          <div className="empty-icon">📝</div>
          <p>No hay hábitos registrados</p>
          <span>Agrega uno para comenzar</span>
        </div>
      ) : view === "weekly" ? (
        <div className="ht-weekly">
          <div className="weekly-header">
            <h2>Grilla de Hábitos</h2>
            <span className="week-label">
              Semana {today.getDate() - today.getDay() + 1}/{today.getMonth() + 1} — {new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7).getDate()}/{today.getMonth() + 1}
            </span>
          </div>

          <div className="weekly-stats">
            <div className="stat-pill">
              <span className="stat-value">{getWeeklyStats().completed}</span>
              <span className="stat-divider">/</span>
              <span className="stat-total">{getWeeklyStats().total}</span>
              <span className="stat-label">completados</span>
            </div>
          </div>

          <div className="weekly-grid">
            {habits.length > 0 && (
              <div className="grid-legend">
                <span className="legend-title">Leyenda:</span>
                {habits.map((habit) => (
                  <div key={habit.id} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: habit.color }}></span>
                    <span className="legend-name">{habit.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid-container">
              <div className="grid-header">
                <div className="header-habit">Hábito</div>
                {weekDays.map((day) => (
                  <div key={day.dateStr} className={`header-day ${day.isToday ? "today" : ""} ${day.isSaturday || day.isSunday ? "weekend" : ""}`}>
                    <span className="day-label">{day.label}</span>
                    <span className="day-num">{day.dayNum}</span>
                  </div>
                ))}
              </div>

              <div className="grid-body">
                {habits.map((habit) => (
                  <div key={habit.id} className="grid-row">
                    <div className="row-habit">
                      <span className="habit-dot" style={{ backgroundColor: habit.color }}></span>
                      <span className="habit-name">{habit.name}</span>
                      <span className="habit-streak">{getStreak(habit.id)}🔥</span>
                      <button className="delete-btn" onClick={() => deleteHabit(habit.id)}>×</button>
                    </div>
                    {weekDays.map((day) => {
                      const isCompleted = logs[habit.id]?.[day.dateStr] > 0;
                      const isFuture = day.isFuture;
                      const isSaving = saving === `${habit.id}-${day.dateStr}`;

                      return (
                        <div
                          key={day.dateStr}
                          className={`grid-cell ${isCompleted ? "completed" : ""} ${isFuture ? "future" : ""} ${day.isSaturday || day.isSunday ? "weekend" : ""}`}
                          style={isCompleted ? { backgroundColor: habit.color, boxShadow: `0 0 18px ${habit.color}80` } : {}}
                          onClick={() => !isFuture && toggleHabit(habit.id, day.dateStr)}
                        >
                          {isSaving ? <div className="cell-spinner"></div> : isCompleted && <span className="check-icon">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ht-monthly">
          <div className="monthly-header">
            <h2>Mensual</h2>
            <span className="month-label">
              {today.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).charAt(0).toUpperCase() + today.toLocaleDateString("es-ES", { month: "long" }).slice(1)}
            </span>
          </div>

          <div className="monthly-chart">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="line-chart">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path
                d={`M ${monthlyData.map((d, i) => `${(i / (monthlyData.length - 1)) * 100} ${40 - (d.rate / 100) * 35}`).join(" L ")}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                className="chart-line"
              />
              <path
                d={`M ${monthlyData.map((d, i) => `${(i / (monthlyData.length - 1)) * 100} ${40 - (d.rate / 100) * 35}`).join(" L ")} L 100 40 L 0 40 Z`}
                fill="url(#lineGradient)"
                className="chart-fill"
              />
            </svg>
          </div>

          <div className="heatmap-container">
            <div className="heatmap-grid">
              {monthDays.map((day) => {
                const dayData = monthlyData.find((d) => d.day === day.dayNum);
                const completion = dayData?.completed || 0;
                const intensity = habits.length > 0 ? completion / habits.length : 0;

                return (
                  <div
                    key={day.dateStr}
                    className={`heat-cell ${day.isToday ? "today" : ""} ${day.isFuture ? "future" : ""}`}
                    style={{
                      backgroundColor: completion > 0 ? `rgba(139, 92, 246, ${0.3 + intensity * 0.7})` : "#090909",
                      boxShadow: completion > 0 ? `0 0 8px rgba(139, 92, 246, ${intensity})` : "none",
                    }}
                    title={`${day.dayNum}: ${completion}/${habits.length}`}
                  >
                    <span className="cell-num">{day.dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="monthly-legend">
            {habits.map((habit) => (
              <div key={habit.id} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: habit.color }}></span>
                <span className="legend-name">{habit.name}</span>
                <span className="legend-streak">{getStreak(habit.id)} días</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .habit-tracker {
          --bg: #050505;
          --surface: #0D0D0F;
          --surface-secondary: #111114;
          --border: rgba(255,255,255,0.06);
          --text-primary: #FFFFFF;
          --text-secondary: rgba(255,255,255,0.55);
          --grid-empty: #121212;
          --grid-stroke: rgba(255,255,255,0.08);
          --neon-violet: #8b5cf6;
          --neon-cyan: #00E5FF;
          --neon-green: #32FF7E;
          --neon-purple: #A855F7;
          
          width: 100%;
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
        }

        .ht-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .ht-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid var(--grid-stroke);
          border-top-color: var(--neon-violet);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--border);
        }

        .filter-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .user-filter-select {
          padding: 0.4rem 0.75rem;
          background: var(--surface-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.8rem;
        }

        .user-filter-select:focus {
          outline: none;
          border-color: var(--neon-violet);
        }

        .entry-count {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-left: auto;
        }

        .ht-header {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%);
          border-bottom: 1px solid var(--border);
        }

        .ht-tabs {
          display: flex;
          gap: 0.25rem;
          background: var(--surface-secondary);
          padding: 4px;
          border-radius: 10px;
        }

        .ht-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ht-tab:hover {
          color: var(--text-primary);
        }

        .ht-tab.active {
          background: var(--neon-violet);
          color: white;
          box-shadow: 0 0 15px rgba(255,23,68,0.4);
        }

        .tab-icon {
          font-size: 1rem;
        }

        .ht-creator {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .ht-input {
          padding: 0.5rem 0.75rem;
          background: var(--surface-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.85rem;
          width: 150px;
        }

        .ht-input:focus {
          outline: none;
          border-color: var(--neon-violet);
        }

        .ht-input::placeholder {
          color: var(--text-secondary);
        }

        .ht-color-input {
          width: 32px;
          height: 32px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          padding: 2px;
        }

        .ht-add-btn {
          width: 32px;
          height: 32px;
          background: var(--neon-violet);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 1.25rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ht-add-btn:hover:not(:disabled) {
          box-shadow: 0 0 12px rgba(255,23,68,0.5);
          transform: scale(1.05);
        }

        .ht-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ht-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .ht-empty .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .ht-empty p {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0 0 0.25rem;
        }

        .ht-empty span {
          font-size: 0.8rem;
        }

        /* Weekly View */
        .ht-weekly {
          padding: 1rem;
        }

        .weekly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .weekly-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .week-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .weekly-stats {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(255,23,68,0.1);
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          border: 1px solid rgba(255,23,68,0.2);
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--neon-violet);
        }

        .stat-divider {
          color: var(--text-secondary);
        }

        .stat-total {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .weekly-grid {
          background: var(--surface-secondary);
          border-radius: 14px;
          border: 1px solid var(--border);
          overflow: hidden;
        }

        .grid-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.4);
          border-bottom: 1px solid var(--border);
        }

        .legend-title {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
          margin-right: 0.5rem;
        }

        .grid-legend .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .grid-legend .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .grid-legend .legend-name {
          font-size: 0.7rem;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .grid-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: var(--neon-violet) var(--surface);
        }

        .grid-container::-webkit-scrollbar {
          height: 6px;
        }

        .grid-container::-webkit-scrollbar-track {
          background: var(--surface);
        }

        .grid-container::-webkit-scrollbar-thumb {
          background: var(--neon-violet);
          border-radius: 3px;
        }

        .grid-header {
          display: grid;
          grid-template-columns: minmax(90px, 1.5fr) repeat(7, minmax(38px, 1fr));
          gap: 4px;
          padding: 0.6rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--border);
          min-width: 450px;
        }

        .header-habit {
          font-size: 0.65rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
        }

        .header-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.1rem;
          position: relative;
        }

        .header-day.today {
          color: var(--neon-violet);
        }

        .header-day.weekend {
          color: var(--neon-cyan);
        }

        .header-day.weekend::after {
          content: "★";
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.4rem;
          color: var(--neon-cyan);
          opacity: 0.8;
        }

        .header-day .day-label {
          font-size: 0.5rem;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
        }

        .header-day .day-num {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .header-day.today .day-num {
          color: var(--neon-violet);
        }

        .grid-body {
          padding: 0.4rem;
          min-width: 450px;
        }

        .grid-row {
          display: grid;
          grid-template-columns: minmax(90px, 1.5fr) repeat(7, minmax(38px, 1fr));
          gap: 4px;
          margin-bottom: 6px;
          align-items: center;
        }

        .grid-row:last-child {
          margin-bottom: 0;
        }

        .row-habit {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.2rem 0.4rem;
          min-width: 0;
        }

        .habit-dot {
          width: 6px;
          height: 6px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .habit-name {
          font-size: 0.7rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1 1 0;
        }

        .habit-streak {
          font-size: 0.6rem;
          color: var(--text-secondary);
          flex-shrink: 0;
          padding: 0 0.25rem;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 1rem;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
          padding: 0.25rem;
          flex-shrink: 0;
        }

        .grid-row:hover .delete-btn {
          opacity: 0.5;
        }

        .delete-btn:hover {
          opacity: 1 !important;
          color: #ef4444;
        }

        .grid-cell {
          width: 100%;
          min-width: 38px;
          aspect-ratio: 1;
          border-radius: 10px;
          background: var(--grid-empty);
          border: 1px solid var(--grid-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .grid-cell:hover:not(.future) {
          transform: scale(1.05);
          filter: brightness(1.1);
        }

        .grid-cell.future {
          opacity: 0.35;
          cursor: not-allowed;
          border-style: dashed;
        }

        .grid-cell.weekend {
          border-color: rgba(0,229,255,0.2);
          background: linear-gradient(135deg, rgba(0,229,255,0.05) 0%, transparent 100%);
        }

        .grid-cell.weekend:hover:not(.completed):not(.future) {
          background: linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,229,255,0.05) 100%);
          border-color: rgba(0,229,255,0.4);
        }

        .grid-cell.weekend.completed {
          border-color: transparent;
        }

        .grid-cell.completed {
          border-color: transparent;
        }

        .grid-cell.weekend.completed .check-icon {
          color: #fff;
        }

        .check-icon {
          color: white;
          font-size: 0.9rem;
          font-weight: bold;
          max-width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cell-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* Monthly View */
        .ht-monthly {
          padding: 1rem;
        }

        .monthly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .monthly-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .month-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .monthly-chart {
          height: 100px;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid var(--border);
        }

        .line-chart {
          width: 100%;
          height: 100%;
        }

        .chart-line {
          filter: drop-shadow(0 0 4px rgba(255,23,68,0.8));
        }

        .chart-fill {
          opacity: 0.6;
        }

        .heatmap-container {
          margin-bottom: 1rem;
        }

        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 5px;
        }

        .heat-cell {
          aspect-ratio: 1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          position: relative;
        }

        .heat-cell.today {
          border-color: var(--neon-violet);
          box-shadow: 0 0 10px rgba(255,23,68,0.5);
        }

        .heat-cell.future {
          opacity: 0.25;
        }

        .cell-num {
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .heat-cell.today .cell-num {
          color: var(--neon-violet);
        }

        .monthly-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          background: var(--surface-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
        }

        .legend-name {
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .legend-streak {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

@media (max-width: 640px) {
          .ht-header {
            flex-direction: column;
            align-items: stretch;
          }

          .ht-tabs {
            justify-content: center;
          }

          .ht-creator {
            justify-content: center;
          }

          .ht-input {
            width: 100%;
          }

          .grid-legend {
            padding: 0.6rem;
            gap: 0.5rem;
          }

          .legend-title {
            width: 100%;
            margin-bottom: 0.25rem;
          }

          .grid-legend .legend-item {
            flex: 0 0 auto;
          }

          .grid-legend .legend-name {
            font-size: 0.65rem;
          }

          .grid-header,
          .grid-row {
            grid-template-columns: 4rem repeat(7, 2rem);
            gap: 0.125rem;
          }

          .grid-container,
          .grid-body {
            min-width: auto;
            width: 100%;
          }

          .grid-cell {
            width: 2rem;
            min-width: 2rem;
            height: 2rem;
            border-radius: 0.25rem;
          }

          .header-day {
            padding: 0;
          }

          .header-day .day-num {
            font-size: 0.6rem;
          }

          .header-day .day-label {
            font-size: 0.4rem;
          }

          .header-habit {
            font-size: 0.5rem;
          }

          .habit-name {
            font-size: 0.55rem;
            max-width: 2.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .check-icon {
            font-size: 0.9rem;
          }

          .grid-cell.weekend.completed {
            box-shadow: 0 0 6px var(--neon-cyan);
          }

          .heatmap-grid {
            gap: 0.125rem;
          }

          .header-day.weekend::after {
            display: none;
          }

          .row-habit {
            padding: 0.125rem;
            gap: 0.25rem;
          }

          .habit-dot {
            width: 0.4rem;
            height: 0.4rem;
          }

          .habit-streak {
            font-size: 0.45rem;
          }

          .delete-btn {
            width: 0.875rem;
            height: 0.875rem;
            font-size: 0.65rem;
          }
        }

        @media (min-width: 1024px) {
          .grid-header {
            grid-template-columns: minmax(140px, 1fr) repeat(7, 52px);
            gap: 8px;
            padding: 1rem;
          }

          .grid-row {
            grid-template-columns: minmax(140px, 1fr) repeat(7, 52px);
            gap: 8px;
          }

          .grid-cell {
            min-width: 52px;
            border-radius: 12px;
          }

          .habit-name {
            font-size: 0.85rem;
          }

          .header-day .day-num {
            font-size: 1rem;
          }

          .check-icon {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}