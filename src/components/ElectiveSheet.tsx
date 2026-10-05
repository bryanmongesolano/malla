import React from 'react';
import { X, Check, Play, Clock, Lock } from 'lucide-react';
import type { ElectiveBlock, CourseStatus, StoredStatus } from '@shared/types.js';
import { CurriculumModel } from '@shared/curriculum.js';
import { canTransition } from '@shared/transitions.js';

interface ElectiveSheetProps {
  block: ElectiveBlock;
  blockStatus: CourseStatus;
  optionStatuses: Record<string, CourseStatus>;
  model: CurriculumModel;
  progress: Record<string, StoredStatus>;
  onClose: () => void;
  onUpdateStatus: (optionId: string, status: 'disponible' | 'cursando' | 'completada') => void;
}

export const ElectiveSheet: React.FC<ElectiveSheetProps> = ({
  block,
  blockStatus,
  optionStatuses,
  model,
  progress,
  onClose,
  onUpdateStatus
}) => {
  const completedCount = block.options.filter(
    opt => optionStatuses[opt.id] === 'completada'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">{block.id}</span>
            <h2 className="text-lg font-bold text-slate-100">{block.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">
                Selecciona {block.required} curso(s) electivo(s)
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30">
                {completedCount} / {block.required} completado(s)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locked warning */}
        {blockStatus === 'bloqueada' && (
          <div className="my-3 p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Este bloque aún tiene requisitos pendientes antes de poder cursar sus opciones.</span>
          </div>
        )}

        {/* Options list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {block.options.map(opt => {
            const status = optionStatuses[opt.id] || 'bloqueada';
            const checkDisponible = canTransition(opt.id, 'disponible', model, progress);
            const checkCursando = canTransition(opt.id, 'cursando', model, progress);
            const checkCompletada = canTransition(opt.id, 'completada', model, progress);

            return (
              <div
                key={opt.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">{opt.id}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          status === 'completada'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : status === 'cursando'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : status === 'disponible'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 mt-1 leading-snug">
                      {opt.name}
                    </h4>
                    {opt.prereqs.length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Requisito: {opt.prereqs.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* State selector buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    disabled={!checkDisponible.allowed && status !== 'disponible'}
                    onClick={() => onUpdateStatus(opt.id, 'disponible')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      status === 'disponible'
                        ? 'bg-sky-600 text-white font-bold'
                        : checkDisponible.allowed
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Disponible</span>
                  </button>

                  <button
                    disabled={!checkCursando.allowed && status !== 'cursando'}
                    onClick={() => onUpdateStatus(opt.id, 'cursando')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      status === 'cursando'
                        ? 'bg-amber-600 text-white font-bold'
                        : checkCursando.allowed
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Cursando</span>
                  </button>

                  <button
                    disabled={!checkCompletada.allowed && status !== 'completada'}
                    onClick={() => onUpdateStatus(opt.id, 'completada')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      status === 'completada'
                        ? 'bg-emerald-600 text-white font-bold'
                        : checkCompletada.allowed
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Completada</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
