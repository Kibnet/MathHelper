/**
 * Тесты парсера
 * Комплексные тесты для парсера выражений, включая краевые случаи
 */

import { describe, it, expect } from 'vitest';
import { ExpressionParser, resetIdCounter } from '../core/parser.js';
import type { ConstantNode, VariableNode, OperatorNode, UnaryNode, GroupNode } from '../types/index.js';

describe('Parser - Basic Constants', () => {
  it('should parse single digit', () => {
    resetIdCounter();
    const parser = new ExpressionParser('5');
    const result = parser.parse();
    expect(result.type).toBe('constant');
    expect((result as ConstantNode).value).toBe(5);
  });

  it('should parse multi-digit number', () => {
    const parser = new ExpressionParser('123');
    const result = parser.parse();
    expect(result.type).toBe('constant');
    expect((result as ConstantNode).value).toBe(123);
  });

  it('should parse decimal number', () => {
    const parser = new ExpressionParser('3.14');
    const result = parser.parse();
    expect(result.type).toBe('constant');
    expect((result as ConstantNode).value).toBe(3.14);
  });

  it('should parse zero', () => {
    const parser = new ExpressionParser('0');
    const result = parser.parse();
    expect(result.type).toBe('constant');
    expect((result as ConstantNode).value).toBe(0);
  });

  it('should parse negative number with unary minus', () => {
    const parser = new ExpressionParser('-5');
    const result = parser.parse();
    expect(result.type).toBe('unary');
    expect((result as UnaryNode).value).toBe('-');
    expect((result as UnaryNode).children[0].type).toBe('constant');
  });
});

describe('Parser - Variables', () => {
  it('should parse single letter variable', () => {
    const parser = new ExpressionParser('x');
    const result = parser.parse();
    expect(result.type).toBe('variable');
    expect((result as VariableNode).value).toBe('x');
  });

  it('should parse uppercase variable', () => {
    const parser = new ExpressionParser('X');
    const result = parser.parse();
    expect(result.type).toBe('variable');
    expect((result as VariableNode).value).toBe('X');
  });

  it('should parse multi-character variable with implicit multiplication', () => {
    const parser = new ExpressionParser('abc');
    const result = parser.parse();
    // abc парсится как a*b*c (неявное умножение)
    expect(result.type).toBe('implicit_mul');
  });
});

describe('Parser - Binary Operations', () => {
  it('should parse addition', () => {
    const parser = new ExpressionParser('2 + 3');
    const result = parser.parse() as OperatorNode;
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
    expect(result.children).toHaveLength(2);
    expect((result.children[0] as ConstantNode).value).toBe(2);
    expect((result.children[1] as ConstantNode).value).toBe(3);
  });

  it('should parse subtraction', () => {
    const parser = new ExpressionParser('5 - 2');
    const result = parser.parse() as OperatorNode;
    // Вычитание теперь преобразуется в сложение: 5 + (-2)
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
    expect((result.children[0] as ConstantNode).value).toBe(5);
    
    // Второй операнд - унарный минус с флагом implicit
    const secondOperand = result.children[1] as UnaryNode;
    expect(secondOperand.type).toBe('unary');
    expect(secondOperand.value).toBe('-');
    expect(secondOperand.implicit).toBe(true);
    expect((secondOperand.children[0] as ConstantNode).value).toBe(2);
  });

  it('should parse multiplication', () => {
    const parser = new ExpressionParser('3 * 4');
    const result = parser.parse() as OperatorNode;
    expect(result.type).toBe('operator');
    expect(result.value).toBe('*');
    expect((result.children[0] as ConstantNode).value).toBe(3);
    expect((result.children[1] as ConstantNode).value).toBe(4);
  });

  it('should parse division', () => {
    const parser = new ExpressionParser('8 / 2');
    const result = parser.parse() as OperatorNode;
    expect(result.type).toBe('operator');
    expect(result.value).toBe('/');
    expect((result.children[0] as ConstantNode).value).toBe(8);
    expect((result.children[1] as ConstantNode).value).toBe(2);
  });

  it('should parse without spaces', () => {
    const parser = new ExpressionParser('2+3');
    const result = parser.parse() as OperatorNode;
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
  });

  it('should parse with extra spaces', () => {
    const parser = new ExpressionParser('2   +   3');
    const result = parser.parse() as OperatorNode;
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
  });
});

