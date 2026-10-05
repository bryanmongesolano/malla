import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchState, updateProgress, updateSettings, type FullClientState } from './api.js';
import { Header, type FilterMode } from './components/Header.js';
import { CurriculumCanvas } from './components/CurriculumCanvas.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { AlertBanner } from './components/AlertBanner.js';
import type { LayoutMode } from './layout.js';
import type { StoredStatus, UserSettings } from '@shared/types.js';
import {
  CurriculumModel,
  computeAllStatuses,
  computeOverallProgress,
  simulateGraduation,
  canTransition
} from '@shared/index.js';
import { AlertCircle, Loader2 } from 'lucide-react';

export function App() {
  const [state, setState] = useState<FullClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings & filter modes
  const [filterMode, setFilterMode] = useState<FilterMode>('todas');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('tree');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Simulation mode (Sandbox)
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState<Record<string, StoredStatus> | null>(null);
  const [simulatedSettings, setSimulatedSettings] = useState<UserSettings | null>(null);

  // Alert banner notification (under topbar)
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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

  // Window focus refetch for cross-device sync (disabled while actively in simulation)
  useEffect(() => {
    const handleFocus = () => {
      if (!isSimulationMode) {
        loadData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !isSimulationMode) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData, isSimulationMode]);

  // Curriculum model for simulation
  const model = useMemo(() => {
    return state ? new CurriculumModel(state.curriculum) : null;
  }, [state?.curriculum]);

  // Active state: either real state or locally simulated state
  const activeState = useMemo<FullClientState | null>(() => {
    if (!state || !model) return null;
    if (!isSimulationMode || !simulatedProgress || !simulatedSettings) {
      return state;
    }

    const statuses = computeAllStatuses(model, simulatedProgress);
    const overall = computeOverallProgress(model, simulatedProgress);
    const simulation = simulateGraduation(model, simulatedProgress, simulatedSettings.coursesPerPeriod);

    return {
      ...state,
      progress: simulatedProgress,
      settings: simulatedSettings,
      statuses,
      overall,
      simulation
    };
  }, [state, model, isSimulationMode, simulatedProgress, simulatedSettings]);

  const handleStartSimulation = () => {
    if (!state) return;
    setSimulatedProgress({ ...state.progress });
    setSimulatedSettings({ ...state.settings });
    setIsSimulationMode(true);
  };

  const handleExitSimulation = () => {
    setIsSimulationMode(false);
    setSimulatedProgress(null);
    setSimulatedSettings(null);
  };

  const handleUpdateCourseStatus = async (
    itemId: string,
    newStatus: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia'
  ) => {
    if (!state || !model) return;

    // Simulation mode: mutate in-memory snapshot only (no backend calls)
    if (isSimulationMode && simulatedProgress) {
      const check = canTransition(itemId, newStatus, model, simulatedProgress);
      if (!check.allowed && newStatus !== 'bloqueada' && newStatus !== 'disponible') {
        setToastMsg(check.reason || 'Transición no permitida');
        return;
      }

      const updated = { ...simulatedProgress };
      if (newStatus === 'disponible' || newStatus === 'bloqueada') {
        delete updated[itemId];
      } else {
        updated[itemId] = newStatus;
      }
      setSimulatedProgress(updated);
      return;
    }

    // Normal mode: optimistic update with backend persistence
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
    if (isSimulationMode && simulatedSettings) {
      setSimulatedSettings({
        ...simulatedSettings,
        coursesPerPeriod
      });
      return;
    }

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

  // Auto-blur buttons on touch/click to prevent sticky hover/focus background
  useEffect(() => {
    const blurBtn = (target: EventTarget | null) => {
      const btn = (target as HTMLElement)?.closest('button');
      if (btn) {
        btn.blur();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        blurBtn(e.target);
      }
    };
    const handleClick = (e: MouseEvent) => {
      blurBtn(e.target);
    };

    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm font-medium tracking-wide">Cargando malla curricular...</span>
      </div>
    );
  }

  if (error || !state || !activeState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-200">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 p-6 rounded-2xl shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Error de conexión</h2>
          <p className="text-xs text-slate-400">{error || 'No se pudo obtener el estado.'}</p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Header
        overall={activeState.overall}
        simulation={activeState.simulation}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <AlertBanner
        message={alertMsg}
        onDismiss={() => setAlertMsg(null)}
      />

      <main className="flex-1 w-full relative min-h-0 overflow-hidden">
        <CurriculumCanvas
          state={activeState}
          layoutMode={layoutMode}
          filterMode={filterMode}
          isDark={isDark}
          isSimulationMode={isSimulationMode}
          onStartSimulation={handleStartSimulation}
          onExitSimulation={handleExitSimulation}
          onSetFilterMode={setFilterMode}
          onSetLayoutMode={setLayoutMode}
          onUpdateCourseStatus={handleUpdateCourseStatus}
          onShowAlert={msg => setAlertMsg(msg)}
        />
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsDialog
          currentCoursesPerPeriod={activeState.settings.coursesPerPeriod}
          isDark={isDark}
          onToggleTheme={() => setIsDark(prev => !prev)}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
