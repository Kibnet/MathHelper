/**
 * Тесты для утилиты НОК (наименьшего общего кратного)
 */
import { describe, test, expect } from 'vitest';
import {
  lcmOfTwo,
  gcdOfMany,
  lcmOfMany,
  calculateLcm,
  formatLcmResult,
  formatMultipliers,
  LcmError
} from '../utils/lcm.js';

describe('lcmOfTwo', () => {
  test('НОК(4, 6) = 12', () => {
    expect(lcmOfTwo(4, 6)).toBe(12);
  });

  test('НОК(3, 5) = 15 (взаимно простые)', () => {
    expect(lcmOfTwo(3, 5)).toBe(15);
  });

  test('НОК(12, 8) = 24', () => {
    expect(lcmOfTwo(12, 8)).toBe(24);
  });

  test('НОК(7, 7) = 7 (одинаковые)', () => {
    expect(lcmOfTwo(7, 7)).toBe(7);
  });

  test('НОК с нулём равен 0', () => {
    expect(lcmOfTwo(0, 5)).toBe(0);
    expect(lcmOfTwo(5, 0)).toBe(0);
  });

  test('НОК(1, n) = n', () => {
    expect(lcmOfTwo(1, 17)).toBe(17);
  });
});

describe('gcdOfMany', () => {
  test('НОД пустого массива = 0', () => {
    expect(gcdOfMany([])).toBe(0);
  });

  test('НОД одного числа равен ему', () => {
    expect(gcdOfMany([12])).toBe(12);
  });

  test('НОД(12, 8, 4) = 4', () => {
    expect(gcdOfMany([12, 8, 4])).toBe(4);
  });

  test('НОД(15, 25, 35) = 5', () => {
    expect(gcdOfMany([15, 25, 35])).toBe(5);
  });

  test('НОД взаимно простых = 1', () => {
    expect(gcdOfMany([7, 11, 13])).toBe(1);
  });
});

describe('lcmOfMany', () => {
  test('НОК пустого массива = 0', () => {
    expect(lcmOfMany([])).toBe(0);
  });

  test('НОК одного числа равен ему', () => {
    expect(lcmOfMany([12])).toBe(12);
  });

  test('НОК(2, 3, 4) = 12', () => {
    expect(lcmOfMany([2, 3, 4])).toBe(12);
  });

  test('НОК(4, 6, 8) = 24', () => {
    expect(lcmOfMany([4, 6, 8])).toBe(24);
  });

  test('НОК(2, 3, 5) = 30 (взаимно простые)', () => {
    expect(lcmOfMany([2, 3, 5])).toBe(30);
  });
});

describe('calculateLcm', () => {
  test('вычисляет НОК и множители для 12 и 8', () => {
    const result = calculateLcm([12, 8]);
    
    expect(result.lcm).toBe(24);
    expect(result.numbers).toEqual([12, 8]);
    expect(result.multipliers).toEqual([2, 3]);
    expect(result.gcd).toBe(4);
  });

  test('вычисляет НОК и множители для 4, 6, 8', () => {
    const result = calculateLcm([4, 6, 8]);
    
    expect(result.lcm).toBe(24);
    expect(result.multipliers).toEqual([6, 4, 3]);
    expect(result.gcd).toBe(2);
  });

  test('вычисляет НОК для взаимно простых 3 и 5', () => {
    const result = calculateLcm([3, 5]);
    
    expect(result.lcm).toBe(15);
    expect(result.multipliers).toEqual([5, 3]);
    expect(result.gcd).toBe(1);
  });

  test('выбрасывает ошибку для одного числа', () => {
    expect(() => calculateLcm([12])).toThrow(LcmError);
    expect(() => calculateLcm([12])).toThrow('минимум два');
  });

  test('выбрасывает ошибку для отрицательного числа', () => {
    expect(() => calculateLcm([12, -8])).toThrow(LcmError);
    expect(() => calculateLcm([12, -8])).toThrow('положительными');
  });

  test('выбрасывает ошибку для нуля', () => {
    expect(() => calculateLcm([12, 0])).toThrow(LcmError);
  });

  test('выбрасывает ошибку для дробного числа', () => {
    expect(() => calculateLcm([12, 8.5])).toThrow(LcmError);
    expect(() => calculateLcm([12, 8.5])).toThrow('целыми');
  });

  test('выбрасывает ошибку для NaN', () => {
    expect(() => calculateLcm([12, NaN])).toThrow(LcmError);
  });
});

describe('formatLcmResult', () => {
  test('форматирует результат для двух чисел', () => {
    const result = calculateLcm([12, 8]);
    expect(formatLcmResult(result)).toBe('НОК(12, 8) = 24');
  });

  test('форматирует результат для трёх чисел', () => {
    const result = calculateLcm([4, 6, 8]);
    expect(formatLcmResult(result)).toBe('НОК(4, 6, 8) = 24');
  });
});

describe('formatMultipliers', () => {
  test('форматирует множители', () => {
    const result = calculateLcm([12, 8]);
    const formatted = formatMultipliers(result);
    
    expect(formatted).toContain('12 × 2 = 24');
    expect(formatted).toContain('8 × 3 = 24');
  });
});
