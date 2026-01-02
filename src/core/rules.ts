/**
 * Модуль правил преобразования
 * Определяет все доступные правила преобразования и их применимость
 */

import type { ASTNode, ConstantNode, OperatorNode, TransformationRule, ImplicitMulNode, GroupNode, UnaryNode } from '../types/index.js';
import { generateId } from './parser.js';
import { nodesEqual } from '../utils/helpers.js';

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

  if (node.type === 'group' && node.children[0].type === 'group') {
    rules.push({
      id: 'remove_double_parens',
      name: '→ Убрать двойные скобки',
      category: '2. Упрощения',
      preview: '((a)) → (a)',
      apply: removeDoubleParentheses
    });
  }

  if (node.type === 'unary' && node.children[0].type === 'group') {
    const groupChild = node.children[0] as GroupNode;
    if (groupChild.children[0].type !== 'operator') {
      rules.push({
        id: 'remove_unary_parens',
        name: '→ Убрать скобки после минуса',
        category: '2. Упрощения',
        preview: '-(a) → -a',
        apply: removeUnaryParentheses
      });
    }
  }
  
  // === ПРИОРИТЕТ 3: ПРЕОБРАЗОВАНИЯ ===
  
  if (node.type === 'operator' && node.value === '+') {
    if (node.children.some(child => child.type === 'operator' && child.value === '+')) {
      rules.push({
        id: 'assoc_flatten_add',
        name: '→ Снять ассоциативные скобки',
        category: '3. Преобразования',
        preview: '(a+b)+c → a+b+c',
        apply: flattenAddition
      });
    }
  }

  if (node.type === 'operator' && node.value === '*') {
    if (node.children.some(child => child.type === 'operator' && child.value === '*')) {
      rules.push({
        id: 'assoc_flatten_mul',
        name: '→ Снять ассоциативные скобки',
        category: '3. Преобразования',
        preview: '(a*b)*c → a*b*c',
        apply: flattenMultiplication
      });
    }
  }

  if (node.type === 'operator' && node.value === '*' && node.children.length === 2) {
    const rightSum = getAdditionNode(node.children[1]);
    if (rightSum) {
      rules.push({
        id: 'distributive_forward',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: 'a*(b+c+...) → a*b + a*c + ...',
        apply: applyDistributiveForward
      });
    }

    const leftSum = getAdditionNode(node.children[0]);
    if (leftSum) {
      rules.push({
        id: 'distributive_forward_left',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: '(a+b+...)*c → a*c + b*c + ...',
        apply: applyDistributiveForwardLeft
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    const leftCommon = findCommonFactorAcrossSum(node, 'left');
    if (leftCommon) {
      rules.push({
        id: 'factor_common_left_all',
        name: '→ Вынести общий множитель',
        category: '3. Преобразования',
        preview: 'a*b + a*c + ... → a*(b+c+...)',
        apply: (n: ASTNode) => factorCommonAcrossSum(n as OperatorNode, leftCommon)
      });
    }

    const rightCommon = findCommonFactorAcrossSum(node, 'right');
    if (rightCommon) {
      rules.push({
        id: 'factor_common_right_all',
        name: '→ Вынести общий множитель',
        category: '3. Преобразования',
        preview: 'b*a + c*a + ... → (b+c+...)*a',
        apply: (n: ASTNode) => factorCommonAcrossSum(n as OperatorNode, rightCommon)
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    node.children.forEach((child, index) => {
      const explicitNegative = getExplicitNegativeChild(child);
      if (explicitNegative) {
        rules.push({
          id: `sum_to_sub_${index}`,
          name: '→ Превратить +(-b) в вычитание',
          category: '3. Преобразования',
          preview: 'a + (-b) → a - b',
          apply: (n: ASTNode) => convertExplicitNegativeToSubtraction(n as OperatorNode, index)
        });
      }

      if (isImplicitNegativeChild(child)) {
        rules.push({
          id: `sub_to_sum_${index}`,
          name: '→ Превратить вычитание в +(-b)',
          category: '3. Преобразования',
          preview: 'a - b → a + (-b)',
          apply: (n: ASTNode) => convertSubtractionToExplicitNegative(n as OperatorNode, index)
        });
      }
    });
  }

  if (node.type === 'unary') {
    const target = getUnaryTarget(node);
    if (target && target.type === 'operator' && target.value === '+') {
      rules.push({
        id: 'distribute_unary_minus',
        name: '→ Распределить минус по сумме',
        category: '3. Преобразования',
        preview: '-(a+b) → -a + -b',
        apply: distributeUnaryMinusOverSum
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    if (node.children.length >= 2 && node.children.every(isUnaryMinusNode)) {
      rules.push({
        id: 'factor_unary_minus',
        name: '→ Вынести минус из суммы',
        category: '3. Преобразования',
        preview: '-a + -b → -(a+b)',
        apply: factorUnaryMinusFromSum
      });
    }
  }

  if (node.type === 'operator' && node.value === '*') {
    const unaryIndices = node.children
      .map((child, index) => (isUnaryMinusNode(child) ? index : -1))
      .filter(index => index !== -1);
    for (const index of unaryIndices) {
      rules.push({
        id: `pull_unary_minus_mul_${index}`,
        name: '→ Вынести минус из произведения',
        category: '3. Преобразования',
        preview: '-a*b → -(a*b)',
        apply: (n: ASTNode) => pullUnaryMinusFromMultiplication(n as OperatorNode, index)
      });
    }
  }

  if (node.type === 'operator' && node.value === '/') {
    const leftUnary = getUnaryNode(node.children[0]);
    const rightUnary = getUnaryNode(node.children[1]);
    if (leftUnary && rightUnary) {
      rules.push({
        id: 'remove_double_neg_div',
        name: '→ Убрать двойной минус в дроби',
        category: '3. Преобразования',
        preview: '(-a)/(-b) → a/b',
        apply: removeDoubleNegationInDivision
      });
    }
    if (leftUnary) {
      rules.push({
        id: 'pull_unary_minus_div_left',
        name: '→ Вынести минус из числителя',
        category: '3. Преобразования',
        preview: '(-a)/b → -(a/b)',
        apply: pullUnaryMinusFromDivisionLeft
      });
    }
    if (rightUnary) {
      rules.push({
        id: 'pull_unary_minus_div_right',
        name: '→ Вынести минус из знаменателя',
        category: '3. Преобразования',
        preview: 'a/(-b) → -(a/b)',
        apply: pullUnaryMinusFromDivisionRight
      });
    }
    rules.push({
      id: 'div_to_mul_inverse',
      name: '→ Заменить деление на умножение',
      category: '3. Преобразования',
      preview: 'a/b → a*(1/b)',
      apply: convertDivisionToMultiplication
    });
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

function removeDoubleParentheses(node: ASTNode): GroupNode {
  const n = node as GroupNode;
  return n.children[0] as GroupNode;
}

function removeUnaryParentheses(node: ASTNode): UnaryNode {
  const n = node as UnaryNode;
  const group = n.children[0] as GroupNode;
  return {
    ...n,
    id: generateId(),
    children: [group.children[0]]
  };
}

function applyCommutative(node: ASTNode): OperatorNode {
  const n = node as OperatorNode;
  return {
    ...n,
    id: generateId(),
    children: [n.children[1], n.children[0]]
  };
}

function applyDistributiveForward(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const multiplier = n.children[0];
  const sumNode = getAdditionNode(n.children[1]);
  if (!sumNode) {
    return node;
  }

  const products = sumNode.children.map(child => createMultiplicationNode([multiplier, child]));
  return createAdditionNode(products);
}

function applyDistributiveForwardLeft(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const sumNode = getAdditionNode(n.children[0]);
  const multiplier = n.children[1];
  if (!sumNode) {
    return node;
  }

  const products = sumNode.children.map(child => createMultiplicationNode([child, multiplier]));
  return createAdditionNode(products);
}

function flattenAddition(node: ASTNode): ASTNode {
  return flattenAssociative(node as OperatorNode, '+');
}

function flattenMultiplication(node: ASTNode): ASTNode {
  return flattenAssociative(node as OperatorNode, '*');
}

function flattenAssociative(node: OperatorNode, operator: '+' | '*'): ASTNode {
  const newChildren: ASTNode[] = [];
  for (const child of node.children) {
    if (child.type === 'operator' && child.value === operator) {
      newChildren.push(...child.children);
    } else {
      newChildren.push(child);
    }
  }
  if (newChildren.length === 1) {
    return newChildren[0];
  }
  return {
    ...node,
    id: generateId(),
    value: operator,
    children: newChildren
  };
}

function factorCommonAcrossSum(node: OperatorNode, match: CommonFactorAcross): ASTNode {
  void node;
  const sumNode = createAdditionNode(match.remainders);
  const groupedSum = wrapInGroup(sumNode);
  const children = match.side === 'right'
    ? [groupedSum, match.factor]
    : [match.factor, groupedSum];
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children
  };
}

function distributeUnaryMinusOverSum(node: ASTNode): ASTNode {
  const unaryNode = node as UnaryNode;
  const target = getUnaryTarget(unaryNode);
  if (!target || target.type !== 'operator' || target.value !== '+') {
    return node;
  }

  const newChildren = target.children.map(child => createUnaryMinus(child));
  return wrapInGroup(createAdditionNode(newChildren));
}

function factorUnaryMinusFromSum(node: ASTNode): ASTNode {
  const sumNode = node as OperatorNode;
  const innerChildren = sumNode.children.map(child => (child as UnaryNode).children[0]);
  const newSum = createAdditionNode(innerChildren);
  return createUnaryMinus(newSum);
}

function convertExplicitNegativeToSubtraction(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index];
  const explicitUnary = getExplicitNegativeChild(target);
  if (!explicitUnary) {
    return node;
  }

  let operand = explicitUnary.children[0];
  if (operand.type === 'operator') {
    operand = wrapInGroup(operand);
  }

  const implicitUnary: UnaryNode = {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [operand],
    implicit: true
  };

  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return implicitUnary;
    }
    return child;
  });

  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function convertSubtractionToExplicitNegative(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index];
  if (!isImplicitNegativeChild(target)) {
    return node;
  }

  const explicitUnary: UnaryNode = {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [target.children[0]]
  };

  const grouped = wrapInGroup(explicitUnary);

  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return grouped;
    }
    return child;
  });

  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function pullUnaryMinusFromMultiplication(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index] as UnaryNode;
  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return target.children[0];
    }
    return child;
  });
  const product = createMultiplicationNode(newChildren);
  return createUnaryMinus(product);
}

