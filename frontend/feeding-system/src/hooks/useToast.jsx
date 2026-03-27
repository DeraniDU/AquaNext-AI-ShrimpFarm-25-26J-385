// Custom hook for managing toast notifications
import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration + 300); // Add 300ms for fade out animation
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-6 py-4 rounded-lg shadow-2xl border-2 text-white font-semibold flex items-center gap-3 min-w-[300px] max-w-[500px] animate-slide-in-right`}
          style={{
            backgroundColor: toast.type === 'success' ? '#10b981' : 
                           toast.type === 'error' ? '#ef4444' : 
                           toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
            borderColor: toast.type === 'success' ? '#059669' : 
                        toast.type === 'error' ? '#dc2626' : 
                        toast.type === 'warning' ? '#d97706' : '#2563eb',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <span className="text-2xl">
            {toast.type === 'success' ? '' : 
             toast.type === 'error' ? '' : 
             toast.type === 'warning' ? '' : ''}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:text-gray-200 text-xl font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return { showToast, removeToast, ToastContainer };
};

