describe('Parser - Operator Precedence', () => {
  it('should respect multiplication over addition (2 + 3 * 4)', () => {
    const parser = new ExpressionParser('2 + 3 * 4');
    const result = parser.parse() as OperatorNode;
    
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
    expect((result.children[0] as ConstantNode).value).toBe(2);
    
    const right = result.children[1] as OperatorNode;
    expect(right.type).toBe('operator');
    expect(right.value).toBe('*');
    expect((right.children[0] as ConstantNode).value).toBe(3);
    expect((right.children[1] as ConstantNode).value).toBe(4);
  });

  it('should respect division over subtraction (10 - 8 / 2)', () => {
    const parser = new ExpressionParser('10 - 8 / 2');
    const result = parser.parse() as OperatorNode;
    
    // Теперь это сложение: 10 + (-(8/2))
    expect(result.value).toBe('+');
    
    // Второй операнд - унарный минус от деления
    const secondOperand = result.children[1] as UnaryNode;
    expect(secondOperand.type).toBe('unary');
    expect(secondOperand.implicit).toBe(true);
    
    const division = secondOperand.children[0] as OperatorNode;
    expect(division.value).toBe('/');
  });

  it('should handle left-to-right for same precedence (10 - 5 - 2)', () => {
    const parser = new ExpressionParser('10 - 5 - 2');
    const result = parser.parse() as OperatorNode;
    
    // Теперь это n-арное сложение: +(10, (-5), (-2))
    expect(result.value).toBe('+');
    expect(result.children.length).toBe(3);
    
    expect((result.children[0] as ConstantNode).value).toBe(10);
    
    // Второй операнд: (-5)
    const second = result.children[1] as UnaryNode;
    expect(second.type).toBe('unary');
    expect(second.implicit).toBe(true);
    expect((second.children[0] as ConstantNode).value).toBe(5);
    
    // Третий операнд: (-2)
    const third = result.children[2] as UnaryNode;
    expect(third.type).toBe('unary');
    expect(third.implicit).toBe(true);
    expect((third.children[0] as ConstantNode).value).toBe(2);
  });

  it('should handle complex precedence (2 + 3 * 4 - 5 / 5)', () => {
    const parser = new ExpressionParser('2 + 3 * 4 - 5 / 5');
    const result = parser.parse() as OperatorNode;
    
    // Теперь это n-арное сложение: +(2, *(3,4), (-(5/5)))
    expect(result.type).toBe('operator');
    expect(result.value).toBe('+');
    expect(result.children.length).toBe(3);
    
    // Первый операнд: 2
    expect((result.children[0] as ConstantNode).value).toBe(2);
    
    // Второй операнд: 3*4
    const multiplication = result.children[1] as OperatorNode;
    expect(multiplication.type).toBe('operator');
    expect(multiplication.value).toBe('*');
    
    // Третий операнд: -(5/5)
    const unaryMinus = result.children[2] as UnaryNode;
    expect(unaryMinus.type).toBe('unary');
    expect(unaryMinus.implicit).toBe(true);
  });
});

describe('Parser - Parentheses', () => {
  it('should parse simple parentheses', () => {
    const parser = new ExpressionParser('(5)');
    const result = parser.parse() as GroupNode;
    expect(result.type).toBe('group');
    expect((result.children[0] as ConstantNode).value).toBe(5);
  });

  it('should override precedence with parentheses', () => {
    const parser = new ExpressionParser('(2 + 3) * 4');
    const result = parser.parse() as OperatorNode;
    
    expect(result.value).toBe('*');
    const left = result.children[0] as GroupNode;
    expect(left.type).toBe('group');
    
    const inner = left.children[0] as OperatorNode;
    expect(inner.value).toBe('+');
  });

  it('should parse nested parentheses', () => {
    const parser = new ExpressionParser('((5))');
    const result = parser.parse() as GroupNode;
    expect(result.type).toBe('group');
    
    const inner = result.children[0] as GroupNode;
    expect(inner.type).toBe('group');
    expect((inner.children[0] as ConstantNode).value).toBe(5);
  });

  it('should parse complex nested expression', () => {
    const parser = new ExpressionParser('((2 + 3) * (4 - 1))');
    const result = parser.parse() as GroupNode;
    expect(result.type).toBe('group');
    
    const inner = result.children[0] as OperatorNode;
    expect(inner.value).toBe('*');
  });
});

