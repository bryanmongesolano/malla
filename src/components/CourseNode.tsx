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
      statusStyles = 'bg-emerald-950/90 text-emerald-100 border-emerald-500 shadow-emerald-950/40';
      break;
    case 'cursando':
      statusStyles = 'bg-amber-950/90 text-amber-100 border-amber-500 shadow-amber-950/40 ring-1 ring-amber-400/40';
      break;
    case 'disponible':
      statusStyles = 'bg-sky-950/90 text-sky-100 border-sky-500 shadow-sky-950/40';
      break;
    case 'bloqueada':
    default:
      statusStyles = 'bg-slate-900/90 text-slate-400 border-slate-700/80';
      break;
  }

  // Highlight roles
  let highlightStyles = '';
  if (highlightRole === 'selected') {
    highlightStyles = 'ring-4 ring-white shadow-2xl scale-[1.03] z-30';
  } else if (highlightRole === 'ancestor') {
    highlightStyles = 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50 scale-[1.02] z-20';
  } else if (highlightRole === 'dependent') {
    highlightStyles = 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-400/50 scale-[1.02] z-20';
  }

  // Dimming and filtering
  let opacityStyles = 'opacity-100';
  if (isFiltered) {
    opacityStyles = 'opacity-10 pointer-events-none grayscale';
  } else if (isDimmed && !highlightRole) {
    opacityStyles = 'opacity-25';
  }

  return (
    <div
      ref={nodeRef}
      {...gestures}
      className={`relative w-[180px] h-[72px] rounded-xl border-2 px-3 py-2 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 select-none shadow-md ${statusStyles} ${highlightStyles} ${opacityStyles}`}
      title={`${item.name} (${status})`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />

      <span className="text-[12px] font-semibold leading-tight line-clamp-3 pointer-events-none">
        {item.name}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />
    </div>
  );
});

CourseNode.displayName = 'CourseNode';
