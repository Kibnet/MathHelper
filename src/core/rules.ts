/**
 * Модуль правил преобразования
 * Определяет все доступные правила преобразования и их применимость
 */

import type { ASTNode, ConstantNode, OperatorNode, TransformationRule, ImplicitMulNode } from '../types/index.js';
import { generateId } from './parser.js';

/**
 * Получить все применимые правила преобразования для узла
 */
export function getApplicableRules(node: ASTNode): TransformationRule[] {
  const rules: TransformationRule[] = [];
  
  // === ПРИОРИТЕТ 1: ВЫЧИСЛЕНИЯ ===
  
  // Вычисления для n-арного умножения: проверяем все соседние пары
  if (node.type === 'operator' && node.value === '*') {
    for (let i = 0; i < node.children.length - 1; i++) {
      if (node.children[i].type === 'constant' && node.children[i + 1].type === 'constant') {
        const left = node.children[i] as ConstantNode;
        const right = node.children[i + 1] as ConstantNode;
        rules.push({
          id: `eval_mul_${i}`,
          name: '→ Вычислить',
          category: '1. Вычисления',
          preview: `${left.value}*${right.value} → ${left.value * right.value}`,
          apply: (n: ASTNode) => evaluatePairAt(n as OperatorNode, i, '*')
        });
      }
    }
  }
  
  // Вычисления для деления (остаётся бинарным)
  if (node.type === 'operator' && node.value === '/') {
    if (node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      const left = node.children[0] as ConstantNode;
      const right = node.children[1] as ConstantNode;
      rules.push({
        id: 'eval_div',
        name: '→ Вычислить',
        category: '1. Вычисления',
        preview: `${left.value}/${right.value} → ${left.value / right.value}`,
        apply: evaluateDivision
      });
    }
  }
  
  // Вычисления для n-арного сложения: проверяем соседние пары констант
  if (node.type === 'operator' && node.value === '+') {
    for (let i = 0; i < node.children.length - 1; i++) {
      const left = node.children[i];
      const right = node.children[i + 1];
      
      // Проверяем, что оба операнда - константы (или унарный минус от константы)
      const leftValue = getConstantValue(left);
      const rightValue = getConstantValue(right);
      
      if (leftValue !== null && rightValue !== null) {
        rules.push({
          id: `eval_add_${i}`,
          name: '→ Вычислить',
          category: '1. Вычисления',
          preview: `${leftValue}+${rightValue} → ${leftValue + rightValue}`,
          apply: (n: ASTNode) => evaluatePairAt(n as OperatorNode, i, '+')
        });
      }
    }
  }
  
  // === ПРИОРИТЕТ 2: УПРОЩЕНИЯ ===
  
  // Удаление 1 из n-арного умножения
  if (node.type === 'operator' && node.value === '*') {
    const hasOne = node.children.some(child => child.type === 'constant' && child.value === 1);
    if (hasOne) {
      rules.push({
        id: 'remove_mult_one',
        name: '→ Убрать *1',
        category: '2. Упрощения',
        preview: 'a*1*b → a*b или 1*a → a',
        apply: removeMultiplicationByOne
      });
    }
  }
  
  // Упрощение умножения на 0
  if (node.type === 'operator' && node.value === '*') {
    const hasZero = node.children.some(child => child.type === 'constant' && child.value === 0);
    if (hasZero) {
      rules.push({
        id: 'simplify_mult_zero',
        name: '→ Упростить до 0',
        category: '2. Упрощения',
        preview: 'a*0*b → 0',
        apply: simplifyMultiplicationByZero
      });
    }
  }
  
  // Деление на 1 (остаётся бинарным)
  if (node.type === 'operator' && node.value === '/') {
    if (node.children[1].type === 'constant' && node.children[1].value === 1) {
      rules.push({
        id: 'remove_div_one',
        name: '→ Убрать /1',
        category: '2. Упрощения',
        preview: 'a/1 → a',
        apply: removeDivisionByOne
      });
    }
  }
  
  // Удаление 0 из n-арного сложения
  if (node.type === 'operator' && node.value === '+') {
    const hasZero = node.children.some(child => {
      // Обычный ноль
      if (child.type === 'constant' && child.value === 0) {
        return true;
      }
      // Унарный минус от нуля (-0)
      if (child.type === 'unary' && child.value === '-') {
        const innerChild = child.children[0];
        if (innerChild.type === 'constant' && (innerChild as ConstantNode).value === 0) {
          return true;
        }
      }
      return false;
    });
    
    if (hasZero) {
      rules.push({
        id: 'remove_add_zero',
        name: '→ Убрать +0',
        category: '2. Упрощения',
        preview: 'a+0+b → a+b или 0+a → a',
        apply: removeAdditionOfZero
      });
    }
  }
  
  if (node.type === 'unary' && node.children[0].type === 'unary') {
    rules.push({
      id: 'double_negation',
      name: '→ Убрать двойное отрицание',
      category: '2. Упрощения',
      preview: '--a → a',
      apply: removeDoubleNegation
    });
  }
  
  if (node.type === 'group' && node.children[0].type !== 'operator') {
    rules.push({
      id: 'remove_parens',
      name: '→ Убрать скобки',
      category: '2. Упрощения',
      preview: '(a) → a',
      apply: removeParentheses
    });
  }
  
  // === ПРИОРИТЕТ 3: ПРЕОБРАЗОВАНИЯ ===
  
  if (node.type === 'operator' && node.value === '*') {
    if (node.children[1].type === 'operator' && 
        (node.children[1].value === '+' || node.children[1].value === '-')) {
      rules.push({
        id: 'distributive_forward',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: 'a*(b+c) → a*b + a*c',
        apply: applyDistributiveForward
      });
    }
    
    if (node.children[0].type === 'operator' && 
        (node.children[0].value === '+' || node.children[0].value === '-')) {
      rules.push({
        id: 'distributive_forward_left',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: '(a+b)*c → a*c + b*c',
        apply: applyDistributiveForwardLeft
      });
    }
  }
  
  // === ПРИОРИТЕТ 4: ПЕРЕСТАНОВКА ===
  
  // Коммутативность только для бинарных узлов (пар)
  if (node.type === 'operator' && node.value === '*' && node.children.length === 2) {
    rules.push({
      id: 'commutative_mul',
      name: 'Поменять местами операнды',
      category: '4. Перестановка',
      preview: 'a*b → b*a',
      apply: applyCommutative
    });
  }
  
  if (node.type === 'operator' && node.value === '+' && node.children.length === 2) {
    rules.push({
      id: 'commutative_add',
      name: 'Поменять местами операнды',
      category: '4. Перестановка',
      preview: 'a+b → b+a',
      apply: applyCommutative
    });
  }
  
  // === НОТАЦИЯ: Неявное/Явное умножение ===
  
  // Раскрытие неявного умножения (2a → 2*a)
  if (node.type === 'implicit_mul') {
    rules.push({
      id: 'expand_implicit_mul',
      name: '→ Раскрыть неявное *',
      category: '6. Нотация',
      preview: '2a → 2*a',
      apply: expandImplicitMultiplication
    });
  }
  
  // Сворачивание явного умножения (2*a → 2a)
  if (node.type === 'operator' && node.value === '*') {
    // Проверяем, можно ли свернуть в неявное умножение
    // Для n-арного умножения проверяем все соседние пары
    const canCollapse = node.children.length >= 2 && node.children.every((child, i) => {
      if (i === node.children.length - 1) return true; // последний элемент не проверяем
      const left = child;
      const right = node.children[i + 1];
      
      // Проверяем возможные комбинации для неявного умножения
      return (
        // Число * переменная
        (left.type === 'constant' && right.type === 'variable') ||
        // Переменная * переменная
        (left.type === 'variable' && right.type === 'variable') ||
        // Переменная * группа
        (left.type === 'variable' && right.type === 'group') ||
        // Число * группа
        (left.type === 'constant' && right.type === 'group') ||
        // Группа * переменная
        (left.type === 'group' && right.type === 'variable') ||
        // Группа * число (только если число не первое)
        (left.type === 'group' && right.type === 'constant') ||
        // Группа * группа
        (left.type === 'group' && right.type === 'group')
      );
    });
    
    if (canCollapse) {
      rules.push({
        id: 'collapse_to_implicit_mul',
        name: '→ Свернуть в неявное *',
        category: '6. Нотация',
        preview: '2*a → 2a',
        apply: collapseToImplicitMultiplication
      });
    }
  }
  
  // === ПРИОРИТЕТ 5: ОБЕРТЫВАНИЕ ===
  
  if (node.type !== 'group') {
    rules.push({
      id: 'add_parens',
      name: '+ Добавить скобки',
      category: '5. Обертывание',
      preview: 'a → (a)',
      apply: addParentheses
    });
  }
  
  rules.push({
    id: 'add_double_neg',
    name: '+ Добавить двойное отрицание',
    category: '5. Обертывание',
    preview: 'a → --a',
    apply: applyDoubleNegation
  });
  
  rules.push({
    id: 'multiply_by_one',
    name: '+ Умножить на 1',
    category: '5. Обертывание',
    preview: 'a → a*1',
    apply: multiplyByOne
  });
  
  rules.push({
    id: 'divide_by_one',
    name: '+ Разделить на 1',
    category: '5. Обертывание',
    preview: 'a → a/1',
    apply: divideByOne
  });
  
  rules.push({
    id: 'add_zero',
    name: '+ Прибавить ноль',
    category: '5. Обертывание',
    preview: 'a → a+0',
    apply: addZero
  });
  
  return rules;
}

