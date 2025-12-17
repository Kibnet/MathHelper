/**
 * Модуль вспомогательных функций
 * Вспомогательные функции для манипуляции с выражениями
 */

import type { ASTNode } from '../types/index.js';

/**
 * Преобразовать AST узел в строковое представление
 */
export function expressionToString(node: ASTNode): string {
  if (node.type === 'constant') {
    return String(node.value);
  } else if (node.type === 'variable') {
    return node.value;
  } else if (node.type === 'unary') {
    const operand = expressionToString(node.children[0]);
    if (node.children[0].type === 'operator') {
      return '-(' + operand + ')';
    }
    return '-' + operand;
  } else if (node.type === 'group') {
    return '(' + expressionToString(node.children[0]) + ')';
  } else if (node.type === 'implicit_mul') {
    // N-арное неявное умножение - без пробелов и без оператора *
    return node.children.map(child => expressionToString(child)).join('');
  } else if (node.type === 'operator') {
    if (node.value === '+') {
      // N-арное сложение с обработкой скрытых унарных минусов
      const parts: string[] = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (i === 0) {
          // Первый операнд
          parts.push(expressionToString(child));
        } else if (child.type === 'unary' && child.implicit) {
          // Скрытый унарный минус - показываем как '-'
          parts.push(' - ' + expressionToString(child.children[0]));
        } else {
          // Обычный операнд - показываем с +
          parts.push(' + ' + expressionToString(child));
        }
      }
      return parts.join('');
    } else if (node.value === '*') {
      // N-арное умножение
      return node.children.map(child => expressionToString(child)).join(' * ');
    } else {
      // Бинарные операции (- и /)
      const left = expressionToString(node.children[0]);
      const right = expressionToString(node.children[1]);
      return left + ' ' + node.value + ' ' + right;
    }
  }
  return '';
}

/**
 * Глубокое клонирование AST узла
 */
export function cloneNode(node: ASTNode): ASTNode {
  if (node.type === 'constant') {
    return { ...node };
  } else if (node.type === 'variable') {
    return { ...node };
  } else if (node.type === 'unary') {
    return {
      ...node,
      children: [cloneNode(node.children[0])]
    };
  } else if (node.type === 'group') {
    return {
      ...node,
      children: [cloneNode(node.children[0])]
    };
  } else if (node.type === 'operator' || node.type === 'implicit_mul') {
    return {
      ...node,
      children: node.children.map(child => cloneNode(child))
    };
  }
  return node;
}

/**
 * Найти узел по ID в AST
 */
export function findNodeById(root: ASTNode, id: string): ASTNode | null {
  if (root.id === id) return root;
  
  if ('children' in root && root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Заменить узел в AST
 */
export function replaceNode(root: ASTNode, targetId: string, newNode: ASTNode): ASTNode {
  if (root.id === targetId) {
    return newNode;
  }
  
  if (root.type === 'unary' || root.type === 'group') {
    return {
      ...root,
      children: [replaceNode(root.children[0], targetId, newNode)]
    };
  } else if (root.type === 'operator' || root.type === 'implicit_mul') {
    return {
      ...root,
      children: root.children.map(child => replaceNode(child, targetId, newNode))
    };
  }
  
  return root;
}

/**
 * Получить все листовые узлы (константы и переменные) из AST
 */
export function getLeafNodes(node: ASTNode): ASTNode[] {
  if (node.type === 'constant' || node.type === 'variable') {
    return [node];
  }
  
  if ('children' in node && node.children) {
    return node.children.flatMap(child => getLeafNodes(child));
  }
  
  return [];
}

/**
 * Подсчитать общее количество узлов в AST
 */
export function countNodes(node: ASTNode): number {
  let count = 1;
  
  if ('children' in node && node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  
  return count;
}

/**
 * Получить глубину AST
 */
export function getDepth(node: ASTNode): number {
  if (!('children' in node) || !node.children) {
    return 1;
  }
  
  const childDepths = node.children.map(child => getDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Проверить, равны ли два узла структурно
 */
export function nodesEqual(node1: ASTNode, node2: ASTNode): boolean {
  if (node1.type !== node2.type) return false;
  
  if (node1.type === 'constant' && node2.type === 'constant') {
    return node1.value === node2.value;
  } else if (node1.type === 'variable' && node2.type === 'variable') {
    return node1.value === node2.value;
  } else if ((node1.type === 'operator' || node1.type === 'implicit_mul') && 
             (node2.type === 'operator' || node2.type === 'implicit_mul')) {
    if (node1.value !== node2.value) return false;
    if (node1.children.length !== node2.children.length) return false;
    // Проверяем все дочерние узлы
    for (let i = 0; i < node1.children.length; i++) {
      if (!nodesEqual(node1.children[i], node2.children[i])) {
        return false;
      }
    }
    return true;
  } else if (node1.type === 'unary' && node2.type === 'unary') {
    return nodesEqual(node1.children[0], node2.children[0]);
  } else if (node1.type === 'group' && node2.type === 'group') {
    return nodesEqual(node1.children[0], node2.children[0]);
  }
  
  return false;
}

/**
 * Получить все ID узлов в AST
 */
export function getAllNodeIds(node: ASTNode): string[] {
  const ids: string[] = [node.id];
  
  if ('children' in node && node.children) {
    for (const child of node.children) {
      ids.push(...getAllNodeIds(child));
    }
  }
  
  return ids;
}
