import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            destructive
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              : 'bg-sky-50 text-[#1687D9] dark:bg-sky-950/50 dark:text-sky-400'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] px-4 py-2 rounded-xl border border-[#E5ECF3] dark:border-slate-700 text-sm font-medium text-[#172B42] dark:text-slate-200 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
            destructive
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-[#1687D9] hover:bg-[#1273BA]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