describe('Parser - Unary Operations', () => {
  it('should parse unary minus', () => {
    const parser = new ExpressionParser('-5');
    const result = parser.parse() as UnaryNode;
    expect(result.type).toBe('unary');
    expect(result.value).toBe('-');
    expect((result.children[0] as ConstantNode).value).toBe(5);
  });

  it('should parse double negation', () => {
    const parser = new ExpressionParser('--5');
    const result = parser.parse() as UnaryNode;
    expect(result.type).toBe('unary');
    
    const inner = result.children[0] as UnaryNode;
    expect(inner.type).toBe('unary');
    expect((inner.children[0] as ConstantNode).value).toBe(5);
  });

  it('should parse unary in expression', () => {
    const parser = new ExpressionParser('2 + -3');
    const result = parser.parse() as OperatorNode;
    
    expect(result.value).toBe('+');
    const right = result.children[1] as UnaryNode;
    expect(right.type).toBe('unary');
  });

  it('should parse unary with parentheses', () => {
    const parser = new ExpressionParser('-(2 + 3)');
    const result = parser.parse() as UnaryNode;
    expect(result.type).toBe('unary');
    
    const inner = result.children[0] as GroupNode;
    expect(inner.type).toBe('group');
  });
});

describe('Parser - Error Handling', () => {
  it('should throw on empty expression', () => {
    expect(() => {
      const parser = new ExpressionParser('');
      parser.parse();
    }).toThrow('Пустое выражение');
  });

  it('should throw on whitespace-only expression', () => {
    expect(() => {
      const parser = new ExpressionParser('   ');
      parser.parse();
    }).toThrow('Пустое выражение');
  });

  it('should throw on unmatched opening parenthesis', () => {
    expect(() => {
      const parser = new ExpressionParser('(2 + 3');
      parser.parse();
    }).toThrow('Отсутствует закрывающая скобка');
  });

  it('should throw on unmatched closing parenthesis', () => {
    expect(() => {
      const parser = new ExpressionParser('2 + 3)');
      parser.parse();
    }).toThrow('Неожиданный токен');
  });

  it('should throw on invalid character', () => {
    expect(() => {
      const parser = new ExpressionParser('2 @ 3');
      parser.parse();
    }).toThrow('Неожиданный токен');
  });

  it('should throw on incomplete expression', () => {
    expect(() => {
      const parser = new ExpressionParser('2 +');
      parser.parse();
    }).toThrow();
  });

  it('should throw unexpected end of expression error', () => {
    // Тестируем строку 182: consume() без токенов
    expect(() => {
      const parser = new ExpressionParser('2 *');
      parser.parse();
    }).toThrow('Неожиданный конец выражения');
  });

  it('should throw on operator at start (except unary)', () => {
    expect(() => {
      const parser = new ExpressionParser('+ 2');
      parser.parse();
    }).toThrow();
  });

  it('should throw on double operator', () => {
    expect(() => {
      const parser = new ExpressionParser('2 * * 3');
      parser.parse();
    }).toThrow();
  });

  it('should throw on empty parentheses', () => {
    expect(() => {
      const parser = new ExpressionParser('()');
      parser.parse();
    }).toThrow();
  });
});

