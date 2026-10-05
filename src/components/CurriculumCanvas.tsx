import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type NodeTypes
} from '@xyflow/react';
import type { StandardCourse, ElectiveBlock, CurriculumItem } from '@shared/types.js';
import { CurriculumModel, isElectiveBlock, getCoursesUnlockedByCursando } from '@shared/index.js';
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

interface CurriculumCanvasProps {
  state: FullClientState;
  layoutMode: LayoutMode;
  filterMode: FilterMode;
  isDark: boolean;
  onUpdateCourseStatus: (itemId: string, status: 'disponible' | 'cursando' | 'completada' | 'suficiencia') => Promise<void>;
  onError: (msg: string) => void;
}

export const CurriculumCanvas: React.FC<CurriculumCanvasProps> = ({
  state,
  layoutMode,
  filterMode,
  isDark,
  onUpdateCourseStatus,
  onError
}) => {
  const model = useMemo(() => new CurriculumModel(state.curriculum), [state.curriculum]);

  // Currently selected node for highlighting route
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // StatusMenu modal state (for standard courses)
  const [menuCourse, setMenuCourse] = useState<{ item: StandardCourse; anchor: DOMRect } | null>(null);

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

  // Handlers for nodes
  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleOpenMenu = useCallback((id: string, anchorRect: DOMRect) => {
    const item = model.getItem(id);
    if (item && !isElectiveBlock(item)) {
      setMenuCourse({ item, anchor: anchorRect });
    }
  }, [model]);

  const handleOpenSheet = useCallback((id: string) => {
    const item = model.getItem(id);
    if (item && isElectiveBlock(item)) {
      setSheetBlock(item);
    }
  }, [model]);

  // Decorate nodes with current statuses, highlights, gestures
  const displayNodes = useMemo(() => {
    return rawNodes.map(node => {
      const id = node.id;
      const status = state.statuses[id] || 'bloqueada';
      const item = node.data.item as CurriculumItem;
      const isUnlockedByCursando = unlockedByCursando.has(id);

      let isFiltered = false;
      if (filterMode === 'disponibles') {
        isFiltered = status !== 'disponible' && status !== 'suficiencia' && !isUnlockedByCursando;
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
            isDimmed,
            isFiltered,
            isUnlockedByCursando,
            highlightRole,
            onOpenSheet: handleOpenSheet
          }
        };
      }

      return {
        ...node,
        data: {
          item,
          status,
          isDimmed,
          isFiltered,
          isUnlockedByCursando,
          highlightRole,
          onOpenMenu: handleOpenMenu
        }
      };
    });
  }, [
    rawNodes,
    state.statuses,
    selectedId,
    ancestors,
    directDependents,
    filterMode,
    unlockedByCursando,
    handleOpenMenu,
    handleOpenSheet
  ]);

  // Decorate edges with highlight styling
  const displayEdges = useMemo(() => {
    return rawEdges.map(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;

      const sourceCompleted = state.statuses[sourceId] === 'completada';
      const isCursandoUnlockEdge =
        state.statuses[sourceId] === 'cursando' &&
        unlockedByCursando.has(targetId);

      if (!selectedId) {
        if (isCursandoUnlockEdge) {
          return {
            ...edge,
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 3,
              strokeDasharray: '6,4',
              opacity: 1
            }
          };
        }

        return {
          ...edge,
          style: {
            stroke: sourceCompleted ? '#10b981' : '#475569',
            strokeWidth: sourceCompleted ? 2.5 : 1.5,
            opacity: sourceCompleted ? 0.8 : 0.4
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
          animated: true,
          style: {
            stroke: '#f59e0b',
            strokeWidth: 2,
            strokeDasharray: '5,4',
            opacity: 0.45
          }
        };
      }

      // Dimmed edge
      return {
        ...edge,
        style: {
          stroke: '#334155',
          strokeWidth: 1,
          opacity: 0.12
        }
      };
    });
  }, [rawEdges, selectedId, ancestors, directDependents, state.statuses, unlockedByCursando]);

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none transition-colors duration-200">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => handleSelect(node.id)}
        onPaneClick={() => setSelectedId(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color={isDark ? "#1e293b" : "#cbd5e1"}
        />
        <CanvasControls />
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
