import { useState, useEffect } from 'react';

const API_BASE = '';

function getARGDate() {
  const now = new Date();
  const argDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const offset = argDate.getTime() - now.getTime();
  return new Date(now.getTime() + offset);
}

export default function HabitCalendar() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  function getAuthHeaders() {
    const token = localStorage.getItem("psy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadData() {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/habits`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/logs`, { headers: getAuthHeaders() })
      ]);
      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();
      setHabits(habitsData);
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="calendar-loading">Cargando calendario...</div>;
  }

  const today = getARGDate();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const dailyTotals = {};
  logs.forEach(l => {
    dailyTotals[l.logDate] = (dailyTotals[l.logDate] || 0) + l.count;
  });
  const maxTotal = habits.reduce((s, h) => s + h.maxPerDay, 0) || 1;

  const months = [];
  for (let mi = 0; mi <= 2; mi++) {
    const d = new Date(today.getFullYear(), today.getMonth() - mi, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startOffset = new Date(year, month, 1).getDay() - 1;
    const offset = startOffset < 0 ? 6 : startOffset;
    
    months.push({ year, month, lastDay, offset });
  }

  return (
    <div className="calendar-container">
      {months.map(({ year, month, lastDay, offset }, mi) => (
        <div key={`${year}-${month}`} className="calendar-month">
          <h3 className="month-title">{monthNames[month]} {year}</h3>
          <div className="calendar-grid">
            {dayNames.map(dn => (
              <div key={dn} className="day-header">{dn}</div>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" />
            ))}
            {Array.from({ length: lastDay }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day).toISOString().split('T')[0];
              const isToday = date === getARGDate().toISOString().split('T')[0];
              const total = dailyTotals[date] || 0;
              const intensity = total > 0 ? Math.min(total / maxTotal, 1) : 0;
              
              return (
                <div 
                  key={day} 
                  className={`calendar-day ${isToday ? 'today' : ''}`}
                  data-date={date}
                  style={intensity > 0 ? { backgroundColor: `rgba(91, 143, 249, ${intensity})` } : {}}
                >
                  <span className="day-number">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <style>{`
        .calendar-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .calendar-month {
          margin-bottom: 0;
        }
        .month-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e5e7eb;
          margin: 0 0 1rem;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .day-header {
          font-size: 0.7rem;
          font-weight: 600;
          color: #6b7280;
          text-align: center;
          padding: 0.5rem;
        }
        .calendar-day {
          aspect-ratio: 1;
          background: #111827;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .calendar-day.today {
          border: 2px solid #5b8ff9;
        }
        .calendar-day.empty {
          background: transparent;
        }
        .calendar-loading {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}