describe('Parser - Bug Fixes', () => {
  it('БАГ 2: выражение 1*2/3 должно парситься без ошибки Maximum call stack size exceeded', () => {
    // Воспроизведение: пытаемся распарсить 1*2/3
    // Ожидаем: должно парситься как (1*2)/3
    const parser = new ExpressionParser('1 * 2 / 3');
    
    // Не должно выбрасывать ошибку и должно вернуть результат
    const result = parser.parse() as OperatorNode;
    
    // Проверяем структуру: (1*2)/3
    expect(result.type).toBe('operator');
    expect(result.value).toBe('/');
    expect(result.children.length).toBe(2);
    
    // Левый операнд: 1*2
    const left = result.children[0] as OperatorNode;
    expect(left.type).toBe('operator');
    expect(left.value).toBe('*');
    expect((left.children[0] as ConstantNode).value).toBe(1);
    expect((left.children[1] as ConstantNode).value).toBe(2);
    
    // Правый операнд: 3
    const right = result.children[1] as ConstantNode;
    expect(right.type).toBe('constant');
    expect(right.value).toBe(3);
  });

  it('БАГ 4: выражение a*bc должно парситься как a*(bc), а не a*b*c', () => {
    // Воспроизведение бага: a*bc должно парситься как a * (bc),
    // где bc - неявное умножение, а не как a*b*c (три отдельных множителя)
    const parser = new ExpressionParser('a*bc');
    const result = parser.parse() as OperatorNode;
    
    // Корневой узел должен быть явным умножением
    expect(result.type).toBe('operator');
    expect(result.value).toBe('*');
    expect(result.children.length).toBe(2);
    
    // Первый операнд: переменная a
    const firstOperand = result.children[0] as VariableNode;
    expect(firstOperand.type).toBe('variable');
    expect(firstOperand.value).toBe('a');
    
    // Второй операнд: неявное умножение bc
    const secondOperand = result.children[1] as OperatorNode;
    expect(secondOperand.type).toBe('implicit_mul');
    expect(secondOperand.children.length).toBe(2);
    expect((secondOperand.children[0] as VariableNode).value).toBe('b');
    expect((secondOperand.children[1] as VariableNode).value).toBe('c');
  });
});

describe('Parser - Edge Cases', () => {
  it('should parse very large number', () => {
    const parser = new ExpressionParser('999999999');
    const result = parser.parse();
    expect((result as ConstantNode).value).toBe(999999999);
  });

  it('should parse very small decimal', () => {
    const parser = new ExpressionParser('0.0001');
    const result = parser.parse();
    expect((result as ConstantNode).value).toBe(0.0001);
  });

  it('should parse long variable name with implicit multiplication', () => {
    const parser = new ExpressionParser('variableName');
    const result = parser.parse();
    // variableName парсится как v*a*r*i*a*b*l*e*N*a*m*e
    expect(result.type).toBe('implicit_mul');
  });

  it('should parse complex nested expression', () => {
    const parser = new ExpressionParser('((a + b) * (c - d)) / ((e * f) + (g / h))');
    const result = parser.parse();
    expect(result.type).toBe('operator');
  });

  it('should parse multiple unary operators', () => {
    const parser = new ExpressionParser('---5');
    const result = parser.parse() as UnaryNode;
    expect(result.type).toBe('unary');
    expect(result.children[0].type).toBe('unary');
  });

  it('should handle leading zeros', () => {
    const parser = new ExpressionParser('007');
    const result = parser.parse();
    expect((result as ConstantNode).value).toBe(7);
  });
});

describe('Parser - Mixed Operations', () => {
  it('should parse mixed variables and constants', () => {
    const parser = new ExpressionParser('2 * x + 3');
    const result = parser.parse() as OperatorNode;
    expect(result.value).toBe('+');
  });

  it('should parse all operators in one expression', () => {
    const parser = new ExpressionParser('a + b - c * d / e');
    const result = parser.parse();
    expect(result.type).toBe('operator');
  });

  it('should parse deeply nested groups', () => {
    const parser = new ExpressionParser('(((((5)))))');
    const result = parser.parse();
    expect(result.type).toBe('group');
  });

  it('should parse alternating operators', () => {
    const parser = new ExpressionParser('1 + 2 * 3 - 4 / 2 + 5');
    const result = parser.parse();
    expect(result.type).toBe('operator');
  });
});
