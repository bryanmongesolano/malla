import React, { useState } from 'react';
import { X, Settings, Check, Sun, Moon } from 'lucide-react';

interface SettingsDialogProps {
  currentCoursesPerPeriod: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onClose: () => void;
  onSave: (coursesPerPeriod: number) => Promise<void>;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  currentCoursesPerPeriod,
  isDark,
  onToggleTheme,
  onClose,
  onSave
}) => {
  const [coursesPerPeriod, setCoursesPerPeriod] = useState<number>(currentCoursesPerPeriod);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(coursesPerPeriod);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <h3 className="text-base font-bold">Ajustes</h3>
          </div>
          <button
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
              Materias por cuatrimestre
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Ritmo de estudio
            </p>

            <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={coursesPerPeriod}
                onChange={e => setCoursesPerPeriod(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600 dark:accent-cyan-500"
              />
              <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 w-8 text-center">
                {coursesPerPeriod}
              </span>
            </div>
          </div>

          {/* Theme toggle row inside Settings */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Tema
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Modo visual
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 transition-all"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Oscuro</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
