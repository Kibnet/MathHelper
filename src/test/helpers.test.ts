/**
 * Тесты вспомогательных функций
 * Комплексные тесты для вспомогательных утилит AST
 */

import { describe, it, expect } from 'vitest';
import { ExpressionParser } from '../core/parser.js';
import { 
  expressionToString, 
  cloneNode, 
  replaceNode, 
  findNodeById,
  getDepth,
  countNodes,
  getAllNodeIds,
  getLeafNodes,
  nodesEqual
} from '../utils/helpers.js';
import type { ConstantNode, OperatorNode } from '../types/index.js';

describe('Helpers - expressionToString', () => {
  it('should convert constant to string', () => {
    const parser = new ExpressionParser('42');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('42');
  });

  it('should convert variable to string', () => {
    const parser = new ExpressionParser('x');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('x');
  });

  it('should convert simple addition', () => {
    const parser = new ExpressionParser('2 + 3');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('2 + 3');
  });

  it('should convert multiplication', () => {
    const parser = new ExpressionParser('4 * 5');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('4 * 5');
  });

  it('should handle operator precedence', () => {
    const parser = new ExpressionParser('2 + 3 * 4');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('2 + 3 * 4');
  });

  it('should convert parentheses', () => {
    const parser = new ExpressionParser('(2 + 3)');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('(2 + 3)');
  });

  it('should convert unary minus', () => {
    const parser = new ExpressionParser('-5');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('-5');
  });

  it('should convert double negation', () => {
    const parser = new ExpressionParser('--5');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('--5');
  });

  it('should convert complex expression', () => {
    const parser = new ExpressionParser('(a + b) * (c - d)');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('(a + b) * (c - d)');
  });

  it('should handle decimal numbers', () => {
    const parser = new ExpressionParser('3.14 + 2.71');
    const node = parser.parse();
    expect(expressionToString(node)).toBe('3.14 + 2.71');
  });

  it('should handle implicit_mul in expressionToString', () => {
    const parser = new ExpressionParser('2a');
    const tree = parser.parse();
    
    const result = expressionToString(tree);
    expect(result).toBe('2a');
  });

  it('should handle unknown node type gracefully', () => {
    const invalidNode = { id: '1', type: 'unknown', value: 'x' } as any;
    const result = expressionToString(invalidNode);
    expect(result).toBe('');
  });

  it('should wrap unary minus around operator child with parentheses', () => {
    // Создаём вручную unary узел с operator child
    const parser = new ExpressionParser('2 + 3');
    const operatorNode = parser.parse();
    
    const unaryNode: any = {
      id: 'test_unary',
      type: 'unary',
      value: '-',
      children: [operatorNode]
    };
    
    const result = expressionToString(unaryNode);
    expect(result).toBe('-(2 + 3)');
  });
});

describe('Helpers - cloneNode', () => {
  it('should clone constant node', () => {
    const parser = new ExpressionParser('42');
    const original = parser.parse();
    const cloned = cloneNode(original);
    
    expect(cloned.type).toBe('constant');
    expect((cloned as ConstantNode).value).toBe(42);
    expect(cloned.id).toBe(original.id); // Should preserve ID in clone
  });

  it('should clone operator node deeply', () => {
    const parser = new ExpressionParser('2 + 3');
    const original = parser.parse() as OperatorNode;
    const cloned = cloneNode(original) as OperatorNode;
    
    expect(cloned.type).toBe('operator');
    expect(cloned.value).toBe('+');
    expect(cloned.children).toHaveLength(2);
    
    // Children should be different objects (deep clone)
    const areSameObject = cloned.children[0] === original.children[0];
    expect(areSameObject).toBeFalsy();
    const areSameObject2 = cloned.children[1] === original.children[1];
    expect(areSameObject2).toBeFalsy();
  });

  it('should clone complex tree', () => {
    const parser = new ExpressionParser('(a + b) * (c - d)');
    const original = parser.parse();
    const cloned = cloneNode(original);
    
    expect(expressionToString(cloned)).toBe('(a + b) * (c - d)');
  });

  it('should clone unary node', () => {
    const parser = new ExpressionParser('-5');
    const original = parser.parse();
    const cloned = cloneNode(original);
    
    expect(cloned.type).toBe('unary');
    expect(expressionToString(cloned)).toBe('-5');
  });

  it('should clone group node', () => {
    const parser = new ExpressionParser('(5)');
    const original = parser.parse();
    const cloned = cloneNode(original);
    
    expect(cloned.type).toBe('group');
    expect(expressionToString(cloned)).toBe('(5)');
  });
});

