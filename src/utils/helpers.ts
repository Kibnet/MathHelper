/**
 * Utility Functions Module
 * Helper functions for expression manipulation
 */

import type { ASTNode } from '../types/index.js';

/**
 * Convert AST node to string representation
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
  } else if (node.type === 'operator') {
    const left = expressionToString(node.children[0]);
    const right = expressionToString(node.children[1]);
    return left + ' ' + node.value + ' ' + right;
  }
  return '';
}

/**
 * Deep clone an AST node
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
  } else if (node.type === 'operator') {
    return {
      ...node,
      children: [cloneNode(node.children[0]), cloneNode(node.children[1])]
    };
  }
  return node;
}

/**
 * Find a node by ID in the AST
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
 * Replace a node in the AST
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
  } else if (root.type === 'operator') {
    return {
      ...root,
      children: [
        replaceNode(root.children[0], targetId, newNode),
        replaceNode(root.children[1], targetId, newNode)
      ]
    };
  }
  
  return root;
}

/**
 * Get all leaf nodes (constants and variables) from AST
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
 * Count total nodes in AST
 */
export function countNodes(node: ASTNode): number {
  let count = 1;
  
  if ('children' in node && node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  
  return count;
}

/**
 * Get the depth of the AST
 */
export function getDepth(node: ASTNode): number {
  if (!('children' in node) || !node.children) {
    return 1;
  }
  
  const childDepths = node.children.map(child => getDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Check if two nodes are structurally equal
 */
export function nodesEqual(node1: ASTNode, node2: ASTNode): boolean {
  if (node1.type !== node2.type) return false;
  
  if (node1.type === 'constant' && node2.type === 'constant') {
    return node1.value === node2.value;
  } else if (node1.type === 'variable' && node2.type === 'variable') {
    return node1.value === node2.value;
  } else if (node1.type === 'operator' && node2.type === 'operator') {
    return node1.value === node2.value &&
           nodesEqual(node1.children[0], node2.children[0]) &&
           nodesEqual(node1.children[1], node2.children[1]);
  } else if (node1.type === 'unary' && node2.type === 'unary') {
    return nodesEqual(node1.children[0], node2.children[0]);
  } else if (node1.type === 'group' && node2.type === 'group') {
    return nodesEqual(node1.children[0], node2.children[0]);
  }
  
  return false;
}
