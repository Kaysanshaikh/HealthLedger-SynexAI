import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ─── Types: success | error | warning | info ────────────────────────────
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
      <circle cx="10" cy="10" r="10" fill="#22c55e" opacity="0.15" />
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        fill="#22c55e"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
      <circle cx="10" cy="10" r="10" fill="#ef4444" opacity="0.15" />
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        fill="#ef4444"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        fill="#f59e0b"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
      <circle cx="10" cy="10" r="10" fill="#6c63ff" opacity="0.15" />
      <path
        d="M10 9a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm0-4a1 1 0 110 2 1 1 0 010-2z"
        fill="#6c63ff"
      />
    </svg>
  ),
};

const COLORS = {
  success: { border: '#22c55e44', bg: '#22c55e0d', text: '#16a34a', bar: '#22c55e' },
  error:   { border: '#ef444444', bg: '#ef44440d', text: '#dc2626', bar: '#ef4444' },
  warning: { border: '#f59e0b44', bg: '#f59e0b0d', text: '#d97706', bar: '#f59e0b' },
  info:    { border: '#6c63ff44', bg: '#6c63ff0d', text: '#5b55e0', bar: '#6c63ff' },
};

const ToastContext = createContext(null);

let _toast = null; // module-level imperative ref for use outside React

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  }, []);

  const show = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, message, type, exiting: false }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Expose imperatively for use in non-React code (e.g. AuthContext callbacks)
  _toast = show;

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// Hook for React components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

// Imperative function – works anywhere, including AuthContext
export const toast = {
  success: (msg, dur) => _toast?.(msg, 'success', dur),
  error:   (msg, dur) => _toast?.(msg, 'error',   dur),
  warning: (msg, dur) => _toast?.(msg, 'warning',  dur),
  info:    (msg, dur) => _toast?.(msg, 'info',     dur),
};

// ─── Toast Container ──────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onDismiss }) => (
  <div
    style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}
  >
    {toasts.map((t) => (
      <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
    ))}
  </div>
);

const ToastItem = ({ toast: t, onDismiss }) => {
  const c = COLORS[t.type] || COLORS.info;
  return (
    <div
      style={{
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minWidth: 280,
        maxWidth: 420,
        background: 'var(--toast-bg, #1a1a2e)',
        border: `1.5px solid ${c.border}`,
        borderRadius: 14,
        padding: '12px 14px 12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
        animation: t.exiting
          ? 'toastOut 0.32s ease forwards'
          : 'toastIn 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(60px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)    scale(1); }
          to   { opacity: 0; transform: translateX(60px) scale(0.92); }
        }
        .hl-toast-close:hover { opacity: 1 !important; }
      `}</style>

      {/* Accent bar on the left */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, background: c.bar, borderRadius: '14px 0 0 14px',
      }} />

      {/* Icon */}
      <div style={{ flexShrink: 0, marginLeft: 4, marginTop: 1 }}>{ICONS[t.type]}</div>

      {/* Message */}
      <p style={{
        flex: 1, margin: 0, fontSize: '0.875rem', lineHeight: 1.5,
        color: 'var(--toast-text, #e8e8f5)', wordBreak: 'break-word',
      }}>
        {/* Strip leading emoji/label prefixes from old alert messages */}
        {t.message.replace(/^(✅|❌|⚠️|🔥|🛡️|⏰|🦊|🔑|🔐)\s*/u, '').replace(/^(Validation Error|Registration Error|Update Error|Upload Error|Submission Error|Grant Access Error|Revoke Access Error|Training Failed|Access Denied|Training Complete)[:\s]*/i, '')}
      </p>

      {/* Close button */}
      <button
        className="hl-toast-close"
        onClick={() => onDismiss(t.id)}
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          cursor: 'pointer', color: '#6060a0', opacity: 0.6,
          padding: 0, lineHeight: 1, fontSize: 16, marginTop: 1,
          transition: 'opacity 0.15s',
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};
