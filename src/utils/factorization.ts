/**
 * Утилиты для факторизации чисел
 * Разложение на простые множители, поиск делителей
 */

/** Результат факторизации числа */
export interface FactorizationResult {
  /** Простые множители: основание → степень (например, 12 = 2² × 3¹) */
  primeFactors: Map<number, number>;
  /** Пары множителей: [(1, n), (a, b), ...] */
  factorPairs: [number, number][];
  /** Все делители числа в порядке возрастания */
  allDivisors: number[];
  /** Исходное число */
  original: number;
}

/** Ошибка валидации ввода */
export class FactorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FactorizationError';
  }
}

/** Максимальное значение для факторизации (защита от переполнения) */
const MAX_VALUE = 1_000_000_000;

/**
 * Выполняет полную факторизацию числа
 * @param n - число для факторизации (положительное целое)
 * @returns результат факторизации
 * @throws FactorizationError при невалидном вводе
 */
export function factorize(n: number): FactorizationResult {
  // Валидация ввода
  if (!Number.isFinite(n)) {
    throw new FactorizationError('Введите конечное число');
  }
  
  if (n <= 0) {
    throw new FactorizationError('Число должно быть положительным');
  }
  
  if (!Number.isInteger(n)) {
    throw new FactorizationError('Число должно быть целым');
  }
  
  if (n > MAX_VALUE) {
    throw new FactorizationError(`Число слишком большое (максимум ${MAX_VALUE.toLocaleString('ru-RU')})`);
  }

  const original = n;
  const primeFactors = getPrimeFactors(n);
  const allDivisors = getAllDivisors(primeFactors);
  const factorPairs = getFactorPairs(allDivisors, original);

  return {
    primeFactors,
    factorPairs,
    allDivisors,
    original
  };
}

/**
 * Разложение числа на простые множители методом пробного деления
 * @param n - число для разложения
 * @returns Map: простой множитель → степень
 */
export function getPrimeFactors(n: number): Map<number, number> {
  const factors = new Map<number, number>();
  
  if (n === 1) {
    return factors; // 1 не имеет простых множителей
  }

  let remaining = n;

  // Делим на 2 пока возможно
  while (remaining % 2 === 0) {
    factors.set(2, (factors.get(2) || 0) + 1);
    remaining = remaining / 2;
  }

  // Проверяем нечётные делители от 3 до √n
  let divisor = 3;
  while (divisor * divisor <= remaining) {
    while (remaining % divisor === 0) {
      factors.set(divisor, (factors.get(divisor) || 0) + 1);
      remaining = remaining / divisor;
    }
    divisor += 2;
  }

  // Если осталось число > 1, это простой множитель
  if (remaining > 1) {
    factors.set(remaining, 1);
  }

  return factors;
}

/**
 * Получает все делители числа из его простых множителей
 * @param primeFactors - простые множители
 * @returns массив всех делителей в порядке возрастания
 */
export function getAllDivisors(primeFactors: Map<number, number>): number[] {
  if (primeFactors.size === 0) {
    return [1]; // Делители числа 1
  }

  const divisors: number[] = [1];
  
  for (const [prime, power] of primeFactors) {
    const currentLength = divisors.length;
    let primePower = 1;
    
    for (let p = 1; p <= power; p++) {
      primePower *= prime;
      for (let i = 0; i < currentLength; i++) {
        divisors.push(divisors[i] * primePower);
      }
    }
  }

  return divisors.sort((a, b) => a - b);
}

/**
 * Получает пары множителей числа
 * @param divisors - все делители числа
 * @param n - исходное число
 * @returns массив пар [a, b] где a × b = n и a ≤ b
 */
export function getFactorPairs(divisors: number[], n: number): [number, number][] {
  const pairs: [number, number][] = [];
  const sqrtN = Math.sqrt(n);

  for (const d of divisors) {
    if (d > sqrtN) break;
    pairs.push([d, n / d]);
  }

  return pairs;
}

/**
 * Форматирует простые множители в читаемую строку
 * Например: Map(2 → 2, 3 → 1) → "2² × 3"
 * @param factors - простые множители
 * @returns отформатированная строка
 */
export function formatPrimeFactors(factors: Map<number, number>): string {
  if (factors.size === 0) {
    return '1'; // Для числа 1
  }

  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };

  const toSuperscript = (num: number): string => {
    return String(num).split('').map(d => superscripts[d] || d).join('');
  };

  const parts: string[] = [];
  
  // Сортируем по основанию для консистентного вывода
  const sortedFactors = [...factors.entries()].sort((a, b) => a[0] - b[0]);
  
  for (const [prime, power] of sortedFactors) {
    if (power === 1) {
      parts.push(String(prime));
    } else {
      parts.push(`${prime}${toSuperscript(power)}`);
    }
  }

  return parts.join(' × ');
}

/**
 * Форматирует пары множителей в строку
 * @param pairs - пары множителей
 * @returns отформатированная строка
 */
export function formatFactorPairs(pairs: [number, number][]): string {
  return pairs.map(([a, b]) => `(${a}, ${b})`).join(', ');
}

/**
 * Форматирует список делителей
 * @param divisors - делители
 * @returns отформатированная строка
 */
export function formatDivisors(divisors: number[]): string {
  return divisors.join(', ');
}
