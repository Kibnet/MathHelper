/**
 * Модуль парсера выражений
 * Разбирает математические выражения в AST (абстрактное синтаксическое дерево)
 */

import type { ASTNode, ConstantNode, VariableNode, OperatorNode, UnaryNode, GroupNode, ImplicitMulNode } from '../types/index.js';
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
    const operands: ASTNode[] = [this.parseMultiplicative()];
    const operatorIndices: number[] = [];
    
    // Проверяем, есть ли операторы + или -
    if (this.pos >= this.tokens.length) {
      return operands[0];
    }
    
    let token = this.peek();
    if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
      return operands[0];
    }
    
    // Накапливаем операнды для n-арного сложения
    while (this.pos < this.tokens.length) {
      token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
        break;
      }
      
      const operator = token.value;
      const opToken = this.consume();
      operatorIndices.push(opToken.originalIndex ?? -1);
      
      let nextOperand = this.parseMultiplicative();
      
      // Если оператор минус, оборачиваем операнд в скрытый унарный минус
      if (operator === '-') {
        const unaryNode: UnaryNode = {
          id: generateId(),
          type: 'unary',
          value: '-',
          children: [nextOperand],
          implicit: true, // Скрытый минус
          tokenIds: nextOperand.tokenIds
        };
        nextOperand = unaryNode;
      }
      
      operands.push(nextOperand);
    }
    
    // Если только один операнд, возвращаем его
    if (operands.length === 1) {
      return operands[0];
    }
    
    // Собираем tokenIds для всего выражения
    const allTokenIds: number[] = [];
    operands.forEach((operand, i) => {
      allTokenIds.push(...(operand.tokenIds || []));
      if (i < operatorIndices.length) {
        allTokenIds.push(operatorIndices[i]);
      }
    });
    
    // Создаём n-арный узел сложения
    const node: OperatorNode = {
      id: generateId(),
      type: 'operator',
      value: '+',
      children: operands,
      tokenIds: allTokenIds
    };
    
    return node;
  }

  private parseMultiplicative(): ASTNode {
    const operands: ASTNode[] = [this.parseUnary()];
    const operatorIndices: number[] = [];
    const implicitFlags: boolean[] = [];
    
    // Проверяем, есть ли операторы * или /
    if (this.pos >= this.tokens.length) {
      return operands[0];
    }
    
    let token = this.peek();
    if (!token || token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) {
      return operands[0];
    }
    
    const firstOp = token.value;
    
    // Если первый оператор - деление, сразу создаём бинарный узел
    if (firstOp === '/') {
      const opToken = this.consume();
      const right = this.parseUnary();
      
      const tokenIds = [
        ...(operands[0].tokenIds || []),
        opToken.originalIndex ?? -1,
        ...(right.tokenIds || [])
      ];
      
      return {
        id: generateId(),
        type: 'operator',
        value: '/',
        children: [operands[0], right],
        tokenIds
      };
    }
    
    // Накапливаем операнды для n-арного умножения
    while (this.pos < this.tokens.length) {
      token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) {
        break;
      }
      
      const operator = token.value;
      const isImplicit = token.implicit || false;
      
      // Если встречается деление и уже есть операнды умножения, сворачиваем
      if (operator === '/' && operands.length > 1) {
        // Создаём n-арный узел умножения из накопленных операндов
        const leftMultNode = this.createMultiplicationNode(operands, operatorIndices, implicitFlags);
        
        // Теперь создаём бинарный узел деления
        const opToken = this.consume();
        const right = this.parseUnary();
        
        const tokenIds = [
          ...(leftMultNode.tokenIds || []),
          opToken.originalIndex ?? -1,
          ...(right.tokenIds || [])
        ];
        
        const divNode: OperatorNode = {
          id: generateId(),
          type: 'operator',
          value: '/',
          children: [leftMultNode, right],
          tokenIds
        };
        
        // Возвращаем результат деления вместо продолжения цикла
        return divNode;
      }
      
      // Если текущий оператор не совпадает с первым (* vs /)
      if (operator === '/' && firstOp === '*') {
        break;
      }
      
      const opToken = this.consume();
      operatorIndices.push(opToken.originalIndex ?? -1);
      implicitFlags.push(isImplicit);
      
      const nextOperand = this.parseUnary();
      operands.push(nextOperand);
    }
    
    // Если только один операнд, возвращаем его
    if (operands.length === 1) {
      return operands[0];
    }
    
    return this.createMultiplicationNode(operands, operatorIndices, implicitFlags);
  }
  
  /**
   * Создаёт n-арный узел умножения (явного или неявного)
   * БАГ 4: Правильно группирует смешанные явные и неявные операции
   */
  private createMultiplicationNode(
    operands: ASTNode[],
    operatorIndices: number[],
    implicitFlags: boolean[]
  ): ASTNode {
    // Проверяем, все ли операции неявные
    const allImplicit = implicitFlags.length > 0 && implicitFlags.every(f => f);
    const allExplicit = implicitFlags.length > 0 && implicitFlags.every(f => !f);
    
    // Если есть смешанные флаги, группируем последовательности неявных операций
    if (!allImplicit && !allExplicit) {
      // Ищем первую последовательность неявных операций
      for (let i = 0; i < implicitFlags.length; i++) {
        if (implicitFlags[i]) {
          // Нашли начало неявной последовательности
          // i - индекс первого неявного оператора (между operands[i] и operands[i+1])
          // Находим конец последовательности
          let j = i;
          while (j < implicitFlags.length && implicitFlags[j]) {
            j++;
          }
          // j - индекс после последнего неявного оператора
          
          // Создаём узел неявного умножения для операндов
          // implicitFlags[i] - оператор между operands[i] и operands[i+1]
          // Например: a*bc где i=1, j=2 → операнды [b, c] = operands.slice(1, 3)
          const implicitOperands = operands.slice(i, j + 1);
          
          const implicitNode = this.createImplicitMultNode(implicitOperands);
          
          // Заменяем операнды на один узел
          // operands = [a, b, c] → [a, implicit_mul(b,c)]
          const newOperands = [
            ...operands.slice(0, i),
            implicitNode,
            ...operands.slice(j + 1)
          ];
          // operatorIndices = [idx0, idx1] → [idx0]
          const newOperatorIndices = [
            ...operatorIndices.slice(0, i),
            ...operatorIndices.slice(j)
          ];
          // implicitFlags = [false, true] → [false]
          const newImplicitFlags = [
            ...implicitFlags.slice(0, i),
            ...implicitFlags.slice(j)
          ];
          
          // Рекурсивно обрабатываем оставшиеся операнды
          return this.createMultiplicationNode(newOperands, newOperatorIndices, newImplicitFlags);
        }
      }
    }
    
    // Собираем tokenIds
    const allTokenIds: number[] = [];
    operands.forEach((operand, i) => {
      allTokenIds.push(...(operand.tokenIds || []));
      if (i < operatorIndices.length && !implicitFlags[i]) {
        allTokenIds.push(operatorIndices[i]);
      }
    });
    
    if (allImplicit) {
      return this.createImplicitMultNode(operands);
    } else {
      // Создаём n-арный узел явного умножения
      const node: OperatorNode = {
        id: generateId(),
        type: 'operator',
        value: '*',
        children: operands,
        tokenIds: allTokenIds
      };
      return node;
    }
  }
  
  /**
   * Создаёт узел неявного умножения
   */
  private createImplicitMultNode(operands: ASTNode[]): ImplicitMulNode {
    const allTokenIds: number[] = [];
    operands.forEach((operand) => {
      allTokenIds.push(...(operand.tokenIds || []));
    });
    
    return {
      id: generateId(),
      type: 'implicit_mul',
      value: '*',
      children: operands,
      tokenIds: allTokenIds
    };
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
