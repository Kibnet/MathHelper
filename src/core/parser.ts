/**
 * Модуль парсера выражений
 * Разбирает математические выражения в AST (абстрактное синтаксическое дерево)
 */

import type { ASTNode, ConstantNode, VariableNode, OperatorNode, UnaryNode, GroupNode, OperatorValue, ImplicitMulNode } from '../types/index.js';
import { tokenize, insertImplicitMultiplication, type Token } from '../utils/tokenizer.js';

let nodeIdCounter = 0;

export function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

export function resetIdCounter(): void {
  nodeIdCounter = 0;
}

export class ExpressionParser {
  private tokens: Token[];
  private pos: number;

  constructor(input: string) {
    // Используем токенизатор и вставляем неявное умножение для парсинга
    // (исходное отображение остается abc, но AST строится как a*b*c)
    const rawTokens = tokenize(input);
    this.tokens = insertImplicitMultiplication(rawTokens);
    this.pos = 0;
  }

  parse(): ASTNode {
    if (this.tokens.length === 0) throw new Error('Пустое выражение');
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      throw new Error(`Неожиданный токен на позиции ${token.start}: ${token.value}`);
    }
    return result;
  }

  private parseExpression(): ASTNode {
    return this.parseAdditive();
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    
    while (this.pos < this.tokens.length) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
        break;
      }
      const opToken = this.consume();
      const op = opToken.value as OperatorValue;
      const right = this.parseMultiplicative();
      
      // Собираем все tokenIds из левого и правого узлов + оператор
      const tokenIds = [
        ...(left.tokenIds || []),
        opToken.originalIndex ?? -1,
        ...(right.tokenIds || [])
      ];
      
      const node: OperatorNode = {
        id: generateId(),
        type: 'operator',
        value: op,
        children: [left, right],
        tokenIds
      };
      left = node;
    }
    
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    
    while (this.pos < this.tokens.length) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) {
        break;
      }
      const op = token.value as OperatorValue;
      const isImplicit = token.implicit || false;
      const opToken = this.consume();
      const right = this.parseUnary();
      
      // Собираем tokenIds
      const tokenIds = [
        ...(left.tokenIds || []),
        ...(isImplicit ? [] : [opToken.originalIndex ?? -1]), // Для implicit не добавляем оператор
        ...(right.tokenIds || [])
      ];
      
      // Создаем узел неявного или явного умножения
      if (isImplicit && op === '*') {
        const node: ImplicitMulNode = {
          id: generateId(),
          type: 'implicit_mul',
          value: '*',
          children: [left, right],
          tokenIds
        };
        left = node;
      } else {
        const node: OperatorNode = {
          id: generateId(),
          type: 'operator',
          value: op,
          children: [left, right],
          tokenIds
        };
        left = node;
      }
    }
    
    return left;
  }

  private parseUnary(): ASTNode {
    const token = this.peek();
    if (token && token.type === 'unary' && token.value === '-') {
      const unaryToken = this.consume();
      const operand = this.parseUnary();
      const node: UnaryNode = {
        id: generateId(),
        type: 'unary',
        value: '-',
        children: [operand],
        tokenIds: [unaryToken.originalIndex ?? -1, ...(operand.tokenIds || [])]
      };
      return node;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();
    
    if (!token) {
      throw new Error('Неожиданный конец выражения');
    }

    // Группа (скобки)
    if (token.type === 'paren' && token.value === '(') {
      const openToken = this.consume();
      const expr = this.parseExpression();
      const closeParen = this.peek();
      if (!closeParen || closeParen.value !== ')') {
        throw new Error('Отсутствует закрывающая скобка');
      }
      const closeToken = this.consume();
      const node: GroupNode = {
        id: generateId(),
        type: 'group',
        value: 'group',
        children: [expr],
        tokenIds: [openToken.originalIndex ?? -1, ...(expr.tokenIds || []), closeToken.originalIndex ?? -1]
      };
      return node;
    }

    // Число
    if (token.type === 'number') {
      return this.parseNumber();
    }

    // Переменная
    if (token.type === 'variable') {
      return this.parseVariable();
    }

    throw new Error(`Неожиданный токен: ${token.value}`);
  }

  private parseNumber(): ConstantNode {
    const token = this.consume();
    return {
      id: generateId(),
      type: 'constant',
      value: parseFloat(token.value),
      tokenIds: [token.originalIndex ?? -1]
    };
  }

  private parseVariable(): VariableNode {
    const token = this.consume();
    return {
      id: generateId(),
      type: 'variable',
      value: token.value,
      tokenIds: [token.originalIndex ?? -1]
    };
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new Error('Неожиданный конец выражения');
    }
    this.pos++;
    return token;
  }
}
