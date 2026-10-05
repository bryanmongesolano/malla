import type { Curriculum, CurriculumItem, ElectiveBlock, StandardCourse, ElectiveOption } from './types.js';

export function isElectiveBlock(item: CurriculumItem): item is ElectiveBlock {
  return item.type === 'electiveBlock';
}

export function isStandardCourse(item: CurriculumItem): item is StandardCourse {
  return item.type !== 'electiveBlock';
}

export class CurriculumModel {
  private curriculum: Curriculum;
  private itemMap: Map<string, CurriculumItem> = new Map();
  private electiveParentMap: Map<string, ElectiveBlock> = new Map();
  private optionMap: Map<string, ElectiveOption> = new Map();

  constructor(curriculum: Curriculum) {
    this.curriculum = curriculum;
    this.buildIndex();
  }

  private buildIndex() {
    this.itemMap.clear();
    this.electiveParentMap.clear();
    this.optionMap.clear();

    for (const item of this.curriculum.courses) {
      this.itemMap.set(item.id, item);
      if (isElectiveBlock(item)) {
        for (const opt of item.options) {
          this.optionMap.set(opt.id, opt);
          this.electiveParentMap.set(opt.id, item);
        }
      }
    }
  }

  getCurriculum(): Curriculum {
    return this.curriculum;
  }

  getItem(id: string): CurriculumItem | undefined {
    return this.itemMap.get(id);
  }

  getElectiveOption(id: string): ElectiveOption | undefined {
    return this.optionMap.get(id);
  }

  getElectiveParentBlock(optionId: string): ElectiveBlock | undefined {
    return this.electiveParentMap.get(optionId);
  }

  getAllItems(): CurriculumItem[] {
    return this.curriculum.courses;
  }

  getAllItemIds(): string[] {
    return this.curriculum.courses.map(c => c.id);
  }

  /**
   * Returns all items plus all elective options in a flat array of identifiers
   */
  getAllAssignableIds(): string[] {
    const ids: string[] = [];
    for (const item of this.curriculum.courses) {
      if (isElectiveBlock(item)) {
        for (const opt of item.options) {
          ids.push(opt.id);
        }
      } else {
        ids.push(item.id);
      }
    }
    return ids;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (const item of this.curriculum.courses) {
      if (seenIds.has(item.id)) {
        errors.push(`ID duplicado: ${item.id}`);
      }
      seenIds.add(item.id);

      if (isElectiveBlock(item)) {
        for (const opt of item.options) {
          if (seenIds.has(opt.id)) {
            errors.push(`ID de optativa duplicado: ${opt.id}`);
          }
          seenIds.add(opt.id);
        }
      }
    }

    // Check prerequisites exist
    for (const item of this.curriculum.courses) {
      for (const req of item.prereqs) {
        if (!this.itemMap.has(req)) {
          errors.push(`Requisito inexistente '${req}' en curso '${item.id}'`);
        }
      }

      if (isElectiveBlock(item)) {
        for (const opt of item.options) {
          for (const req of opt.prereqs) {
            if (!this.itemMap.has(req) && !this.optionMap.has(req)) {
              errors.push(`Requisito inexistente '${req}' en opción '${opt.id}' de bloque '${item.id}'`);
            }
          }
        }
      }
    }

    // Check for cycles in main courses
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const checkCycle = (id: string, path: string[]): boolean => {
      visiting.add(id);
      const item = this.itemMap.get(id);
      if (item) {
        for (const req of item.prereqs) {
          if (visiting.has(req)) {
            errors.push(`Ciclo detectado: ${path.join(' -> ')} -> ${req}`);
            return true;
          }
          if (!visited.has(req)) {
            if (checkCycle(req, [...path, req])) return true;
          }
        }
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const item of this.curriculum.courses) {
      if (!visited.has(item.id)) {
        checkCycle(item.id, [item.id]);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
