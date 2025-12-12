/**
 * Transformation Rules Module
 * Defines all available transformation rules and their applicability
 */

import { generateId } from './parser.js';

/**
 * Get all applicable transformation rules for a node
 * @param {Object} node - AST node
 * @returns {Array} Array of applicable rule objects
 */
export function getApplicableRules(node) {
  const rules = [];
  
  if (!node) return rules;
  
  // === PRIORITY 1: COMPUTATION ===
  
  // Evaluate multiplication constants
  if (node.type === 'operator' && node.value === '*') {
    if (node.children && node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      rules.push({
        id: 'eval_mul',
        name: '→ Evaluate',
        category: '1. Computation',
        preview: `${node.children[0].value}*${node.children[1].value} → ${node.children[0].value * node.children[1].value}`,
        apply: evaluateMultiplication
      });
    }
  }
  
  // Evaluate division constants
  if (node.type === 'operator' && node.value === '/') {
    if (node.children && node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      rules.push({
        id: 'eval_div',
        name: '→ Evaluate',
        category: '1. Computation',
        preview: `${node.children[0].value}/${node.children[1].value} → ${node.children[0].value / node.children[1].value}`,
        apply: evaluateDivision
      });
    }
  }
  
  // Evaluate addition/subtraction constants
  if (node.type === 'operator' && (node.value === '+' || node.value === '-')) {
    if (node.children && node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      rules.push({
        id: 'eval_add_sub',
        name: '→ Evaluate',
        category: '1. Computation',
        preview: `${node.children[0].value}${node.value}${node.children[1].value} → ${node.value === '+' ? node.children[0].value + node.children[1].value : node.children[0].value - node.children[1].value}`,
        apply: node.value === '+' ? evaluateAddition : evaluateSubtraction
      });
    }
  }
  
  // === PRIORITY 2: SIMPLIFICATION ===
  
  // Remove multiplication by 1
  if (node.type === 'operator' && node.value === '*') {
    if (node.children && ((node.children[0].type === 'constant' && node.children[0].value === 1) ||
                           (node.children[1].type === 'constant' && node.children[1].value === 1))) {
      rules.push({
        id: 'remove_mult_one',
        name: '→ Remove *1',
        category: '2. Simplification',
        preview: 'a*1 → a or 1*a → a',
        apply: removeMultiplicationByOne
      });
    }
  }
  
  // Simplify multiplication by 0
  if (node.type === 'operator' && node.value === '*') {
    if (node.children && ((node.children[0].type === 'constant' && node.children[0].value === 0) ||
                           (node.children[1].type === 'constant' && node.children[1].value === 0))) {
      rules.push({
        id: 'simplify_mult_zero',
        name: '→ Simplify to 0',
        category: '2. Simplification',
        preview: 'a*0 → 0',
        apply: simplifyMultiplicationByZero
      });
    }
  }
  
  // Remove division by 1
  if (node.type === 'operator' && node.value === '/') {
    if (node.children && node.children[1].type === 'constant' && node.children[1].value === 1) {
      rules.push({
        id: 'remove_div_one',
        name: '→ Remove /1',
        category: '2. Simplification',
        preview: 'a/1 → a',
        apply: removeDivisionByOne
      });
    }
  }
  
  // Remove addition of 0
  if (node.type === 'operator' && node.value === '+') {
    if (node.children && 
        ((node.children[0].type === 'constant' && node.children[0].value === 0) ||
         (node.children[1].type === 'constant' && node.children[1].value === 0))) {
      rules.push({
        id: 'remove_add_zero',
        name: '→ Remove +0',
        category: '2. Simplification',
        preview: 'a+0 → a or 0+a → a',
        apply: removeAdditionOfZero
      });
    }
  }
  
  // Remove subtraction of 0
  if (node.type === 'operator' && node.value === '-') {
    if (node.children && node.children[1].type === 'constant' && node.children[1].value === 0) {
      rules.push({
        id: 'remove_sub_zero',
        name: '→ Remove -0',
        category: '2. Simplification',
        preview: 'a-0 → a',
        apply: removeSubtractionOfZero
      });
    }
  }
  
  // Remove double negation
  if (node.type === 'unary') {
    if (node.children && node.children[0] && node.children[0].type === 'unary') {
      rules.push({
        id: 'double_negation',
        name: '→ Remove Double Negative',
        category: '2. Simplification',
        preview: '--a → a',
        apply: removeDoubleNegation
      });
    }
  }
  
  // Remove unnecessary parentheses
  if (node.type === 'group') {
    if (node.children && node.children[0] && node.children[0].type !== 'operator') {
      rules.push({
        id: 'remove_parens',
        name: '→ Remove Parentheses',
        category: '2. Simplification',
        preview: '(a) → a',
        apply: removeParentheses
      });
    }
  }
  
  // Factor out (distributive reverse)
  if (node.type === 'operator' && (node.value === '+' || node.value === '-')) {
    if (canFactor(node)) {
      rules.push({
        id: 'distributive_reverse',
        name: '← Factor Out',
        category: '2. Simplification',
        preview: 'a*b + a*c → a*(b+c)',
        apply: applyDistributiveReverse
      });
    }
  }
  
  // === PRIORITY 3: TRANSFORMATIONS ===
  
  // Distributive property - expand multiplication
  if (node.type === 'operator' && node.value === '*') {
    // Distributive property - check if right child is addition/subtraction
    if (node.children && node.children[1] && (node.children[1].type === 'operator') && 
        (node.children[1].value === '+' || node.children[1].value === '-')) {
      rules.push({
        id: 'distributive_forward',
        name: '→ Expand (Distributive)',
        category: '3. Transformation',
        preview: 'a*(b+c) → a*b + a*c',
        apply: applyDistributiveForward
      });
    }
    
    // Also check if left child is addition/subtraction: (a+b)*c
    if (node.children && node.children[0] && (node.children[0].type === 'operator') && 
        (node.children[0].value === '+' || node.children[0].value === '-')) {
      rules.push({
        id: 'distributive_forward_left',
        name: '→ Expand (Distributive)',
        category: '3. Transformation',
        preview: '(a+b)*c → a*c + b*c',
        apply: applyDistributiveForwardLeft
      });
    }
  }
  
  // === PRIORITY 4: REARRANGEMENT ===
  
  // Commutative property for multiplication
  if (node.type === 'operator' && node.value === '*') {
    rules.push({
      id: 'commutative_mul',
      name: 'Swap Operands',
      category: '4. Rearrangement',
      preview: 'a*b → b*a',
      apply: applyCommutative
    });
  }
  
  // Commutative property for addition
  if (node.type === 'operator' && node.value === '+') {
    rules.push({
      id: 'commutative_add',
      name: 'Swap Operands',
      category: '4. Rearrangement',
      preview: 'a+b → b+a',
      apply: applyCommutative
    });
  }
  
  // === PRIORITY 5: WRAPPING ===
  
  // Add parentheses - Only applicable for certain contexts
  if (node.type !== 'group') {
    rules.push({
      id: 'add_parens',
      name: '+ Add Parentheses',
      category: '5. Wrapping',
      preview: 'a → (a)',
      apply: addParentheses
    });
  }
  
  // Apply double negation
  rules.push({
    id: 'add_double_neg',
    name: '+ Add Double Negative',
    category: '5. Wrapping',
    preview: 'a → --a',
    apply: applyDoubleNegation
  });
  
  // Multiply by 1
  rules.push({
    id: 'multiply_by_one',
    name: '+ Multiply by 1',
    category: '5. Wrapping',
    preview: 'a → a*1 or 1*a',
    apply: multiplyByOne
  });
  
  // Divide by 1
  rules.push({
    id: 'divide_by_one',
    name: '+ Divide by 1',
    category: '5. Wrapping',
    preview: 'a → a/1',
    apply: divideByOne
  });
  
  // Add 0
  rules.push({
    id: 'add_zero',
    name: '+ Add Zero',
    category: '5. Wrapping',
    preview: 'a → a+0 or 0+a',
    apply: addZero
  });
  
  return rules;
}

