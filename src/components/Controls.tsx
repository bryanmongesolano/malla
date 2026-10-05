import React, { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  Crosshair,
  ZoomIn,
  Pencil,
  FlaskConical,
  Undo2,
  Filter,
  Check,
  Layers,
  Clock,
  GraduationCap,
  EyeOff,
  GitFork,
  Columns
} from 'lucide-react';
import type { FilterMode } from './Header.js';
import type { LayoutMode } from '../layout.js';

export interface CanvasControlsProps {
  hasSelection?: boolean;
  onEdit?: () => void;
  isSimulationMode: boolean;
  onStartSimulation: () => void;
  onExitSimulation: () => void;
  filterMode: FilterMode;
  onSetFilterMode: (m: FilterMode) => void;
  layoutMode: LayoutMode;
  onSetLayoutMode: (m: LayoutMode) => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  hasSelection,
  onEdit,
  isSimulationMode,
  onStartSimulation,
  onExitSimulation,
  filterMode,
  onSetFilterMode,
  layoutMode,
  onSetLayoutMode
}) => {
  const { fitView, getNodes, getNodesBounds, setCenter } = useReactFlow();
  const [isZoomedIn, setIsZoomedIn] = useState(false);
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

  const handleToggleView = () => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) {
      fitView({ padding: 0.15, duration: 400 });
      setIsZoomedIn(false);
      return;
    }

    if (isZoomedIn) {
      fitView({ padding: 0.15, duration: 400 });
      setIsZoomedIn(false);
    } else {
      const bounds = getNodesBounds(nodes);
      const targetCenterX = bounds.x + bounds.width / 2;
      const targetCenterY = bounds.y + bounds.height / 2;
      setCenter(targetCenterX, targetCenterY, { zoom: 0.85, duration: 400 });
      setIsZoomedIn(true);
    }
  };

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
    <>
      {/* Left Cluster: Simular, Filtro, Vista */}
      <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-3 sm:left-5 z-30 flex items-center gap-2 nodrag nopan">
        {/* 1. Simulation Toggle Button */}
        {!isSimulationMode ? (
          <button
            onClick={onStartSimulation}
            className="h-12 min-h-[48px] px-3.5 rounded-2xl border border-purple-300/80 dark:border-purple-800/80 bg-purple-50/90 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Iniciar modo de simulación"
          >
            <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">Simular</span>
          </button>
        ) : (
          <button
            onClick={onExitSimulation}
            className="h-12 min-h-[48px] px-3.5 rounded-2xl border border-amber-500/70 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 ring-1 ring-amber-500/40"
            title="Volver al avance real"
          >
            <Undo2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">Volver</span>
          </button>
        )}

        {/* 2. Filter Button (icon only, active glow when not 'todas', menu opens upwards) */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterMenuOpen(prev => !prev)}
            className={`w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border transition-all cursor-pointer shadow-xl backdrop-blur-md active:scale-95 ${
              filterMode !== 'todas'
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/70 ring-1 ring-cyan-500/40'
                : 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300'
            }`}
            title="Filtrar materias"
          >
            <Filter className="w-5 h-5" />
          </button>

          {filterMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2.5 z-50 w-52 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                          : 'text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800'
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

        {/* 3. Layout Mode Toggle (icon only: Árbol / Cuatrimestres) */}
        <button
          onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'cuatrimestres' : 'tree')}
          className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border border-slate-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title={layoutMode === 'tree' ? 'Cambiar a vista Cuatris' : 'Cambiar a vista Árbol'}
        >
          {layoutMode === 'tree' ? (
            <GitFork className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          ) : (
            <Columns className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>

      {/* Right Cluster: Edit (above) and Zoom (below) */}
      <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-5 z-30 flex flex-col items-center gap-2 nodrag nopan">
        {/* 4. Edit Button (appears smoothly directly above zoom when a course is selected) */}
        {hasSelection && (
          <button
            onClick={onEdit}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center bg-cyan-500/20 dark:bg-cyan-500/20 border border-cyan-500/60 text-cyan-700 dark:text-cyan-300 rounded-2xl shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ring-1 ring-cyan-500/30 animate-in fade-in zoom-in-95 duration-200"
            title="Editar estado"
          >
            <Pencil className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </button>
        )}

        {/* 5. Zoom / Fit View Toggle Button */}
        <button
          onClick={handleToggleView}
          className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white/95 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 rounded-2xl shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title={isZoomedIn ? 'Mostrar toda la malla' : 'Acercar al centro'}
        >
          {isZoomedIn ? (
            <Crosshair className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          ) : (
            <ZoomIn className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>
    </>
  );
};
