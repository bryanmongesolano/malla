import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { StandardCourse, CourseStatus } from '@shared/types.js';

export interface CourseNodeData extends Record<string, unknown> {
  item: StandardCourse;
  status: CourseStatus;
  isPrereqsMet?: boolean;
  isUnlockedByCursando?: boolean;
  isDimmed: boolean;
  isFiltered: boolean;
  highlightRole: 'selected' | 'ancestor' | 'dependent' | null;
  onOpenMenu: (id: string, anchorRect: DOMRect) => void;
}

export type CourseNodeType = Node<CourseNodeData, 'course'>;

export const CourseNode = memo(({ data }: NodeProps<CourseNodeType>) => {
  const {
    item,
    status,
    isPrereqsMet,
    isUnlockedByCursando,
    isDimmed,
    isFiltered,
    highlightRole,
    onOpenMenu
  } = data;
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [canClickAction, setCanClickAction] = React.useState(false);

  // Prevent double-tap zoom from accidentally clicking the newly mounted button
  React.useEffect(() => {
    if (highlightRole === 'selected') {
      const timer = setTimeout(() => {
        setCanClickAction(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCanClickAction(false);
    }
  }, [highlightRole]);

  // Base state styles (background, text, border)
  let statusStyles = '';
  let actionBtnTone = '';
  switch (status) {
    case 'completada':
      statusStyles = 'bg-emerald-100/95 text-emerald-950 border-emerald-500 shadow-emerald-900/10 dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-500 dark:shadow-emerald-950/40';
      actionBtnTone = 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-800/25';
      break;
    case 'cursando':
      statusStyles = 'bg-amber-100/95 text-amber-950 border-amber-500 shadow-amber-900/10 ring-1 ring-amber-400 dark:bg-amber-950/90 dark:text-amber-100 dark:border-amber-500 dark:shadow-amber-950/40 dark:ring-amber-400/40';
      actionBtnTone = 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-800/25';
      break;
    case 'disponible':
      statusStyles = 'bg-sky-100/95 text-sky-950 border-sky-500 shadow-sky-900/10 dark:bg-sky-950/90 dark:text-sky-100 dark:border-sky-500 dark:shadow-sky-950/40';
      actionBtnTone = 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-800/25';
      break;
    case 'suficiencia':
      if (isPrereqsMet === false) {
        // Bloqueada pero marcada como suficiencia: color morado atenuado con borde punteado
        statusStyles = 'bg-purple-50/75 text-purple-900/85 border-purple-300/80 border-dashed dark:bg-purple-950/35 dark:text-purple-300/85 dark:border-purple-600/50 dark:border-dashed shadow-sm';
        actionBtnTone = 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/30 border border-purple-400/40';
      } else {
        statusStyles = 'bg-purple-100/95 text-purple-950 border-purple-500 shadow-purple-900/10 ring-1 ring-purple-400 dark:bg-purple-950/90 dark:text-purple-100 dark:border-purple-500 dark:shadow-purple-950/40 dark:ring-purple-400/40';
        actionBtnTone = 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-800/25';
      }
      break;
    case 'bloqueada':
    default:
      if (isUnlockedByCursando) {
        // Desbloqueable al aprobar lo que está cursando: tono ámbar más discreto
        statusStyles = 'bg-amber-50/80 text-amber-950 border-amber-400/90 border-dashed dark:bg-amber-950/30 dark:text-amber-200/90 dark:border-amber-500/60 dark:border-dashed shadow-sm';
        actionBtnTone = 'bg-amber-700 hover:bg-amber-600 text-white shadow-amber-900/25';
      } else {
        statusStyles = 'bg-slate-200/90 text-slate-500 border-slate-300 dark:bg-slate-900/90 dark:text-slate-400 dark:border-slate-700/80';
        actionBtnTone = 'bg-slate-600 hover:bg-slate-500 text-white shadow-slate-900/25';
      }
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
      className={`relative w-[184px] min-h-[80px] rounded-xl border-2 px-3 py-2 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 select-none shadow-md ${statusStyles} ${highlightStyles} ${opacityStyles}`}
      title={`${item.name} (${status}${isPrereqsMet === false && status === 'suficiencia' ? ' [Requisitos pendientes]' : ''}${isUnlockedByCursando ? ' — Desbloquea al aprobar cursando' : ''})`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border-none !opacity-0"
      />

      <span className="text-[12px] font-semibold leading-tight line-clamp-2 pointer-events-none">
        {item.name}
      </span>

      {/* Action button shown when selected, styled with the course's status color */}
      {highlightRole === 'selected' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!canClickAction) return;
            if (nodeRef.current) {
              onOpenMenu(item.id, nodeRef.current.getBoundingClientRect());
            }
          }}
          className={`mt-2 px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 nodrag nopan ${actionBtnTone} ${
            canClickAction ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-80'
          }`}
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
