import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-xl',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#172B42]/45 dark:bg-black/70 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-[#E5ECF3] dark:border-slate-800 shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E5ECF3] dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="text-lg font-bold text-[#172B42] dark:text-slate-100 leading-snug"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-[#718096] dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="min-h-[40px] min-w-[40px] -mr-1 flex items-center justify-center rounded-lg text-[#718096] hover:text-[#172B42] hover:bg-[#F5F8FC] dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
};
