/**
 * Тесты для модуля path-utils
 * 
 * Покрывает все edge cases работы с путями в AST:
 * - Простые пути
 * - Пути с ParenthesisNode
 * - Пути с явным 'content'
 * - Унарные операторы со скобками
 * - Вложенные скобки
 */

import { describe, it, expect } from 'vitest';
import { 
  isParenthesisNode, 
  normalizePath, 
  getNodeAtPath, 
  replaceNodeAtPath,
  pathsEqual,
  pathToString
} from '../core/path-utils.js';
import { MathStepsEngine } from '../core/mathsteps-engine.js';
import type { MathStepsNode, MathStepsPath } from '../types/index.js';

describe('path-utils', () => {
  const engine = new MathStepsEngine();

  // Вспомогательная функция для клонирования узлов
  const cloneNode = (node: MathStepsNode): MathStepsNode => {
    const candidate = node as { clone?: () => MathStepsNode };
    if (typeof candidate.clone === 'function') {
      return candidate.clone();
    }
    return engine.parse(node.toString()) as MathStepsNode;
  };

  describe('isParenthesisNode', () => {
    it('возвращает true для ParenthesisNode', () => {
      const node = engine.parse('(4)');
      expect(isParenthesisNode(node)).toBe(true);
    });

    it('возвращает false для ConstantNode', () => {
      const node = engine.parse('4');
      expect(isParenthesisNode(node)).toBe(false);
    });

    it('возвращает false для OperatorNode', () => {
      const node = engine.parse('2 + 3');
      expect(isParenthesisNode(node)).toBe(false);
    });
  });

  describe('getNodeAtPath', () => {
    it('возвращает корень для пустого пути', () => {
      const root = engine.parse('2 + 3');
      const node = getNodeAtPath(root, []);
      expect(node).toBe(root);
    });

    it('находит узел по простому пути args', () => {
      const root = engine.parse('2 + 3');
      const node = getNodeAtPath(root, ['args', 0]);
      expect(node?.toString()).toBe('2');
    });

    it('находит узел внутри ParenthesisNode без content в пути', () => {
      // 3 * -(4) - путь ["args", 1, "args", 0] должен найти 4
      const root = engine.parse('3 * -(4)');
      const unaryMinus = getNodeAtPath(root, ['args', 1]);
      expect(unaryMinus?.toString()).toBe('-(4)');
      
      // Прозрачная навигация через ParenthesisNode
      const innerContent = getNodeAtPath(root, ['args', 1, 'args', 0]);
      expect(innerContent?.toString()).toBe('4');
    });

    it('находит узел внутри ParenthesisNode с явным content в пути', () => {
      // 3 * -(4) - путь ["args", 1, "args", 0, "content"] должен найти 4
      const root = engine.parse('3 * -(4)');
      const innerContent = getNodeAtPath(root, ['args', 1, 'args', 0, 'content']);
      expect(innerContent?.toString()).toBe('4');
    });

    it('обрабатывает вложенные унарные минусы --1', () => {
      const root = engine.parse('--1');
      const normalized = engine.stringify(root);
      expect(normalized).toBe('-(-1)');
      
      // Внутренняя 1
      const innerOne = getNodeAtPath(root, ['args', 0, 'args', 0]);
      expect(innerOne?.toString()).toBe('1');
    });

    it('обрабатывает сложное выражение 1---1', () => {
      const root = engine.parse('1---1');
      
      // Левая 1
      const leftOne = getNodeAtPath(root, ['args', 0]);
      expect(leftOne?.toString()).toBe('1');
      
      // Правая часть -(-1)
      const rightPart = getNodeAtPath(root, ['args', 1]);
      expect(rightPart?.toString()).toContain('-');
    });

    it('возвращает null для невалидного пути', () => {
      const root = engine.parse('2 + 3');
      const node = getNodeAtPath(root, ['args', 5]);
      expect(node).toBeNull();
    });

    it('возвращает null для некорректного сегмента', () => {
      const root = engine.parse('2 + 3');
      const node = getNodeAtPath(root, ['invalid' as any]);
      expect(node).toBeNull();
    });
  });

  describe('replaceNodeAtPath', () => {
    it('заменяет корень для пустого пути', () => {
      const root = engine.parse('2 + 3');
      const replacement = engine.parse('5');
      const result = replaceNodeAtPath(root, [], replacement, cloneNode);
      expect(result.toString()).toBe('5');
    });

    it('заменяет узел по простому пути', () => {
      const root = engine.parse('2 + 3');
      const replacement = engine.parse('10');
      const result = replaceNodeAtPath(root, ['args', 0], replacement, cloneNode);
      expect(result.toString()).toBe('10 + 3');
    });

    it('заменяет узел внутри ParenthesisNode с content в пути', () => {
      // 3 * -(4) - заменить 4 на 10 по пути ["args", 1, "args", 0, "content"]
      const root = engine.parse('3 * -(4)');
      const replacement = engine.parse('10');
      const result = replaceNodeAtPath(root, ['args', 1, 'args', 0, 'content'], replacement, cloneNode);
      expect(result.toString()).toBe('3 * -(10)');
    });

    it('заменяет узел внутри ParenthesisNode без content в пути', () => {
      // 3 * -(4) - заменить содержимое скобок (4) на 10 по пути ["args", 1, "args", 0]
      // При прозрачной навигации ParenthesisNode разворачивается,
      // поэтому замена происходит внутри скобок
      const root = engine.parse('3 * -(4)');
      const replacement = engine.parse('10');
      const result = replaceNodeAtPath(root, ['args', 1, 'args', 0], replacement, cloneNode);
      // Результат: скобки сохраняются если путь НЕ заменяет сам ParenthesisNode
      // но в данном случае прозрачная навигация заменяет содержимое
      expect(result.toString()).toBe('3 * -(10)');
    });

    it('корректно обрабатывает унарный минус со скобками', () => {
      const root = engine.parse('-(x + 1)');
      const replacement = engine.parse('y');
      
      // Заменяем x
      const xPath: MathStepsPath = ['args', 0, 'args', 0];
      const result = replaceNodeAtPath(root, xPath, replacement, cloneNode);
      expect(result.toString()).toBe('-(y + 1)');
    });
  });

  describe('normalizePath', () => {
    it('не меняет пустой путь', () => {
      const root = engine.parse('2 + 3');
      const result = normalizePath([], root);
      expect(result).toEqual([]);
    });

    it('не меняет простой путь', () => {
      const root = engine.parse('2 + 3');
      const result = normalizePath(['args', 0], root);
      expect(result).toEqual(['args', 0]);
    });

    it('сохраняет путь с content если он валиден', () => {
      const root = engine.parse('3 * -(4)');
      const path: MathStepsPath = ['args', 1, 'args', 0, 'content'];
      const result = normalizePath(path, root);
      expect(result).toContain('args');
    });
  });

  describe('pathsEqual', () => {
    it('возвращает true для одинаковых путей', () => {
      const path1: MathStepsPath = ['args', 0, 'args', 1];
      const path2: MathStepsPath = ['args', 0, 'args', 1];
      expect(pathsEqual(path1, path2)).toBe(true);
    });

    it('возвращает false для разных путей', () => {
      const path1: MathStepsPath = ['args', 0];
      const path2: MathStepsPath = ['args', 1];
      expect(pathsEqual(path1, path2)).toBe(false);
    });

    it('возвращает false для путей разной длины', () => {
      const path1: MathStepsPath = ['args', 0];
      const path2: MathStepsPath = ['args', 0, 'content'];
      expect(pathsEqual(path1, path2)).toBe(false);
    });
  });

  describe('pathToString', () => {
    it('форматирует путь в JSON', () => {
      const path: MathStepsPath = ['args', 0, 'content'];
      expect(pathToString(path)).toBe('["args",0,"content"]');
    });
  });

  describe('интеграция с MathStepsEngine', () => {
    it('getNodeAtPath работает для всех подвыражений 3*-(4)', () => {
      const root = engine.parse('3*-(4)');
      
      // Тестируем все возможные пути
      const paths: MathStepsPath[] = [
        [],                              // весь expression
        ['args', 0],                     // 3
        ['args', 1],                     // -(4)
        ['args', 1, 'args', 0],          // (4) или 4
        ['args', 1, 'args', 0, 'content'] // 4
      ];
      
      for (const path of paths) {
        const node = getNodeAtPath(root, path);
        expect(node).not.toBeNull();
      }
    });

    it('replaceNodeAtPath корректно работает с путями analyzer-а', () => {
      // Симуляция пути от analyzer: ["args", 1, "args", 0, "content"]
      const root = engine.parse('3*-(4)');
      const replacement = engine.parse('(4 + 0)');
      
      const result = replaceNodeAtPath(
        root, 
        ['args', 1, 'args', 0, 'content'], 
        replacement, 
        cloneNode
      );
      
      expect(result.toString()).toContain('4 + 0');
    });
  });
});
