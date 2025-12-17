/**
 * Типы AST узлов
 */

export type NodeType = 'constant' | 'variable' | 'operator' | 'unary' | 'group' | 'implicit_mul';

export type OperatorValue = '+' | '-' | '*' | '/';

export interface BaseNode {
  id: string;
  type: NodeType;
  tokenIds?: number[]; // Индексы токенов, из которых создан узел
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
  children: ASTNode[]; // Массив произвольной длины (минимум 2)
}

export interface UnaryNode extends BaseNode {
  type: 'unary';
  value: '-';
  children: [ASTNode];
  implicit?: boolean; // Скрытый унарный минус (создан из оператора вычитания)
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
  children: ASTNode[]; // Массив произвольной длины (минимум 2)
}

export type ASTNode = ConstantNode | VariableNode | OperatorNode | UnaryNode | GroupNode | ImplicitMulNode;

/**
 * Типы правил преобразования
 */

export type RuleCategory = 
  | '1. Вычисления'
  | '2. Упрощения'
  | '3. Преобразования'
  | '4. Перестановка'
  | '5. Обертывание'
  | '6. Нотация';

export interface TransformationRule {
  id: string;
  name: string;
  category: RuleCategory;
  preview: string;
  apply: (node: ASTNode) => ASTNode;
}

/**
 * Типы анализа подвыражений
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
 * Типы истории
 */

export interface HistoryState {
  expression: string;
  ruleName: string;
  node: ASTNode;
  timestamp: number;
}
