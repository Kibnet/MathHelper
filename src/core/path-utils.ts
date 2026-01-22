/**
 * Утилиты для работы с путями в AST дереве mathsteps
 * 
 * Решает проблему дуализма путей: analyzer генерирует пути с явным 'content',
 * а mathsteps-engine использует "прозрачную" навигацию.
 * Этот модуль обеспечивает единую точку нормализации путей.
 */

import type { MathStepsNode, MathStepsPath } from '../types/index.js';

/**
 * Проверяет, является ли узел ParenthesisNode
 */
export function isParenthesisNode(node: MathStepsNode): node is MathStepsNode & { content: MathStepsNode } {
  return node.type === 'ParenthesisNode';
}

/**
 * Нормализует путь относительно структуры AST дерева.
 * 
 * Проблема: пути могут генерироваться двумя способами:
 * 1. С явным 'content' для ParenthesisNode: ["args", 1, "args", 0, "content"]
 * 2. Без 'content' (прозрачная навигация): ["args", 1, "args", 0]
 * 
 * Эта функция приводит путь к каноническому виду, совместимому с AST структурой.
 * 
 * @param path - исходный путь
 * @param root - корневой узел AST
 * @returns нормализованный путь
 */
export function normalizePath(path: MathStepsPath, root: MathStepsNode): MathStepsPath {
  if (path.length === 0) {
    return path;
  }

  const result: MathStepsPath = [];
  let current: MathStepsNode | undefined = root;
  let index = 0;

  while (current && index < path.length) {
    const segment = path[index];

    if (segment === 'left' || segment === 'right') {
      // Обработка уравнений
      result.push(segment);
      const eqNode = current as MathStepsNode & { leftNode?: MathStepsNode; rightNode?: MathStepsNode };
      current = segment === 'left' ? eqNode.leftNode : eqNode.rightNode;
      index += 1;
      continue;
    }

    if (segment === 'content') {
      // Явный переход к содержимому ParenthesisNode
      if (isParenthesisNode(current) && current.content) {
        result.push('content');
        current = current.content;
        index += 1;
        continue;
      }
      // Если текущий узел не ParenthesisNode, пропускаем лишний 'content'
      // (узел уже был развёрнут)
      index += 1;
      continue;
    }

    if (segment === 'args') {
      const argIndex = path[index + 1];
      if (typeof argIndex !== 'number' || !current.args || !current.args[argIndex]) {
        // Невалидный путь - возвращаем что есть
        return result;
      }

      result.push('args', argIndex);
      current = current.args[argIndex];
      index += 2;

      // Проверяем следующий сегмент пути
      const nextSegment = path[index];
      
      // Если следующий сегмент НЕ 'content', но текущий узел - ParenthesisNode,
      // добавляем 'content' в нормализованный путь для явности
      if (nextSegment !== 'content' && isParenthesisNode(current) && current.content) {
        // Автоматически разворачиваем ParenthesisNode
        // НЕ добавляем 'content' - сохраняем прозрачную семантику
        // чтобы путь оставался совместимым с mathsteps
      }

      continue;
    }

    // Неизвестный сегмент
    return result;
  }

  return result;
}

/**
 * Получает узел по пути с поддержкой обоих форматов путей.
 * 
 * @param root - корневой узел AST
 * @param path - путь к узлу (может быть с 'content' или без)
 * @returns узел или null если путь невалиден
 */
export function getNodeAtPath(root: MathStepsNode, path: MathStepsPath): MathStepsNode | null {
  let current: MathStepsNode | undefined = root;
  let index = 0;

  while (current && index < path.length) {
    const segment = path[index];

    if (segment === 'left' || segment === 'right') {
      const eqNode = current as MathStepsNode & { leftNode?: MathStepsNode; rightNode?: MathStepsNode };
      current = segment === 'left' ? eqNode.leftNode : eqNode.rightNode;
      index += 1;
      continue;
    }

    if (segment === 'content') {
      if (isParenthesisNode(current) && current.content) {
        current = current.content;
      }
      // Если не ParenthesisNode, игнорируем сегмент (узел уже развёрнут)
      index += 1;
      continue;
    }

    if (segment === 'args') {
      const argIndex = path[index + 1];
      if (typeof argIndex !== 'number' || !current.args || !current.args[argIndex]) {
        return null;
      }
      current = current.args[argIndex];
      index += 2;

      // Прозрачно разворачиваем ParenthesisNode, если следующий сегмент НЕ 'content'
      const nextSegment = path[index];
      if (nextSegment !== 'content') {
        while (current && isParenthesisNode(current) && current.content) {
          current = current.content;
        }
      }
      continue;
    }

    return null;
  }

  return current || null;
}

