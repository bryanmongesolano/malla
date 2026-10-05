import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { StandardCourse, CourseStatus } from '@shared/types.js';
import { useNodeGestures } from '../hooks/useNodeGestures.js';

export interface CourseNodeData extends Record<string, unknown> {
  item: StandardCourse;
  status: CourseStatus;
  isDimmed: boolean;
  isFiltered: boolean;
  highlightRole: 'selected' | 'ancestor' | 'dependent' | null;
  onSelect: (id: string) => void;
  onOpenMenu: (id: string, anchorRect: DOMRect) => void;
}

export type CourseNodeType = Node<CourseNodeData, 'course'>;

export const CourseNode = memo(({ data }: NodeProps<CourseNodeType>) => {
  const { item, status, isDimmed, isFiltered, highlightRole, onSelect, onOpenMenu } = data;
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const gestures = useNodeGestures({
    onSingleTap: () => {
      onSelect(item.id);
    },
    onDoubleTap: () => {
      if (nodeRef.current) {
        onOpenMenu(item.id, nodeRef.current.getBoundingClientRect());
      }
    },
    onLongPress: () => {
      if (nodeRef.current) {
        onOpenMenu(item.id, nodeRef.current.getBoundingClientRect());
      }
    }
  });

  // Base state styles (background, text, border)
  let statusStyles = '';
  switch (status) {
    case 'completada':
      statusStyles = 'bg-emerald-100/95 text-emerald-950 border-emerald-500 shadow-emerald-900/10 dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-500 dark:shadow-emerald-950/40';
      break;
    case 'cursando':
      statusStyles = 'bg-amber-100/95 text-amber-950 border-amber-500 shadow-amber-900/10 ring-1 ring-amber-400 dark:bg-amber-950/90 dark:text-amber-100 dark:border-amber-500 dark:shadow-amber-950/40 dark:ring-amber-400/40';
      break;
    case 'disponible':
      statusStyles = 'bg-sky-100/95 text-sky-950 border-sky-500 shadow-sky-900/10 dark:bg-sky-950/90 dark:text-sky-100 dark:border-sky-500 dark:shadow-sky-950/40';
      break;
    case 'bloqueada':
    default:
      statusStyles = 'bg-slate-200/90 text-slate-500 border-slate-300 dark:bg-slate-900/90 dark:text-slate-400 dark:border-slate-700/80';
      break;
  }

  // Highlight roles
  let highlightStyles = '';
  if (highlightRole === 'selected') {
    highlightStyles = 'ring-4 ring-cyan-500 dark:ring-white shadow-2xl scale-[1.04] z-30';
  } else if (highlightRole === 'ancestor') {
    highlightStyles = 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50 scale-[1.02] z-20';
  } else if (highlightRole === 'dependent') {
    highlightStyles = 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-400/50 scale-[1.02] z-20';
  }

  // Dimming and filtering
  let opacityStyles = 'opacity-100';
  if (isFiltered) {
    opacityStyles = 'opacity-15 pointer-events-none grayscale';
  } else if (isDimmed && !highlightRole) {
    opacityStyles = 'opacity-25';
  }

  return (
    <div
      ref={nodeRef}
      {...gestures}
      onClick={() => onSelect(item.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (nodeRef.current) {
          onOpenMenu(item.id, nodeRef.current.getBoundingClientRect());
        }
      }}
      className={`relative w-[184px] min-h-[76px] rounded-xl border-2 px-3 py-2 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 select-none shadow-md nodrag nopan ${statusStyles} ${highlightStyles} ${opacityStyles}`}
      title={`${item.name} (${status}) — Tap para seleccionar, Doble-tap para cambiar estado`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />

      <span className="text-[12px] font-semibold leading-tight line-clamp-2 pointer-events-none">
        {item.name}
      </span>

      {highlightRole === 'selected' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (nodeRef.current) {
              onOpenMenu(item.id, nodeRef.current.getBoundingClientRect());
            }
          }}
          className="mt-1.5 px-2.5 py-0.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-1 transition-transform active:scale-95"
        >
          <span>Cambiar estado</span>
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />
    </div>
  );
});

CourseNode.displayName = 'CourseNode';
