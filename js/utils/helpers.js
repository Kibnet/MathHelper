/**
 * Utility Functions Module
 * Helper functions for expression manipulation
 */

/**
 * Convert AST node to string representation
 * @param {Object} node - AST node
 * @returns {string} String representation of the expression
 */
export function expressionToString(node) {
  if (!node) return '';
  
  if (node.type === 'constant') {
    return String(node.value);
  } else if (node.type === 'variable') {
    return node.value;
  } else if (node.type === 'unary') {
    const operand = expressionToString(node.children[0]);
    // Add parentheses if the operand is an operator
    if (node.children[0].type === 'operator') {
      return '-(' + operand + ')';
    }
    return '-' + operand;
  } else if (node.type === 'group') {
    return '(' + expressionToString(node.children[0]) + ')';
  } else if (node.type === 'operator') {
    const left = expressionToString(node.children[0]);
    const right = expressionToString(node.children[1]);
    return left + ' ' + node.value + ' ' + right;
  }
  return '';
}

/**
 * Deep clone an AST node
 * @param {Object} node - AST node to clone
 * @returns {Object} Cloned node
 */
export function cloneNode(node) {
  if (!node) return null;
  
  const cloned = {
    ...node,
    id: node.id // Keep same ID for now
  };
  
  if (node.children) {
    cloned.children = node.children.map(child => cloneNode(child));
  }
  
  return cloned;
}

/**
 * Find a node by ID in the AST
 * @param {Object} root - Root node to search from
 * @param {string} id - Node ID to find
 * @returns {Object|null} Found node or null
 */
export function findNodeById(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Replace a node in the AST
 * @param {Object} root - Root node
 * @param {string} targetId - ID of node to replace
 * @param {Object} newNode - New node to insert
 * @returns {Object} Modified AST
 */
export function replaceNode(root, targetId, newNode) {
  if (!root) return null;
  
  if (root.id === targetId) {
    return newNode;
  }
  
  if (root.children) {
    const newChildren = root.children.map(child => 
      replaceNode(child, targetId, newNode)
    );
    
    return {
      ...root,
      children: newChildren
    };
  }
  
  return root;
}

/**
 * Get all leaf nodes (constants and variables) from AST
 * @param {Object} node - Root node
 * @returns {Array} Array of leaf nodes
 */
export function getLeafNodes(node) {
  if (!node) return [];
  
  if (node.type === 'constant' || node.type === 'variable') {
    return [node];
  }
  
  if (node.children) {
    return node.children.flatMap(child => getLeafNodes(child));
  }
  
  return [];
}

/**
 * Count total nodes in AST
 * @param {Object} node - Root node
 * @returns {number} Total number of nodes
 */
export function countNodes(node) {
  if (!node) return 0;
  
  let count = 1;
  
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  
  return count;
}

/**
 * Get the depth of the AST
 * @param {Object} node - Root node
 * @returns {number} Maximum depth
 */
export function getDepth(node) {
  if (!node) return 0;
  
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  
  const childDepths = node.children.map(child => getDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Check if two nodes are structurally equal
 * @param {Object} node1 - First node
 * @param {Object} node2 - Second node
 * @returns {boolean} True if nodes are equal
 */
export function nodesEqual(node1, node2) {
  if (!node1 && !node2) return true;
  if (!node1 || !node2) return false;
  
  if (node1.type !== node2.type) return false;
  if (node1.value !== node2.value) return false;
  
  if (node1.children && node2.children) {
    if (node1.children.length !== node2.children.length) return false;
    
    for (let i = 0; i < node1.children.length; i++) {
      if (!nodesEqual(node1.children[i], node2.children[i])) {
        return false;
      }
    }
  } else if (node1.children || node2.children) {
    return false;
  }
  
  return true;
}
