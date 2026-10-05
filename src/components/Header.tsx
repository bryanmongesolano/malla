import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import type { OverallProgress, SimulationResult } from '@shared/types.js';
import { getRemainingTimeText } from '@shared/index.js';

export type FilterMode = 'todas' | 'disponibles' | 'suficiencia' | 'ocultar_completadas';

interface HeaderProps {
  overall: OverallProgress;
  simulation: SimulationResult;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  isSimulationMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  overall,
  simulation,
  isSettingsOpen,
  onToggleSettings,
  isSimulationMode
}) => {
  const [showRemainingTime, setShowRemainingTime] = useState<boolean>(() => {
    try {
      return localStorage.getItem('malla_date_display') === 'remaining';
    } catch {
      return false;
    }
  });

  const handleToggleDateDisplay = () => {
    setShowRemainingTime(prev => {
      const next = !prev;
      try {
        localStorage.setItem('malla_date_display', next ? 'remaining' : 'date');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isCompleted = overall.percentCompleted === 100;
  const remainingText = isCompleted
    ? 'completado'
    : ((simulation.remainingTime && simulation.remainingTime !== 'completado')
        ? simulation.remainingTime
        : getRemainingTimeText(simulation.estimatedGraduationDate));
  const displayText = showRemainingTime
    ? remainingText
    : (simulation.estimatedGraduationDate?.toLowerCase() || remainingText);
  return (
    <header
      className={`sticky top-0 z-40 w-full px-3.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-2 sm:px-5 sm:pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:pb-2.5 transition-colors duration-200 ${
        isSimulationMode
          ? 'border-b border-amber-500/50 dark:border-amber-500/40'
          : 'border-b border-slate-200 dark:border-slate-800/80'
      }`}
      style={{ backgroundColor: 'var(--topbar-bg)' }}
    >
      <div className="flex items-center justify-between gap-5 sm:gap-7 max-w-7xl mx-auto">
        {/* Progress bar + metrics on left */}
        <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
          {/* Progress bar (thicker, rounded, smooth gradient, themed track for simulation) */}
          <div
            className={`w-full h-2.5 sm:h-3 rounded-full overflow-hidden shadow-inner transition-colors duration-200 ${
              isSimulationMode
                ? 'bg-amber-950/15 dark:bg-black/60 border border-amber-500/30 dark:border-amber-500/30'
                : 'bg-slate-200 dark:bg-slate-800'
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${overall.percentCompleted}%` }}
            />
          </div>

          {/* Underneath: Metrics on left, percentage and graduation date on right */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            {/* Left: Course status counters */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                  isSimulationMode
                    ? 'text-amber-950/80 dark:text-amber-200/90'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Completadas"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{overall.completedUnits}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                  isSimulationMode
                    ? 'text-amber-950/80 dark:text-amber-200/90'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Cursando"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>{overall.cursandoUnits}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                  isSimulationMode
                    ? 'text-amber-950/80 dark:text-amber-200/90'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Disponibles"
              >
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span>{overall.availableUnits}</span>
              </span>
              {overall.suficienciaUnits > 0 && (
                <span
                  className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                    isSimulationMode
                      ? 'text-amber-950/80 dark:text-amber-200/90'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Suficiencia"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span>{overall.suficienciaUnits}</span>
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                  isSimulationMode
                    ? 'text-amber-950/80 dark:text-amber-200/90'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Bloqueadas"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                <span>{overall.blockedUnits}</span>
              </span>
            </div>

            {/* Right: Percentage (in progress bar green) at the left of date, and graduation date */}
            <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0 font-medium">
              <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400">
                {overall.percentCompleted}%
              </span>
              <button
                type="button"
                onClick={handleToggleDateDisplay}
                className={`min-h-[36px] -my-1.5 px-1.5 -mx-1.5 inline-flex items-center transition-colors cursor-pointer select-none active:scale-95 ${
                  isSimulationMode
                    ? 'text-amber-950/80 hover:text-amber-950 dark:text-amber-200/90 dark:hover:text-amber-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title={showRemainingTime ? 'Mostrar fecha estimada' : 'Mostrar tiempo restante'}
              >
                {displayText}
              </button>
            </div>
          </div>
        </div>

        {/* Settings / Close icon only, vertically centered, no background */}
        <button
          onClick={onToggleSettings}
          className={`min-w-[42px] min-h-[42px] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 self-center ${
            isSimulationMode
              ? 'text-amber-900/80 hover:text-amber-950 dark:text-amber-300/80 dark:hover:text-amber-200'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title={isSettingsOpen ? 'Cerrar ajustes' : 'Ajustes'}
        >
          {isSettingsOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Settings className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
};
