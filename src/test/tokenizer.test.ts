/**
 * Тесты модуля токенизации
 */

import { describe, it, expect } from 'vitest';
import { tokenize, insertImplicitMultiplication, getTokenTypeName, getTokenColor } from '../utils/tokenizer.js';

describe('Tokenizer - Basic Tokenization', () => {
  it('should tokenize numbers', () => {
    const tokens = tokenize('123');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('number');
    expect(tokens[0].value).toBe('123');
  });

  it('should tokenize decimal numbers', () => {
    const tokens = tokenize('3.14');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('number');
    expect(tokens[0].value).toBe('3.14');
  });

  it('should tokenize variables', () => {
    const tokens = tokenize('x');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('variable');
    expect(tokens[0].value).toBe('x');
  });

  it('should tokenize operators', () => {
    const tokens = tokenize('+');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('operator');
    expect(tokens[0].value).toBe('+');
  });

  it('should tokenize parentheses', () => {
    const tokens = tokenize('()');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('paren');
    expect(tokens[0].value).toBe('(');
    expect(tokens[1].type).toBe('paren');
    expect(tokens[1].value).toBe(')');
  });

  it('should skip whitespace', () => {
    const tokens = tokenize('  2  +  3  ');
    expect(tokens).toHaveLength(3);
    expect(tokens[0].value).toBe('2');
    expect(tokens[1].value).toBe('+');
    expect(tokens[2].value).toBe('3');
  });
});

describe('Tokenizer - Unary Minus Detection', () => {
  it('should detect unary minus at start', () => {
    const tokens = tokenize('-5');
    expect(tokens[0].type).toBe('unary');
    expect(tokens[0].value).toBe('-');
  });

  it('should detect unary minus after operator', () => {
    const tokens = tokenize('2 + -3');
    expect(tokens[2].type).toBe('unary');
  });

  it('should detect unary minus after opening paren', () => {
    const tokens = tokenize('(-5)');
    expect(tokens[1].type).toBe('unary');
  });

  it('should detect binary minus between numbers', () => {
    const tokens = tokenize('5 - 3');
    expect(tokens[1].type).toBe('operator');
  });
});

describe('Tokenizer - Implicit Multiplication', () => {
  it('should insert implicit multiplication between number and variable', () => {
    const tokens = tokenize('2x');
    const result = insertImplicitMultiplication(tokens);
    expect(result).toHaveLength(3);
    expect(result[1].type).toBe('operator');
    expect(result[1].value).toBe('*');
    expect(result[1].implicit).toBe(true);
  });

  it('should insert implicit multiplication between variables', () => {
    const tokens = tokenize('abc');
    const result = insertImplicitMultiplication(tokens);
    // a*b*c = 5 токенов
    expect(result.length).toBeGreaterThan(3);
    expect(result[1].implicit).toBe(true);
  });

  it('should insert implicit multiplication between closing and opening paren', () => {
    const tokens = tokenize('(2)(3)');
    const result = insertImplicitMultiplication(tokens);
    // (2)(3) -> ( 2 ) * ( 3 ) = 7 токенов
    expect(result.length).toBeGreaterThan(6);
    // Проверяем, что есть неявное умножение
    const implicitMul = result.find(t => t.implicit === true);
    expect(implicitMul).toBeDefined();
  });

  it('should insert implicit multiplication between number and opening paren', () => {
    const tokens = tokenize('2(3)');
    const result = insertImplicitMultiplication(tokens);
    expect(result[1].value).toBe('*');
    expect(result[1].implicit).toBe(true);
  });

  it('should insert implicit multiplication between closing paren and variable', () => {
    const tokens = tokenize('(2)x');
    const result = insertImplicitMultiplication(tokens);
    // (2)x -> ( 2 ) * x = 5 токенов
    expect(result.length).toBeGreaterThan(4);
    const implicitMul = result.find(t => t.implicit === true);
    expect(implicitMul).toBeDefined();
  });

  it('should not insert multiplication between explicit operators', () => {
    const tokens = tokenize('2 * 3');
    const result = insertImplicitMultiplication(tokens);
    expect(result).toHaveLength(3);
    // Явный оператор не имеет флага implicit
    expect(result[1].implicit).toBeUndefined();
  });
});

describe('Tokenizer - Position Tracking', () => {
  it('should track start positions', () => {
    const tokens = tokenize('2 + 3');
    expect(tokens[0].start).toBe(0); // 2
    expect(tokens[1].start).toBe(1); // + (с учетом пробела)
    expect(tokens[2].start).toBe(2); // 3 (после +)
  });

  it('should track end positions', () => {
    const tokens = tokenize('123 + 456');
    expect(tokens[0].end).toBe(3);   // 123 (0-3)
    expect(tokens[1].end).toBe(4);   // + (3-4)
    expect(tokens[2].end).toBe(7);   // 456 (4-7)
  });
});

describe('Tokenizer - Helper Functions', () => {
  it('getTokenTypeName should return correct names', () => {
    expect(getTokenTypeName('number')).toBe('Число');
    expect(getTokenTypeName('variable')).toBe('Переменная');
    expect(getTokenTypeName('operator')).toBe('Оператор');
    expect(getTokenTypeName('paren')).toBe('Скобка');
    expect(getTokenTypeName('unary')).toBe('Унарный минус');
  });

  it('getTokenColor should return correct colors', () => {
    expect(getTokenColor('number')).toBe('#3aff37');
    expect(getTokenColor('variable')).toBe('#e37933');
    expect(getTokenColor('operator')).toBe('#ffff40');
    expect(getTokenColor('paren')).toBe('#60f0ff');
    expect(getTokenColor('unary')).toBe('#ff4000');
  });
});

describe('Tokenizer - Complex Expressions', () => {
  it('should tokenize complex expression with all token types', () => {
    const tokens = tokenize('2x + (3 - y) * 4.5');
    // 2x + ( 3 - y ) * 4.5 = 10 токенов
    expect(tokens.length).toBeGreaterThanOrEqual(10);
  });

  it('should handle multiple consecutive variables', () => {
    const tokens = tokenize('xyz');
    expect(tokens).toHaveLength(3);
    expect(tokens.every(t => t.type === 'variable')).toBe(true);
  });

  it('should handle mixed case variables', () => {
    const tokens = tokenize('aB');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].value).toBe('a');
    expect(tokens[1].value).toBe('B');
  });
});

describe('Tokenizer - Edge Cases', () => {
  it('should handle empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(0);
  });

  it('should handle whitespace only', () => {
    const tokens = tokenize('   ');
    expect(tokens).toHaveLength(0);
  });

  it('should handle multiple operators', () => {
    const tokens = tokenize('+-*/');
    expect(tokens).toHaveLength(4);
    expect(tokens.every(t => t.type === 'operator' || t.type === 'unary')).toBe(true);
  });

  it('should handle numbers with leading zeros', () => {
    const tokens = tokenize('007');
    expect(tokens[0].value).toBe('007');
  });
});
