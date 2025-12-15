/**
 * AST Node Types
 */

export type NodeType = 'constant' | 'variable' | 'operator' | 'unary' | 'group' | 'implicit_mul';

export type OperatorValue = '+' | '-' | '*' | '/';

export interface BaseNode {
  id: string;
  type: NodeType;
}

export interface ConstantNode extends BaseNode {
  type: 'constant';
  value: number;
}

export interface VariableNode extends BaseNode {
  type: 'variable';
  value: string;
}

export interface OperatorNode extends BaseNode {
  type: 'operator';
  value: OperatorValue;
  children: [ASTNode, ASTNode];
}

export interface UnaryNode extends BaseNode {
  type: 'unary';
  value: '-';
  children: [ASTNode];
}

export interface GroupNode extends BaseNode {
  type: 'group';
  value: 'group';
  children: [ASTNode];
}

// Узел неявного умножения (2a, abc, (x+1)y)
export interface ImplicitMulNode extends BaseNode {
  type: 'implicit_mul';
  value: '*';
  children: [ASTNode, ASTNode];
}

export type ASTNode = ConstantNode | VariableNode | OperatorNode | UnaryNode | GroupNode | ImplicitMulNode;

/**
 * Transformation Rule Types
 */

export type RuleCategory = 
  | '1. Computation'
  | '2. Simplification'
  | '3. Transformation'
  | '4. Rearrangement'
  | '5. Wrapping';

export interface TransformationRule {
  id: string;
  name: string;
  category: RuleCategory;
  preview: string;
  apply: (node: ASTNode) => ASTNode;
}

/**
 * Subexpression Analysis Types
 */

export interface Subexpression {
  text: string;
  start: number;
  end: number;
  node: ASTNode;
  length: number;
  rules: TransformationRule[];
  level?: number;
}

export interface SubexpressionPosition extends Subexpression {
  left: number;
  width: number;
  top: number;
}

export interface LayoutConfig {
  LEVEL_HEIGHT: number;
  BASE_OFFSET: number;
}

/**
 * History Types
 */

export interface HistoryState {
  expression: string;
  ruleName: string;
  node: ASTNode;
  timestamp: number;
}
