import React from 'react';

interface ActionTooltipProps {
  label: string;
  shortcut?: string;
  side?: 'left' | 'top' | 'right' | 'bottom';
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  children: React.ReactNode;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  label,
  shortcut,
  side = 'left',
  align = 'center',
  disabled = false,
  children
}) => {
  if (disabled) {
    return <>{children}</>;
  }

  let positionClasses = '';
  switch (side) {
    case 'left':
      positionClasses = 'right-full mr-2.5 top-1/2 -translate-y-1/2';
      break;
    case 'right':
      positionClasses = 'left-full ml-2.5 top-1/2 -translate-y-1/2';
      break;
    case 'top':
      if (align === 'start') {
        positionClasses = 'bottom-full mb-2.5 left-0';
      } else if (align === 'end') {
        positionClasses = 'bottom-full mb-2.5 right-0';
      } else {
        positionClasses = 'bottom-full mb-2.5 left-1/2 -translate-x-1/2';
      }
      break;
    case 'bottom':
      if (align === 'start') {
        positionClasses = 'top-full mt-2.5 left-0';
      } else if (align === 'end') {
        positionClasses = 'top-full mt-2.5 right-0';
      } else {
        positionClasses = 'top-full mt-2.5 left-1/2 -translate-x-1/2';
      }
      break;
  }

  return (
    <div className="relative group/tooltip inline-flex items-center justify-center">
      {children}
      <div
        role="tooltip"
        className={`absolute ${positionClasses} pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-100 ease-out scale-95 group-hover/tooltip:scale-100 z-50 flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white dark:text-slate-100 text-xs font-medium rounded-xl shadow-2xl border border-slate-700/70 dark:border-slate-600/70 whitespace-nowrap select-none`}
      >
        <span>{label}</span>
        {shortcut && (
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-mono font-bold uppercase rounded-md bg-slate-800 text-cyan-300 dark:bg-slate-700 dark:text-cyan-300 border border-slate-600 dark:border-slate-500 shadow-[0_2px_0_rgba(0,0,0,0.4)]">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
};