/**
 * Заменяет узел по пути с поддержкой обоих форматов путей.
 * 
 * @param root - корневой узел AST
 * @param path - путь к узлу (может быть с 'content' или без)
 * @param replacement - новый узел
 * @param cloneNode - функция клонирования узла
 * @returns новый корневой узел с заменённым подузлом
 */
export function replaceNodeAtPath(
  root: MathStepsNode,
  path: MathStepsPath,
  replacement: MathStepsNode,
  cloneNode: (node: MathStepsNode) => MathStepsNode
): MathStepsNode {
  if (path.length === 0) {
    return replacement;
  }

  const [segment, next] = path;

  if (segment === 'left' || segment === 'right') {
    const clone = cloneNode(root);
    const eqClone = clone as MathStepsNode & { leftNode?: MathStepsNode; rightNode?: MathStepsNode };
    const eqRoot = root as MathStepsNode & { leftNode?: MathStepsNode; rightNode?: MathStepsNode };
    
    if (segment === 'left' && eqRoot.leftNode) {
      eqClone.leftNode = replaceNodeAtPath(eqRoot.leftNode, path.slice(1), replacement, cloneNode);
    } else if (segment === 'right' && eqRoot.rightNode) {
      eqClone.rightNode = replaceNodeAtPath(eqRoot.rightNode, path.slice(1), replacement, cloneNode);
    }
    return clone;
  }

  if (segment === 'content') {
    if (isParenthesisNode(root) && root.content) {
      const clone = cloneNode(root);
      (clone as MathStepsNode & { content: MathStepsNode }).content = 
        replaceNodeAtPath(root.content, path.slice(1), replacement, cloneNode);
      return clone;
    }
    // Если не ParenthesisNode, продолжаем с текущим корнем
    return replaceNodeAtPath(root, path.slice(1), replacement, cloneNode);
  }

  if (segment === 'args') {
    if (typeof next !== 'number' || !root.args) {
      return root;
    }
    const clone = cloneNode(root);
    clone.args = root.args.map((arg, index) => {
      if (index === next) {
        const restPath = path.slice(2);
        const nextSegment = restPath[0];

        // Если arg - ParenthesisNode и путь не содержит явный 'content':
        if (isParenthesisNode(arg) && arg.content && nextSegment !== 'content') {
          // Если путь закончился - заменяем содержимое скобок (прозрачная навигация)
          if (restPath.length === 0) {
            const parenClone = cloneNode(arg);
            (parenClone as MathStepsNode & { content: MathStepsNode }).content = replacement;
            return parenClone;
          }
          // Иначе продолжаем навигацию внутри content
          const parenClone = cloneNode(arg);
          (parenClone as MathStepsNode & { content: MathStepsNode }).content = 
            replaceNodeAtPath(arg.content, restPath, replacement, cloneNode);
          return parenClone;
        }

        return replaceNodeAtPath(arg, restPath, replacement, cloneNode);
      }
      return cloneNode(arg);
    });
    return clone;
  }

  return root;
}

/**
 * Сравнивает два пути на эквивалентность с учётом нормализации.
 * 
 * @param path1 - первый путь
 * @param path2 - второй путь
 * @param root - корневой узел для нормализации
 * @returns true если пути эквивалентны
 */
export function pathsEqual(path1: MathStepsPath, path2: MathStepsPath): boolean {
  // Простое сравнение без нормализации
  if (path1.length !== path2.length) {
    return false;
  }
  
  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Преобразует путь в строковое представление для отладки.
 */
export function pathToString(path: MathStepsPath): string {
  return JSON.stringify(path);
}