function removeDoubleNegationInDivision(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = unwrapUnaryNode(divNode.children[0]).inner;
  const right = unwrapUnaryNode(divNode.children[1]).inner;
  return createDivisionNode(left, right);
}

function pullUnaryMinusFromDivisionLeft(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = unwrapUnaryNode(divNode.children[0]).inner;
  const right = divNode.children[1];
  return createUnaryMinus(createDivisionNode(left, right));
}

function pullUnaryMinusFromDivisionRight(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = divNode.children[0];
  const right = unwrapUnaryNode(divNode.children[1]).inner;
  return createUnaryMinus(createDivisionNode(left, right));
}

function convertDivisionToMultiplication(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = divNode.children[0];
  const right = divNode.children[1];
  const reciprocal = wrapInGroup(createDivisionNode(createConstantNode(1), right));
  return createMultiplicationNode([left, reciprocal]);
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

function getUnaryTarget(node: UnaryNode): ASTNode | null {
  const child = node.children[0];
  if (child.type === 'group') {
    return child.children[0];
  }
  return child;
}

function getAdditionNode(node: ASTNode): OperatorNode | null {
  if (node.type === 'operator' && node.value === '+' && node.children.length >= 2) {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'operator') {
    const inner = node.children[0] as OperatorNode;
    if (inner.value === '+' && inner.children.length >= 2) {
      return inner;
    }
  }
  return null;
}

function unwrapGroupNode(node: ASTNode): ASTNode {
  if (node.type === 'group') {
    return node.children[0];
  }
  return node;
}

function getExplicitNegativeChild(node: ASTNode): UnaryNode | null {
  if (node.type === 'unary' && node.value === '-' && !node.implicit) {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'unary') {
    const inner = node.children[0] as UnaryNode;
    if (inner.value === '-') {
      return inner;
    }
  }
  return null;
}

function isImplicitNegativeChild(node: ASTNode): node is UnaryNode {
  return node.type === 'unary' && node.value === '-' && Boolean(node.implicit);
}

function isUnaryMinusNode(node: ASTNode): node is UnaryNode {
  return node.type === 'unary' && node.value === '-';
}

function getUnaryNode(node: ASTNode): UnaryNode | null {
  if (node.type === 'unary' && node.value === '-') {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'unary') {
    return node.children[0];
  }
  return null;
}

function unwrapUnaryNode(node: ASTNode): { unary: UnaryNode; inner: ASTNode } {
  const unaryNode = getUnaryNode(node);
  if (!unaryNode) {
    return { unary: node as UnaryNode, inner: node };
  }
  return { unary: unaryNode, inner: unaryNode.children[0] };
}

function createUnaryMinus(node: ASTNode): UnaryNode {
  return {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [node]
  };
}

function createAdditionNode(children: ASTNode[]): ASTNode {
  if (children.length === 1) {
    return children[0];
  }
  return {
    id: generateId(),
    type: 'operator',
    value: '+',
    children
  };
}

function createMultiplicationNode(children: ASTNode[]): ASTNode {
  if (children.length === 1) {
    return children[0];
  }
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children
  };
}

