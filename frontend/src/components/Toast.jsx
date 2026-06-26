import React, { useState, useEffect, useCallback } from 'react';
import '../styles/components/Toast.css';

let toastHandler = null;

export const showToast = (message, type = 'info', duration = 3500) => {
    if (toastHandler) {
        toastHandler(message, type, duration);
    }
};

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type, duration) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration, removing: false }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 400);
        }, duration);
    }, []);

    useEffect(() => {
        toastHandler = addToast;
        return () => { toastHandler = null; };
    }, [addToast]);

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠',
    };

    return (
        <div className="toast-portal" aria-live="polite">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`toast toast--${toast.type} ${toast.removing ? 'toast--removing' : ''}`}
                    role="alert"
                >
                    <span className="toast__icon">{icons[toast.type] || icons.info}</span>
                    <span className="toast__message">{toast.message}</span>
                    <button
                        className="toast__close"
                        onClick={() =>
                            setToasts(prev => prev.filter(t => t.id !== toast.id))
                        }
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
