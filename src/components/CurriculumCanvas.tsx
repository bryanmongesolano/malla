import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useViewport,
  type NodeTypes
} from '@xyflow/react';
import type { StandardCourse, ElectiveBlock, CurriculumItem } from '@shared/types.js';
import { CurriculumModel, isElectiveBlock, getCoursesUnlockedByCursando, arePrereqsMet } from '@shared/index.js';
import { getAllAncestors, getDirectDependents } from '@shared/graph.js';
import { buildNodesAndEdges, type LayoutMode } from '../layout.js';
import { CourseNode } from './CourseNode.js';
import { ElectiveBlockNode } from './ElectiveBlockNode.js';
import { StatusMenu } from './StatusMenu.js';
import { ElectiveSheet } from './ElectiveSheet.js';
import { CanvasControls } from './Controls.js';
import { CanvasGestures } from './CanvasGestures.js';
import type { FullClientState } from '../api.js';
import type { FilterMode } from './Header.js';

const nodeTypes: NodeTypes = {
  course: CourseNode as any,
  electiveBlock: ElectiveBlockNode as any
};

/**
 * AdaptiveBackground dynamically scales SVG pattern dot radius and grid gap
 * based on the active viewport zoom level (Figma / Miro style LOD), keeping
 * dots subtle, delicate, and non-distracting at low zoom levels.
 */
const AdaptiveBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { zoom } = useViewport();

  // Multi-tier Level of Detail (LOD) grid gap to maintain ~20-25px visual spacing on screen
  const gap = useMemo(() => {
    if (zoom < 0.35) return 96;
    if (zoom < 0.6) return 48;
    return 24;
  }, [zoom]);

  // Scaled pattern size: delicate at low zoom (~1.1px diameter) and crisp at normal zoom (~1.4px)
  const size = useMemo(() => {
    const targetPx = zoom < 0.45 ? 1.1 : 1.4;
    return Math.max(0.8, targetPx / Math.max(zoom, 0.08));
  }, [zoom]);

  // Soft, low-contrast colors that fade gently at low zoom without dominating the canvas
  const color = useMemo(() => {
    if (isDark) {
      return zoom < 0.45 ? 'rgba(148, 163, 184, 0.07)' : 'rgba(148, 163, 184, 0.12)';
    }
    return zoom < 0.45 ? 'rgba(100, 116, 139, 0.09)' : 'rgba(100, 116, 139, 0.16)';
  }, [isDark, zoom]);

  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={gap}
      size={size}
      color={color}
    />
  );
};

