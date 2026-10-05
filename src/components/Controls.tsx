import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow, useViewport, useNodesInitialized, getViewportForBounds } from '@xyflow/react';
import {
  Crosshair,
  ZoomIn,
  Play,
  FlaskConical,
  Undo2,
  Filter,
  Check,
  Layers,
  Clock,
  GraduationCap,
  EyeOff,
  GitFork,
  Columns,
  Lock
} from 'lucide-react';
import type { FilterMode } from './Header.js';
import type { LayoutMode } from '../layout.js';
import type { CurriculumItem, CourseStatus } from '@shared/types.js';
import { isElectiveBlock } from '@shared/index.js';

export interface CourseActionTransition {
  allowed: boolean;
  reason?: string;
}

export interface CourseTransitions {
  base: CourseActionTransition;
  suficiencia: CourseActionTransition;
  cursando: CourseActionTransition;
  completada: CourseActionTransition;
}

export interface CanvasControlsProps {
  selectedItem: CurriculumItem | null;
  selectedStatus?: CourseStatus;
  isPrereqsMet?: boolean;
  transitions?: CourseTransitions | null;
  onActionStatus?: (target: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia') => void;
  onOpenElectiveSheet?: () => void;
  onShowAlert?: (msg: string) => void;
  isSimulationMode: boolean;
  onStartSimulation: () => void;
  onExitSimulation: () => void;
  filterMode: FilterMode;
  onSetFilterMode: (m: FilterMode) => void;
  layoutMode: LayoutMode;
  onSetLayoutMode: (m: LayoutMode) => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  selectedItem,
  selectedStatus,
  isPrereqsMet,
  transitions,
  onActionStatus,
  onOpenElectiveSheet,
  onShowAlert,
  isSimulationMode,
  onStartSimulation,
  onExitSimulation,
  filterMode,
  onSetFilterMode,
  layoutMode,
  onSetLayoutMode
}) => {
  const { fitView, getNodes, getNodesBounds, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const nodesInitialized = useNodesInitialized();
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Auto fit complete view when layout mode changes
  const prevLayoutModeRef = useRef<LayoutMode>(layoutMode);
  useEffect(() => {
    if (prevLayoutModeRef.current !== layoutMode) {
      prevLayoutModeRef.current = layoutMode;
      const t = setTimeout(() => {
        fitView({ padding: 0.18, duration: 400 });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [layoutMode, fitView]);

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

  // Exact fit zoom calculation using React Flow's native layout engine
  const calculateBaselineZoom = useCallback(() => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) return 0.25;
    const bounds = getNodesBounds(nodes);
    const container = document.querySelector('.react-flow');
    if (!container) return 0.25;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return 0.25;
    const vp = getViewportForBounds(bounds, rect.width, rect.height, 0.15, 2.5, 0.18);
    return vp.zoom;
  }, [getNodes, getNodesBounds]);

  const [baselineFitZoom, setBaselineFitZoom] = useState<number>(0.25);

  useEffect(() => {
    if (nodesInitialized) {
      setBaselineFitZoom(calculateBaselineZoom());
    }
  }, [nodesInitialized, layoutMode, calculateBaselineZoom]);

  useEffect(() => {
    const onResize = () => {
      if (nodesInitialized) {
        setBaselineFitZoom(calculateBaselineZoom());
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [nodesInitialized, calculateBaselineZoom]);

  // Reactive zoom state: any manual or automated zoom above baseline flips to "volver a estado normal"
  const isZoomedIn = zoom > baselineFitZoom + 0.04;

  const handleToggleView = () => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) {
      fitView({ padding: 0.18, duration: 400 });
      return;
    }

    const currentBaseline = calculateBaselineZoom();
    setBaselineFitZoom(currentBaseline);

    if (zoom > currentBaseline + 0.04) {
      // Zoomed in -> return to complete normal overview
      fitView({ padding: 0.18, duration: 400 });
    } else {
      // In overview -> zoom in to comfortable reading size (~0.68)
      const bounds = getNodesBounds(nodes);
      const isHorizontal = layoutMode === 'horizontal' || layoutMode === 'cuatrimestres';
      const targetZoom = Math.min(Math.max(currentBaseline * 2.2, 0.65), 0.72);

      if (isHorizontal) {
        // Focus on the left (Level 0 / start of career path)
        const targetX = bounds.x + 130;
        const targetY = bounds.y + bounds.height / 2;
        setCenter(targetX, targetY, { zoom: targetZoom, duration: 400 });
      } else {
        // Focus at the top center (Level 0 / foundation courses)
        const targetX = bounds.x + bounds.width / 2;
        const targetY = bounds.y + 110;
        setCenter(targetX, targetY, { zoom: targetZoom, duration: 400 });
      }
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
      icon: <Clock className="w-4 h-4 text-sky-500 dark:text-sky-400" />
    },
    {
      id: 'suficiencia',
      label: 'Por suficiencia',
      icon: <GraduationCap className="w-4 h-4 text-purple-500 dark:text-purple-400" />
    },
    {
      id: 'ocultar_completadas',
      label: 'Ocultar aprobadas',
      icon: <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
    }
  ];

  const baseStatus = isPrereqsMet ? 'disponible' : 'bloqueada';

  return (
    <>
      {/* Left Cluster: Simular, Filtrar, Vista */}
      <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-3 sm:left-5 z-30 flex items-center gap-2.5 nodrag nopan">
        {/* 1. Simulate Button */}
        {!isSimulationMode ? (
          <button
            onClick={onStartSimulation}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border border-slate-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
            title="Simular avance (Sandbox)"
          >
            <FlaskConical className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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

        {/* 3. Layout Mode Toggle (icon only: Árbol / Horizontal) */}
        <button
          onClick={() => onSetLayoutMode(layoutMode === 'tree' ? 'horizontal' : 'tree')}
          className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border border-slate-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title={layoutMode === 'tree' ? 'Cambiar a vista Horizontal' : 'Cambiar a vista Árbol'}
        >
          {layoutMode === 'tree' ? (
            <GitFork className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          ) : (
            <Columns className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>

      {/* Right Cluster: Selection Actions (above) and Zoom (below) */}
      <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-5 z-30 flex flex-col items-center gap-2 nodrag nopan">
        {/* If an elective block is selected: single button to open sheet */}
        {selectedItem && isElectiveBlock(selectedItem) && (
          <button
            onClick={onOpenElectiveSheet}
            className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/60 rounded-2xl shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ring-1 ring-purple-500/30 animate-in fade-in zoom-in-95 duration-200"
            title="Elegir materia optativa"
          >
            <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </button>
        )}

        {/* If a standard course is selected: 4 vertical buttons in requested order */}
        {selectedItem && !isElectiveBlock(selectedItem) && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Estado Base (Clock celeste si prereqs cumplidos, Lock gris si bloqueada) */}
            <button
              onClick={() => {
                if (selectedStatus === baseStatus) return;
                if (!transitions?.base.allowed) {
                  onShowAlert?.(transitions?.base.reason || 'No se puede cambiar a este estado.');
                  return;
                }
                onActionStatus?.(baseStatus);
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
                selectedStatus === baseStatus
                  ? isPrereqsMet
                    ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/70 ring-1 ring-sky-500/40'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-600 ring-1 ring-slate-400'
                  : transitions?.base.allowed
                  ? 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80'
                  : 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 opacity-40'
              }`}
              title={isPrereqsMet ? 'Disponible' : 'Bloqueada'}
            >
              {isPrereqsMet ? (
                <Clock className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              )}
            </button>

            {/* 2. Suficiencia (GraduationCap morado) */}
            <button
              onClick={() => {
                if (selectedStatus === 'suficiencia') {
                  // Toggle off -> revert to base
                  if (!transitions?.base.allowed) {
                    onShowAlert?.(transitions?.base.reason || 'No se puede desmarcar suficiencia.');
                    return;
                  }
                  onActionStatus?.(baseStatus);
                  return;
                }
                if (!transitions?.suficiencia.allowed) {
                  onShowAlert?.(transitions?.suficiencia.reason || 'No se puede marcar suficiencia.');
                  return;
                }
                onActionStatus?.('suficiencia');
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
                selectedStatus === 'suficiencia'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/70 ring-1 ring-purple-500/40'
                  : transitions?.suficiencia.allowed
                  ? 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80'
                  : 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 opacity-40'
              }`}
              title="Suficiencia"
            >
              <GraduationCap className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </button>

            {/* 3. Cursando (Play ámbar) */}
            <button
              onClick={() => {
                if (selectedStatus === 'cursando') {
                  // Toggle off -> revert to base
                  if (!transitions?.base.allowed) {
                    onShowAlert?.(transitions?.base.reason || 'No se puede desmarcar cursando.');
                    return;
                  }
                  onActionStatus?.(baseStatus);
                  return;
                }
                if (!transitions?.cursando.allowed) {
                  onShowAlert?.(transitions?.cursando.reason || 'No se puede marcar cursando.');
                  return;
                }
                onActionStatus?.('cursando');
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
                selectedStatus === 'cursando'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/70 ring-1 ring-amber-500/40'
                  : transitions?.cursando.allowed
                  ? 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80'
                  : 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 opacity-40'
              }`}
              title="Cursando"
            >
              <Play className="w-5 h-5 text-amber-500 dark:text-amber-400 fill-amber-500/20" />
            </button>

            {/* 4. Completada (Check verde) */}
            <button
              onClick={() => {
                if (selectedStatus === 'completada') {
                  // Toggle off -> revert to base
                  if (!transitions?.base.allowed) {
                    onShowAlert?.(transitions?.base.reason || 'No se puede desmarcar completada.');
                    return;
                  }
                  onActionStatus?.(baseStatus);
                  return;
                }
                if (!transitions?.completada.allowed) {
                  onShowAlert?.(transitions?.completada.reason || 'No se puede marcar completada.');
                  return;
                }
                onActionStatus?.('completada');
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
                selectedStatus === 'completada'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/70 ring-1 ring-emerald-500/40'
                  : transitions?.completada.allowed
                  ? 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80'
                  : 'bg-white/95 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 opacity-40'
              }`}
              title="Completada"
            >
              <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* 5. Zoom / Reset View Toggle Button (Reactive) */}
        <button
          onClick={handleToggleView}
          className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border border-slate-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 shadow-xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title={isZoomedIn ? "Mostrar toda la malla" : "Acercar vista"}
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
