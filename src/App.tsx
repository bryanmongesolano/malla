import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchState, updateProgress, updateSettings, type FullClientState } from './api.js';
import { Header, type FilterMode } from './components/Header.js';
import { CurriculumCanvas } from './components/CurriculumCanvas.js';
import { SettingsBar } from './components/SettingsBar.js';
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
import { computeThemeColor } from './themeColor.js';
import { AlertCircle, Loader2 } from 'lucide-react';

export function App() {
  const [state, setState] = useState<FullClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings & filter modes
  const [filterMode, setFilterMode] = useState<FilterMode>('todas');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('tree');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Simulation mode (Sandbox) with sessionStorage persistence so reloads don't drop to real DB mode
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('malla_simulation_active') === 'true';
    } catch {
      return false;
    }
  });
  const [simulatedProgress, setSimulatedProgress] = useState<Record<string, StoredStatus> | null>(() => {
    try {
      const saved = sessionStorage.getItem('malla_simulation_progress');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [simulatedSettings, setSimulatedSettings] = useState<UserSettings | null>(() => {
    try {
      const saved = sessionStorage.getItem('malla_simulation_settings');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Alert banner notification (under topbar)
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('malla_theme');
    return saved ? saved === 'dark' : true;
  });

  // Dynamically calculate the exact blended opaque color for topbar & iOS status bar
  const topbarColor = useMemo(() => {
    return computeThemeColor(isDark, isSimulationMode).color;
  }, [isDark, isSimulationMode]);

  useEffect(() => {
    // 1. Toggle dark class first so DOM styles reflect the active theme
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('malla_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('malla_theme', 'light');
    }

    // 2. Set on html/body and CSS variable
    document.documentElement.style.setProperty('--topbar-bg', topbarColor);
    document.documentElement.style.backgroundColor = topbarColor;
    document.body.style.backgroundColor = topbarColor;

    // 3. Update the dedicated fixed status bar element for iOS Safari live edge sampling
    const statusBarTint = document.getElementById('ios-status-bar-tint');
    if (statusBarTint) {
      statusBarTint.style.backgroundColor = topbarColor;
      statusBarTint.style.display = 'none';
      void statusBarTint.offsetHeight;
      statusBarTint.style.display = 'block';
    }

    // 4. Update the EXISTING theme-color meta tag (updates Safari bottom URL bar and Chrome/Android)
    const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', topbarColor);
    }
  }, [isDark, topbarColor]);

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
    if (!isSimulationMode) {
      return state;
    }

    const currentProgress = simulatedProgress ?? state.progress;
    const currentSettings = simulatedSettings ?? state.settings;

    const statuses = computeAllStatuses(model, currentProgress);
    const overall = computeOverallProgress(model, currentProgress);
    const simulation = simulateGraduation(model, currentProgress, currentSettings.coursesPerPeriod);

    return {
      ...state,
      progress: currentProgress,
      settings: currentSettings,
      statuses,
      overall,
      simulation
    };
  }, [state, model, isSimulationMode, simulatedProgress, simulatedSettings]);

  const handleStartSimulation = () => {
    if (!state) return;
    const progress = { ...state.progress };
    const settings = { ...state.settings };
    setSimulatedProgress(progress);
    setSimulatedSettings(settings);
    setIsSimulationMode(true);
    try {
      sessionStorage.setItem('malla_simulation_active', 'true');
      sessionStorage.setItem('malla_simulation_progress', JSON.stringify(progress));
      sessionStorage.setItem('malla_simulation_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  };

  const handleExitSimulation = () => {
    setIsSimulationMode(false);
    setSimulatedProgress(null);
    setSimulatedSettings(null);
    try {
      sessionStorage.removeItem('malla_simulation_active');
      sessionStorage.removeItem('malla_simulation_progress');
      sessionStorage.removeItem('malla_simulation_settings');
    } catch {
      // ignore
    }
  };

  const handleUpdateCourseStatus = async (
    itemId: string,
    newStatus: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia'
  ) => {
    if (!state || !model) return;

    // Simulation mode: mutate in-memory snapshot only (ABSOLUTELY NO backend calls)
    if (isSimulationMode) {
      const currentSim = { ...(simulatedProgress ?? state.progress) };
      const check = canTransition(itemId, newStatus, model, currentSim);
      if (!check.allowed && newStatus !== 'bloqueada' && newStatus !== 'disponible') {
        setAlertMsg(check.reason || 'Transición no permitida');
        return;
      }

      if (newStatus === 'disponible' || newStatus === 'bloqueada') {
        delete currentSim[itemId];
      } else {
        currentSim[itemId] = newStatus;
      }
      setSimulatedProgress(currentSim);
      try {
        sessionStorage.setItem('malla_simulation_progress', JSON.stringify(currentSim));
      } catch {
        // ignore
      }
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
      setAlertMsg(err.message || 'No se pudo actualizar el estado');
      throw err;
    }
  };

  const handleSaveSettings = async (coursesPerPeriod: number) => {
    if (isSimulationMode) {
      const currentSimSettings = {
        ...(simulatedSettings ?? state?.settings ?? { coursesPerPeriod: 4 }),
        coursesPerPeriod
      };
      setSimulatedSettings(currentSimSettings);
      try {
        sessionStorage.setItem('malla_simulation_settings', JSON.stringify(currentSimSettings));
      } catch {
        // ignore
      }
      return;
    }

    try {
      const res = await updateSettings(coursesPerPeriod);
      setState(res.state);
    } catch (err: any) {
      setAlertMsg(err.message || 'No se pudo guardar la configuración');
    }
  };

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
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(prev => !prev)}
        isSimulationMode={isSimulationMode}
        headerBgColor={topbarColor}
      />

      <main className="flex-1 w-full relative min-h-0 overflow-hidden">
        {/* Floating overlays: SettingsBar and AlertBanner (float over canvas without pushing it down) */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex flex-col">
          {isSettingsOpen && (
            <div className="pointer-events-auto">
              <SettingsBar
                coursesPerPeriod={activeState.settings.coursesPerPeriod}
                isDark={isDark}
                onToggleTheme={() => setIsDark(prev => !prev)}
                onChangeCourses={handleSaveSettings}
              />
            </div>
          )}
          {alertMsg && (
            <div className="pointer-events-auto">
              <AlertBanner
                message={alertMsg}
                onDismiss={() => setAlertMsg(null)}
              />
            </div>
          )}
        </div>

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
    </div>
  );
}
