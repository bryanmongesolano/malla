import { CurriculumModel, isElectiveBlock } from './curriculum.js';

export function getDirectPrereqs(
  itemId: string,
  model: CurriculumModel
): string[] {
  const item = model.getItem(itemId);
  if (item) {
    return [...item.prereqs];
  }
  const option = model.getElectiveOption(itemId);
  if (option) {
    const parentBlock = model.getElectiveParentBlock(itemId);
    const blockPrereqs = parentBlock ? parentBlock.prereqs : [];
    return Array.from(new Set([...blockPrereqs, ...option.prereqs]));
  }
  return [];
}

export function getAllAncestors(
  itemId: string,
  model: CurriculumModel
): Set<string> {
  const ancestors = new Set<string>();
  const queue = [...getDirectPrereqs(itemId, model)];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (!ancestors.has(curr)) {
      ancestors.add(curr);
      const nextPrereqs = getDirectPrereqs(curr, model);
      for (const p of nextPrereqs) {
        if (!ancestors.has(p)) {
          queue.push(p);
        }
      }
    }
  }

  return ancestors;
}

export function getDirectDependents(
  itemId: string,
  model: CurriculumModel
): string[] {
  const dependents: string[] = [];
  const items = model.getAllItems();

  for (const item of items) {
    if (item.prereqs.includes(itemId)) {
      dependents.push(item.id);
    }
    if (isElectiveBlock(item)) {
      for (const opt of item.options) {
        if (opt.prereqs.includes(itemId)) {
          dependents.push(opt.id);
        }
      }
    }
  }

  // If itemId is an elective option, its parent block's dependents could also be affected
  const parentBlock = model.getElectiveParentBlock(itemId);
  if (parentBlock) {
    for (const item of items) {
      if (item.prereqs.includes(parentBlock.id)) {
        dependents.push(item.id);
      }
    }
  }

  return Array.from(new Set(dependents));
}

export function getAllDependents(
  itemId: string,
  model: CurriculumModel
): Set<string> {
  const dependents = new Set<string>();
  const queue = [...getDirectDependents(itemId, model)];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (!dependents.has(curr)) {
      dependents.add(curr);
      const nextDeps = getDirectDependents(curr, model);
      for (const d of nextDeps) {
        if (!dependents.has(d)) {
          queue.push(d);
        }
      }
    }
  }

  return dependents;
}

export function computeDependencyLevels(
  model: CurriculumModel
): Record<string, number> {
  const levels: Record<string, number> = {};
  const items = model.getAllItems();

  const getLevel = (id: string, visited: Set<string>): number => {
    if (levels[id] !== undefined) return levels[id];
    if (visited.has(id)) return 0; // prevent cycle crash

    visited.add(id);
    const prereqs = getDirectPrereqs(id, model);
    if (prereqs.length === 0) {
      levels[id] = 0;
    } else {
      let maxL = 0;
      for (const p of prereqs) {
        maxL = Math.max(maxL, getLevel(p, new Set(visited)));
      }
      levels[id] = maxL + 1;
    }
    return levels[id];
  };

  for (const item of items) {
    getLevel(item.id, new Set());
  }

  return levels;
}
