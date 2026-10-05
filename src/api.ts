import type {
  Curriculum,
  CourseStatus,
  StoredStatus,
  UserSettings,
  OverallProgress,
  SimulationResult
} from '@shared/types.js';

export interface FullClientState {
  username: string;
  progress: Record<string, StoredStatus>;
  settings: UserSettings;
  statuses: Record<string, CourseStatus>;
  overall: OverallProgress;
  simulation: SimulationResult;
  curriculum: Curriculum;
}

export async function fetchState(): Promise<FullClientState> {
  const res = await fetch('/api/state', {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.reload();
      throw new Error('Sesión expirada o no autenticada');
    }
    throw new Error(`Error del servidor (${res.status}) al obtener el estado`);
  }

  return res.json();
}

export async function updateProgress(
  itemId: string,
  status: 'disponible' | 'cursando' | 'completada' | 'suficiencia'
): Promise<{ ok: boolean; state: FullClientState }> {
  const res = await fetch(`/api/progress/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el progreso');
  }

  return data;
}

export async function updateSettings(
  coursesPerPeriod: number
): Promise<{ ok: boolean; state: FullClientState }> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ coursesPerPeriod })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar la configuración');
  }

  return data;
}
