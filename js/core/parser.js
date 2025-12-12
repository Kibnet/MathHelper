/**
 * Expression Parser Module
 * Parses mathematical expressions into AST (Abstract Syntax Tree)
 */

let nodeIdCounter = 0;

export function generateId() {
  return `node_${nodeIdCounter++}`;
}

export function resetIdCounter() {
  nodeIdCounter = 0;
}

export class ExpressionParser {
  constructor(input) {
    this.input = input.replace(/\s+/g, '');
    this.pos = 0;
  }

  parse() {
    if (!this.input) throw new Error('Empty expression');
    const result = this.parseExpression();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character at position ${this.pos}: ${this.input[this.pos]}`);
    }
    return result;
  }

  parseExpression() {
    return this.parseAdditive();
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    
    while (this.pos < this.input.length && (this.peek() === '+' || this.peek() === '-')) {
      const op = this.consume();
      const right = this.parseMultiplicative();
      left = {
        id: generateId(),
        type: 'operator',
        value: op,
        children: [left, right]
      };
    }
    
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    
    while (this.pos < this.input.length && (this.peek() === '*' || this.peek() === '/')) {
      const op = this.consume();
      const right = this.parseUnary();
      left = {
        id: generateId(),
        type: 'operator',
        value: op,
        children: [left, right]
      };
    }
    
    return left;
  }

  parseUnary() {
    if (this.peek() === '-') {
      this.consume();
      const operand = this.parseUnary();
      return {
        id: generateId(),
        type: 'unary',
        value: '-',
        children: [operand]
      };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.peek() === '(') {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      this.consume();
      return {
        id: generateId(),
        type: 'group',
        value: 'group',
        children: [expr]
      };
    }

    // Check for implicit multiplication (e.g., 2a, ab)
    if (this.isDigit(this.peek())) {
      const num = this.parseNumber();
      // Check if followed by variable or opening paren
      if (this.pos < this.input.length && (this.isLetter(this.peek()) || this.peek() === '(')) {
        const right = this.parsePrimary();
        return {
          id: generateId(),
          type: 'operator',
          value: '*',
          children: [num, right],
          implicit: true
        };
      }
      return num;
    }

    if (this.isLetter(this.peek())) {
      const variable = this.parseVariable();
      // Check for implicit multiplication between variables
      if (this.pos < this.input.length && this.isLetter(this.peek())) {
        const right = this.parsePrimary();
        return {
          id: generateId(),
          type: 'operator',
          value: '*',
          children: [variable, right],
          implicit: true
        };
      }
      return variable;
    }

    throw new Error(`Unexpected character: ${this.peek()}`);
  }

  parseNumber() {
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

  parseVariable() {
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

  peek() {
    return this.input[this.pos];
  }

  consume() {
    return this.input[this.pos++];
  }

  isDigit(char) {
    return char && /[0-9]/.test(char);
  }

  isLetter(char) {
    return char && /[a-zA-Z]/.test(char);
  }
}
