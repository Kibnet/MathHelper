/**
 * Тесты для утилиты факторизации чисел
 */
import { describe, test, expect } from 'vitest';
import {
  factorize,
  getPrimeFactors,
  getAllDivisors,
  getFactorPairs,
  formatPrimeFactors,
  formatFactorPairs,
  formatDivisors,
  FactorizationError
} from '../utils/factorization.js';

describe('factorize', () => {
  test('факторизует число 12', () => {
    const result = factorize(12);
    
    expect(result.original).toBe(12);
    expect(result.primeFactors.get(2)).toBe(2);
    expect(result.primeFactors.get(3)).toBe(1);
    expect(result.allDivisors).toEqual([1, 2, 3, 4, 6, 12]);
    expect(result.factorPairs).toEqual([[1, 12], [2, 6], [3, 4]]);
  });

  test('факторизует число 1', () => {
    const result = factorize(1);
    
    expect(result.original).toBe(1);
    expect(result.primeFactors.size).toBe(0);
    expect(result.allDivisors).toEqual([1]);
    expect(result.factorPairs).toEqual([[1, 1]]);
  });

  test('факторизует простое число 17', () => {
    const result = factorize(17);
    
    expect(result.primeFactors.size).toBe(1);
    expect(result.primeFactors.get(17)).toBe(1);
    expect(result.allDivisors).toEqual([1, 17]);
    expect(result.factorPairs).toEqual([[1, 17]]);
  });

  test('факторизует степень двойки 64', () => {
    const result = factorize(64);
    
    expect(result.primeFactors.size).toBe(1);
    expect(result.primeFactors.get(2)).toBe(6);
    expect(result.allDivisors).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });

  test('факторизует составное число 100', () => {
    const result = factorize(100);
    
    expect(result.primeFactors.get(2)).toBe(2);
    expect(result.primeFactors.get(5)).toBe(2);
    expect(result.allDivisors).toEqual([1, 2, 4, 5, 10, 20, 25, 50, 100]);
  });

  test('выбрасывает ошибку для отрицательного числа', () => {
    expect(() => factorize(-5)).toThrow(FactorizationError);
    expect(() => factorize(-5)).toThrow('положительным');
  });

  test('выбрасывает ошибку для нуля', () => {
    expect(() => factorize(0)).toThrow(FactorizationError);
    expect(() => factorize(0)).toThrow('положительным');
  });

  test('выбрасывает ошибку для дробного числа', () => {
    expect(() => factorize(3.14)).toThrow(FactorizationError);
    expect(() => factorize(3.14)).toThrow('целым');
  });

  test('выбрасывает ошибку для слишком большого числа', () => {
    expect(() => factorize(2_000_000_000)).toThrow(FactorizationError);
    expect(() => factorize(2_000_000_000)).toThrow('слишком большое');
  });

  test('выбрасывает ошибку для Infinity', () => {
    expect(() => factorize(Infinity)).toThrow(FactorizationError);
  });

  test('выбрасывает ошибку для NaN', () => {
    expect(() => factorize(NaN)).toThrow(FactorizationError);
  });
});

describe('getPrimeFactors', () => {
  test('возвращает пустую Map для 1', () => {
    const factors = getPrimeFactors(1);
    expect(factors.size).toBe(0);
  });

  test('раскладывает 60 = 2² × 3 × 5', () => {
    const factors = getPrimeFactors(60);
    
    expect(factors.get(2)).toBe(2);
    expect(factors.get(3)).toBe(1);
    expect(factors.get(5)).toBe(1);
    expect(factors.size).toBe(3);
  });

  test('раскладывает большое простое число 997', () => {
    const factors = getPrimeFactors(997);
    
    expect(factors.size).toBe(1);
    expect(factors.get(997)).toBe(1);
  });
});

describe('getAllDivisors', () => {
  test('возвращает [1] для пустой Map', () => {
    const divisors = getAllDivisors(new Map());
    expect(divisors).toEqual([1]);
  });

  test('находит все делители для 2² × 3', () => {
    const factors = new Map<number, number>([[2, 2], [3, 1]]);
    const divisors = getAllDivisors(factors);
    
    expect(divisors).toEqual([1, 2, 3, 4, 6, 12]);
  });
});

describe('getFactorPairs', () => {
  test('находит пары для 12', () => {
    const divisors = [1, 2, 3, 4, 6, 12];
    const pairs = getFactorPairs(divisors, 12);
    
    expect(pairs).toEqual([[1, 12], [2, 6], [3, 4]]);
  });

  test('находит пары для полного квадрата 36', () => {
    const divisors = [1, 2, 3, 4, 6, 9, 12, 18, 36];
    const pairs = getFactorPairs(divisors, 36);
    
    expect(pairs).toEqual([[1, 36], [2, 18], [3, 12], [4, 9], [6, 6]]);
  });
});

describe('formatPrimeFactors', () => {
  test('форматирует пустую Map как "1"', () => {
    expect(formatPrimeFactors(new Map())).toBe('1');
  });

  test('форматирует 2² × 3', () => {
    const factors = new Map<number, number>([[2, 2], [3, 1]]);
    expect(formatPrimeFactors(factors)).toBe('2² × 3');
  });

  test('форматирует 2⁶', () => {
    const factors = new Map<number, number>([[2, 6]]);
    expect(formatPrimeFactors(factors)).toBe('2⁶');
  });

  test('форматирует множители в порядке возрастания', () => {
    const factors = new Map<number, number>([[5, 1], [2, 3], [3, 2]]);
    expect(formatPrimeFactors(factors)).toBe('2³ × 3² × 5');
  });
});

describe('formatFactorPairs', () => {
  test('форматирует пары множителей', () => {
    const pairs: [number, number][] = [[1, 12], [2, 6], [3, 4]];
    expect(formatFactorPairs(pairs)).toBe('(1, 12), (2, 6), (3, 4)');
  });
});

describe('formatDivisors', () => {
  test('форматирует список делителей', () => {
    const divisors = [1, 2, 3, 4, 6, 12];
    expect(formatDivisors(divisors)).toBe('1, 2, 3, 4, 6, 12');
  });
});
