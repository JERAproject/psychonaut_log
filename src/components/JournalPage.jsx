import { useState, useEffect } from "react";
import JournalGrid from "./JournalGrid.jsx";

const API_BASE = "";

export default function JournalPage() {
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("all");
  const [canFilterUsers, setCanFilterUsers] = useState(false);
  const [loading, setLoading] = useState(true);

  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem("psy_user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch { return null; }
  }

  function getAuthHeaders() {
    const token = localStorage.getItem("psy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    const user = getCurrentUser();
    console.log("DEBUG JournalPage - User:", user);
    const isAdmin = user?.role === "admin" || user?.role === "psicologo";
    console.log("DEBUG JournalPage - isAdmin:", isAdmin, "role:", user?.role);
    setCanFilterUsers(isAdmin);

    if (isAdmin) {
      fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() })
        .then(res => {
          console.log("DEBUG JournalPage - Response status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("DEBUG JournalPage - Users data:", data);
          setUsers(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("DEBUG JournalPage - Error loading users:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="jp-loading">
        <div className="jp-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="journal-page">
      <JournalGrid 
        externalUsers={users}
        externalUserFilter={userFilter}
        externalSetUserFilter={canFilterUsers ? setUserFilter : null}
        externalCanFilterUsers={canFilterUsers}
      />
      <style>{`
        .jp-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: rgba(255,255,255,0.55);
        }
        .jp-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}