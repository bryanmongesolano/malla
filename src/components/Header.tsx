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
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-5 sm:py-2.5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-7xl mx-auto">
        {/* Left: Title + % Bar + Counters */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight truncate">
              Ingeniería del Software
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              CENFOTEC
            </span>
          </div>

          {/* Progress Bar + % */}
          <div className="flex items-center gap-3">
            <div className="flex-1 sm:w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${overall.percentCompleted}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {overall.percentCompleted}%
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              ({overall.completedCredits}/{overall.totalCredits} créditos)
            </span>
          </div>

          {/* Counters row */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/60 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>{overall.completedUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/60 font-medium">
              <Play className="w-3.5 h-3.5" />
              <span>{overall.cursandoUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-md border border-sky-900/60 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{overall.availableUnits}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded-md border border-slate-800 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>{overall.blockedUnits}</span>
            </span>

            {/* Estimated graduation pill */}
            <div className="inline-flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/60 text-purple-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
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
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              filterMode !== 'todas'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="Filtrar materias"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{getFilterLabel()}</span>
          </button>

          {/* Layout mode button */}
          <button
            onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'cuatrimestres' : 'tree')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all"
            title={layoutMode === 'tree' ? 'Cambiar a vista por Cuatrimestres' : 'Cambiar a vista Árbol'}
          >
            {layoutMode === 'tree' ? (
              <>
                <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Árbol</span>
              </>
            ) : (
              <>
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Cuatris</span>
              </>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Configurar simulación"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