describe('Helpers - replaceNode', () => {
  it('should replace root node', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    const newNode: ConstantNode = { id: 'new', type: 'constant', value: 10 };
    
    const result = replaceNode(tree, tree.id, newNode);
    expect((result as ConstantNode).value).toBe(10);
  });

  it('should replace child in operator', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse() as OperatorNode;
    const leftId = tree.children[0].id;
    const newNode: ConstantNode = { id: 'new', type: 'constant', value: 10 };
    
    const result = replaceNode(tree, leftId, newNode) as OperatorNode;
    expect((result.children[0] as ConstantNode).value).toBe(10);
    expect((result.children[1] as ConstantNode).value).toBe(3);
  });

  it('should replace deep nested node', () => {
    const parser = new ExpressionParser('(2 + 3) * 4');
    const tree = parser.parse() as OperatorNode;
    
    // Find the '2' node
    const groupNode = tree.children[0];
    const addNode = (groupNode as any).children[0] as OperatorNode;
    const twoId = addNode.children[0].id;
    
    const newNode: ConstantNode = { id: 'new', type: 'constant', value: 100 };
    const result = replaceNode(tree, twoId, newNode);
    
    expect(expressionToString(result)).toBe('(100 + 3) * 4');
  });

  it('should return original if ID not found', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    const newNode: ConstantNode = { id: 'new', type: 'constant', value: 10 };
    
    const result = replaceNode(tree, 'nonexistent', newNode);
    expect(result).toBe(tree);
  });

  it('should preserve tree structure when replacing', () => {
    const parser = new ExpressionParser('a + b + c');
    const tree = parser.parse() as OperatorNode;
    const rightId = tree.children[1].id;
    const newNode: ConstantNode = { id: 'new', type: 'constant', value: 99 };
    
    const result = replaceNode(tree, rightId, newNode);
    expect(result.type).toBe('operator');
  });
});

describe('Helpers - findNodeById', () => {
  it('should find root node', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    
    const found = findNodeById(tree, tree.id);
    expect(found).toBe(tree);
  });

  it('should find child node', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse() as OperatorNode;
    const leftId = tree.children[0].id;
    
    const found = findNodeById(tree, leftId);
    expect(found).toBe(tree.children[0]);
  });

  it('should find deeply nested node', () => {
    const parser = new ExpressionParser('((2 + 3) * 4) - 5');
    const tree = parser.parse();
    
    // Get all IDs
    const ids = getAllNodeIds(tree);
    
    // Find each one
    for (const id of ids) {
      const found = findNodeById(tree, id);
      expect(found).toBeTruthy();
      expect(found!.id).toBe(id);
    }
  });

  it('should return null for nonexistent ID', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    
    const found = findNodeById(tree, 'nonexistent');
    expect(found).toBeNull();
  });

  it('should find node in unary', () => {
    const parser = new ExpressionParser('-5');
    const tree = parser.parse() as any;
    const childId = tree.children[0].id;
    
    const found = findNodeById(tree, childId);
    expect(found).toBeTruthy();
  });

  it('should find node in group', () => {
    const parser = new ExpressionParser('(5)');
    const tree = parser.parse() as any;
    const childId = tree.children[0].id;
    
    const found = findNodeById(tree, childId);
    expect(found).toBeTruthy();
  });
});

