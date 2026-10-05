import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { ElectiveBlock, CourseStatus } from '@shared/types.js';
import { useNodeGestures } from '../hooks/useNodeGestures.js';

export interface ElectiveBlockNodeData extends Record<string, unknown> {
  item: ElectiveBlock;
  status: CourseStatus;
  completedCount: number;
  isDimmed: boolean;
  isFiltered: boolean;
  highlightRole: 'selected' | 'ancestor' | 'dependent' | null;
  onSelect: (id: string) => void;
  onOpenSheet: (id: string) => void;
}

export type ElectiveBlockNodeType = Node<ElectiveBlockNodeData, 'electiveBlock'>;

export const ElectiveBlockNode = memo(({ data }: NodeProps<ElectiveBlockNodeType>) => {
  const { item, status, completedCount, isDimmed, isFiltered, highlightRole, onSelect, onOpenSheet } = data;
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const gestures = useNodeGestures({
    onSingleTap: () => {
      onSelect(item.id);
    },
    onDoubleTap: () => {
      onOpenSheet(item.id);
    },
    onLongPress: () => {
      onOpenSheet(item.id);
    }
  });

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

  let highlightStyles = '';
  if (highlightRole === 'selected') {
    highlightStyles = 'ring-4 ring-white shadow-2xl scale-[1.03] z-30';
  } else if (highlightRole === 'ancestor') {
    highlightStyles = 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50 scale-[1.02] z-20';
  } else if (highlightRole === 'dependent') {
    highlightStyles = 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-400/50 scale-[1.02] z-20';
  }

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
      className={`relative w-[180px] h-[72px] rounded-xl border-2 border-dashed px-3 py-2 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 select-none shadow-md ${statusStyles} ${highlightStyles} ${opacityStyles}`}
      title={`${item.name} (${completedCount}/${item.required})`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />

      <span className="text-[12px] font-semibold leading-tight line-clamp-2 pointer-events-none">
        {item.name}
      </span>
      <span className="text-[10px] mt-1 font-mono px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-300 pointer-events-none">
        {completedCount} / {item.required}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />
    </div>
  );
});

ElectiveBlockNode.displayName = 'ElectiveBlockNode';
