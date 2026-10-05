import type { Node, Edge } from '@xyflow/react';
import type { Curriculum, CurriculumItem } from '@shared/types.js';
import { computeDependencyLevels, getDirectPrereqs } from '@shared/graph.js';
import { CurriculumModel, isElectiveBlock } from '@shared/curriculum.js';

export type LayoutMode = 'tree' | 'horizontal' | 'cuatrimestres';

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

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Group items by dependency level
  const byLevel: Record<number, CurriculumItem[]> = {};
  for (const item of curriculum.courses) {
    const lvl = levels[item.id] || 0;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(item);
  }

  const sortedLevels = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b);
  const maxLevel = sortedLevels[sortedLevels.length - 1] ?? 0;

  // Optimize vertical order within levels using barycenter heuristic (minimizes line crossings)
  const nodeOrderIdx: Record<string, number> = {};
  if (byLevel[0]) {
    byLevel[0].forEach((item, idx) => {
      nodeOrderIdx[item.id] = idx;
    });
  }

  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const items = byLevel[lvl];
    if (!items) continue;
    items.sort((a, b) => {
      const prereqsA = getDirectPrereqs(a.id, model);
      const prereqsB = getDirectPrereqs(b.id, model);
      const avgA = prereqsA.length > 0
        ? prereqsA.reduce((sum, pId) => sum + (nodeOrderIdx[pId] ?? 0), 0) / prereqsA.length
        : 0;
      const avgB = prereqsB.length > 0
        ? prereqsB.reduce((sum, pId) => sum + (nodeOrderIdx[pId] ?? 0), 0) / prereqsB.length
        : 0;
      return avgA - avgB;
    });
    items.forEach((item, idx) => {
      nodeOrderIdx[item.id] = idx;
    });
  }

  const isHorizontal = mode === 'horizontal' || mode === 'cuatrimestres';

  if (isHorizontal) {
    // Compact Horizontal View (Left to Right flow across dependency columns)
    const NODE_WIDTH = options.nodeWidth || 172;
    const NODE_HEIGHT = options.nodeHeight || 58;
    const COL_GAP = 58;
    const ROW_GAP = 14;

    let maxCountInCol = 0;
    for (const lvl of sortedLevels) {
      maxCountInCol = Math.max(maxCountInCol, byLevel[lvl].length);
    }
    const maxColHeight = maxCountInCol * (NODE_HEIGHT + ROW_GAP);

    for (const lvl of sortedLevels) {
      const items = byLevel[lvl];
      const count = items.length;
      const colHeight = count * (NODE_HEIGHT + ROW_GAP);
      const startY = (maxColHeight - colHeight) / 2;
      const x = lvl * (NODE_WIDTH + COL_GAP);

      items.forEach((item, rowIdx) => {
        const y = startY + rowIdx * (NODE_HEIGHT + ROW_GAP);
        nodes.push({
          id: item.id,
          type: isElectiveBlock(item) ? 'electiveBlock' : 'course',
          position: { x, y },
          data: { item, level: lvl, layoutMode: 'horizontal' },
          draggable: false
        });
      });
    }
  } else {
    // Tree View (Top to Bottom hierarchical flow)
    const NODE_WIDTH = options.nodeWidth || 184;
    const NODE_HEIGHT = options.nodeHeight || 72;
    const HORIZ_GAP = 36;
    const VERT_GAP = 96;

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
          data: { item, level: lvl, layoutMode: 'tree' },
          draggable: false
        });
      });
    }
  }

  // Generate prerequisite edges with smoothstep curvature
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
