import React from 'react';
import { Check, Clock, Play, GraduationCap, Lock, X } from 'lucide-react';
import type { StandardCourse, CourseStatus, StoredStatus } from '@shared/types.js';
import { canTransition } from '@shared/transitions.js';
import { arePrereqsMet } from '@shared/status.js';
import { CurriculumModel } from '@shared/curriculum.js';

interface StatusMenuProps {
  item: StandardCourse;
  currentStatus: CourseStatus;
  anchorRect: DOMRect | null;
  model: CurriculumModel;
  progress: Record<string, StoredStatus>;
  onClose: () => void;
  onSelectStatus: (status: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia') => void;
}

export const StatusMenu: React.FC<StatusMenuProps> = ({
  item,
  currentStatus,
  anchorRect,
  model,
  progress,
  onClose,
  onSelectStatus
}) => {
  const isPrereqsMet = arePrereqsMet(item.id, model, progress);

  // Base natural status: disponible if prereqs met, bloqueada otherwise
  const baseStatus = isPrereqsMet ? 'disponible' : 'bloqueada';
  const checkBase = canTransition(item.id, baseStatus, model, progress);
  const isBaseSelected = currentStatus === baseStatus;

  // Test transition availability for each option
  const checkCursando = canTransition(item.id, 'cursando', model, progress);
  const checkSuficiencia = canTransition(item.id, 'suficiencia', model, progress);
  const checkCompletada = canTransition(item.id, 'completada', model, progress);

  // Position popover
  const style: React.CSSProperties = {};
  if (anchorRect && window.innerWidth >= 640) {
    const top = Math.min(window.innerHeight - 260, Math.max(80, anchorRect.top - 20));
    const left = Math.min(window.innerWidth - 300, Math.max(20, anchorRect.right + 16));
    style.top = `${top}px`;
    style.left = `${left}px`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        style={style}
        className="relative z-10 w-full sm:w-[290px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom sm:slide-in-from-left duration-200"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{item.id}</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
              {item.name}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {item.credits} créditos · Cuatri {item.period}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {/* 1. Base status: Disponible o Bloqueada */}
          {isPrereqsMet ? (
            <button
              disabled={!checkBase.allowed && !isBaseSelected}
              onClick={() => {
                onSelectStatus('disponible');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                isBaseSelected
                  ? 'bg-sky-500/20 border-sky-500 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500'
                  : checkBase.allowed
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-sky-500/50'
                  : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Disponible</span>
              </div>
              {isBaseSelected && <Check className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
            </button>
          ) : (
            <button
              disabled={!checkBase.allowed && !isBaseSelected}
              onClick={() => {
                onSelectStatus('bloqueada');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                isBaseSelected
                  ? 'bg-slate-200/80 border-slate-400 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 ring-1 ring-slate-400'
                  : checkBase.allowed
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{currentStatus === 'suficiencia' ? 'Desmarcar suficiencia' : 'Bloqueada'}</span>
              </div>
              {isBaseSelected && <Check className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            </button>
          )}

          {/* 2. Cursando */}
          <button
            disabled={!checkCursando.allowed && currentStatus !== 'cursando'}
            onClick={() => {
              onSelectStatus('cursando');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              currentStatus === 'cursando'
                ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500'
                : checkCursando.allowed
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-500/50'
                : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Cursando</span>
            </div>
            {currentStatus === 'cursando' && <Check className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
          </button>
          {!checkCursando.allowed && currentStatus !== 'cursando' && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400/90 px-1 leading-tight">{checkCursando.reason}</p>
          )}

          {/* 3. Suficiencia (Morado) */}
          <button
            disabled={!checkSuficiencia.allowed && currentStatus !== 'suficiencia'}
            onClick={() => {
              onSelectStatus('suficiencia');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              currentStatus === 'suficiencia'
                ? 'bg-purple-500/20 border-purple-500 text-purple-800 dark:text-purple-200 ring-1 ring-purple-500'
                : checkSuficiencia.allowed
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-purple-500/50'
                : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <div className="flex flex-col items-start text-left">
                <span>Suficiencia</span>
                {!isPrereqsMet && (
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 font-normal">
                    {currentStatus === 'suficiencia' ? '(Requisitos pendientes)' : 'Adelantada (atenuada)'}
                  </span>
                )}
              </div>
            </div>
            {currentStatus === 'suficiencia' && <Check className="w-4 h-4 text-purple-500 dark:text-purple-400" />}
          </button>
          {!checkSuficiencia.allowed && currentStatus !== 'suficiencia' && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400/90 px-1 leading-tight">{checkSuficiencia.reason}</p>
          )}

          {/* 4. Completada */}
          <button
            disabled={!checkCompletada.allowed && currentStatus !== 'completada'}
            onClick={() => {
              onSelectStatus('completada');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              currentStatus === 'completada'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500'
                : checkCompletada.allowed
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-500/50'
                : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Completada</span>
            </div>
            {currentStatus === 'completada' && <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
          </button>
          {!checkCompletada.allowed && currentStatus !== 'completada' && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400/90 px-1 leading-tight">{checkCompletada.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
};
