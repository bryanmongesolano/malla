import type {
  CourseStatus,
  StoredStatus,
  OverallProgress
} from './types.js';
import { CurriculumModel, isElectiveBlock } from './curriculum.js';

export function computeAllStatuses(
  model: CurriculumModel,
  progress: Record<string, StoredStatus>
): Record<string, CourseStatus> {
  const statuses: Record<string, CourseStatus> = {};
  const items = model.getAllItems();

  // Helper to check if a specific prerequisite ID is completed
  const isPrereqCompleted = (prereqId: string): boolean => {
    // If the prereq is an elective block, check if the block is completed
    const item = model.getItem(prereqId);
    if (item && isElectiveBlock(item)) {
      const completedOpts = item.options.filter(
        opt => progress[opt.id] === 'completada'
      ).length;
      return completedOpts >= item.required;
    }
    return progress[prereqId] === 'completada';
  };

  // Evaluate courses
  for (const item of items) {
    if (isElectiveBlock(item)) {
      // Evaluate options first
      const completedOptionsCount = item.options.filter(
        opt => progress[opt.id] === 'completada'
      ).length;

      const hasCursandoOption = item.options.some(
        opt => progress[opt.id] === 'cursando'
      );

      // Check block prereqs
      const blockPrereqsMet = item.prereqs.every(isPrereqCompleted);

      if (completedOptionsCount >= item.required) {
        statuses[item.id] = 'completada';
      } else if (hasCursandoOption) {
        statuses[item.id] = 'cursando';
      } else if (blockPrereqsMet) {
        statuses[item.id] = 'disponible';
      } else {
        statuses[item.id] = 'bloqueada';
      }

      // Now determine status of each elective option
      for (const opt of item.options) {
        const stored = progress[opt.id];
        if (stored === 'completada') {
          statuses[opt.id] = 'completada';
        } else if (stored === 'cursando') {
          statuses[opt.id] = 'cursando';
        } else {
          // It is not completed or cursando. Check if it can be available:
          // Parent block must not be locked, and option's own prereqs must be met
          const optionPrereqsMet = opt.prereqs.every(isPrereqCompleted);
          if (blockPrereqsMet && optionPrereqsMet) {
            statuses[opt.id] = 'disponible';
          } else {
            statuses[opt.id] = 'bloqueada';
          }
        }
      }
    } else {
      // Standard Course
      const stored = progress[item.id];
      if (stored === 'completada') {
        statuses[item.id] = 'completada';
      } else if (stored === 'cursando') {
        statuses[item.id] = 'cursando';
      } else {
        const prereqsMet = item.prereqs.every(isPrereqCompleted);
        if (prereqsMet) {
          statuses[item.id] = 'disponible';
        } else {
          statuses[item.id] = 'bloqueada';
        }
      }
    }
  }

  return statuses;
}

export function computeOverallProgress(
  model: CurriculumModel,
  progress: Record<string, StoredStatus>
): OverallProgress {
  const statuses = computeAllStatuses(model, progress);
  const items = model.getAllItems();

  let totalUnits = 0;
  let completedUnits = 0;
  let cursandoUnits = 0;
  let availableUnits = 0;
  let blockedUnits = 0;

  let totalCredits = 0;
  let completedCredits = 0;

  for (const item of items) {
    totalCredits += item.credits;

    if (isElectiveBlock(item)) {
      totalUnits += item.required;

      const completedOpts = item.options.filter(
        opt => statuses[opt.id] === 'completada'
      ).length;

      const cursandoOpts = item.options.filter(
        opt => statuses[opt.id] === 'cursando'
      ).length;

      const effectiveCompleted = Math.min(completedOpts, item.required);
      completedUnits += effectiveCompleted;

      // Credits proportional to completed units in elective block
      const perUnitCredits = item.credits / item.required;
      completedCredits += effectiveCompleted * perUnitCredits;

      const remainingNeeded = Math.max(0, item.required - effectiveCompleted);
      const effectiveCursando = Math.min(cursandoOpts, remainingNeeded);
      cursandoUnits += effectiveCursando;

      if (effectiveCompleted >= item.required) {
        // Block is completed
      } else if (statuses[item.id] === 'disponible') {
        availableUnits += remainingNeeded - effectiveCursando;
      } else {
        blockedUnits += remainingNeeded - effectiveCursando;
      }
    } else {
      totalUnits += 1;
      const status = statuses[item.id];
      if (status === 'completada') {
        completedUnits += 1;
        completedCredits += item.credits;
      } else if (status === 'cursando') {
        cursandoUnits += 1;
      } else if (status === 'disponible') {
        availableUnits += 1;
      } else {
        blockedUnits += 1;
      }
    }
  }

  const percentCompleted =
    totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return {
    totalUnits,
    completedUnits,
    cursandoUnits,
    availableUnits,
    blockedUnits,
    percentCompleted,
    totalCredits,
    completedCredits
  };
}

/**
 * Identifies courses that are currently 'bloqueada' but will be unlocked
 * as soon as the currently 'cursando' courses are completed.
 */
export function getCoursesUnlockedByCursando(
  model: CurriculumModel,
  progress: Record<string, StoredStatus>
): Set<string> {
  const result = new Set<string>();
  const currentStatuses = computeAllStatuses(model, progress);

  const hasCursando = Object.values(progress).some(s => s === 'cursando');
  if (!hasCursando) return result;

  // Hypothetical progress assuming all currently cursando are approved
  const hypotheticalProgress: Record<string, StoredStatus> = {};
  for (const [id, s] of Object.entries(progress)) {
    if (s === 'completada' || s === 'cursando') {
      hypotheticalProgress[id] = 'completada';
    }
  }

  const hypotheticalStatuses = computeAllStatuses(model, hypotheticalProgress);

  for (const item of model.getAllItems()) {
    // If currently blocked, but becomes disponible if cursando courses are completed
    if (
      currentStatuses[item.id] === 'bloqueada' &&
      hypotheticalStatuses[item.id] === 'disponible'
    ) {
      result.add(item.id);
    }
  }

  return result;
}
