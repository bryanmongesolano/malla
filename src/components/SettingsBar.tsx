import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface SettingsBarProps {
  coursesPerPeriod: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeCourses: (courses: number) => void;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  coursesPerPeriod,
  isDark,
  onToggleTheme,
  onChangeCourses
}) => {
  return (
    <div className="w-full bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 py-0.5 sm:px-5 shadow-sm transition-colors duration-200 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Course count select without button styling */}
        <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
          <span className="shrink-0">Materias por cuatri:</span>
          <select
            value={coursesPerPeriod}
            onChange={(e) => onChangeCourses(parseInt(e.target.value, 10))}
            className="bg-transparent border-0 font-bold text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none py-2 pr-1"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option
                key={n}
                value={n}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {n} {n === 1 ? 'materia' : 'materias'}
              </option>
            ))}
          </select>
        </label>

        {/* Theme toggle without button styling (styled identically to topbar settings button) */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="min-w-[42px] min-h-[42px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0"
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
};
