import type {
  StoredStatus,
  SimulationResult,
  SimulationPeriod
} from './types.js';
import { CurriculumModel, isElectiveBlock } from './curriculum.js';
import { getDirectDependents } from './graph.js';

interface PeriodInfo {
  year: number;
  periodIndex: 0 | 1 | 2; // 0: Ene-Abr, 1: May-Ago, 2: Sep-Dic
}

function getPeriodLabel(p: PeriodInfo): string {
  const names = ['Ene–Abr', 'May–Ago', 'Sep–Dic'];
  return `${names[p.periodIndex]} ${p.year}`;
}

function getPeriodEndLabel(p: PeriodInfo): string {
  const endMonths = ['abr', 'ago', 'dic'];
  return `${endMonths[p.periodIndex]} ${p.year}`;
}

function advancePeriod(p: PeriodInfo): PeriodInfo {
  if (p.periodIndex === 2) {
    return { year: p.year + 1, periodIndex: 0 };
  }
  return { year: p.year, periodIndex: (p.periodIndex + 1) as 0 | 1 | 2 };
}

function getCurrentPeriodInfo(referenceDate: Date = new Date()): PeriodInfo {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-11
  let periodIndex: 0 | 1 | 2 = 0;
  if (month >= 0 && month <= 3) {
    periodIndex = 0; // Ene-Abr
  } else if (month >= 4 && month <= 7) {
    periodIndex = 1; // May-Ago
  } else {
    periodIndex = 2; // Sep-Dic
  }
  return { year, periodIndex };
}