describe('Helpers - getDepth', () => {
  it('should return 1 for leaf node (constant)', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(1);
  });

  it('should return 1 for leaf node (variable)', () => {
    const parser = new ExpressionParser('x');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(1);
  });

  it('should return 2 for simple binary operation', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(2);
  });

  it('should return 3 for nested operation', () => {
    const parser = new ExpressionParser('2 + 3 * 4');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(3);
  });

  it('should return correct depth for unary', () => {
    const parser = new ExpressionParser('-5');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(2);
  });

  it('should return correct depth for double unary', () => {
    const parser = new ExpressionParser('--5');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(3);
  });

  it('should return correct depth for group', () => {
    const parser = new ExpressionParser('(5)');
    const tree = parser.parse();
    expect(getDepth(tree)).toBe(2);
  });

  it('should return correct depth for complex tree', () => {
    const parser = new ExpressionParser('((2 + 3) * (4 - 5))');
    const tree = parser.parse();
    expect(getDepth(tree)).toBeGreaterThan(3);
  });
});

describe('Helpers - countNodes', () => {
  it('should count 1 for single node', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    expect(countNodes(tree)).toBe(1);
  });

  it('should count 3 for binary operation (parent + 2 children)', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse();
    expect(countNodes(tree)).toBe(3);
  });

  it('should count all nodes in complex tree', () => {
    const parser = new ExpressionParser('2 + 3 * 4');
    const tree = parser.parse();
    // Structure: + (2, * (3, 4)) = 5 nodes
    expect(countNodes(tree)).toBe(5);
  });

  it('should count unary nodes', () => {
    const parser = new ExpressionParser('-5');
    const tree = parser.parse();
    expect(countNodes(tree)).toBe(2);
  });

  it('should count group nodes', () => {
    const parser = new ExpressionParser('(5)');
    const tree = parser.parse();
    expect(countNodes(tree)).toBe(2);
  });

  it('should count deeply nested tree', () => {
    const parser = new ExpressionParser('((2 + 3) * (4 - 5))');
    const tree = parser.parse();
    expect(countNodes(tree)).toBeGreaterThan(5);
  });
});

