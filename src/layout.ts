import type { Node, Edge } from '@xyflow/react';
import type { Curriculum, CurriculumItem } from '@shared/types.js';
import { computeDependencyLevels, getDirectPrereqs } from '@shared/graph.js';
import { CurriculumModel, isElectiveBlock } from '@shared/curriculum.js';

export type LayoutMode = 'tree' | 'cuatrimestres';

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
}

export function buildNodesAndEdges(
  curriculum: Curriculum,
  mode: LayoutMode = 'tree',
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const model = new CurriculumModel(curriculum);
  const levels = computeDependencyLevels(model);

  const NODE_WIDTH = options.nodeWidth || 180;
  const NODE_HEIGHT = options.nodeHeight || 72;

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (mode === 'tree') {
    // Group courses by level
    const byLevel: Record<number, CurriculumItem[]> = {};
    for (const item of curriculum.courses) {
      const lvl = levels[item.id] || 0;
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(item);
    }

    const HORIZ_GAP = 36;
    const VERT_GAP = 90;

    // Find max width among levels to center levels
    const sortedLevels = Object.keys(byLevel)
      .map(Number)
      .sort((a, b) => a - b);

    let maxLevelWidth = 0;
    for (const lvl of sortedLevels) {
      const count = byLevel[lvl].length;
      const width = count * NODE_WIDTH + (count - 1) * HORIZ_GAP;
      maxLevelWidth = Math.max(maxLevelWidth, width);
    }

    for (const lvl of sortedLevels) {
      const items = byLevel[lvl];
      const count = items.length;
      const rowWidth = count * NODE_WIDTH + (count - 1) * HORIZ_GAP;
      const startX = (maxLevelWidth - rowWidth) / 2;
      const y = lvl * (NODE_HEIGHT + VERT_GAP);

      items.forEach((item, idx) => {
        const x = startX + idx * (NODE_WIDTH + HORIZ_GAP);
        nodes.push({
          id: item.id,
          type: isElectiveBlock(item) ? 'electiveBlock' : 'course',
          position: { x, y },
          data: { item, level: lvl },
          draggable: false
        });
      });
    }
  } else {
    // Cuatrimestre columns layout
    const COL_GAP = 50;
    const ROW_GAP = 28;

    const byPeriod: Record<number, CurriculumItem[]> = {};
    for (const item of curriculum.courses) {
      if (!byPeriod[item.period]) byPeriod[item.period] = [];
      byPeriod[item.period].push(item);
    }

    for (let p = 1; p <= curriculum.periods; p++) {
      const items = byPeriod[p] || [];
      const x = (p - 1) * (NODE_WIDTH + COL_GAP);

      items.forEach((item, rowIdx) => {
        const y = rowIdx * (NODE_HEIGHT + ROW_GAP);
        nodes.push({
          id: item.id,
          type: isElectiveBlock(item) ? 'electiveBlock' : 'course',
          position: { x, y },
          data: { item, period: p },
          draggable: false
        });
      });
    }
  }

  // Generate Edges for prerequisites
  for (const item of curriculum.courses) {
    const prereqs = getDirectPrereqs(item.id, model);
    for (const prereqId of prereqs) {
      edges.push({
        id: `e-${prereqId}-${item.id}`,
        source: prereqId,
        target: item.id,
        type: 'smoothstep',
        animated: false
      });
    }
  }

  return { nodes, edges };
}