export function simulateGraduation(
  model: CurriculumModel,
  progress: Record<string, StoredStatus>,
  coursesPerPeriod: number = 4,
  currentDate: Date = new Date()
): SimulationResult {
  const items = model.getAllItems();

  // Completed items set (courses or elective options)
  const completed = new Set<string>();
  const cursandoItems: string[] = [];

  for (const item of items) {
    if (isElectiveBlock(item)) {
      for (const opt of item.options) {
        if (progress[opt.id] === 'completada') {
          completed.add(opt.id);
        } else if (progress[opt.id] === 'cursando') {
          cursandoItems.push(opt.id);
        }
      }
    } else {
      if (progress[item.id] === 'completada') {
        completed.add(item.id);
      } else if (progress[item.id] === 'cursando') {
        cursandoItems.push(item.id);
      }
    }
  }

  // Calculate dependency chain length for remaining courses to find critical path
  const memoDepth = new Map<string, number>();
  const calculateDepth = (itemId: string, visited: Set<string>): number => {
    if (memoDepth.has(itemId)) return memoDepth.get(itemId)!;
    if (visited.has(itemId)) return 0;

    visited.add(itemId);
    const deps = getDirectDependents(itemId, model);
    let maxChildDepth = 0;
    for (const d of deps) {
      maxChildDepth = Math.max(maxChildDepth, calculateDepth(d, new Set(visited)));
    }
    const depth = maxChildDepth + 1;
    memoDepth.set(itemId, depth);
    return depth;
  };

  for (const item of items) {
    calculateDepth(item.id, new Set());
  }

  // Find overall critical path from all uncompleted courses
  const criticalPathItems: string[] = [];
  let maxPathDepth = 0;
  let criticalStart: string | null = null;

  for (const item of items) {
    if (!completed.has(item.id)) {
      const d = memoDepth.get(item.id) || 0;
      if (d > maxPathDepth) {
        maxPathDepth = d;
        criticalStart = item.id;
      }
    }
  }

  if (criticalStart) {
    let curr: string | null = criticalStart;
    const pathVisited = new Set<string>();
    while (curr && !pathVisited.has(curr)) {
      criticalPathItems.push(curr);
      pathVisited.add(curr);
      const deps: string[] = getDirectDependents(curr, model).filter(d => !completed.has(d));
      if (deps.length === 0) break;
      deps.sort((a: string, b: string) => (memoDepth.get(b) || 0) - (memoDepth.get(a) || 0));
      curr = deps[0];
    }
  }

  const periods: SimulationPeriod[] = [];
  let currentPeriod = getCurrentPeriodInfo(currentDate);

  // If there are courses currently in cursando, they belong to the current active period
  if (cursandoItems.length > 0) {
    periods.push({
      periodIndex: 0,
      label: `${getPeriodLabel(currentPeriod)} (Actual)`,
      itemIds: [...cursandoItems]
    });

    // Mark cursando as completed at the end of the current period
    for (const id of cursandoItems) {
      completed.add(id);
    }
    currentPeriod = advancePeriod(currentPeriod);
  }

  // Helper to test if an elective block is completed
  const isBlockCompleted = (blockId: string): boolean => {
    const block = model.getItem(blockId);
    if (!block || !isElectiveBlock(block)) return false;
    const count = block.options.filter(opt => completed.has(opt.id)).length;
    return count >= block.required;
  };

  const isPrereqSatisfied = (prereqId: string): boolean => {
    const item = model.getItem(prereqId);
    if (item && isElectiveBlock(item)) {
      return isBlockCompleted(prereqId);
    }
    return completed.has(prereqId);
  };

  // Helper to determine remaining units
  const getRemainingItems = () => {
    const remaining: { id: string; name: string; priority: number }[] = [];

    for (const item of items) {
      if (isElectiveBlock(item)) {
        const completedOpts = item.options.filter(opt => completed.has(opt.id)).length;
        const needed = item.required - completedOpts;
        if (needed > 0) {
          // Check if block prereqs are satisfied
          const prereqsMet = item.prereqs.every(isPrereqSatisfied);
          if (prereqsMet) {
            // Pick options that have their own prereqs satisfied
            const availableOptions = item.options.filter(
              opt => !completed.has(opt.id) && opt.prereqs.every(isPrereqSatisfied)
            );
            // Sort options by priority
            availableOptions.sort((a, b) => (memoDepth.get(b.id) || 0) - (memoDepth.get(a.id) || 0));

            for (let i = 0; i < Math.min(needed, availableOptions.length); i++) {
              const opt = availableOptions[i];
              remaining.push({
                id: opt.id,
                name: `${item.name}: ${opt.name}`,
                priority: (memoDepth.get(item.id) || 1) + (memoDepth.get(opt.id) || 0)
              });
            }
          }
        }
      } else {
        if (!completed.has(item.id)) {
          const prereqsMet = item.prereqs.every(isPrereqSatisfied);
          if (prereqsMet) {
            remaining.push({
              id: item.id,
              name: item.name,
              priority: memoDepth.get(item.id) || 0
            });
          }
        }
      }
    }

    return remaining;
  };

  // Check if everything is already completed
  const isEverythingCompleted = (): boolean => {
    for (const item of items) {
      if (isElectiveBlock(item)) {
        const cCount = item.options.filter(opt => completed.has(opt.id)).length;
        if (cCount < item.required) return false;
      } else {
        if (!completed.has(item.id)) return false;
      }
    }
    return true;
  };

  const maxSafetyIterations = 30; // maximum 10 years of simulation
  let iteration = 0;

  while (!isEverythingCompleted() && iteration < maxSafetyIterations) {
    iteration++;
    const candidates = getRemainingItems();

    if (candidates.length === 0) {
      // No courses can be taken (should not happen in a valid DAG unless prerequisites are unresolvable)
      break;
    }

    // Sort candidates by critical path priority (depth descending)
    candidates.sort((a, b) => b.priority - a.priority);

    // Take up to coursesPerPeriod
    const countToTake = Math.min(coursesPerPeriod, candidates.length);
    const chosen = candidates.slice(0, countToTake);

    periods.push({
      periodIndex: periods.length,
      label: getPeriodLabel(currentPeriod),
      itemIds: chosen.map(c => c.id)
    });

    for (const c of chosen) {
      completed.add(c.id);
    }

    if (isEverythingCompleted()) {
      break;
    }

    currentPeriod = advancePeriod(currentPeriod);
  }

  const lastPeriod = periods.length > 0 ? currentPeriod : getCurrentPeriodInfo(currentDate);
  const estimatedGraduationDate = getPeriodEndLabel(lastPeriod);
  const remainingTime = isEverythingCompleted()
    ? 'completado'
    : getRemainingTimeText(estimatedGraduationDate, currentDate);

  return {
    periodsRemaining: periods.length,
    estimatedGraduationDate,
    remainingTime,
    periods,
    criticalPath: criticalPathItems
  };
}

export function getRemainingTimeText(
  estimatedGraduationDate?: string,
  referenceDate: Date = new Date()
): string {
  if (!estimatedGraduationDate) return '';

  const match = estimatedGraduationDate.match(/([a-zA-Záéíóúñ]+)\s*(\d{4})/i);
  if (!match) return estimatedGraduationDate;

  const monthStr = match[1].toLowerCase().slice(0, 3);
  const targetYear = parseInt(match[2], 10);

  const monthMap: Record<string, number> = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11
  };

  const targetMonth = monthMap[monthStr] ?? 11;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  const totalMonths = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);

  if (totalMonths <= 0) {
    return 'este mes';
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const yearPart = years === 1 ? '1 año' : `${years} años`;
  const monthPart = months === 1 ? '1 mes' : `${months} meses`;

  if (years > 0 && months > 0) {
    return `${monthPart} y ${yearPart}`;
  }
  if (years > 0) {
    return yearPart;
  }
  return monthPart;
}
