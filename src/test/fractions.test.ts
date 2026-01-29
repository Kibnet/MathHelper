/**
 * Тесты для утилиты работы с дробями
 */
import { describe, test, expect } from 'vitest';
import {
  gcd,
  simplifyFraction,
  toMixedNumber,
  isRepeatingDecimal,
  convertFraction,
  formatSimplifiedFraction,
  formatMixedNumber,
  formatDecimal,
  FractionError
} from '../utils/fractions.js';

describe('gcd', () => {
  test('НОД(12, 8) = 4', () => {
    expect(gcd(12, 8)).toBe(4);
  });

  test('НОД(17, 13) = 1 (взаимно простые)', () => {
    expect(gcd(17, 13)).toBe(1);
  });

  test('НОД(0, 5) = 5', () => {
    expect(gcd(0, 5)).toBe(5);
  });

  test('работает с отрицательными числами', () => {
    expect(gcd(-12, 8)).toBe(4);
    expect(gcd(12, -8)).toBe(4);
    expect(gcd(-12, -8)).toBe(4);
  });

  test('НОД одинаковых чисел равен им', () => {
    expect(gcd(7, 7)).toBe(7);
  });
});

describe('simplifyFraction', () => {
  test('сокращает 6/8 до 3/4', () => {
    const result = simplifyFraction(6, 8);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(4);
  });

  test('не меняет несократимую дробь 3/7', () => {
    const result = simplifyFraction(3, 7);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(7);
  });

  test('сокращает 12/4 до 3/1', () => {
    const result = simplifyFraction(12, 4);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(1);
  });

  test('нормализует знак: знаменатель всегда положительный', () => {
    const result = simplifyFraction(3, -4);
    expect(result.numerator).toBe(-3);
    expect(result.denominator).toBe(4);
  });

  test('обрабатывает отрицательный числитель', () => {
    const result = simplifyFraction(-6, 8);
    expect(result.numerator).toBe(-3);
    expect(result.denominator).toBe(4);
  });

  test('обрабатывает оба отрицательных', () => {
    const result = simplifyFraction(-6, -8);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(4);
  });
});

describe('toMixedNumber', () => {
  test('преобразует 7/4 в 1 3/4', () => {
    const result = toMixedNumber(7, 4);
    expect(result).toEqual({ whole: 1, numerator: 3, denominator: 4 });
  });

  test('преобразует 11/3 в 3 2/3', () => {
    const result = toMixedNumber(11, 3);
    expect(result).toEqual({ whole: 3, numerator: 2, denominator: 3 });
  });

  test('возвращает null для правильной дроби 3/4', () => {
    const result = toMixedNumber(3, 4);
    expect(result).toBeNull();
  });

  test('возвращает null если делится нацело', () => {
    const result = toMixedNumber(8, 4);
    expect(result).toBeNull();
  });

  test('обрабатывает отрицательный числитель -7/4', () => {
    const result = toMixedNumber(-7, 4);
    expect(result).toEqual({ whole: -1, numerator: 3, denominator: 4 });
  });
});

describe('isRepeatingDecimal', () => {
  test('1/4 = 0.25 — конечная (знаменатель 4 = 2²)', () => {
    expect(isRepeatingDecimal(4)).toBe(false);
  });

  test('1/5 = 0.2 — конечная', () => {
    expect(isRepeatingDecimal(5)).toBe(false);
  });

  test('1/8 = 0.125 — конечная (знаменатель 8 = 2³)', () => {
    expect(isRepeatingDecimal(8)).toBe(false);
  });

  test('1/3 = 0.333... — периодическая', () => {
    expect(isRepeatingDecimal(3)).toBe(true);
  });

  test('1/6 = 0.1666... — периодическая', () => {
    expect(isRepeatingDecimal(6)).toBe(true);
  });

  test('1/7 = 0.142857... — периодическая', () => {
    expect(isRepeatingDecimal(7)).toBe(true);
  });

  test('1/10 = 0.1 — конечная (10 = 2 × 5)', () => {
    expect(isRepeatingDecimal(10)).toBe(false);
  });
});

describe('convertFraction', () => {
  test('преобразует 7/4', () => {
    const result = convertFraction(7, 4);
    
    expect(result.decimal).toBe(1.75);
    expect(result.simplified).toEqual({ numerator: 7, denominator: 4 });
    expect(result.mixed).toEqual({ whole: 1, numerator: 3, denominator: 4 });
    expect(result.isRepeating).toBe(false);
  });

  test('преобразует 6/9 (сокращается до 2/3)', () => {
    const result = convertFraction(6, 9);
    
    expect(result.decimal).toBeCloseTo(0.6666666667, 5);
    expect(result.simplified).toEqual({ numerator: 2, denominator: 3 });
    expect(result.mixed).toBeNull();
    expect(result.isRepeating).toBe(true);
  });

  test('преобразует 12/4 (целое число)', () => {
    const result = convertFraction(12, 4);
    
    expect(result.decimal).toBe(3);
    expect(result.simplified).toEqual({ numerator: 3, denominator: 1 });
    expect(result.mixed).toBeNull();
  });

  test('выбрасывает ошибку при делении на ноль', () => {
    expect(() => convertFraction(5, 0)).toThrow(FractionError);
    expect(() => convertFraction(5, 0)).toThrow('ноль');
  });

  test('выбрасывает ошибку для дробных чисел', () => {
    expect(() => convertFraction(3.5, 2)).toThrow(FractionError);
    expect(() => convertFraction(3, 2.5)).toThrow(FractionError);
  });

  test('выбрасывает ошибку для Infinity', () => {
    expect(() => convertFraction(Infinity, 2)).toThrow(FractionError);
  });

  test('выбрасывает ошибку для NaN', () => {
    expect(() => convertFraction(NaN, 2)).toThrow(FractionError);
  });
});

describe('formatSimplifiedFraction', () => {
  test('форматирует 3/4', () => {
    expect(formatSimplifiedFraction({ numerator: 3, denominator: 4 })).toBe('3/4');
  });

  test('форматирует целое число 5/1 как "5"', () => {
    expect(formatSimplifiedFraction({ numerator: 5, denominator: 1 })).toBe('5');
  });

  test('форматирует отрицательную дробь -3/4', () => {
    expect(formatSimplifiedFraction({ numerator: -3, denominator: 4 })).toBe('-3/4');
  });
});

describe('formatMixedNumber', () => {
  test('форматирует 1 3/4', () => {
    expect(formatMixedNumber({ whole: 1, numerator: 3, denominator: 4 })).toBe('1 3/4');
  });

  test('форматирует -2 1/3', () => {
    expect(formatMixedNumber({ whole: -2, numerator: 1, denominator: 3 })).toBe('-2 1/3');
  });
});

describe('formatDecimal', () => {
  test('форматирует целое число', () => {
    expect(formatDecimal(5, false)).toBe('5');
  });

  test('форматирует конечную десятичную дробь', () => {
    expect(formatDecimal(1.75, false)).toBe('1.75');
  });

  test('добавляет многоточие для периодической дроби', () => {
    const result = formatDecimal(0.333333333333, true);
    expect(result).toContain('...');
  });

  test('убирает лишние нули', () => {
    expect(formatDecimal(1.5, false)).toBe('1.5');
  });
});
