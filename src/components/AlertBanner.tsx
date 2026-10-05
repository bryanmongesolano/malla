import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface AlertBannerProps {
  message: string | null;
  onDismiss: () => void;
  autoCloseDurationMs?: number;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  onDismiss,
  autoCloseDurationMs = 4000
}) => {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoCloseDurationMs);

    return () => clearTimeout(timer);
  }, [message, onDismiss, autoCloseDurationMs]);

  if (!message) return null;

  return (
    <div
      onClick={onDismiss}
      role="alert"
      className="w-full bg-rose-500/15 dark:bg-rose-950/80 border-b border-rose-500/30 backdrop-blur-md px-3.5 py-2.5 sm:px-5 flex items-center cursor-pointer select-none transition-all duration-200 animate-in fade-in slide-in-from-top-1"
      title="Toca para descartar"
    >
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-200">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        <span className="flex-1 min-w-0 leading-snug">{message}</span>
      </div>
    </div>
  );
};
