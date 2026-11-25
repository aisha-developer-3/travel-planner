import React from 'react';
import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg text-sm text-[#172B42] dark:text-slate-100"
          role="status"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20B486]" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          {toast.type === 'info' && (
            <Info className="h-4 w-4 shrink-0 text-[#1687D9]" />
          )}
          <span className="flex-1 font-medium leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#718096] hover:text-[#172B42] dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
