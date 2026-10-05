import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Settings,
  GitFork,
  Columns,
  GraduationCap,
  Layers,
  Clock,
  EyeOff,
  FlaskConical,
  Undo2,
  Check
} from 'lucide-react';
import type { OverallProgress, SimulationResult } from '@shared/types.js';
import type { LayoutMode } from '../layout.js';

export type FilterMode = 'todas' | 'disponibles' | 'suficiencia' | 'ocultar_completadas';

interface HeaderProps {
  overall: OverallProgress;
  simulation: SimulationResult;
  filterMode: FilterMode;
  layoutMode: LayoutMode;
  isSimulationMode: boolean;
  onSetFilterMode: (m: FilterMode) => void;
  onSetLayoutMode: (m: LayoutMode) => void;
  onOpenSettings: () => void;
  onStartSimulation: () => void;
  onExitSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  overall,
  simulation,
  filterMode,
  layoutMode,
  isSimulationMode,
  onSetFilterMode,
  onSetLayoutMode,
  onOpenSettings,
  onStartSimulation,
  onExitSimulation
}) => {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  const filterOptions: { id: FilterMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'todas',
      label: 'Todas las materias',
      icon: <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
    },
    {
      id: 'disponibles',
      label: 'Solo disponibles',
      icon: <Clock className="w-4 h-4 text-sky-500" />
    },
    {
      id: 'suficiencia',
      label: 'Suficiencia',
      icon: <GraduationCap className="w-4 h-4 text-purple-500" />
    },
    {
      id: 'ocultar_completadas',
      label: 'Ocultar completadas',
      icon: <EyeOff className="w-4 h-4 text-emerald-500" />
    }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3.5 py-2 sm:px-5 sm:py-2.5 transition-colors duration-200">
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Progress bar + metrics on left, Settings button centered vertically on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${overall.percentCompleted}%` }}
              />
            </div>

            {/* Directly underneath: Date on left, data & green % on right */}
            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
              {/* Left: Graduation date (only icon, month and year) */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{simulation.estimatedGraduationDate}</span>
              </div>

              {/* Right: Subtle dots + numbers, ending with percentage in green */}
              <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium" title="Completadas">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{overall.completedUnits}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium" title="Cursando">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>{overall.cursandoUnits}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium" title="Disponibles">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span>{overall.availableUnits}</span>
                </span>
                {overall.suficienciaUnits > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium" title="Suficiencia">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span>{overall.suficienciaUnits}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium" title="Bloqueadas">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                  <span>{overall.blockedUnits}</span>
                </span>

                {/* Percentage in progress bar green */}
                <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400 ml-1">
                  {overall.percentCompleted}%
                </span>
              </div>
            </div>
          </div>

          {/* Settings icon only, vertically centered */}
          <button
            onClick={onOpenSettings}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0 self-center"
            title="Ajustes"
          >
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Row 3: Action Toolbar (Simulate on left, Filter & View on right with slate icon color) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-900/60">
          {/* Left: Simulation button */}
          {!isSimulationMode ? (
            <button
              onClick={onStartSimulation}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-purple-300 bg-purple-100 hover:bg-purple-200 text-purple-900 dark:border-purple-800/80 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Iniciar modo de simulación"
            >
              <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Simular</span>
            </button>
          ) : (
            <button
              onClick={onExitSimulation}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ring-1 ring-amber-500/40"
              title="Volver al avance real"
            >
              <Undo2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Volver</span>
            </button>
          )}

          {/* Right: Filter & View buttons with slate icon color matching settings */}
          <div className="flex items-center gap-2">
            {/* Filter button (icon only, active color only when not 'todas') */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterMenuOpen(prev => !prev)}
                className={`min-w-[42px] min-h-[42px] p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                  filterMode !== 'todas'
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/70 ring-1 ring-cyan-500/40'
                    : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Filtrar materias"
              >
                <Filter className="w-5 h-5" />
              </button>

              {/* Dropdown menu without header */}
              {filterMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl animate-in fade-in duration-150">
                  <div className="space-y-1">
                    {filterOptions.map(opt => {
                      const isSelected = filterMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onSetFilterMode(opt.id);
                            setFilterMenuOpen(false);
                          }}
                          className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {opt.icon}
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Layout mode button (icon only, color matching settings) */}
            <button
              onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'cuatrimestres' : 'tree')}
              className="min-w-[42px] min-h-[42px] p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title={layoutMode === 'tree' ? 'Cambiar a vista Cuatris' : 'Cambiar a vista Árbol'}
            >
              {layoutMode === 'tree' ? (
                <GitFork className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              ) : (
                <Columns className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
