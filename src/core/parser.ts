/**
 * Expression Parser Module
 * Parses mathematical expressions into AST (Abstract Syntax Tree)
 */

import type { ASTNode, ConstantNode, VariableNode, OperatorNode, UnaryNode, GroupNode, OperatorValue } from '../types/index.js';

let nodeIdCounter = 0;

export function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

export function resetIdCounter(): void {
  nodeIdCounter = 0;
}

export class ExpressionParser {
  private input: string;
  private pos: number;

  constructor(input: string) {
    this.input = input.replace(/\s+/g, '');
    this.pos = 0;
  }

  parse(): ASTNode {
    if (!this.input) throw new Error('Empty expression');
    const result = this.parseExpression();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character at position ${this.pos}: ${this.input[this.pos]}`);
    }
    return result;
  }

  private parseExpression(): ASTNode {
    return this.parseAdditive();
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    
    while (this.pos < this.input.length && (this.peek() === '+' || this.peek() === '-')) {
      const op = this.consume() as OperatorValue;
      const right = this.parseMultiplicative();
      const node: OperatorNode = {
        id: generateId(),
        type: 'operator',
        value: op,
        children: [left, right]
      };
      left = node;
    }
    
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    
    while (this.pos < this.input.length && (this.peek() === '*' || this.peek() === '/')) {
      const op = this.consume() as OperatorValue;
      const right = this.parseUnary();
      const node: OperatorNode = {
        id: generateId(),
        type: 'operator',
        value: op,
        children: [left, right]
      };
      left = node;
    }
    
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek() === '-') {
      this.consume();
      const operand = this.parseUnary();
      const node: UnaryNode = {
        id: generateId(),
        type: 'unary',
        value: '-',
        children: [operand]
      };
      return node;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.peek() === '(') {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      this.consume();
      const node: GroupNode = {
        id: generateId(),
        type: 'group',
        value: 'group',
        children: [expr]
      };
      return node;
    }

    if (this.isDigit(this.peek())) {
      return this.parseNumber();
    }

    if (this.isLetter(this.peek())) {
      return this.parseVariable();
    }

    throw new Error(`Unexpected character: ${this.peek()}`);
  }

  private parseNumber(): ConstantNode {
    let num = '';
    while (this.pos < this.input.length && (this.isDigit(this.peek()) || this.peek() === '.')) {
      num += this.consume();
    }
    return {
      id: generateId(),
      type: 'constant',
      value: parseFloat(num)
    };
  }

  private parseVariable(): VariableNode {
    let name = '';
    while (this.pos < this.input.length && this.isLetter(this.peek())) {
      name += this.consume();
    }
    return {
      id: generateId(),
      type: 'variable',
      value: name
    };
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private consume(): string {
    return this.input[this.pos++] || '';
  }

  private isDigit(char: string): boolean {
    return char !== '' && /[0-9]/.test(char);
  }

  private isLetter(char: string): boolean {
    return char !== '' && /[a-zA-Z]/.test(char);
  }
}
