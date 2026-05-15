import { useState, useEffect, useRef } from 'react';

export default function SuccessPopup() {
  const [show, setShow] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const stylesInjected = useRef(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @media (max-width: 640px) {
          .success-popup {
            left: 1rem !important;
            right: 1rem !important;
            bottom: max(5rem, calc(env(safe-area-inset-bottom) + 4rem)) !important;
            max-width: none !important;
          }
        }
      `;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }

    const handleJournalUpdated = (event) => {
      if (event.detail?.savedEntry) {
        setPopupData(event.detail.savedEntry);
        setShow(true);
        setTimeout(() => {
          setShow(false);
          setPopupData(null);
        }, 4000);
      }
    };

    window.addEventListener('journal-updated', handleJournalUpdated);
    return () => window.removeEventListener('journal-updated', handleJournalUpdated);
  }, []);

  if (!show || !popupData) return null;

  return (
    <div className="success-popup" style={popupStyles}>
      <div style={iconStyles}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div style={contentStyles}>
        <span style={titleStyles}>Entrada guardada</span>
        <span style={subtitleStyles}>
          {popupData.tipo_practica || 'Nueva entrada'} · {popupData.fecha || 'Hoy'}
        </span>
      </div>
    </div>
  );
}

const popupStyles = {
  position: 'fixed',
  bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
  right: '1.5rem',
  background: 'linear-gradient(135deg, #065f46, #047857)',
  border: '1px solid #10b981',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  zIndex: 9999,
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  animation: 'slideIn 0.4s ease, fadeOut 0.4s ease 3.6s',
  maxWidth: '320px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const iconStyles = {
  width: '32px',
  height: '32px',
  background: '#10b981',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  flexShrink: 0,
};

const contentStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
};

const titleStyles = {
  color: '#ecfdf5',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const subtitleStyles = {
  color: '#a7f3d0',
  fontSize: '0.75rem',
};