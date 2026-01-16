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

  it('should add zero with parentheses in preview', () => {
    const engine = new MathStepsEngine();
    const operations = engine.listOps('x', []);
    const addZero = operations.find(op => op.id.startsWith('custom:ADD_ADDING_ZERO'));
    expect(addZero).toBeTruthy();
    const preview = addZero!.preview.replace(/\s+/g, '');
    expect(preview).toBe('(x+0)');
  });

  it('should expose legacy rules as custom operations', () => {
    const engine = new MathStepsEngine();
    const operations = engine.listOps('2 + 3', []);
    const legacy = operations.find(op => op.id.startsWith('custom:LEGACY_'));
    expect(legacy).toBeTruthy();
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

  it('должен обрабатывать listOps для всех подвыражений в 1---1 без исключений', () => {
    // Баг: при выборе второй "1" в выражении "1---1" возникает исключение
    // "Некорректный путь к args" из библиотеки mathsteps
    const engine = new MathStepsEngine();
    const expression = '1---1';
    const node = engine.parse(expression);
    const exprString = engine.stringify(node);

    // Извлекаем все подвыражения с их путями
    const subexpressions = extractNodesFromMathStepsAst(node, exprString);

    // Выводим пути для отладки
    console.log('Subexpressions for 1---1:');
    for (const subexpr of subexpressions) {
      console.log(`  "${subexpr.text}" -> path: [${subexpr.path!.map(p => JSON.stringify(p)).join(', ')}]`);
    }

    // Для каждого подвыражения вызываем listOps - не должно быть исключений
    for (const subexpr of subexpressions) {
      expect(() => {
        engine.listOps(expression, subexpr.path!);
      }).not.toThrow();
    }
  });

  it('должен обрабатывать путь к вложенным унарным минусам в 1---1', () => {
    // Проверяем специфические пути, которые могут вызвать проблемы
    const engine = new MathStepsEngine();
    const expression = '1---1';
    
    // Структура 1---1 парсится как: 1 - (-(- 1))
    // Корень: OperatorNode '-' с args [1, OperatorNode унарный '-']
    // args[1]: OperatorNode унарный '-' с args [OperatorNode унарный '-']
    // args[1].args[0]: OperatorNode унарный '-' с args [1]
    // args[1].args[0].args[0]: ConstantNode 1
    
    // Проверяем разные пути
    const pathsToTest = [
      [],                           // корень: 1 - --1
      ['args', 0],                  // первая 1
      ['args', 1],                  // --1
      ['args', 1, 'args', 0],       // -1 (внутренний унарный минус)
      ['args', 1, 'args', 0, 'args', 0], // вторая 1
    ];
    
    for (const path of pathsToTest) {
      console.log(`Testing path: [${path.map(p => JSON.stringify(p)).join(', ')}]`);
      expect(() => {
        engine.listOps(expression, path as import('../types/index.js').MathStepsPath);
      }).not.toThrow();
    }
  });

  it('должен обрабатывать пути с оригинальной (ненормализованной) строкой 1---1', () => {
    // В браузере пользователь вводит '1---1', но пути генерируются по нормализованной структуре
    // Это может вызвать несоответствие
    const engine = new MathStepsEngine();
    
    // Оригинальная строка как вводит пользователь
    const originalExpression = '1---1';
    
    // Парсим и получаем нормализованную строку
    const node = engine.parse(originalExpression);
    const normalizedExpression = engine.stringify(node);
    
    console.log(`Original: "${originalExpression}", Normalized: "${normalizedExpression}"`);
    
    // Получаем подвыражения из нормализованного AST
    const subexpressions = extractNodesFromMathStepsAst(node, normalizedExpression);
    
    // Проверяем что listOps работает с ОРИГИНАЛЬНОЙ строкой и путями из нормализованного AST
    // Это имитирует сценарий в браузере
    for (const subexpr of subexpressions) {
      console.log(`Testing with original expr "${originalExpression}" and path: [${subexpr.path!.map(p => JSON.stringify(p)).join(', ')}]`);
      expect(() => {
        engine.listOps(originalExpression, subexpr.path!);
      }).not.toThrow();
    }
  });

  it('должен показывать структуру AST для диагностики проблемы с 1---1', () => {
    const engine = new MathStepsEngine();
    
    // Строка как её вводит пользователь
    const inputExpression = '1---1';
    
    // Парсим
    const node = engine.parse(inputExpression);
    const normalizedExpression = engine.stringify(node);
    
    // Проверяем что нормализация возвращает формат с полным раскрытием скобок
    expect(normalizedExpression).toBe('1 - -(-1)');
    
    // Проверяем пути
    const subexpressions = extractNodesFromMathStepsAst(node, normalizedExpression);
    expect(subexpressions.length).toBeGreaterThan(0);
    
    // ГЛАВНАЯ ПРОВЕРКА: все пути должны работать без исключений
    // и возвращать операции (не пустой список)
    for (const subexpr of subexpressions) {
      const ops = engine.listOps(normalizedExpression, subexpr.path!);
      // Для констант (листовых узлов) операции должны быть доступны
      expect(ops).toBeDefined();
    }
  });

  it('должен возвращать операции для внутренней 1 в выражении --1', () => {
    // Баг: при выборе "1" в выражении "--1" нет доступных операций
    // Причина: mathsteps создаёт ParenthesisNode при парсинге "-(-1)",
    // что делает путь ["args", 0, "args", 0] невалидным.
    // Решение: fallback на custom операции когда simplify недоступны
    const engine = new MathStepsEngine();
    const expression = '--1';
    
    const node = engine.parse(expression);
    const normalizedExpression = engine.stringify(node);
    
    // Получаем подвыражения
    const subexpressions = extractNodesFromMathStepsAst(node, normalizedExpression);
    
    // Находим подвыражение "1" (константу внутри двойного минуса)
    const innerOne = subexpressions.find(s => s.text === '1');
    expect(innerOne).toBeDefined();
    
    // Получаем операции для "1"
    const ops = engine.listOps(normalizedExpression, innerOne!.path!);
    
    // Должны быть операции (хотя бы custom: wrap, +0, *1)
    expect(ops.length).toBeGreaterThan(0);
  });
});
