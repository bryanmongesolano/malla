import React, { useState, useRef, useEffect } from 'react';
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
  Columns,
  GraduationCap,
  ChevronDown,
  Layers,
  EyeOff
} from 'lucide-react';
import type { OverallProgress, SimulationResult } from '@shared/types.js';
import type { LayoutMode } from '../layout.js';

export type FilterMode = 'todas' | 'disponibles' | 'suficiencia' | 'ocultar_completadas';

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

  const currentFilterLabel = filterOptions.find(o => o.id === filterMode)?.label || 'Filtrar';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 py-2 sm:px-5 sm:py-2.5 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-7xl mx-auto">
        {/* Left: Title + % Bar + Counters */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight truncate">
              Ingeniería del Software
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
            {overall.suficienciaUnits > 0 && (
              <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-100 border border-purple-300 dark:text-purple-300 dark:bg-purple-950/50 dark:border-purple-800/80 px-2 py-0.5 rounded-md font-medium" title="Suficiencia">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{overall.suficienciaUnits}</span>
              </span>
            )}
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

        {/* Right: Action buttons (larger for finger accessibility) */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Selectable Filter Menu Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterMenuOpen(prev => !prev)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                filterMode !== 'todas'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/70 ring-1 ring-cyan-500/40'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
              title="Seleccionar filtro de materias"
            >
              <Filter className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-none">{currentFilterLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${filterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Filtrar vista
                </div>
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
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
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

          {/* Layout mode button */}
          <button
            onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'cuatrimestres' : 'tree')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title={layoutMode === 'tree' ? 'Cambiar a vista por Cuatrimestres' : 'Cambiar a vista Árbol'}
          >
            {layoutMode === 'tree' ? (
              <>
                <GitFork className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Árbol</span>
              </>
            ) : (
              <>
                <Columns className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Cuatris</span>
              </>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="min-w-[42px] min-h-[42px] p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-95"
            title="Configurar simulación"
          >
            <Sliders className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="min-w-[42px] min-h-[42px] p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-95"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