function createDivisionNode(left: ASTNode, right: ASTNode): OperatorNode {
  return {
    id: generateId(),
    type: 'operator',
    value: '/',
    children: [left, right]
  };
}

function createConstantNode(value: number): ConstantNode {
  return {
    id: generateId(),
    type: 'constant',
    value
  };
}

function wrapInGroup(node: ASTNode): GroupNode {
  return {
    id: generateId(),
    type: 'group',
    value: 'group',
    children: [node]
  };
}

type CommonFactorAcross = {
  factor: ASTNode;
  side: 'left' | 'right';
  remainders: ASTNode[];
};

function findCommonFactorAcrossSum(node: OperatorNode, side: 'left' | 'right'): CommonFactorAcross | null {
  if (node.children.length < 2) {
    return null;
  }

  const firstTerm = unwrapGroupNode(node.children[0]);
  const candidate = getFactorCandidate(firstTerm, side);
  if (!candidate) {
    return null;
  }

  const remainders: ASTNode[] = [];
  for (const term of node.children) {
    const remainder = extractRemainderForFactor(term, candidate, side);
    if (!remainder) {
      return null;
    }
    remainders.push(remainder);
  }

  return {
    factor: candidate,
    side,
    remainders
  };
}

function getFactorCandidate(term: ASTNode, side: 'left' | 'right'): ASTNode | null {
  if (term.type === 'operator' && term.value === '*') {
    if (side === 'left') {
      return term.children[0] ?? null;
    }
    return term.children[term.children.length - 1] ?? null;
  }
  return term;
}

function extractRemainderForFactor(term: ASTNode, factor: ASTNode, side: 'left' | 'right'): ASTNode | null {
  const unwrapped = unwrapGroupNode(term);
  if (nodesEqual(unwrapped, factor)) {
    return createConstantNode(1);
  }

  if (unwrapped.type !== 'operator' || unwrapped.value !== '*') {
    return null;
  }

  const children = [...unwrapped.children];
  if (side === 'left') {
    if (!children[0] || !nodesEqual(children[0], factor)) {
      return null;
    }
    children.shift();
  } else {
    if (!children[children.length - 1] || !nodesEqual(children[children.length - 1], factor)) {
      return null;
    }
    children.pop();
  }

  if (children.length === 0) {
    return createConstantNode(1);
  }
  if (children.length === 1) {
    return children[0];
  }
  return createMultiplicationNode(children);
}
