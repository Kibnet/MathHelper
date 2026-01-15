/**
 * Тесты для MathStepsEngine и работы с mathjs AST
 */

import { describe, it, expect } from 'vitest';
import { MathStepsEngine } from '../core/mathsteps-engine.js';

const getChangeType = (id: string, transformType?: string) => {
  if (transformType) {
    return transformType;
  }
  if (id.startsWith('custom:')) {
    return id.split(':')[1] || '';
  }
  if (id.startsWith('solve:')) {
    return id.split(':')[1] || '';
  }
  return '';
};
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

  it('should expose custom operations for commutativity and parentheses', () => {
    const engine = new MathStepsEngine();
    const expression = 'a + b + c';
    const operations = engine.listOps(expression, ['args', 0]);
    const commutative = operations.find(op => op.id.startsWith('custom:CUSTOM_COMMUTATIVE'));
    const addParens = operations.find(op => op.id.startsWith('custom:CUSTOM_ADD_PARENS'));

    expect(commutative).toBeTruthy();
    expect(addParens).toBeTruthy();

    const applied = engine.apply(expression, ['args', 0], commutative!.id);
    const normalized = engine.stringify(applied.newNode).replace(/\s+/g, '');
    expect(normalized).toBe('b+a+c');
  });

  it('should apply distribution, factoring and neutral elements', () => {
    const engine = new MathStepsEngine();

    const distributeOps = engine.listOps('a * (b + c)', []);
    const distribute = distributeOps.find(op => op.id.startsWith('custom:CUSTOM_DISTRIBUTE'));
    expect(distribute).toBeTruthy();
    const distributed = engine.apply('a * (b + c)', [], distribute!.id);
    const distributedText = engine.stringify(distributed.newNode).replace(/\s+/g, '');
    expect(distributedText.replace(/[()]/g, '')).toBe('a*b+a*c');

    const factorOps = engine.listOps('a*b + a*c', []);
    const factor = factorOps.find(op => op.id.startsWith('custom:CUSTOM_FACTOR'));
    expect(factor).toBeTruthy();
    const factored = engine.apply('a*b + a*c', [], factor!.id);
    const factoredText = engine.stringify(factored.newNode).replace(/\s+/g, '');
    expect(factoredText.replace(/[()]/g, '')).toBe('a*b+c');

    const addZeroOps = engine.listOps('a + b', ['args', 0]);
    const addZero = addZeroOps.find(op => op.id.startsWith('custom:ADD_ADDING_ZERO'));
    expect(addZero).toBeTruthy();
    const withZero = engine.apply('a + b', ['args', 0], addZero!.id);
    const withZeroText = engine.stringify(withZero.newNode).replace(/\s+/g, '');
    expect(withZeroText.replace(/[()]/g, '')).toBe('a+0+b');

    const removeZeroOps = engine.listOps('a + 0 + b', ['args', 0]);
    const removeZero = removeZeroOps.find(op => getChangeType(op.id, op.transform?.changeType) === 'REMOVE_ADDING_ZERO');
    expect(removeZero).toBeTruthy();
    const withoutZero = engine.apply('a + 0 + b', ['args', 0], removeZero!.id);
    expect(engine.stringify(withoutZero.newNode).replace(/\s+/g, '')).toBe('a+b');
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
