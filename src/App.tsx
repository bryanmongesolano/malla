import { useEffect, useState, useCallback } from 'react';
import { fetchState, updateProgress, updateSettings, type FullClientState } from './api.js';
import { Header, type FilterMode } from './components/Header.js';
import { CurriculumCanvas } from './components/CurriculumCanvas.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import type { LayoutMode } from './layout.js';
import { AlertCircle, Loader2 } from 'lucide-react';

export function App() {
  const [state, setState] = useState<FullClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings & filter modes
  const [filterMode, setFilterMode] = useState<FilterMode>('todas');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('tree');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Toast notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('malla_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('malla_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('malla_theme', 'light');
    }
  }, [isDark]);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await fetchState();
      setState(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Window focus refetch for cross-device sync (question 29)
  useEffect(() => {
    const handleFocus = () => {
      loadData(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  const handleUpdateCourseStatus = async (
    itemId: string,
    newStatus: 'disponible' | 'cursando' | 'completada'
  ) => {
    if (!state) return;

    // Optimistic update
    const previousState = { ...state };
    try {
      const res = await updateProgress(itemId, newStatus);
      setState(res.state);
    } catch (err: any) {
      // Revert optimistic update
      setState(previousState);
      setToastMsg(err.message || 'No se pudo actualizar el estado');
      throw err;
    }
  };

  const handleSaveSettings = async (coursesPerPeriod: number) => {
    try {
      const res = await updateSettings(coursesPerPeriod);
      setState(res.state);
    } catch (err: any) {
      setToastMsg(err.message || 'No se pudo guardar la configuración');
    }
  };

  // Toast auto-clear
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm font-medium tracking-wide">Cargando malla curricular...</span>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-200">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 p-6 rounded-2xl shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Error de conexión</h2>
          <p className="text-xs text-slate-400">{error || 'No se pudo obtener el estado.'}</p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Header
        overall={state.overall}
        simulation={state.simulation}
        filterMode={filterMode}
        layoutMode={layoutMode}
        isDark={isDark}
        onSetFilterMode={setFilterMode}
        onSetLayoutMode={setLayoutMode}
        onToggleTheme={() => setIsDark(prev => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 w-full relative">
        <CurriculumCanvas
          state={state}
          layoutMode={layoutMode}
          filterMode={filterMode}
          isDark={isDark}
          onUpdateCourseStatus={handleUpdateCourseStatus}
          onError={msg => setToastMsg(msg)}
        />
      </main>

      {/* Floating toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-rose-950/95 border border-rose-500/60 text-rose-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom duration-300">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-snug">{toastMsg}</div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-rose-400 hover:text-white p-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsDialog
          currentCoursesPerPeriod={state.settings.coursesPerPeriod}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
