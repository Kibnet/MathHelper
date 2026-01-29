/**
 * Утилиты для работы с дробями
 * Преобразование, сокращение, смешанные числа
 */

/** Сокращённая дробь */
export interface SimplifiedFraction {
  numerator: number;
  denominator: number;
}

/** Смешанное число (целая часть + правильная дробь) */
export interface MixedNumber {
  whole: number;
  numerator: number;
  denominator: number;
}

/** Полный результат конвертации дроби */
export interface FractionResult {
  /** Десятичное представление */
  decimal: number;
  /** Сокращённая дробь */
  simplified: SimplifiedFraction;
  /** Смешанное число (null если дробь правильная) */
  mixed: MixedNumber | null;
  /** Исходные значения */
  original: { numerator: number; denominator: number };
  /** Является ли дробь периодической */
  isRepeating: boolean;
}

/** Ошибка валидации дроби */
export class FractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FractionError';
  }
}

/**
 * Вычисляет наибольший общий делитель двух чисел (алгоритм Евклида)
 * @param a - первое число
 * @param b - второе число
 * @returns НОД(a, b)
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  
  return a;
}

/**
 * Сокращает дробь до несократимого вида
 * @param numerator - числитель
 * @param denominator - знаменатель
 * @returns сокращённая дробь
 */
export function simplifyFraction(numerator: number, denominator: number): SimplifiedFraction {
  const divisor = gcd(numerator, denominator);
  
  let num = numerator / divisor;
  let den = denominator / divisor;
  
  // Нормализуем знак: знаменатель всегда положительный
  if (den < 0) {
    num = -num;
    den = -den;
  }
  
  return { numerator: num, denominator: den };
}

/**
 * Преобразует неправильную дробь в смешанное число
 * @param numerator - числитель (сокращённой дроби)
 * @param denominator - знаменатель (сокращённой дроби)
 * @returns смешанное число или null если дробь правильная
 */
export function toMixedNumber(numerator: number, denominator: number): MixedNumber | null {
  const absNum = Math.abs(numerator);
  const absDen = Math.abs(denominator);
  
  // Если дробь правильная (|числитель| < |знаменатель|), не преобразуем
  if (absNum < absDen) {
    return null;
  }
  
  // Если делится нацело, тоже не нужно смешанное число
  if (absNum % absDen === 0) {
    return null;
  }
  
  const sign = numerator < 0 ? -1 : 1;
  const whole = sign * Math.floor(absNum / absDen);
  const remainder = absNum % absDen;
  
  return {
    whole,
    numerator: remainder,
    denominator: absDen
  };
}

/**
 * Проверяет, является ли дробь периодической
 * Дробь периодическая, если знаменатель содержит простые множители кроме 2 и 5
 * @param denominator - знаменатель сокращённой дроби
 * @returns true если дробь периодическая
 */
export function isRepeatingDecimal(denominator: number): boolean {
  let d = Math.abs(denominator);
  
  // Удаляем все множители 2 и 5
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  
  // Если осталось что-то кроме 1, дробь периодическая
  return d !== 1;
}

/**
 * Выполняет полное преобразование дроби
 * @param numerator - числитель
 * @param denominator - знаменатель
 * @returns результат преобразования
 * @throws FractionError при невалидном вводе
 */
export function convertFraction(numerator: number, denominator: number): FractionResult {
  // Валидация
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new FractionError('Числитель и знаменатель должны быть конечными числами');
  }
  
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new FractionError('Числитель и знаменатель должны быть целыми числами');
  }
  
  if (denominator === 0) {
    throw new FractionError('Деление на ноль невозможно');
  }

  const decimal = numerator / denominator;
  const simplified = simplifyFraction(numerator, denominator);
  const mixed = toMixedNumber(simplified.numerator, simplified.denominator);
  const repeating = isRepeatingDecimal(simplified.denominator);

  return {
    decimal,
    simplified,
    mixed,
    original: { numerator, denominator },
    isRepeating: repeating
  };
}

/**
 * Форматирует сокращённую дробь в строку
 * @param fraction - сокращённая дробь
 * @returns строка вида "a/b" или "a" если b = 1
 */
export function formatSimplifiedFraction(fraction: SimplifiedFraction): string {
  if (fraction.denominator === 1) {
    return String(fraction.numerator);
  }
  return `${fraction.numerator}/${fraction.denominator}`;
}

/**
 * Форматирует смешанное число в строку
 * @param mixed - смешанное число
 * @returns строка вида "w a/b"
 */
export function formatMixedNumber(mixed: MixedNumber): string {
  return `${mixed.whole} ${mixed.numerator}/${mixed.denominator}`;
}

/**
 * Форматирует десятичное число с указанием периодичности
 * @param decimal - десятичное значение
 * @param isRepeating - является ли периодической дробью
 * @param precision - точность отображения (по умолчанию 10 знаков)
 * @returns отформатированная строка
 */
export function formatDecimal(decimal: number, isRepeating: boolean, precision = 10): string {
  // Проверяем, является ли число целым
  if (Number.isInteger(decimal)) {
    return String(decimal);
  }
  
  // Округляем до precision знаков после запятой
  const formatted = decimal.toFixed(precision).replace(/\.?0+$/, '');
  
  if (isRepeating) {
    return `${formatted}...`;
  }
  
  return formatted;
}