// === Transformation Functions ===

function evaluateMultiplication(node) {
  return {
    id: generateId(),
    type: 'constant',
    value: node.children[0].value * node.children[1].value
  };
}

function evaluateDivision(node) {
  return {
    id: generateId(),
    type: 'constant',
    value: node.children[0].value / node.children[1].value
  };
}

function evaluateAddition(node) {
  return {
    id: generateId(),
    type: 'constant',
    value: node.children[0].value + node.children[1].value
  };
}

function evaluateSubtraction(node) {
  return {
    id: generateId(),
    type: 'constant',
    value: node.children[0].value - node.children[1].value
  };
}

function removeMultiplicationByOne(node) {
  if (node.children[0].type === 'constant' && node.children[0].value === 1) {
    return node.children[1];
  }
  return node.children[0];
}

function simplifyMultiplicationByZero(node) {
  return {
    id: generateId(),
    type: 'constant',
    value: 0
  };
}

function removeDivisionByOne(node) {
  return node.children[0];
}

function removeAdditionOfZero(node) {
  if (node.children[0].type === 'constant' && node.children[0].value === 0) {
    return node.children[1];
  }
  return node.children[0];
}

function removeSubtractionOfZero(node) {
  return node.children[0];
}

function removeDoubleNegation(node) {
  return node.children[0].children[0];
}

function removeParentheses(node) {
  return node.children[0];
}

function applyCommutative(node) {
  return {
    ...node,
    id: generateId(),
    children: [node.children[1], node.children[0]]
  };
}

function applyDistributiveForward(node) {
  const a = node.children[0];
  const bc = node.children[1];
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

function applyDistributiveForwardLeft(node) {
  const ab = node.children[0];
  const c = node.children[1];
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

function applyDistributiveReverse(node) {
  // Implementation placeholder
  return node;
}

function canFactor(node) {
  // Simplified check for factoring
  return false;
}

function addParentheses(node) {
  return {
    id: generateId(),
    type: 'group',
    value: 'group',
    children: [node]
  };
}

function applyDoubleNegation(node) {
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

function multiplyByOne(node) {
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

function divideByOne(node) {
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

function addZero(node) {
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
