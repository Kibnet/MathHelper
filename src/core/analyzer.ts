/**
 * Модуль анализатора выражений
 * Находит все валидные подвыражения и определяет расположение фреймов
 */

import type { Subexpression, SubexpressionPosition, LayoutConfig, ASTNode } from '../types/index.js';
import { ExpressionParser } from './parser.js';
import { getApplicableRules } from './rules.js';
import { expressionToString } from '../utils/helpers.js';

/**
 * Извлечь все узлы из AST дерева с их текстовыми позициями
 * Для n-арных операций генерируются фреймы соседних пар
 */
export function extractNodesFromAST(rootNode: ASTNode, fullExpressionString: string): Subexpression[] {
  const subexpressions: Subexpression[] = [];
  const nodeTextMap = new Map<string, string>();
  
  // Рекурсивно обходим дерево и строим карту узлов
  function buildNodeTextMap(node: ASTNode): void {
    const text = expressionToString(node);
    nodeTextMap.set(node.id, text);
    
    if ('children' in node && node.children) {
      node.children.forEach(child => buildNodeTextMap(child));
    }
  }
  
  buildNodeTextMap(rootNode);
  
  // Для каждого узла находим его позицию в полном выражении
  function findNodePositions(node: ASTNode, currentPos: number = 0): void {
    const nodeText = nodeTextMap.get(node.id) || '';
    const rules = getApplicableRules(node);
    
    // Ищем позицию этого узла в оставшейся части выражения
    const index = fullExpressionString.indexOf(nodeText, currentPos);
    
    if (index !== -1 && rules.length > 0) {
      subexpressions.push({
        text: nodeText,
        start: index,
        end: index + nodeText.length,
        node: node,
        length: nodeText.length,
        rules: rules
      });
    }
    
    // Для n-арных операций генерируем фреймы для соседних пар
    if ((node.type === 'operator' || node.type === 'implicit_mul') && 
        node.children.length > 2) {
      // Генерируем парные подвыражения
      for (let i = 0; i < node.children.length - 1; i++) {
        const leftChild = node.children[i];
        const rightChild = node.children[i + 1];
        
        const leftText = nodeTextMap.get(leftChild.id) || '';
        const rightText = nodeTextMap.get(rightChild.id) || '';
        
        // Формируем текст пары
        let pairText = '';
        if (node.type === 'implicit_mul') {
          pairText = `${leftText}${rightText}`; // Неявное умножение без оператора
        } else if (node.value === '+') {
          // Для сложения нужно учесть скрытые унарные минусы
          if (rightChild.type === 'unary' && (rightChild as any).implicit) {
            const innerText = nodeTextMap.get(rightChild.children[0].id) || '';
            pairText = `${leftText} - ${innerText}`;
          } else {
            pairText = `${leftText} + ${rightText}`;
          }
        } else if (node.value === '*') {
          pairText = `${leftText} * ${rightText}`;
        }
        
        // Находим позицию пары
        const pairIndex = fullExpressionString.indexOf(pairText, currentPos);
        if (pairIndex !== -1) {
          // Создаём виртуальный узел для пары
          const pairNode: ASTNode = {
            ...node,
            id: `${node.id}_pair_${i}`,
            children: [leftChild, rightChild]
          };
          
          const pairRules = getApplicableRules(pairNode);
          if (pairRules.length > 0) {
            subexpressions.push({
              text: pairText,
              start: pairIndex,
              end: pairIndex + pairText.length,
              node: pairNode,
              length: pairText.length,
              rules: pairRules
            });
          }
        }
      }
    }
    
    // Рекурсивно обрабатываем дочерние узлы
    if ('children' in node && node.children) {
      let childPos = index !== -1 ? index : currentPos;
      node.children.forEach(child => {
        findNodePositions(child, childPos);
      });
    }
  }
  
  findNodePositions(rootNode);
  
  // Удаляем дубликаты по ID узла
  const uniqueSubexpressions: Subexpression[] = [];
  const seenIds = new Set<string>();
  
  for (const subexpr of subexpressions) {
    if (!seenIds.has(subexpr.node.id)) {
      seenIds.add(subexpr.node.id);
      uniqueSubexpressions.push(subexpr);
    }
  }
  
  return uniqueSubexpressions;
}

/**
 * Найти все валидные подвыражения в строке выражения
 * @deprecated Используйте extractNodesFromAST для работы с основным деревом
 */
export function findAllSubexpressions(exprString: string): Subexpression[] {
  const subexpressions: Subexpression[] = [];
  const length = exprString.length;
  
  // Пробуем все возможные подстроки
  for (let start = 0; start < length; start++) {
    for (let end = start + 1; end <= length; end++) {
      const substring = exprString.substring(start, end);
      const trimmedSubstring = substring.trim();
      
      if (!trimmedSubstring) continue;
      
      // Пропускаем, если начинается или заканчивается пробелом (нужны точные позиции)
      if (substring !== trimmedSubstring) continue;
      
      // Пропускаем отдельные цифры, которые являются частью большего числа
      if (/^\d$/.test(trimmedSubstring)) {
        const charBefore = start > 0 ? exprString[start - 1] : '';
        const charAfter = end < length ? exprString[end] : '';
        if (/\d/.test(charBefore) || /\d/.test(charAfter)) {
          continue; // Пропускаем, эта цифра является частью многозначного числа
        }
      }
      
      try {
        const parser = new ExpressionParser(trimmedSubstring);
        const node = parser.parse();
        
        // Проверяем, является ли это значимым выражением
        if (node) {
          // Получаем применимые правила для проверки полезности подвыражения
          const rules = getApplicableRules(node);
          
          // Пропускаем, если нет доступных преобразований
          if (rules.length === 0) {
            continue;
          }
          
          subexpressions.push({
            text: trimmedSubstring,
            start: start,
            end: end,
            node: node,
            length: end - start,
            rules: rules
          });
        }
      } catch (e) {
        // Не валидное выражение, пропускаем тихо
      }
    }
  }
  
  // Удаляем дубликаты на основе позиции
  const uniqueSubexpressions: Subexpression[] = [];
  const seen = new Set<string>();
  
  for (const subexpr of subexpressions) {
    const key = `${subexpr.start}-${subexpr.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSubexpressions.push(subexpr);
    }
  }
  
  return uniqueSubexpressions;
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
