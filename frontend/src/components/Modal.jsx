import React, { useEffect } from 'react';
import './Modal.css';

const CONFIG = {
  success: { icon: '✓', color: '#22c55e', bg: '#f0fdf4' },
  error:   { icon: '✕', color: '#ef4444', bg: '#fef2f2' },
  info:    { icon: 'i', color: '#667eea', bg: '#f0f3ff' },
  warning: { icon: '!', color: '#f59e0b', bg: '#fffbeb' },
  confirm: { icon: '?', color: '#667eea', bg: '#f0f3ff' },
};

function Modal({ type, message, alertType = 'info', danger = false, confirmLabel = 'Confirm', onClose, onConfirm, onCancel }) {
  const cfg = CONFIG[type === 'confirm' ? 'confirm' : alertType];

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        type === 'alert' ? onClose?.() : onCancel?.();
      }
      if (e.key === 'Enter') {
        type === 'alert' ? onClose?.() : onConfirm?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [type, onClose, onConfirm, onCancel]);

  const handleOverlayClick = () => {
    type === 'alert' ? onClose?.() : onCancel?.();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-icon-wrap"
          style={{ background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}30` }}
        >
          <span className="modal-icon">{cfg.icon}</span>
        </div>

        <p className="modal-message">{message}</p>

        {type === 'alert' ? (
          <div className="modal-actions">
            <button
              className="modal-btn modal-btn--primary"
              style={{ background: cfg.color }}
              onClick={onClose}
              autoFocus
            >
              OK
            </button>
          </div>
        ) : (
          <div className="modal-actions modal-actions--confirm">
            <button className="modal-btn modal-btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              className={`modal-btn ${danger ? 'modal-btn--danger' : 'modal-btn--primary'}`}
              style={!danger ? { background: cfg.color } : undefined}
              onClick={onConfirm}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
