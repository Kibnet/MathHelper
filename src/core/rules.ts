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
  
  if (node.type === 'operator' && node.value === '*') {
    if (node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      const left = node.children[0] as ConstantNode;
      const right = node.children[1] as ConstantNode;
      rules.push({
        id: 'eval_mul',
        name: '→ Вычислить',
        category: '1. Вычисления',
        preview: `${left.value}*${right.value} → ${left.value * right.value}`,
        apply: evaluateMultiplication
      });
    }
  }
  
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
  
  if (node.type === 'operator' && (node.value === '+' || node.value === '-')) {
    if (node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      const left = node.children[0] as ConstantNode;
      const right = node.children[1] as ConstantNode;
      const result = node.value === '+' ? left.value + right.value : left.value - right.value;
      rules.push({
        id: 'eval_add_sub',
        name: '→ Вычислить',
        category: '1. Вычисления',
        preview: `${left.value}${node.value}${right.value} → ${result}`,
        apply: node.value === '+' ? evaluateAddition : evaluateSubtraction
      });
    }
  }
  
  // === ПРИОРИТЕТ 2: УПРОЩЕНИЯ ===
  
  if (node.type === 'operator' && node.value === '*') {
    if ((node.children[0].type === 'constant' && node.children[0].value === 1) ||
        (node.children[1].type === 'constant' && node.children[1].value === 1)) {
      rules.push({
        id: 'remove_mult_one',
        name: '→ Убрать *1',
        category: '2. Упрощения',
        preview: 'a*1 → a или 1*a → a',
        apply: removeMultiplicationByOne
      });
    }
  }
  
  if (node.type === 'operator' && node.value === '*') {
    if ((node.children[0].type === 'constant' && node.children[0].value === 0) ||
        (node.children[1].type === 'constant' && node.children[1].value === 0)) {
      rules.push({
        id: 'simplify_mult_zero',
        name: '→ Упростить до 0',
        category: '2. Упрощения',
        preview: 'a*0 → 0',
        apply: simplifyMultiplicationByZero
      });
    }
  }
  
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
  
  if (node.type === 'operator' && node.value === '+') {
    if ((node.children[0].type === 'constant' && node.children[0].value === 0) ||
        (node.children[1].type === 'constant' && node.children[1].value === 0)) {
      rules.push({
        id: 'remove_add_zero',
        name: '→ Убрать +0',
        category: '2. Упрощения',
        preview: 'a+0 → a или 0+a → a',
        apply: removeAdditionOfZero
      });
    }
  }
  
  if (node.type === 'operator' && node.value === '-') {
    if (node.children[1].type === 'constant' && node.children[1].value === 0) {
      rules.push({
        id: 'remove_sub_zero',
        name: '→ Убрать -0',
        category: '2. Упрощения',
        preview: 'a-0 → a',
        apply: removeSubtractionOfZero
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
  
  if (node.type === 'operator' && node.value === '*') {
    rules.push({
      id: 'commutative_mul',
      name: 'Поменять местами операнды',
      category: '4. Перестановка',
      preview: 'a*b → b*a',
      apply: applyCommutative
    });
  }
  
  if (node.type === 'operator' && node.value === '+') {
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
    const canCollapse = (
      // Число * переменная
      (node.children[0].type === 'constant' && node.children[1].type === 'variable') ||
      // Переменная * переменная
      (node.children[0].type === 'variable' && node.children[1].type === 'variable') ||
      // Переменная * группа
      (node.children[0].type === 'variable' && node.children[1].type === 'group') ||
      // Число * группа
      (node.children[0].type === 'constant' && node.children[1].type === 'group') ||
      // Группа * переменная
      (node.children[0].type === 'group' && node.children[1].type === 'variable') ||
      // Группа * число
      (node.children[0].type === 'group' && node.children[1].type === 'constant') ||
      // Группа * группа
      (node.children[0].type === 'group' && node.children[1].type === 'group')
    );
    
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

function evaluateMultiplication(node: ASTNode): ConstantNode {
  const n = node as OperatorNode;
  const left = n.children[0] as ConstantNode;
  const right = n.children[1] as ConstantNode;
  return {
    id: generateId(),
    type: 'constant',
    value: left.value * right.value
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

function evaluateAddition(node: ASTNode): ConstantNode {
  const n = node as OperatorNode;
  const left = n.children[0] as ConstantNode;
  const right = n.children[1] as ConstantNode;
  return {
    id: generateId(),
    type: 'constant',
    value: left.value + right.value
  };
}

function evaluateSubtraction(node: ASTNode): ConstantNode {
  const n = node as OperatorNode;
  const left = n.children[0] as ConstantNode;
  const right = n.children[1] as ConstantNode;
  return {
    id: generateId(),
    type: 'constant',
    value: left.value - right.value
  };
}

function removeMultiplicationByOne(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  if (n.children[0].type === 'constant' && (n.children[0] as ConstantNode).value === 1) {
    return n.children[1];
  }
  return n.children[0];
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
  if (n.children[0].type === 'constant' && (n.children[0] as ConstantNode).value === 0) {
    return n.children[1];
  }
  return n.children[0];
}

function removeSubtractionOfZero(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  return n.children[0];
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
    children: [n.children[0], n.children[1]]
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
    children: [n.children[0], n.children[1]]
  };
}
