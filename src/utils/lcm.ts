/**
 * Утилиты для нахождения НОК (наименьшего общего кратного)
 * и вычисления множителей для приведения чисел к общему кратному
 */

import { gcd } from './fractions.js';

/** Результат вычисления НОК */
export interface LcmResult {
  /** Наименьшее общее кратное */
  lcm: number;
  /** Исходные числа */
  numbers: number[];
  /** Множители для каждого числа: number[i] × multipliers[i] = lcm */
  multipliers: number[];
  /** НОД исходных чисел (для справки) */
  gcd: number;
}

/** Ошибка валидации ввода */
export class LcmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LcmError';
  }
}

/** Максимальное значение для вычислений */
const MAX_VALUE = 1_000_000_000;

/**
 * Вычисляет НОК двух чисел через НОД
 * НОК(a, b) = |a × b| / НОД(a, b)
 */
export function lcmOfTwo(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Вычисляет НОД нескольких чисел
 */
export function gcdOfMany(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  if (numbers.length === 1) return Math.abs(numbers[0]);
  
  let result = Math.abs(numbers[0]);
  for (let i = 1; i < numbers.length; i++) {
    result = gcd(result, numbers[i]);
    if (result === 1) break; // НОД = 1, дальше не изменится
  }
  return result;
}

/**
 * Вычисляет НОК нескольких чисел
 */
export function lcmOfMany(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  if (numbers.length === 1) return Math.abs(numbers[0]);
  
  let result = Math.abs(numbers[0]);
  for (let i = 1; i < numbers.length; i++) {
    result = lcmOfTwo(result, numbers[i]);
    if (result > MAX_VALUE) {
      throw new LcmError(`Результат слишком большой (превышает ${MAX_VALUE.toLocaleString('ru-RU')})`);
    }
  }
  return result;
}

/**
 * Вычисляет НОК и множители для списка чисел
 * @param numbers - массив положительных целых чисел
 * @returns результат с НОК и множителями
 */
export function calculateLcm(numbers: number[]): LcmResult {
  // Валидация
  if (numbers.length < 2) {
    throw new LcmError('Введите минимум два числа');
  }

  for (const n of numbers) {
    if (!Number.isFinite(n)) {
      throw new LcmError('Все числа должны быть конечными');
    }
    if (!Number.isInteger(n)) {
      throw new LcmError('Все числа должны быть целыми');
    }
    if (n <= 0) {
      throw new LcmError('Все числа должны быть положительными');
    }
    if (n > MAX_VALUE) {
      throw new LcmError(`Число слишком большое (максимум ${MAX_VALUE.toLocaleString('ru-RU')})`);
    }
  }

  const lcm = lcmOfMany(numbers);
  const gcdValue = gcdOfMany(numbers);
  const multipliers = numbers.map(n => lcm / n);

  return {
    lcm,
    numbers,
    multipliers,
    gcd: gcdValue
  };
}

/**
 * Форматирует результат НОК в читаемую строку
 */
export function formatLcmResult(result: LcmResult): string {
  return `НОК(${result.numbers.join(', ')}) = ${result.lcm}`;
}

/**
 * Форматирует множители в строку
 */
export function formatMultipliers(result: LcmResult): string {
  return result.numbers
    .map((n, i) => `${n} × ${result.multipliers[i]} = ${result.lcm}`)
    .join('\n');
}
