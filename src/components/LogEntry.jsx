import { useState, useEffect } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(":");
  return h + ":" + m;
}

export default function LogEntry({ entry, onView, onEdit, onDelete }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [entrySaved, setEntrySaved] = useState(null);

  useEffect(() => {
    const handleJournalUpdated = (event) => {
      if (event.detail?.savedEntry) {
        setEntrySaved(event.detail.savedEntry);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setEntrySaved(null);
        }, 4000);
      }
    };
    window.addEventListener('journal-updated', handleJournalUpdated);
    return () => window.removeEventListener('journal-updated', handleJournalUpdated);
  }, []);

  if (!entry) return null;

  const dateTimeHtml = formatDate(entry.fecha) + (entry.hora ? ` · ${formatTime(entry.hora)}` : '');
  const canEdit = entry.canEdit;

  return (
    <>
      <div className="entry-card" data-id={entry.id}>
        <div className="entry-card-header">
          <span className="entry-card-tecnica">
            {entry.practiceLabel || entry.tipo_practica || 'Práctica'}
          </span>
          <span className="entry-card-datetime">{dateTimeHtml}</span>
        </div>

        <div className="entry-card-body">
          <span className="entry-card-label">Insight:</span>
          <span className="entry-card-insight">
            {entry.insight || 'Sin insight registrado'}
          </span>
        </div>

        <div className="entry-card-footer">
          <button
            className="action-btn view-btn"
            onClick={() => onView?.(entry)}
            aria-label="Ver detalles"
          >
            Ver
          </button>
          {canEdit && (
            <>
              <button
                className="action-btn edit-btn"
                onClick={() => onEdit?.(entry)}
                aria-label="Editar"
              >
                Editar
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => onDelete?.(entry.id)}
                aria-label="Eliminar"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="success-popup">
          <div className="success-popup-icon">✓</div>
          <div className="success-popup-content">
            <span className="success-popup-title">Entrada guardada</span>
            <span className="success-popup-subtitle">
              {entrySaved?.tipo_practica || 'Nueva entrada'} - {entrySaved?.fecha || formatDate(new Date().toISOString().split('T')[0])}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .entry-card {
          background: linear-gradient(145deg, #16162a 0%, #1a1a2e 100%);
          border: 1px solid #2a2a35;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        @media (min-width: 640px) {
          .entry-card {
            border-radius: 16px;
            padding: 1.25rem;
          }
        }

        .entry-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(91, 143, 249, 0.1);
        }

        .entry-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .entry-card-tecnica {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          background: linear-gradient(135deg, rgba(91, 143, 249, 0.15), rgba(139, 92, 246, 0.15));
          color: #a5b4fc;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        @media (min-width: 640px) {
          .entry-card-tecnica {
            padding: 0.3rem 0.75rem;
            font-size: 0.85rem;
          }
        }

        .entry-card-datetime {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: right;
        }

        @media (min-width: 640px) {
          .entry-card-datetime {
            font-size: 0.8rem;
          }
        }

        .entry-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .entry-card-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #5b8ff9;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        @media (min-width: 640px) {
          .entry-card-label {
            font-size: 0.75rem;
          }
        }

        .entry-card-insight {
          color: #d1d5db;
          font-size: 0.85rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .entry-card-insight {
            font-size: 0.9rem;
          }
        }

        .entry-card-footer {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.75rem;
          font-weight: 500;
          min-height: 36px;
          flex: 1;
        }

        @media (min-width: 640px) {
          .action-btn {
            flex: initial;
            min-width: 70px;
            padding: 0.5rem 1rem;
          }
        }

        .view-btn {
          background: rgba(55, 65, 81, 0.8);
          color: #9ca3af;
          border: 1px solid #374151;
        }

        .view-btn:hover {
          background: #4b5563;
          color: #fefefe;
          border-color: #4b5563;
        }

        .edit-btn {
          background: rgba(37, 99, 235, 0.9);
          color: #fff;
          border: 1px solid #2563eb;
        }

        .edit-btn:hover {
          background: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .delete-btn {
          background: rgba(220, 38, 38, 0.2);
          color: #f87171;
          border: 1px solid #dc2626;
        }

        .delete-btn:hover {
          background: #dc2626;
          color: #fff;
        }

        .success-popup {
          position: fixed;
          bottom: max(1.5rem, env(safe-area-inset-bottom));
          right: 1.5rem;
          background: linear-gradient(135deg, #065f46, #047857);
          border: 1px solid #10b981;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 9999;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.4s ease, fadeOut 0.4s ease 3.6s;
          max-width: 320px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .success-popup-icon {
          width: 32px;
          height: 32px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .success-popup-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .success-popup-title {
          color: #ecfdf5;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .success-popup-subtitle {
          color: #a7f3d0;
          font-size: 0.75rem;
        }

        @media (max-width: 640px) {
          .success-popup {
            left: 1rem;
            right: 1rem;
            bottom: max(5rem, calc(env(safe-area-inset-bottom) + 4rem));
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}