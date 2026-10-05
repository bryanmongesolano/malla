import React from 'react';
import {
  Check,
  Play,
  Clock,
  Lock,
  Calendar,
  Filter,
  Sliders,
  Sun,
  Moon,
  GitFork,
  Columns
} from 'lucide-react';
import type { OverallProgress, SimulationResult } from '@shared/types.js';
import type { LayoutMode } from '../layout.js';

export type FilterMode = 'todas' | 'disponibles' | 'ocultar_completadas';

interface HeaderProps {
  overall: OverallProgress;
  simulation: SimulationResult;
  filterMode: FilterMode;
  layoutMode: LayoutMode;
  isDark: boolean;
  onSetFilterMode: (m: FilterMode) => void;
  onSetLayoutMode: (m: LayoutMode) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  overall,
  simulation,
  filterMode,
  layoutMode,
  isDark,
  onSetFilterMode,
  onSetLayoutMode,
  onToggleTheme,
  onOpenSettings
}) => {
  const cycleFilter = () => {
    if (filterMode === 'todas') onSetFilterMode('disponibles');
    else if (filterMode === 'disponibles') onSetFilterMode('ocultar_completadas');
    else onSetFilterMode('todas');
  };

  const getFilterLabel = () => {
    if (filterMode === 'disponibles') return 'Solo disponibles';
    if (filterMode === 'ocultar_completadas') return 'Ocultar completadas';
    return 'Todas';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 py-2 sm:px-5 sm:py-2.5 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-7xl mx-auto">
        {/* Left: Title + % Bar + Counters */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight truncate">
              Ingeniería del Software
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800/60 font-semibold">
              CENFOTEC
            </span>
          </div>

          {/* Progress Bar + % */}
          <div className="flex items-center gap-3">
            <div className="flex-1 sm:w-64 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${overall.percentCompleted}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {overall.percentCompleted}%
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
              ({overall.completedCredits}/{overall.totalCredits} créditos)
            </span>
          </div>

          {/* Counters row */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/60 px-2 py-0.5 rounded-md font-medium" title="Completadas">
              <Check className="w-3.5 h-3.5" />
              <span>{overall.completedUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 border border-amber-300 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/60 px-2 py-0.5 rounded-md font-medium" title="Cursando">
              <Play className="w-3.5 h-3.5" />
              <span>{overall.cursandoUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-100 border border-sky-300 dark:text-sky-400 dark:bg-sky-950/40 dark:border-sky-900/60 px-2 py-0.5 rounded-md font-medium" title="Disponibles">
              <Clock className="w-3.5 h-3.5" />
              <span>{overall.availableUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-300 dark:text-slate-400 dark:bg-slate-900/70 dark:border-slate-800 px-2 py-0.5 rounded-md font-medium" title="Bloqueadas">
              <Lock className="w-3.5 h-3.5" />
              <span>{overall.blockedUnits}</span>
            </span>

            {/* Estimated graduation pill */}
            <div className="inline-flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-md bg-purple-100 border border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                ≈ {simulation.periodsRemaining} cuatris · {simulation.estimatedGraduationDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {/* Filter button */}
          <button
            onClick={cycleFilter}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterMode !== 'todas'
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/60'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Filtrar materias"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[11px]">{getFilterLabel()}</span>
          </button>

          {/* Layout mode button */}
          <button
            onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'cuatrimestres' : 'tree')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title={layoutMode === 'tree' ? 'Cambiar a vista por Cuatrimestres' : 'Cambiar a vista Árbol'}
          >
            {layoutMode === 'tree' ? (
              <>
                <GitFork className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Árbol</span>
              </>
            ) : (
              <>
                <Columns className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Cuatris</span>
              </>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Configurar simulación"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
