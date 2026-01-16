/**
 * Модуль анализатора выражений
 * Находит все валидные подвыражения и определяет расположение фреймов
 */

import type { Subexpression, SubexpressionPosition, LayoutConfig, MathStepsNode, MathStepsPath } from '../types/index.js';
import { MathStepsEngine } from './mathsteps-engine.js';

/**
 * Извлечь все узлы из AST дерева с их текстовыми позициями
 * Для n-арных операций генерируются фреймы соседних пар
 */
export function extractNodesFromAST(rootNode: MathStepsNode, fullExpressionString: string): Subexpression[] {
  const engine = new MathStepsEngine();
  const subexpressions = extractNodesFromMathStepsAst(rootNode, fullExpressionString);

  subexpressions.forEach((subexpr) => {
    if (subexpr.path) {
      subexpr.operations = engine.listOps(fullExpressionString, subexpr.path);
    } else {
      subexpr.operations = [];
    }
  });

  return subexpressions;
}

/**
 * Извлечь все узлы из mathjs AST дерева с их текстовыми позициями
 */
export function extractNodesFromMathStepsAst(rootNode: MathStepsNode, fullExpressionString: string): Subexpression[] {
  const subexpressions: Subexpression[] = [];
  const nodeTextMap = new Map<MathStepsNode, string>();
  const engine = new MathStepsEngine();

  function buildNodeTextMap(node: MathStepsNode): void {
    // Используем engine.stringify() для единого формата с mathsteps
    const text = engine.stringify(node);
    nodeTextMap.set(node, text);

    if (node.content) {
      buildNodeTextMap(node.content);
    }

    if (node.args && node.args.length > 0) {
      node.args.forEach(child => buildNodeTextMap(child));
    }
  }

  buildNodeTextMap(rootNode);

  function findNodePositions(node: MathStepsNode, path: MathStepsPath, currentPos: number = 0): void {
    const nodeText = nodeTextMap.get(node) || '';
    const index = fullExpressionString.indexOf(nodeText, currentPos);

    if (index !== -1) {
      subexpressions.push({
        text: nodeText,
        start: index,
        end: index + nodeText.length,
        node: node,
        length: nodeText.length,
        path
      });
    }

    const nextPos = index !== -1 ? index : currentPos;

    if (node.content) {
      findNodePositions(node.content, [...path, 'content'], nextPos);
    }

    if (node.args && node.args.length > 0) {
      node.args.forEach((child, index) => {
        findNodePositions(child, [...path, 'args', index], nextPos);
      });
    }
  }

  findNodePositions(rootNode, []);

  return subexpressions;
}

/**
 * Найти все валидные подвыражения в строке выражения
 * @deprecated Используйте extractNodesFromAST для работы с основным деревом
 */
export function findAllSubexpressions(exprString: string): Subexpression[] {
  const engine = new MathStepsEngine();
  let rootNode: MathStepsNode;
  let normalized = exprString;

  try {
    normalized = engine.normalizeExpression(exprString);
    rootNode = engine.parse(normalized) as MathStepsNode;
  } catch {
    return [];
  }

  const subexpressions = extractNodesFromMathStepsAst(rootNode, normalized);

  const filtered = subexpressions.filter((subexpr) => {
    if (!subexpr.path) {
      return false;
    }
    const operations = engine.listOps(normalized, subexpr.path);
    if (operations.length === 0) {
      return false;
    }
    subexpr.operations = operations;
    return true;
  });

  const unique: Subexpression[] = [];
  const seen = new Set<string>();
  for (const subexpr of filtered) {
    const key = `${subexpr.start}-${subexpr.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(subexpr);
  }

  return unique;
}

/**
 * Назначить уровни подвыражениям для предотвращения визуального перекрытия
 */
export function assignLevels(subexpressions: Subexpression[]): Subexpression[][] {
  const levels: Subexpression[][] = [];
  
  subexpressions.forEach(subexpr => {
    let assignedLevel = -1;
    
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      const level = levels[levelIndex];
      let hasOverlap = false;
      
      for (const existing of level) {
        if (doRangesOverlap(subexpr.start, subexpr.end, existing.start, existing.end)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        assignedLevel = levelIndex;
        break;
      }
    }
    
    if (assignedLevel === -1) {
      assignedLevel = levels.length;
      levels[assignedLevel] = [];
    }
    
    levels[assignedLevel].push(subexpr);
    subexpr.level = assignedLevel;
  });
  
  return levels;
}

/**
 * Проверить, перекрываются ли два диапазона
 */
export function doRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return !(end1 <= start2 || end2 <= start1);
}

/**
 * Вычислить позиции фреймов для подвыражений
 */
export function calculateFramePositions(
  subexpressions: Subexpression[],
  exprString: string,
  config: LayoutConfig = { LEVEL_HEIGHT: 18, BASE_OFFSET: 5 }
): SubexpressionPosition[] {
  const positions: SubexpressionPosition[] = subexpressions.map(subexpr => {
    const textBefore = exprString.substring(0, subexpr.start);
    const left = measureTextWidth(textBefore);
    const width = measureTextWidth(subexpr.text);
    const top = config.BASE_OFFSET + ((subexpr.level || 0) * config.LEVEL_HEIGHT);
    
    return {
      ...subexpr,
      left,
      width,
      top
    };
  });
  
  return positions;
}

/**
 * Измерить ширину текста, используя метрики моноширинного шрифта
 */
export function measureTextWidth(text: string): number {
  if (typeof document === 'undefined') {
    // Запасной вариант для окружения Node.js
    return text.length * 10;
  }
  
  const span = document.createElement('span');
  span.className = 'measure-span';
  span.textContent = text;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  document.body.removeChild(span);
  return width;
}

/**
 * Получить общую высоту, необходимую для всех уровней фреймов
 */
export function calculateTotalHeight(
  levels: Subexpression[][],
  config: LayoutConfig = { LEVEL_HEIGHT: 18, BASE_OFFSET: 5 }
): number {
  const maxLevel = levels.length - 1;
  return config.BASE_OFFSET + (maxLevel + 1) * config.LEVEL_HEIGHT + 5;
}
