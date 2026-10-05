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
      className="sticky top-[53px] sm:top-[57px] z-30 w-full bg-rose-500/15 dark:bg-rose-950/80 border-b border-rose-500/30 backdrop-blur-md px-4 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-200 cursor-pointer select-none transition-all duration-200 animate-in fade-in slide-in-from-top-1"
      title="Toca para descartar"
    >
      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
      <span className="flex-1 min-w-0 leading-snug">{message}</span>
    </div>
  );
};