describe('Helpers - getAllNodeIds', () => {
  it('should return single ID for leaf node', () => {
    const parser = new ExpressionParser('5');
    const tree = parser.parse();
    const ids = getAllNodeIds(tree);
    
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe(tree.id);
  });

  it('should return all IDs in binary tree', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse() as OperatorNode;
    const ids = getAllNodeIds(tree);
    
    expect(ids).toHaveLength(3);
    expect(ids).toContain(tree.id);
    expect(ids).toContain(tree.children[0].id);
    expect(ids).toContain(tree.children[1].id);
  });

  it('should return all IDs in complex tree', () => {
    const parser = new ExpressionParser('(2 + 3) * 4');
    const tree = parser.parse();
    const ids = getAllNodeIds(tree);
    const nodeCount = countNodes(tree);
    
    expect(ids).toHaveLength(nodeCount);
  });

  it('should not have duplicate IDs', () => {
    const parser = new ExpressionParser('a + b + c + d');
    const tree = parser.parse();
    const ids = getAllNodeIds(tree);
    
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Helpers - Edge Cases', () => {
  it('should handle very deep nesting', () => {
    const parser = new ExpressionParser('((((5))))');
    const tree = parser.parse();
    
    expect(getDepth(tree)).toBe(5);
    expect(countNodes(tree)).toBe(5);
  });

  it('should handle wide tree', () => {
    const parser = new ExpressionParser('a + b + c + d + e');
    const tree = parser.parse();
    
    const count = countNodes(tree);
    expect(count).toBeGreaterThan(5);
  });

  it('should handle mixed operations', () => {
    const parser = new ExpressionParser('a * b + c / d - e');
    const tree = parser.parse();
    
    expect(expressionToString(tree)).toBe('a * b + c / d - e');
    expect(countNodes(tree)).toBeGreaterThan(5);
  });

  it('should clone and replace maintain equivalence', () => {
    const parser = new ExpressionParser('2 + 3');
    const original = parser.parse();
    const cloned = cloneNode(original);
    
    expect(expressionToString(cloned)).toBe(expressionToString(original));
  });
});

describe('Helpers - getLeafNodes', () => {
  it('should return constant as leaf', () => {
    const parser = new ExpressionParser('42');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(1);
    expect(leaves[0].type).toBe('constant');
  });

  it('should return variable as leaf', () => {
    const parser = new ExpressionParser('x');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(1);
    expect(leaves[0].type).toBe('variable');
  });

  it('should return all leaves from binary operation', () => {
    const parser = new ExpressionParser('2 + 3');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(2);
    expect((leaves[0] as ConstantNode).value).toBe(2);
    expect((leaves[1] as ConstantNode).value).toBe(3);
  });

  it('should return all leaves from complex expression', () => {
    const parser = new ExpressionParser('(a + b) * c');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(3);
  });

  it('should handle unary operations', () => {
    const parser = new ExpressionParser('-x');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(1);
    expect(leaves[0].type).toBe('variable');
  });

  it('should handle group nodes', () => {
    const parser = new ExpressionParser('(5)');
    const tree = parser.parse();
    const leaves = getLeafNodes(tree);
    
    expect(leaves).toHaveLength(1);
    expect((leaves[0] as ConstantNode).value).toBe(5);
  });
});

describe('Helpers - nodesEqual', () => {
  it('should return true for equal constants', () => {
    const parser1 = new ExpressionParser('42');
    const parser2 = new ExpressionParser('42');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should return false for different constants', () => {
    const parser1 = new ExpressionParser('42');
    const parser2 = new ExpressionParser('43');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return true for equal variables', () => {
    const parser1 = new ExpressionParser('x');
    const parser2 = new ExpressionParser('x');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should return false for different variables', () => {
    const parser1 = new ExpressionParser('x');
    const parser2 = new ExpressionParser('y');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return true for equal operators', () => {
    const parser1 = new ExpressionParser('2 + 3');
    const parser2 = new ExpressionParser('2 + 3');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should return false for different operators', () => {
    const parser1 = new ExpressionParser('2 + 3');
    const parser2 = new ExpressionParser('2 * 3');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return false for different operator children', () => {
    const parser1 = new ExpressionParser('2 + 3');
    const parser2 = new ExpressionParser('2 + 4');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return true for equal unary nodes', () => {
    const parser1 = new ExpressionParser('-5');
    const parser2 = new ExpressionParser('-5');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should return false for different unary children', () => {
    const parser1 = new ExpressionParser('-5');
    const parser2 = new ExpressionParser('-6');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return true for equal group nodes', () => {
    const parser1 = new ExpressionParser('(5)');
    const parser2 = new ExpressionParser('(5)');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should return false for different types', () => {
    const parser1 = new ExpressionParser('5');
    const parser2 = new ExpressionParser('x');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should handle complex nested equality', () => {
    const parser1 = new ExpressionParser('(2 + 3) * 4');
    const parser2 = new ExpressionParser('(2 + 3) * 4');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(true);
  });

  it('should detect inequality in nested structures', () => {
    const parser1 = new ExpressionParser('(2 + 3) * 4');
    const parser2 = new ExpressionParser('(2 + 3) * 5');
    const node1 = parser1.parse();
    const node2 = parser2.parse();
    
    expect(nodesEqual(node1, node2)).toBe(false);
  });

  it('should return false for mismatched node types', () => {
    const invalidNode1 = { id: '1', type: 'custom_type_1', value: 'x' } as any;
    const invalidNode2 = { id: '2', type: 'custom_type_2', value: 'y' } as any;
    
    expect(nodesEqual(invalidNode1, invalidNode2)).toBe(false);
  });

  it('should return false for same custom type not handled by nodesEqual', () => {
    // Тестируем строку 167: return false для необрабатываемого типа
    const customNode1 = { id: '1', type: 'future_type', value: 'a', children: [] } as any;
    const customNode2 = { id: '2', type: 'future_type', value: 'b', children: [] } as any;
    
    // Оба узла одного типа, но тип не обрабатывается ни в одной из веток
    expect(nodesEqual(customNode1, customNode2)).toBe(false);
  });
});

describe('Helpers - cloneNode edge cases', () => {
  it('should return node as is for unknown type', () => {
    const unknownNode = { id: '1', type: 'unknown_type', value: 'test' } as any;
    const cloned = cloneNode(unknownNode);
    
    expect(cloned).toBe(unknownNode);
  });
});

describe('Helpers - getLeafNodes edge cases', () => {
  it('should return empty array for node without children', () => {
    const nodeWithoutChildren = { id: '1', type: 'custom', value: 'test' } as any;
    const leaves = getLeafNodes(nodeWithoutChildren);
    
    expect(leaves).toEqual([]);
  });
});
