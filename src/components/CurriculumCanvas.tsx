import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  useViewport,
  PanOnScrollMode,
  getViewportForBounds,
  type NodeTypes
} from '@xyflow/react';
import type { ElectiveBlock, CurriculumItem } from '@shared/types.js';
import { CurriculumModel, isElectiveBlock, getCoursesUnlockedByCursando, arePrereqsMet, canTransition } from '@shared/index.js';
import { getAllAncestors, getDirectDependents } from '@shared/graph.js';
import { buildNodesAndEdges, type LayoutMode } from '../layout.js';
import { CourseNode } from './CourseNode.js';
import { ElectiveBlockNode } from './ElectiveBlockNode.js';
import { ElectiveSheet } from './ElectiveSheet.js';
import { CanvasControls } from './Controls.js';
import type { FullClientState } from '../api.js';
import type { FilterMode } from './Header.js';

const nodeTypes: NodeTypes = {
  course: CourseNode as any,
  electiveBlock: ElectiveBlockNode as any
};

/**
 * AdaptiveBackground keeps background dots visually constant on screen:
 * exact same dot size, exact same dot spacing, and exact same color
 * across all zoom levels.
 */
const AdaptiveBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { zoom } = useViewport();

  // Constant screen spacing (~24px) regardless of zoom level
  const gap = useMemo(() => {
    const currentZoom = Math.max(zoom, 0.05);
    return 24 / currentZoom;
  }, [zoom]);

  // Constant screen dot diameter (~1.5px) regardless of zoom level
  const size = useMemo(() => {
    const currentZoom = Math.max(zoom, 0.05);
    return 1.5 / currentZoom;
  }, [zoom]);

  // Softened opacity: clearly visible, but without harsh contrast
  const color = isDark ? 'rgba(43, 56, 76, 0.65)' : 'rgba(203, 213, 225, 0.70)';

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
  onShowAlert: (msg: string) => void;
}

const CurriculumCanvasInner: React.FC<CurriculumCanvasProps> = ({
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
  onShowAlert
}) => {
  const { fitView, getNodes, getNodesBounds, setCenter, getZoom } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => new CurriculumModel(state.curriculum), [state.curriculum]);

  // Currently selected node for highlighting route
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Exact fit zoom calculation using React Flow's native layout engine
  const calculateBaselineZoom = useCallback(() => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) return 0.25;
    const bounds = getNodesBounds(nodes);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return 0.25;
    const vp = getViewportForBounds(bounds, rect.width, rect.height, 0.15, 2.5, 0.18);
    return vp.zoom;
  }, [getNodes, getNodesBounds]);

  const prevSelectedIdRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Reset selection on layout mode change
  useEffect(() => {
    setSelectedId(null);
  }, [layoutMode]);

  // Zoom and pan to subject on selection/switch, return to overview on deselect
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevSelectedIdRef.current = selectedId;
      return;
    }

    if (prevSelectedIdRef.current === selectedId) {
      return;
    }
    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;

    if (!selectedId) {
      // Subject deselected -> return to general overview
      if (prevId !== null) {
        fitView({ padding: 0.18, duration: 400 });
      }
      return;
    }

    // Subject selected or switched -> zoom and move smoothly
    const nodes = getNodes();
    const targetNode = nodes.find(n => n.id === selectedId);
    if (!targetNode) return;

    const bounds = getNodesBounds([targetNode]);
    const targetX = bounds.x + bounds.width / 2;
    const targetY = bounds.y + bounds.height / 2;

    const currentBaseline = calculateBaselineZoom();
    const currentZoom = getZoom();
    const targetZoom = Math.min(Math.max(currentBaseline * 2.5, 0.82), 1.05);
    const effectiveZoom = currentZoom > targetZoom ? Math.min(currentZoom, 1.2) : targetZoom;
    const duration = prevId ? 300 : 400;

    setCenter(targetX, targetY, { zoom: effectiveZoom, duration });
  }, [selectedId, fitView, getNodes, getNodesBounds, getZoom, setCenter, calculateBaselineZoom]);

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

  // Instant node selection on tap (0ms delay, no double-tap wait)
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedId(prev => (prev === node.id ? null : node.id));
  }, []);

  const handlePaneClick = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedId(null);
  }, []);

  // Selected item and transition checks for the vertical action stack
  const selectedItem = useMemo(() => {
    return selectedId ? (model.getItem(selectedId) ?? null) : null;
  }, [selectedId, model]);

  const isPrereqsMet = useMemo(() => {
    if (!selectedItem || isElectiveBlock(selectedItem)) return false;
    return arePrereqsMet(selectedItem.id, model, state.progress);
  }, [selectedItem, model, state.progress]);

  const baseStatus = isPrereqsMet ? 'disponible' : 'bloqueada';
  const selectedStatus = selectedId ? (state.statuses[selectedId] || 'bloqueada') : undefined;

  const transitions = useMemo(() => {
    if (!selectedItem || isElectiveBlock(selectedItem)) return null;
    return {
      base: canTransition(selectedItem.id, baseStatus, model, state.progress),
      suficiencia: canTransition(selectedItem.id, 'suficiencia', model, state.progress),
      cursando: canTransition(selectedItem.id, 'cursando', model, state.progress),
      completada: canTransition(selectedItem.id, 'completada', model, state.progress)
    };
  }, [selectedItem, baseStatus, model, state.progress]);

  const handleActionStatus = useCallback(async (newStatus: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia') => {
    if (!selectedId) return;
    try {
      await onUpdateCourseStatus(selectedId, newStatus);
    } catch (err: any) {
      onShowAlert(err.message || 'Error al actualizar');
    }
  }, [selectedId, onUpdateCourseStatus, onShowAlert]);

  const handleOpenElectiveSheet = useCallback(() => {
    if (selectedItem && isElectiveBlock(selectedItem)) {
      setSheetBlock(selectedItem);
    }
  }, [selectedItem]);

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
    <div ref={containerRef} className="relative w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none transition-colors duration-200">
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
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.8}
        zoomOnPinch={true}
        panOnDrag={true}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        disableKeyboardA11y={true}
        nodeClickDistance={8}
        paneClickDistance={8}
      >
        <AdaptiveBackground isDark={isDark} />
        <CanvasControls
          selectedItem={selectedItem}
          selectedStatus={selectedStatus}
          isPrereqsMet={isPrereqsMet}
          transitions={transitions}
          onActionStatus={handleActionStatus}
          onOpenElectiveSheet={handleOpenElectiveSheet}
          onShowAlert={onShowAlert}
          onDeselect={() => setSelectedId(null)}
          onSelectNode={setSelectedId}
          isSimulationMode={isSimulationMode}
          onStartSimulation={onStartSimulation}
          onExitSimulation={onExitSimulation}
          filterMode={filterMode}
          onSetFilterMode={onSetFilterMode}
          layoutMode={layoutMode}
          onSetLayoutMode={onSetLayoutMode}
        />
      </ReactFlow>

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
              onShowAlert(err.message || 'Error al actualizar optativa');
            }
          }}
        />
      )}
    </div>
  );
};

export const CurriculumCanvas: React.FC<CurriculumCanvasProps> = (props) => (
  <ReactFlowProvider>
    <CurriculumCanvasInner {...props} />
  </ReactFlowProvider>
);
