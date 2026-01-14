/**
 * Тесты для MathStepsEngine и работы с mathjs AST
 */

import { describe, it, expect } from 'vitest';
import { MathStepsEngine } from '../core/mathsteps-engine.js';
import { extractNodesFromMathStepsAst } from '../core/analyzer.js';

describe('MathStepsEngine', () => {
  it('should list operations and apply transform deterministically', () => {
    const engine = new MathStepsEngine();
    const expression = '2 + 2';

    const operations = engine.listOps(expression, []);
    expect(operations.length).toBeGreaterThan(0);
    expect(operations[0].category).toBeTruthy();
    expect(operations[0].description).toBeTruthy();

    const target = operations[0];
    const applied = engine.apply(expression, [], target.id);
    const preview = engine.stringify(applied.newNode);

    expect(preview).toBe(target.preview);
  });

  it('should extract subexpressions from mathjs AST', () => {
    const engine = new MathStepsEngine();
    const node = engine.parse('2 + 3');
    const exprString = engine.stringify(node);

    const subexpressions = extractNodesFromMathStepsAst(node, exprString);

    expect(subexpressions.length).toBeGreaterThan(0);
    const root = subexpressions.find(subexpr => subexpr.text === exprString);
    expect(root).toBeTruthy();
    expect(root?.path).toEqual([]);
  });
});
