/**
 * Тесты анализатора (MathStepsEngine)
 */

import { describe, it, expect } from 'vitest';
import {
  extractNodesFromAST,
  findAllSubexpressions,
  assignLevels,
  calculateFramePositions,
  calculateTotalHeight,
  doRangesOverlap,
  measureTextWidth
} from '../core/analyzer.js';
import { MathStepsEngine } from '../core/mathsteps-engine.js';

describe('Analyzer - findAllSubexpressions', () => {
  it('возвращает подвыражения с операциями', () => {
    const subexprs = findAllSubexpressions('2 + 3');
    expect(subexprs.length).toBeGreaterThan(0);

    const root = subexprs.find((s) => s.text.includes('2') && s.text.includes('3'));
    expect(root).toBeTruthy();
    expect(root?.operations?.length).toBeGreaterThan(0);
  });

  it('возвращает пустой список для невалидного выражения', () => {
    const subexprs = findAllSubexpressions('2 + ');
    expect(subexprs.length).toBe(0);
  });
});

describe('Analyzer - extractNodesFromAST', () => {
  it('извлекает узлы и прикрепляет операции', () => {
    const engine = new MathStepsEngine();
    const node = engine.parse('2 + 3');
    const exprString = engine.stringify(node);

    const subexprs = extractNodesFromAST(node, exprString);
    expect(subexprs.length).toBeGreaterThan(0);

    const root = subexprs.find((s) => s.text === exprString);
    expect(root).toBeTruthy();
    expect(root?.operations?.length).toBeGreaterThan(0);
  });
});

describe('Analyzer - doRangesOverlap', () => {
  it('проверяет пересечения диапазонов', () => {
    expect(doRangesOverlap(0, 2, 3, 5)).toBeFalsy();
    expect(doRangesOverlap(0, 3, 2, 5)).toBeTruthy();
  });
});

describe('Analyzer - assignLevels', () => {
  it('назначает уровни подвыражениям', () => {
    const subexprs = findAllSubexpressions('2 + 3 * 4');
    const levels = assignLevels(subexprs);
    expect(levels.length).toBeGreaterThan(0);
    expect(subexprs.every((s) => typeof s.level === 'number')).toBeTruthy();
  });
});

describe('Analyzer - calculateFramePositions', () => {
  it('вычисляет позиции для фреймов', () => {
    const subexprs = findAllSubexpressions('2 + 3');
    assignLevels(subexprs);
    const positions = calculateFramePositions(subexprs, '2 + 3');
    expect(positions.length).toBe(subexprs.length);
  });
});

describe('Analyzer - calculateTotalHeight', () => {
  it('считает высоту уровней', () => {
    const subexprs = findAllSubexpressions('2 + 3');
    const levels = assignLevels(subexprs);
    const height = calculateTotalHeight(levels);
    expect(height).toBeGreaterThan(0);
  });
});

describe('Analyzer - measureTextWidth', () => {
  it('возвращает числовую ширину текста', () => {
    const width = measureTextWidth('test');
    expect(typeof width).toBe('number');
    expect(width).toBeGreaterThanOrEqual(0);
  });
});
