import React from 'react';
import { Download, MonitorSmartphone, Share, PlusSquare, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface PWAInstallModalProps {
  open: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onTriggerNativeInstall: () => Promise<void>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  open,
  onClose,
  isInstallable,
  isInstalled,
  isIOS,
  onTriggerNativeInstall,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Install Travel Planner"
      subtitle="Use Travel Planner as a standalone offline-ready app on desktop or mobile."
      maxWidth="max-w-md"
    >
      {isInstalled ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#20B486]" />
          <p className="text-sm font-medium">
            Travel Planner is already running in standalone installed mode.
          </p>
        </div>
      ) : isInstallable ? (
        <div className="space-y-4">
          <p className="text-sm text-[#718096] dark:text-slate-300 leading-relaxed">
            Install Travel Planner directly to your device for quick launch, full-screen workspace navigation, and reliable offline access to your trips.
          </p>
          <button
            type="button"
            onClick={async () => {
              await onTriggerNativeInstall();
              onClose();
            }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Install Travel Planner Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-4 border border-[#E5ECF3] dark:border-slate-700">
            <MonitorSmartphone className="h-5 w-5 text-[#1687D9] shrink-0 mt-0.5" />
            <div className="text-sm text-[#172B42] dark:text-slate-200 space-y-2">
              {isIOS ? (
                <>
                  <p className="font-semibold">Install on iPhone or iPad (Safari)</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[#718096] dark:text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <span>1. Tap the</span>
                      <Share className="h-4 w-4 text-[#1687D9] inline" />
                      <strong className="text-[#172B42] dark:text-slate-100">Share</strong>
                      <span>button in Safari.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>2. Choose</span>
                      <PlusSquare className="h-4 w-4 text-[#1687D9] inline" />
                      <strong className="text-[#172B42] dark:text-slate-100">Add to Home Screen</strong>.
                    </li>
                    <li>3. Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold">Install from your browser menu</p>
                  <p className="text-[#718096] dark:text-slate-300 leading-relaxed">
                    In Chrome, Edge, or Brave, click the <strong>Install app</strong> icon in the address bar or open the browser menu and select <strong>Install Travel Planner</strong> (or <strong>Add to Home Screen</strong> on mobile).
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1687D9] text-sm font-semibold text-white hover:bg-[#1273BA] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
