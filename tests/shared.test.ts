import { describe, it, expect } from 'vitest';
import curriculumData from '../data/curriculum.json' with { type: 'json' };
import {
  CurriculumModel,
  computeAllStatuses,
  computeOverallProgress,
  computeDependencyLevels,
  canTransition,
  simulateGraduation,
  getDirectPrereqs,
  getAllAncestors,
  getDirectDependents,
  getAllDependents,
  getCoursesUnlockedByCursando
} from '../shared/index.js';
import type { Curriculum, StoredStatus } from '../shared/types.js';

describe('Curriculum Model and Graph Validation', () => {
  const model = new CurriculumModel(curriculumData as unknown as Curriculum);

  it('validates without any errors or cycles', () => {
    const result = model.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('loads exactly 43 main curriculum items totaling 141 credits', () => {
    const items = model.getAllItems();
    expect(items.length).toBe(43);
    const totalCredits = items.reduce((acc, c) => acc + c.credits, 0);
    expect(totalCredits).toBe(141);
  });

  it('correctly tracks ancestors for SOFT-23', () => {
    // SOFT-23 requires SOFT-17 and SOFT-22
    const direct = getDirectPrereqs('SOFT-23', model);
    expect(direct).toContain('SOFT-17');
    expect(direct).toContain('SOFT-22');

    const ancestors = getAllAncestors('SOFT-23', model);
    // SOFT-17 -> SOFT-14 -> SOFT-09
    expect(ancestors.has('SOFT-17')).toBe(true);
    expect(ancestors.has('SOFT-14')).toBe(true);
    expect(ancestors.has('SOFT-09')).toBe(true);
    // SOFT-22 -> SOFT-15 -> SOFT-12C1 -> (SOFT-04, SOFT-06C2) -> SOFT-02 -> SOFT-01
    expect(ancestors.has('SOFT-22')).toBe(true);
    expect(ancestors.has('SOFT-15')).toBe(true);
    expect(ancestors.has('SOFT-12C1')).toBe(true);
    expect(ancestors.has('SOFT-04')).toBe(true);
    expect(ancestors.has('SOFT-02')).toBe(true);
    expect(ancestors.has('SOFT-01')).toBe(true);
  });

  it('correctly computes dependency levels', () => {
    const levels = computeDependencyLevels(model);
    // Level 0 courses (no prereqs)
    expect(levels['SOFT-09']).toBe(0);
    expect(levels['FUN-02']).toBe(0);
    expect(levels['SOFT-01']).toBe(0);
    expect(levels['FUN-01']).toBe(0);
    expect(levels['FUN-08']).toBe(0);
    expect(levels['SOFT-06C2']).toBe(0);
    expect(levels['FUN-14']).toBe(0);
    expect(levels['FUN-04']).toBe(0);

    // SOFT-02 depends on SOFT-01 (lvl 0) -> lvl 1
    expect(levels['SOFT-02']).toBe(1);
    // SOFT-04 depends on SOFT-02 (lvl 1) -> lvl 2
    expect(levels['SOFT-04']).toBe(2);
  });
});

describe('Course Status and Progression', () => {
  const model = new CurriculumModel(curriculumData as unknown as Curriculum);

  it('starts with roots as disponible and others as bloqueada', () => {
    const progress: Record<string, StoredStatus> = {};
    const statuses = computeAllStatuses(model, progress);

    expect(statuses['SOFT-01']).toBe('disponible');
    expect(statuses['SOFT-02']).toBe('bloqueada');
    expect(statuses['FUN-05']).toBe('bloqueada');
    expect(statuses['SOFT-06C2']).toBe('disponible');
    expect(statuses['FUN-14']).toBe('disponible');
    expect(statuses['FUN-04']).toBe('disponible');
  });

  it('unlocks dependent courses when prerequisites are completed', () => {
    const progress: Record<string, StoredStatus> = {
      'SOFT-01': 'completada'
    };
    const statuses = computeAllStatuses(model, progress);

    expect(statuses['SOFT-01']).toBe('completada');
    expect(statuses['SOFT-02']).toBe('disponible');
    // SOFT-03 requires SOFT-01 AND FUN-01, so it should still be locked
    expect(statuses['SOFT-03']).toBe('bloqueada');

    // Complete FUN-01 as well
    progress['FUN-01'] = 'completada';
    const updatedStatuses = computeAllStatuses(model, progress);
    expect(updatedStatuses['SOFT-03']).toBe('disponible');
  });

  it('correctly calculates overall progress indicators', () => {
    const progress: Record<string, StoredStatus> = {
      'SOFT-09': 'completada', // 3 cr
      'FUN-02': 'completada',  // 3 cr
      'SOFT-01': 'cursando'    // 5 cr
    };
    const stats = computeOverallProgress(model, progress);

    expect(stats.totalUnits).toBe(43);
    expect(stats.completedUnits).toBe(2);
    expect(stats.cursandoUnits).toBe(1);
    expect(stats.completedCredits).toBe(6);
    expect(stats.totalCredits).toBe(141);
    expect(stats.percentCompleted).toBe(Math.round((2 / 43) * 100));
  });
});

describe('State Transitions & Safety Rules (Rule 7)', () => {
  const model = new CurriculumModel(curriculumData as unknown as Curriculum);

  it('prevents enrolling or completing locked courses', () => {
    const progress: Record<string, StoredStatus> = {};
    const check = canTransition('SOFT-02', 'cursando', model, progress);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('bloqueada');
  });

  it('allows advancing from disponible to cursando or completada', () => {
    const progress: Record<string, StoredStatus> = {};
    const check1 = canTransition('SOFT-01', 'cursando', model, progress);
    expect(check1.allowed).toBe(true);

    const check2 = canTransition('SOFT-01', 'completada', model, progress);
    expect(check2.allowed).toBe(true);
  });

  it('forbids unmarking a course if a dependent is cursando or completada', () => {
    const progress: Record<string, StoredStatus> = {
      'SOFT-01': 'completada',
      'SOFT-02': 'cursando'
    };

    // Attempting to demote SOFT-01 to disponible
    const check = canTransition('SOFT-01', 'disponible', model, progress);
    expect(check.allowed).toBe(false);
    expect(check.blockingDependents).toBeDefined();
    expect(check.blockingDependents?.some(name => name.includes('Principios de Programación 2'))).toBe(true);
  });

  it('allows unmarking a course if no dependent has started', () => {
    const progress: Record<string, StoredStatus> = {
      'SOFT-01': 'completada'
      // SOFT-02 is only disponible, not started
    };

    const check = canTransition('SOFT-01', 'disponible', model, progress);
    expect(check.allowed).toBe(true);
  });
});

describe('Graduation Simulator', () => {
  const model = new CurriculumModel(curriculumData as unknown as Curriculum);

  it('simulates all courses from scratch at 4 courses per period', () => {
    const progress: Record<string, StoredStatus> = {};
    // Simulation reference date: 2026-10-05 (cuatri Sep-Dic 2026)
    const refDate = new Date('2026-10-05T00:00:00Z');
    const result = simulateGraduation(model, progress, 4, refDate);

    expect(result.periodsRemaining).toBeGreaterThanOrEqual(10);
    expect(result.periods.length).toBe(result.periodsRemaining);
    expect(result.estimatedGraduationDate).toMatch(/(Abr|Ago|Dic) \d{4}/);
    expect(result.criticalPath.length).toBeGreaterThan(0);
  });

  it('reduces remaining periods as courses are completed', () => {
    const progress1: Record<string, StoredStatus> = {};
    const refDate = new Date('2026-10-05T00:00:00Z');
    const res1 = simulateGraduation(model, progress1, 4, refDate);

    // Complete the first two cuatrimestres
    const progress2: Record<string, StoredStatus> = {
      'SOFT-09': 'completada',
      'FUN-02': 'completada',
      'SOFT-01': 'completada',
      'FUN-01': 'completada',
      'FUN-08': 'completada',
      'FUN-05': 'completada',
      'FUN-03': 'completada',
      'SOFT-02': 'completada',
      'SOFT-06C2': 'completada',
      'FUN-09': 'completada'
    };
    const res2 = simulateGraduation(model, progress2, 4, refDate);

    expect(res2.periodsRemaining).toBeLessThan(res1.periodsRemaining);
  });

  it('correctly detects courses that will be unlocked when currently cursando courses are completed', () => {
    // When SOFT-01 is cursando, SOFT-02 should be flagged as willUnlockByCursando
    const progress: Record<string, StoredStatus> = {
      'SOFT-01': 'cursando'
    };
    const unlocked = getCoursesUnlockedByCursando(model, progress);
    expect(unlocked.has('SOFT-02')).toBe(true);
    // SOFT-07 requires SOFT-02, which is not yet cursando/completed, so SOFT-07 must NOT be in unlocked
    expect(unlocked.has('SOFT-07')).toBe(false);
  });

  it('supports the suficiencia state and its transitions correctly', () => {
    // SOFT-01 is disponible by default
    const progress: Record<string, StoredStatus> = {
      'SOFT-01': 'suficiencia'
    };

    const statuses = computeAllStatuses(model, progress);
    expect(statuses['SOFT-01']).toBe('suficiencia');

    // Suficiencia does NOT unlock dependent courses (SOFT-02 is still blocked)
    expect(statuses['SOFT-02']).toBe('bloqueada');

    // Overall progress tracks suficienciaUnits
    const overall = computeOverallProgress(model, progress);
    expect(overall.suficienciaUnits).toBe(1);

    // Transitions from suficiencia
    expect(canTransition('SOFT-01', 'disponible', model, progress).allowed).toBe(true);
    expect(canTransition('SOFT-01', 'cursando', model, progress).allowed).toBe(true);
    expect(canTransition('SOFT-01', 'completada', model, progress).allowed).toBe(true);

    // Blocked course cannot be transitioned to suficiencia directly
    expect(canTransition('SOFT-02', 'suficiencia', model, progress).allowed).toBe(false);
  });
});
