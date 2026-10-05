import type {
  StoredStatus,
  TransitionCheckResult
} from './types.js';
import { CurriculumModel } from './curriculum.js';
import { computeAllStatuses } from './status.js';
import { getAllDependents } from './graph.js';

export function canTransition(
  itemId: string,
  targetStatus: 'disponible' | 'cursando' | 'completada',
  model: CurriculumModel,
  progress: Record<string, StoredStatus>
): TransitionCheckResult {
  const currentStatuses = computeAllStatuses(model, progress);
  const current = currentStatuses[itemId];

  if (!current) {
    return {
      allowed: false,
      reason: `Elemento desconocido '${itemId}'`
    };
  }

  // No-op
  if (current === targetStatus) {
    return { allowed: true };
  }

  // Locked item cannot be moved to cursando or completada
  if (current === 'bloqueada') {
    const item = model.getItem(itemId);
    const option = model.getElectiveOption(itemId);
    const parentBlock = model.getElectiveParentBlock(itemId);

    const neededPrereqs: string[] = [];
    if (item) {
      for (const req of item.prereqs) {
        if (currentStatuses[req] !== 'completada') {
          const reqItem = model.getItem(req);
          neededPrereqs.push(reqItem ? reqItem.name : req);
        }
      }
    } else if (option && parentBlock) {
      if (currentStatuses[parentBlock.id] !== 'completada' && currentStatuses[parentBlock.id] !== 'disponible') {
        neededPrereqs.push(parentBlock.name);
      }
      for (const req of option.prereqs) {
        if (currentStatuses[req] !== 'completada') {
          const reqItem = model.getItem(req);
          neededPrereqs.push(reqItem ? reqItem.name : req);
        }
      }
    }

    return {
      allowed: false,
      reason: `La materia está bloqueada. Faltan requisitos: ${neededPrereqs.join(', ')}`,
      missingPrereqs: neededPrereqs
    };
  }

  // Transitions towards advancing (disponible -> cursando, disponible -> completada, cursando -> completada)
  // are always allowed if not locked.
  if (
    (current === 'disponible' && (targetStatus === 'cursando' || targetStatus === 'completada')) ||
    (current === 'cursando' && targetStatus === 'completada')
  ) {
    return { allowed: true };
  }

  // Transitions towards demoting (completada -> cursando, completada -> disponible, cursando -> disponible):
  // Must verify rule 7: "Solo se puede desmarcar si ninguna materia dependiente está completada/cursando"
  const allDependents = getAllDependents(itemId, model);
  const blockingDependents: string[] = [];

  for (const depId of allDependents) {
    const depStatus = currentStatuses[depId];
    if (depStatus === 'cursando' || depStatus === 'completada') {
      const depItem = model.getItem(depId) || model.getElectiveOption(depId);
      blockingDependents.push(depItem ? depItem.name : depId);
    }
  }

  // Special check for elective option: demoting might break the parent elective block
  const parentBlock = model.getElectiveParentBlock(itemId);
  if (parentBlock && current === 'completada' && targetStatus !== 'completada') {
    // Count completed options excluding this one
    const remainingCompleted = parentBlock.options.filter(
      opt => opt.id !== itemId && currentStatuses[opt.id] === 'completada'
    ).length;

    // If parent block will drop below required
    if (remainingCompleted < parentBlock.required) {
      // Check if any course depending on the parent block is cursando/completada
      const blockDependents = getAllDependents(parentBlock.id, model);
      for (const depId of blockDependents) {
        const depStatus = currentStatuses[depId];
        if (depStatus === 'cursando' || depStatus === 'completada') {
          const depItem = model.getItem(depId) || model.getElectiveOption(depId);
          blockingDependents.push(depItem ? depItem.name : depId);
        }
      }
    }
  }

  if (blockingDependents.length > 0) {
    return {
      allowed: false,
      reason: `No se puede modificar el estado porque las siguientes materias dependen de ella y están cursando o completadas: ${Array.from(new Set(blockingDependents)).join(', ')}`,
      blockingDependents: Array.from(new Set(blockingDependents))
    };
  }

  return { allowed: true };
}