// === Функции преобразования ===

/**
 * Получить числовое значение узла (константа или унарный минус от константы)
 */
function getConstantValue(node: ASTNode): number | null {
  if (node.type === 'constant') {
    return node.value;
  }
  if (node.type === 'unary' && node.value === '-' && node.children[0].type === 'constant') {
    return -(node.children[0] as ConstantNode).value;
  }
  return null;
}

/**
 * Вычислить пару операндов в n-арном узле
 */
function evaluatePairAt(node: OperatorNode, index: number, operator: string): ASTNode {
  const left = node.children[index];
  const right = node.children[index + 1];
  
  let result: number;
  
  if (operator === '*') {
    const leftVal = (left as ConstantNode).value;
    const rightVal = (right as ConstantNode).value;
    result = leftVal * rightVal;
  } else if (operator === '+') {
    const leftVal = getConstantValue(left)!;
    const rightVal = getConstantValue(right)!;
    result = leftVal + rightVal;
  } else {
    throw new Error(`Unsupported operator: ${operator}`);
  }
  
  // Создаём новый массив детей с заменённой парой
  const newChildren = [
    ...node.children.slice(0, index),
    { id: generateId(), type: 'constant' as const, value: result },
    ...node.children.slice(index + 2)
  ];
  
  // Если остался только один элемент, возвращаем его
  if (newChildren.length === 1) {
    return newChildren[0];
  }
  
  // Иначе возвращаем n-арный узел
  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function evaluateDivision(node: ASTNode): ConstantNode {
  const n = node as OperatorNode;
  const left = n.children[0] as ConstantNode;
  const right = n.children[1] as ConstantNode;
  return {
    id: generateId(),
    type: 'constant',
    value: left.value / right.value
  };
}

function removeMultiplicationByOne(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  // Удаляем все единицы из n-арного умножения
  const newChildren = n.children.filter(
    child => !(child.type === 'constant' && (child as ConstantNode).value === 1)
  );
  
  // Если остался только один элемент, возвращаем его
  if (newChildren.length === 1) {
    return newChildren[0];
  }
  
  // Если остался пустой массив (все были единицы), возвращаем 1
  if (newChildren.length === 0) {
    return { id: generateId(), type: 'constant', value: 1 };
  }
  
  // Иначе возвращаем n-арный узел без единиц
  return {
    ...n,
    id: generateId(),
    children: newChildren
  };
}

function simplifyMultiplicationByZero(): ConstantNode {
  return {
    id: generateId(),
    type: 'constant',
    value: 0
  };
}

function removeDivisionByOne(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  return n.children[0];
}

function removeAdditionOfZero(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  // Удаляем все нули из n-арного сложения, включая унарные минусы от нуля
  const newChildren = n.children.filter(child => {
    // Обычные нули
    if (child.type === 'constant' && (child as ConstantNode).value === 0) {
      return false; // Удаляем
    }
    // Унарный минус от нуля (-0)
    if (child.type === 'unary' && child.value === '-') {
      const innerChild = child.children[0];
      if (innerChild.type === 'constant' && (innerChild as ConstantNode).value === 0) {
        return false; // Удаляем -0
      }
    }
    return true; // Оставляем
  });
  
  // Если остался только один элемент, возвращаем его
  if (newChildren.length === 1) {
    return newChildren[0];
  }
  
  // Если остался пустой массив (все были нули), возвращаем 0
  if (newChildren.length === 0) {
    return { id: generateId(), type: 'constant', value: 0 };
  }
  
  // Иначе возвращаем n-арный узел без нулей
  return {
    ...n,
    id: generateId(),
    children: newChildren
  };
}

function removeDoubleNegation(node: ASTNode): ASTNode {
  const n = node as import('../types/index.js').UnaryNode;
  const inner = n.children[0] as import('../types/index.js').UnaryNode;
  return inner.children[0];
}

function removeParentheses(node: ASTNode): ASTNode {
  const n = node as import('../types/index.js').GroupNode;
  return n.children[0];
}

function applyCommutative(node: ASTNode): OperatorNode {
  const n = node as OperatorNode;
  return {
    ...n,
    id: generateId(),
    children: [n.children[1], n.children[0]]
  };
}

function applyDistributiveForward(node: ASTNode): OperatorNode {
  const n = node as OperatorNode;
  const a = n.children[0];
  const bc = n.children[1] as OperatorNode;
  const b = bc.children[0];
  const c = bc.children[1];
  
  return {
    id: generateId(),
    type: 'operator',
    value: bc.value,
    children: [
      { id: generateId(), type: 'operator', value: '*', children: [a, b] },
      { id: generateId(), type: 'operator', value: '*', children: [a, c] }
    ]
  };
}

function applyDistributiveForwardLeft(node: ASTNode): OperatorNode {
  const n = node as OperatorNode;
  const ab = n.children[0] as OperatorNode;
  const c = n.children[1];
  const a = ab.children[0];
  const b = ab.children[1];
  
  return {
    id: generateId(),
    type: 'operator',
    value: ab.value,
    children: [
      { id: generateId(), type: 'operator', value: '*', children: [a, c] },
      { id: generateId(), type: 'operator', value: '*', children: [b, c] }
    ]
  };
}

function addParentheses(node: ASTNode): import('../types/index.js').GroupNode {
  return {
    id: generateId(),
    type: 'group',
    value: 'group',
    children: [node]
  };
}

function applyDoubleNegation(node: ASTNode): import('../types/index.js').UnaryNode {
  return {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [{
      id: generateId(),
      type: 'unary',
      value: '-',
      children: [node]
    }]
  };
}

function multiplyByOne(node: ASTNode): OperatorNode {
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children: [
      node,
      { id: generateId(), type: 'constant', value: 1 }
    ]
  };
}

function divideByOne(node: ASTNode): OperatorNode {
  return {
    id: generateId(),
    type: 'operator',
    value: '/',
    children: [
      node,
      { id: generateId(), type: 'constant', value: 1 }
    ]
  };
}

function addZero(node: ASTNode): OperatorNode {
  return {
    id: generateId(),
    type: 'operator',
    value: '+',
    children: [
      node,
      { id: generateId(), type: 'constant', value: 0 }
    ]
  };
}

// === Преобразования неявного умножения ===

/**
 * Раскрывает неявное умножение в явное (2a → 2*a)
 */
function expandImplicitMultiplication(node: ASTNode): OperatorNode {
  const n = node as ImplicitMulNode;
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children: [...n.children] // Копируем весь массив детей
  };
}

/**
 * Сворачивает явное умножение в неявное (2*a → 2a)
 */
function collapseToImplicitMultiplication(node: ASTNode): ImplicitMulNode {
  const n = node as OperatorNode;
  return {
    id: generateId(),
    type: 'implicit_mul',
    value: '*',
    children: [...n.children] // Копируем весь массив детей
  };
}
