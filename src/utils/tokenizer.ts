/**
 * Модуль токенизатора
 * Разбивает выражение на лексемы с типами
 */

export type TokenType = 
  | 'number'      // Числовая константа
  | 'variable'    // Переменная
  | 'operator'    // Оператор (+, -, *, /)
  | 'paren'       // Скобки ( )
  | 'unary';      // Унарный минус

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  implicit?: boolean; // Флаг для неявного умножения
}

/**
 * Проверяет, является ли символ буквой любого алфавита
 */
function isLetter(char: string): boolean {
  return char !== '' && /\p{L}/u.test(char);
}

/**
 * Проверяет, является ли символ цифрой
 */
function isDigit(char: string): boolean {
  return char !== '' && /[0-9]/.test(char);
}

/**
 * Разбивает выражение на лексемы
 */
export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  
  // Удаляем пробелы
  expression = expression.replace(/\s+/g, '');
  
  while (pos < expression.length) {
    const char = expression[pos];
    
    // Числа
    if (isDigit(char)) {
      let num = '';
      const start = pos;
      while (pos < expression.length && (isDigit(expression[pos]) || expression[pos] === '.')) {
        num += expression[pos++];
      }
      tokens.push({
        type: 'number',
        value: num,
        start,
        end: pos
      });
      continue;
    }
    
    // Переменные (одна буква любого алфавита)
    if (isLetter(char)) {
      tokens.push({
        type: 'variable',
        value: char,
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }
    
    // Скобки
    if (char === '(' || char === ')') {
      tokens.push({
        type: 'paren',
        value: char,
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }
    
    // Операторы
    if (['+', '-', '*', '/'].includes(char)) {
      // Определяем, является ли минус унарным
      const isUnary = char === '-' && (
        tokens.length === 0 || 
        tokens[tokens.length - 1].type === 'operator' ||
        tokens[tokens.length - 1].type === 'unary' ||
        tokens[tokens.length - 1].value === '('
      );
      
      tokens.push({
        type: isUnary ? 'unary' : 'operator',
        value: char,
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }
    
    // Пропускаем неизвестные символы
    pos++;
  }
  
  return tokens;
}

/**
 * Вставляет неявное умножение между токенами
 * Например: abc -> a*b*c, 2x -> 2*x, (a+b)c -> (a+b)*c
 * ВАЖНО: Вставляемые операторы помечаются как 'implicit_mul' для отличия от явных
 */
export function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const result: Token[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    
    // Проверяем, нужно ли вставить * перед следующим токеном
    if (i < tokens.length - 1) {
      const current = tokens[i];
      const next = tokens[i + 1];
      
      // Добавляем * в следующих случаях:
      // 1. Число/переменная перед переменной: 2x, ab
      // 2. Число/переменная перед открывающей скобкой: 2(x+1), a(b+c)
      // 3. Закрывающая скобка перед числом/переменной/открывающей скобкой: (a+b)c, (x)2, (a)(b)
      
      const needsMultiplication = (
        // Число перед переменной или (
        (current.type === 'number' && (next.type === 'variable' || next.value === '(')) ||
        // Переменная перед переменной или (
        (current.type === 'variable' && (next.type === 'variable' || next.value === '(')) ||
        // ) перед числом, переменной или (
        (current.value === ')' && (next.type === 'number' || next.type === 'variable' || next.value === '('))
      );
      
      if (needsMultiplication) {
        result.push({
          type: 'operator',
          value: '*',
          start: current.end,
          end: current.end,
          // @ts-ignore - добавляем флаг для обозначения неявного умножения
          implicit: true
        });
      }
    }
  }
  
  return result;
}

/**
 * Получает русское название типа лексемы
 */
export function getTokenTypeName(type: TokenType): string {
  const names: Record<TokenType, string> = {
    'number': 'Число',
    'variable': 'Переменная',
    'operator': 'Оператор',
    'paren': 'Скобка',
    'unary': 'Унарный минус'
  };
  return names[type];
}

/**
 * Получает цвет для типа лексемы
 */
export function getTokenColor(type: TokenType): string {
  const colors: Record<TokenType, string> = {
    'number': '#3aff37',      // для чисел
    'variable': '#e37933',    // для переменных
    'operator': '#ffff40',    // для операторов
    'paren': '#60f0ff',       // для скобок
    'unary': '#ff4000'        // для унарного минуса
  };
  return colors[type];
}
