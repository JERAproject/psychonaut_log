import { useState, useEffect } from "react";
import { render3DChart } from "./Chart3D.jsx";

const API_BASE = "";

const COLORS = {
  violet: "#8b5cf6",
  cyan: "#00E5FF",
  green: "#32FF7E",
  pink: "#FF2D95",
  orange: "#FF7A00",
  yellow: "#FFD230",
  blue: "#3B82F6",
};

const PRACTICE_COLORS = {
  mindfulness: "#8b5cf6",
  meditacion: "#3B82F6",
  visualizacion: "#FF2D95",
  respiracion: "#32FF7E",
  hypnosis: "#FF7A00",
  default: "#8b5cf6",
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
  const dayLabels = ["LUN", "MAR", "Mié", "JUE", "VIE", "SÁB", "DOM"];
  
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

function getPracticeColor(practiceSlug) {
  const key = Object.keys(PRACTICE_COLORS).find(k => practiceSlug?.includes(k));
  return PRACTICE_COLORS[key || "default"];
}

export default function JournalGrid({ 
  externalUsers = [], 
  externalUserFilter = "all", 
  externalSetUserFilter = null,
  externalCanFilterUsers = false 
}) {
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [practices, setPractices] = useState([]);
  const [users, setUsers] = useState(externalUsers);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("weekly");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [internalUserFilter, setInternalUserFilter] = useState("all");
  
  const userFilter = externalSetUserFilter ? externalUserFilter : internalUserFilter;
  const setUserFilter = externalSetUserFilter || setInternalUserFilter;

  const weekDays = getWeekDays();
  const today = getARGDate();

  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem("psy_user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch { return null; }
  }

  const currentUser = getCurrentUser();
  const isExternalUsers = externalUsers.length > 0;
  const canFilterUsers = externalCanFilterUsers || (currentUser?.role === "admin" || currentUser?.role === "psicologo");
  
  console.log("DEBUG JournalGrid - Props:", { 
    externalUsersCount: externalUsers.length, 
    externalUserFilter, 
    externalCanFilterUsers, 
    currentUserRole: currentUser?.role,
    canFilterUsers 
  });
  console.log("DEBUG JournalGrid - users state:", users.length, users);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!canFilterUsers) {
      setEntries(allEntries);
    } else if (users.length > 0) {
      if (userFilter === "all") {
        setEntries(allEntries);
      } else {
        setEntries(allEntries.filter(e => e.user_id === parseInt(userFilter)));
      }
    }
  }, [userFilter, users, allEntries, canFilterUsers]);

  function getAuthHeaders() {
    const token = localStorage.getItem("psy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadData() {
    try {
      const fetchUsers = !isExternalUsers && canFilterUsers;
      const [entriesRes, practicesRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/journal`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/practices`, { headers: getAuthHeaders() }),
        fetchUsers ? fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() }) : Promise.resolve({ json: () => [] }),
      ]);
      const entriesData = await entriesRes.json();
      const practicesData = await practicesRes.json();
      const usersData = fetchUsers ? await usersRes.json() : [];
      
      setAllEntries(entriesData);
      setEntries(entriesData);
      setPractices(practicesData);
      if (!isExternalUsers) setUsers(usersData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id) {
    if (!confirm("¿Eliminar esta entrada?")) return;
    try {
      await fetch(`${API_BASE}/api/journal/${id}`, { 
        method: "DELETE", 
        headers: getAuthHeaders() 
      });
      loadData();
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  }

  const getEntriesByDate = () => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.fecha]) map[e.fecha] = [];
      map[e.fecha].push(e);
    });
    return map;
  };

  const getWeeklyStats = () => {
    let completed = 0;
    let total = 0;
    weekDays.forEach((day) => {
      if (!day.isFuture && entries.find(e => e.fecha === day.dateStr)) {
        completed++;
      }
      if (!day.isFuture) total++;
    });
    return { completed, total };
  };

  const getPracticeLabel = (slug) => {
    const practice = practices.find(p => p.slug === slug);
    return practice?.label || slug || "Práctica";
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    return `${h}:${m}`;
  };

  if (loading) {
    return (
      <div className="jg-loading">
        <div className="jg-spinner"></div>
        <p>Cargando bitácora...</p>
      </div>
    );
  }

  const entriesMap = getEntriesByDate();

  return (
    <div className="journal-grid">
      <div className="chart-section">
        <div className="chart-header-row">
          <div className="chart-title-group">
            <h3 className="chart-title">Patrones Energy × Valence</h3>
            <p className="chart-subtitle">Evolución de tus sesiones</p>
          </div>
          {canFilterUsers && users.length > 0 && (
            <div className="chart-user-filter">
              <select 
                className="chart-user-select" 
                value={userFilter} 
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div 
          className="journal-chart"
          dangerouslySetInnerHTML={{ __html: render3DChart(entries) }}
        />
        <div className="chart-legend">
          <span className="legend-item"><span className="dot pre"></span> Pre-práctica</span>
          <span className="legend-item"><span className="dot post"></span> Post-práctica</span>
        </div>
      </div>

      <div className="filter-bar">
      </div>

      <div className="jg-header">
        <div className="jg-tabs">
          <button className={`jg-tab ${view === "weekly" ? "active" : ""}`} onClick={() => setView("weekly")}>
            <span className="tab-icon">▦</span>
            Semanal
          </button>
          <button className={`jg-tab ${view === "monthly" ? "active" : ""}`} onClick={() => setView("monthly")}>
            <span className="tab-icon">▩</span>
            Mensual
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="jg-empty">
          <div className="empty-icon">📓</div>
          <p>No hay entradas en la bitácora</p>
          <span>Registra tu primera práctica</span>
        </div>
      ) : view === "weekly" ? (
        <div className="jg-weekly">
          <div className="weekly-header">
            <h2>Grilla de Entradas</h2>
            <span className="week-label">
              Semana {today.getDate() - today.getDay() + 1}/{today.getMonth() + 1} — {new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7).getDate()}/{today.getMonth() + 1}
            </span>
          </div>

          <div className="weekly-stats">
            <div className="stat-pill">
              <span className="stat-value">{getWeeklyStats().completed}</span>
              <span className="stat-divider">/</span>
              <span className="stat-total">{getWeeklyStats().total}</span>
              <span className="stat-label">días con práctica</span>
            </div>
          </div>

          <div className="weekly-grid">
            <div className="jg-grid-container">
              <div className="grid-header">
                <div className="header-practice">Práctica</div>
                {weekDays.map((day) => (
                  <div key={day.dateStr} className={`header-day ${day.isToday ? "today" : ""} ${day.isSaturday || day.isSunday ? "weekend" : ""}`}>
                    <span className="day-label">{day.label}</span>
                    <span className="day-num">{day.dayNum}</span>
                  </div>
                ))}
              </div>

              <div className="grid-body">
                {practices.slice(0, 6).map((practice) => {
                  const practiceEntries = entries.filter(e => e.tipo_practica === practice.slug);
                  return (
                    <div key={practice.slug} className="grid-row">
                      <div className="row-practice">
                        <span className="practice-dot" style={{ backgroundColor: getPracticeColor(practice.slug) }}></span>
                        <span className="practice-name">{practice.label}</span>
                      </div>
                      {weekDays.map((day) => {
                        const dayEntries = practiceEntries.filter(e => e.fecha === day.dateStr);
                        const hasEntry = dayEntries.length > 0;
                        const isFuture = day.isFuture;
                        const primaryEntry = dayEntries[0];
                        const practiceColor = getPracticeColor(practice.slug);

                        return (
                          <div
                            key={day.dateStr}
                            className={`grid-cell ${hasEntry ? "completed" : ""} ${isFuture ? "future" : ""} ${day.isSaturday || day.isSunday ? "weekend" : ""}`}
                            style={hasEntry ? { backgroundColor: practiceColor, boxShadow: `0 0 15px ${practiceColor}80` } : {}}
                            title={hasEntry ? `${practice.label} - ${getPracticeLabel(primaryEntry?.tipo_practica)}` : ""}
                          >
                            {hasEntry && <span className="check-icon">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="jg-monthly">
          <div className="monthly-header">
            <h2>Mensual</h2>
            <span className="month-label">
              {today.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).charAt(0).toUpperCase() + today.toLocaleDateString("es-ES", { month: "long" }).slice(1)}
            </span>
          </div>

          <div className="monthly-heatmap">
            <div className="heatmap-grid">
              {Array.from({ length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map((dayNum) => {
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayEntries = entries.filter(e => e.fecha === dateStr);
                const hasEntry = dayEntries.length > 0;
                const isToday = dayNum === today.getDate();
                const isFuture = new Date(dateStr) > today;

                const dominantPractice = hasEntry ? dayEntries[0].tipo_practica : null;
                const practiceColor = dominantPractice ? getPracticeColor(dominantPractice) : null;

                return (
                  <div
                    key={dayNum}
                    className={`heat-cell ${hasEntry ? "completed" : ""} ${isToday ? "today" : ""} ${isFuture ? "future" : ""}`}
                    style={hasEntry && practiceColor ? { backgroundColor: practiceColor, boxShadow: `0 0 8px ${practiceColor}` } : {}}
                    title={`${dayNum}: ${dayEntries.length} entrada(s)`}
                  >
                    <span className="cell-num">{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="monthly-legend">
            {practices.slice(0, 5).map((practice) => (
              <div key={practice.slug} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: getPracticeColor(practice.slug) }}></span>
                <span className="legend-name">{practice.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="entries-section">
        <h3 className="entries-title">Entradas Recientes</h3>
        <div className="entries-list">
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-card-header">
                <span className="entry-type" style={{ backgroundColor: getPracticeColor(entry.tipo_practica) }}>
                  {getPracticeLabel(entry.tipo_practica)}
                </span>
                <span className="entry-date">
                  {formatDate(entry.fecha)} {entry.hora ? `· ${formatTime(entry.hora)}` : ""}
                </span>
              </div>
              <div className="entry-card-body">
                <span className="entry-insight">{entry.insight || "Sin insight registrado"}</span>
              </div>
              <div className="entry-card-footer">
                <button className="entry-btn view-btn" onClick={() => setSelectedEntry(entry)}>Ver</button>
                <button className="entry-btn edit-btn" onClick={() => setEditEntry(entry)}>Editar</button>
                <button className="entry-btn delete-btn" onClick={() => deleteEntry(entry.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{getPracticeLabel(selectedEntry.tipo_practica)}</h3>
              <button className="close-btn" onClick={() => setSelectedEntry(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Fecha</span>
                <span className="detail-value">{formatDate(selectedEntry.fecha)}</span>
              </div>
              {selectedEntry.hora && (
                <div className="detail-row">
                  <span className="detail-label">Hora</span>
                  <span className="detail-value">{formatTime(selectedEntry.hora)}</span>
                </div>
              )}
              {selectedEntry.duracion && (
                <div className="detail-row">
                  <span className="detail-label">Duración</span>
                  <span className="detail-value">{selectedEntry.duracion} min</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Estado Previo</span>
                <span className="detail-value">{selectedEntry.estado_previo || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estado Post</span>
                <span className="detail-value">{selectedEntry.estado_post || "—"}</span>
              </div>
              {selectedEntry.somatica && (
                <div className="detail-section">
                  <span className="detail-label">Fenomenología Somática</span>
                  <p className="detail-text">{selectedEntry.somatica}</p>
                </div>
              )}
              {selectedEntry.cognitiva && (
                <div className="detail-section">
                  <span className="detail-label">Fenomenología Cognitiva</span>
                  <p className="detail-text">{selectedEntry.cognitiva}</p>
                </div>
              )}
              {selectedEntry.cuerpo && (
                <div className="detail-section">
                  <span className="detail-label">Descripción</span>
                  <p className="detail-text">{selectedEntry.cuerpo}</p>
                </div>
              )}
              {selectedEntry.insight && (
                <div className="detail-section">
                  <span className="detail-label">Insight</span>
                  <p className="detail-text highlight">{selectedEntry.insight}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editEntry && (
        <div className="modal-overlay" onClick={() => setEditEntry(null)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Entrada</h3>
              <button className="close-btn" onClick={() => setEditEntry(null)}>×</button>
            </div>
            <form className="edit-form" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const updatedData = {
                fecha: formData.get("fecha"),
                hora: formData.get("hora") || null,
                duracion: formData.get("duracion") ? parseInt(formData.get("duracion")) : null,
                tipo_practica: formData.get("tipo_practica"),
                estado_previo: formData.get("estado_previo") || "",
                estado_post: formData.get("estado_post") || "",
                fenomenologia_somatica: formData.get("somatica") || "",
                fenomenologia_cognitiva: formData.get("cognitiva") || "",
                cuerpo: formData.get("cuerpo") || "",
                insight: formData.get("insight") || "",
              };
              
              try {
                await fetch(`${API_BASE}/api/journal/${editEntry.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                  body: JSON.stringify(updatedData),
                });
                setEditEntry(null);
                loadData();
              } catch (err) {
                console.error("Error updating entry:", err);
              }
            }}>
              <div className="form-row">
                <label className="form-label">
                  Fecha
                  <input type="date" name="fecha" defaultValue={editEntry.fecha} required />
                </label>
                <label className="form-label">
                  Hora
                  <input type="time" name="hora" defaultValue={editEntry.hora || ""} />
                </label>
                <label className="form-label">
                  Duración (min)
                  <input type="number" name="duracion" defaultValue={editEntry.duracion || ""} min="1" />
                </label>
              </div>
              <label className="form-label">
                Tipo de Práctica
                <select name="tipo_practica" defaultValue={editEntry.tipo_practica} required>
                  {practices.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.label}</option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label className="form-label">
                  Estado Previo
                  <input type="text" name="estado_previo" defaultValue={editEntry.estado_previo || ""} />
                </label>
                <label className="form-label">
                  Estado Post
                  <input type="text" name="estado_post" defaultValue={editEntry.estado_post || ""} />
                </label>
              </div>
              <label className="form-label">
                Fenomenología Somática
                <input type="text" name="somatica" defaultValue={editEntry.somatica || ""} />
              </label>
              <label className="form-label">
                Fenomenología Cognitiva
                <input type="text" name="cognitiva" defaultValue={editEntry.cognitiva || ""} />
              </label>
              <label className="form-label">
                Descripción
                <textarea name="cuerpo" defaultValue={editEntry.cuerpo || ""} rows="3" />
              </label>
              <label className="form-label">
                Insight
                <input type="text" name="insight" defaultValue={editEntry.insight || ""} />
              </label>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditEntry(null)}>Cancelar</button>
                <button type="submit" className="save-btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .journal-grid {
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
          
          width: 100%;
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
        }

        .jg-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-secondary);
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

        .jg-spinner {
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

        .chart-section {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .chart-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .chart-title-group {
          flex: 1;
          min-width: 200px;
        }

        .chart-user-filter {
          flex-shrink: 0;
        }

        .chart-user-select {
          padding: 0.35rem 0.75rem;
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.8rem;
          cursor: pointer;
        }

        .chart-user-select:focus {
          outline: none;
          border-color: var(--neon-violet);
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem;
        }

        .chart-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0 0 0.75rem;
        }

        .journal-chart {
          width: 100%;
          margin-bottom: 0.75rem;
          overflow: hidden;
          border-radius: 10px;
          background: rgba(0,0,0,0.3);
        }

        .journal-chart svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
        }

        .chart-legend .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .chart-legend .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .chart-legend .dot.pre {
          background: #A855F7;
        }

        .chart-legend .dot.post {
          background: #3B82F6;
        }

        .jg-header {
          display: flex;
          justify-content: center;
          padding: 1rem;
          background: linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%);
          border-bottom: 1px solid var(--border);
        }

        .jg-tabs {
          display: flex;
          gap: 0.25rem;
          background: var(--surface-secondary);
          padding: 4px;
          border-radius: 10px;
        }

        .jg-tab {
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

        .jg-tab:hover {
          color: var(--text-primary);
        }

        .jg-tab.active {
          background: var(--neon-violet);
          color: white;
          box-shadow: 0 0 15px rgba(139,92,246,0.4);
        }

        .jg-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .jg-empty .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .jg-empty p {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0 0 0.25rem;
        }

        .jg-empty span {
          font-size: 0.8rem;
        }

        /* Weekly View */
        .jg-weekly {
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
          background: rgba(139,92,246,0.1);
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          border: 1px solid rgba(139,92,246,0.2);
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

        .jg-grid-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: var(--neon-violet) var(--surface);
        }

        .jg-grid-container::-webkit-scrollbar {
          height: 6px;
        }

        .jg-grid-container::-webkit-scrollbar-track {
          background: var(--surface);
        }

        .jg-grid-container::-webkit-scrollbar-thumb {
          background: var(--neon-violet);
          border-radius: 3px;
        }

        .grid-header {
          display: grid;
          grid-template-columns: minmax(100px, 1fr) repeat(7, minmax(40px, 1fr));
          gap: 4px;
          padding: 0.6rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--border);
          min-width: 400px;
        }

        .header-practice {
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
          font-size: 0.55rem;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
        }

        .header-day .day-num {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .header-day.today .day-num {
          color: var(--neon-violet);
        }

        .grid-body {
          padding: 0.4rem;
          min-width: 400px;
        }

        .grid-row {
          display: grid;
          grid-template-columns: minmax(100px, 1fr) repeat(7, minmax(40px, 1fr));
          gap: 4px;
          margin-bottom: 6px;
          align-items: center;
        }

        .grid-row:last-child {
          margin-bottom: 0;
        }

        .row-practice {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.2rem 0.4rem;
          min-width: 0;
        }

        .practice-dot {
          width: 6px;
          height: 6px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .practice-name {
          font-size: 0.7rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1 1 0;
        }

        .grid-cell {
          width: 100%;
          min-width: 40px;
          aspect-ratio: 1;
          border-radius: 10px;
          background: var(--grid-empty);
          border: 1px solid var(--grid-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
          transition: all 0.2s;
        }

        .grid-cell.future {
          opacity: 0.35;
          border-style: dashed;
        }

        .grid-cell.weekend {
          border-color: rgba(0,229,255,0.2);
          background: linear-gradient(135deg, rgba(0,229,255,0.05) 0%, transparent 100%);
        }

        .grid-cell.completed {
          border-color: transparent;
        }

        .check-icon {
          color: white;
          font-size: 0.9rem;
          font-weight: bold;
        }

        /* Monthly View */
        .jg-monthly {
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

        .monthly-heatmap {
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
          box-shadow: 0 0 10px rgba(139,92,246,0.5);
        }

        .heat-cell.future {
          opacity: 0.25;
        }

        .heat-cell.completed {
          border-color: transparent;
        }

        .cell-num {
          font-size: 0.6rem;
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
          font-size: 0.75rem;
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .grid-header,
          .grid-row {
            grid-template-columns: minmax(80px, 1fr) repeat(7, minmax(32px, 1fr));
            gap: 2px;
          }

          .grid-cell {
            min-width: 32px;
            border-radius: 8px;
          }

          .practice-name {
            font-size: 0.6rem;
          }

          .header-day .day-num {
            font-size: 0.7rem;
          }

          .check-icon {
            font-size: 0.8rem;
          }

          .jg-grid-container,
          .grid-body {
            min-width: 340px;
          }
        }

        /* Entries Section */
        .entries-section {
          margin-top: 1.5rem;
          padding: 1rem;
          border-top: 1px solid var(--border);
        }

        .entries-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem;
        }

        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .entry-card {
          background: var(--surface-secondary);
          border-radius: 12px;
          border: 1px solid var(--border);
          overflow: hidden;
          transition: all 0.2s;
        }

        .entry-card:hover {
          border-color: var(--neon-violet);
          box-shadow: 0 0 10px rgba(139,92,246,0.1);
        }

        .entry-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--border);
        }

        .entry-type {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: white;
        }

        .entry-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .entry-card-body {
          padding: 0.75rem 1rem;
        }

        .entry-insight {
          font-size: 0.85rem;
          color: var(--text-primary);
          font-style: italic;
        }

        .entry-card-footer {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-top: 1px solid var(--border);
        }

        .entry-btn {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .entry-btn.view-btn {
          background: var(--neon-violet);
          color: white;
        }

        .entry-btn.view-btn:hover {
          box-shadow: 0 0 10px rgba(139,92,246,0.4);
        }

        .entry-btn.edit-btn {
          background: transparent;
          border: 1px solid var(--neon-cyan);
          color: var(--neon-cyan);
        }

        .entry-btn.edit-btn:hover {
          background: rgba(0,229,255,0.1);
        }

        .entry-btn.delete-btn {
          background: transparent;
          border: 1px solid #ef4444;
          color: #ef4444;
        }

        .entry-btn.delete-btn:hover {
          background: rgba(239,68,68,0.1);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }

        .modal-content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
        }

        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.25rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        .detail-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .detail-section {
          margin-top: 1rem;
        }

        .detail-section .detail-label {
          display: block;
          margin-bottom: 0.5rem;
        }

        .detail-text {
          font-size: 0.85rem;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.5;
        }

        .detail-text.highlight {
          color: var(--neon-violet);
          font-weight: 500;
        }

        /* Edit Form */
        .edit-modal {
          max-width: 550px;
        }

        .edit-form {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: flex;
          gap: 0.75rem;
        }

        .form-row .form-label {
          flex: 1;
        }

        .form-label {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .form-label input,
        .form-label select,
        .form-label textarea {
          padding: 0.5rem 0.75rem;
          background: var(--surface-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .form-label input:focus,
        .form-label select:focus,
        .form-label textarea:focus {
          outline: none;
          border-color: var(--neon-violet);
        }

        .form-label textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
        }

        .cancel-btn:hover {
          border-color: var(--text-secondary);
        }

        .save-btn {
          padding: 0.5rem 1rem;
          background: var(--neon-violet);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
        }

        .save-btn:hover {
          box-shadow: 0 0 15px rgba(139,92,246,0.4);
        }

        @media (max-width: 640px) {
          .form-row {
            flex-direction: column;
            gap: 0.5rem;
          }

          .entry-card-footer {
            flex-wrap: wrap;
          }

          .entry-btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}