interface CurriculumCanvasProps {
  state: FullClientState;
  layoutMode: LayoutMode;
  filterMode: FilterMode;
  isDark: boolean;
  isSimulationMode: boolean;
  onStartSimulation: () => void;
  onExitSimulation: () => void;
  onSetFilterMode: (m: FilterMode) => void;
  onSetLayoutMode: (m: LayoutMode) => void;
  onUpdateCourseStatus: (itemId: string, status: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia') => Promise<void>;
  onError: (msg: string) => void;
}

export const CurriculumCanvas: React.FC<CurriculumCanvasProps> = ({
  state,
  layoutMode,
  filterMode,
  isDark,
  isSimulationMode,
  onStartSimulation,
  onExitSimulation,
  onSetFilterMode,
  onSetLayoutMode,
  onUpdateCourseStatus,
  onError
}) => {
  const model = useMemo(() => new CurriculumModel(state.curriculum), [state.curriculum]);

  // Currently selected node for highlighting route
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // StatusMenu modal state (for standard courses)
  const [menuCourse, setMenuCourse] = useState<{ item: StandardCourse; anchor: DOMRect | null } | null>(null);

  // ElectiveSheet modal state (for elective blocks)
  const [sheetBlock, setSheetBlock] = useState<ElectiveBlock | null>(null);

  // Compute base nodes and edges
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    return buildNodesAndEdges(state.curriculum, layoutMode);
  }, [state.curriculum, layoutMode]);

  // Route highlight calculation
  const { ancestors, directDependents } = useMemo(() => {
    if (!selectedId) {
      return { ancestors: new Set<string>(), directDependents: new Set<string>() };
    }
    const anc = getAllAncestors(selectedId, model);
    const dep = new Set(getDirectDependents(selectedId, model));
    return { ancestors: anc, directDependents: dep };
  }, [selectedId, model]);

  // Courses unlocked hypothetically when currently "cursando" courses finish
  const unlockedByCursando = useMemo(() => {
    return getCoursesUnlockedByCursando(model, state.progress);
  }, [model, state.progress]);

  // Single-tap selection with double-tap cancellation (so double-tap zoom doesn't select/toggle node)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickNodeIdRef = useRef<string | null>(null);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    const now = Date.now();
    const timeSinceLast = now - lastClickTimeRef.current;
    const isQuickDoubleTap = timeSinceLast < 280 && lastClickNodeIdRef.current === node.id;

    lastClickTimeRef.current = now;
    lastClickNodeIdRef.current = node.id;

    if (isQuickDoubleTap) {
      // User is double-tapping on this course to zoom in.
      // Cancel the pending single-tap selection!
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      setSelectedId(prev => (prev === node.id ? null : node.id));
      clickTimerRef.current = null;
    }, 250);
  }, []);

  const handlePaneClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setSelectedId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleOpenSelection = useCallback(() => {
    if (!selectedId) return;
    const item = model.getItem(selectedId);
    if (!item) return;
    if (isElectiveBlock(item)) {
      setSheetBlock(item);
    } else {
      setMenuCourse({ item, anchor: null });
    }
  }, [selectedId, model]);

  // Decorate nodes with current statuses, highlights, gestures
  const displayNodes = useMemo(() => {
    return rawNodes.map(node => {
      const id = node.id;
      const status = state.statuses[id] || 'bloqueada';
      const item = node.data.item as CurriculumItem;
      const isUnlockedByCursando = unlockedByCursando.has(id);
      const isPrereqsMet = arePrereqsMet(id, model, state.progress);

      let isFiltered = false;
      if (filterMode === 'disponibles') {
        isFiltered = status !== 'disponible' && !(status === 'suficiencia' && isPrereqsMet) && !isUnlockedByCursando;
      } else if (filterMode === 'suficiencia') {
        isFiltered = status !== 'suficiencia';
      } else if (filterMode === 'ocultar_completadas') {
        isFiltered = status === 'completada';
      }

      let highlightRole: 'selected' | 'ancestor' | 'dependent' | null = null;
      if (selectedId) {
        if (id === selectedId) highlightRole = 'selected';
        else if (ancestors.has(id)) highlightRole = 'ancestor';
        else if (directDependents.has(id)) highlightRole = 'dependent';
      }

      const isDimmed = !!selectedId;

      if (isElectiveBlock(item)) {
        const completedCount = item.options.filter(
          opt => state.statuses[opt.id] === 'completada'
        ).length;

        return {
          ...node,
          data: {
            item,
            status,
            completedCount,
            isPrereqsMet,
            isDimmed,
            isFiltered,
            isUnlockedByCursando,
            highlightRole,
            layoutMode
          }
        };
      }

      return {
        ...node,
        data: {
          item,
          status,
          isPrereqsMet,
          isDimmed,
          isFiltered,
          isUnlockedByCursando,
          highlightRole,
          layoutMode
        }
      };
    });
  }, [
    rawNodes,
    state.statuses,
    state.progress,
    model,
    selectedId,
    ancestors,
    directDependents,
    filterMode,
    unlockedByCursando,
    layoutMode
  ]);

  // Decorate edges with highlight styling
  const displayEdges = useMemo(() => {
    const isHorizontal = layoutMode === 'horizontal' || layoutMode === 'cuatrimestres';

    return rawEdges.map(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;

      const sourceCompleted = state.statuses[sourceId] === 'completada';
      const isCursandoUnlockEdge =
        state.statuses[sourceId] === 'cursando' &&
        unlockedByCursando.has(targetId);

      const pathOptions = { borderRadius: 16 };

      if (!selectedId) {
        if (isHorizontal) {
          // Horizontal View: Clean, neutral lines without color clutter
          return {
            ...edge,
            pathOptions,
            style: {
              stroke: isDark ? '#475569' : '#94a3b8',
              strokeWidth: 1.5,
              opacity: isDark ? 0.35 : 0.4
            }
          };
        }

        // Tree View: Subtle status indications
        if (isCursandoUnlockEdge) {
          return {
            ...edge,
            pathOptions,
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 2.5,
              strokeDasharray: '6,4',
              opacity: 0.9
            }
          };
        }

        return {
          ...edge,
          pathOptions,
          style: {
            stroke: sourceCompleted ? '#10b981' : (isDark ? '#475569' : '#94a3b8'),
            strokeWidth: sourceCompleted ? 2.2 : 1.5,
            opacity: sourceCompleted ? 0.75 : 0.35
          }
        };
      }

      // Check if edge is in highlighted path
      const isAncestorEdge =
        (ancestors.has(sourceId) && ancestors.has(targetId)) ||
        (ancestors.has(sourceId) && targetId === selectedId);

      const isDependentEdge =
        (sourceId === selectedId && directDependents.has(targetId)) ||
        (directDependents.has(sourceId) && directDependents.has(targetId));

      if (isAncestorEdge) {
        if (isCursandoUnlockEdge) {
          return {
            ...edge,
            pathOptions,
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 3.5,
              strokeDasharray: '6,4',
              opacity: 1
            }
          };
        }
        return {
          ...edge,
          pathOptions,
          animated: true,
          style: {
            stroke: '#c084fc',
            strokeWidth: 3.5,
            opacity: 1
          }
        };
      }

      if (isDependentEdge) {
        if (isCursandoUnlockEdge) {
          return {
            ...edge,
            pathOptions,
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 3.5,
              strokeDasharray: '6,4',
              opacity: 1
            }
          };
        }
        return {
          ...edge,
          pathOptions,
          animated: true,
          style: {
            stroke: '#22d3ee',
            strokeWidth: 3.5,
            opacity: 1
          }
        };
      }

      if (isCursandoUnlockEdge) {
        return {
          ...edge,
          pathOptions,
          animated: true,
          style: {
            stroke: '#f59e0b',
            strokeWidth: 1.5,
            strokeDasharray: '5,4',
            opacity: 0.3
          }
        };
      }

      // Dimmed unrelated edge
      return {
        ...edge,
        pathOptions,
        style: {
          stroke: isDark ? '#1e293b' : '#cbd5e1',
          strokeWidth: 1,
          opacity: isDark ? 0.08 : 0.15
        }
      };
    });
  }, [rawEdges, selectedId, ancestors, directDependents, state.statuses, unlockedByCursando, layoutMode, isDark]);

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none transition-colors duration-200">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.15}
        maxZoom={2.5}
        zoomOnDoubleClick={true}
        zoomOnPinch={true}
        panOnDrag={true}
        panOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeClickDistance={8}
        paneClickDistance={8}
      >
        <AdaptiveBackground isDark={isDark} />
        <CanvasControls
          hasSelection={!!selectedId}
          onEdit={handleOpenSelection}
          isSimulationMode={isSimulationMode}
          onStartSimulation={onStartSimulation}
          onExitSimulation={onExitSimulation}
          filterMode={filterMode}
          onSetFilterMode={onSetFilterMode}
          layoutMode={layoutMode}
          onSetLayoutMode={onSetLayoutMode}
        />
        <CanvasGestures />
      </ReactFlow>

      {/* Course status popover menu */}
      {menuCourse && (
        <StatusMenu
          item={menuCourse.item}
          currentStatus={state.statuses[menuCourse.item.id] || 'bloqueada'}
          anchorRect={menuCourse.anchor}
          model={model}
          progress={state.progress}
          onClose={() => setMenuCourse(null)}
          onSelectStatus={async status => {
            try {
              await onUpdateCourseStatus(menuCourse.item.id, status);
            } catch (err: any) {
              onError(err.message || 'Error al actualizar');
            }
          }}
        />
      )}

      {/* Elective block options modal sheet */}
      {sheetBlock && (
        <ElectiveSheet
          block={sheetBlock}
          blockStatus={state.statuses[sheetBlock.id] || 'bloqueada'}
          optionStatuses={state.statuses}
          model={model}
          progress={state.progress}
          onClose={() => setSheetBlock(null)}
          onUpdateStatus={async (optId, status) => {
            try {
              await onUpdateCourseStatus(optId, status);
            } catch (err: any) {
              onError(err.message || 'Error al actualizar optativa');
            }
          }}
        />
      )}
    </div>
  );
};
