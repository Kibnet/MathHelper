/**
 * Tokenizer Module
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
}

/**
 * Разбивает выражение на лексемы
 */
export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const original = expression;
  
  // Удаляем пробелы для позиционирования
  expression = expression.replace(/\s+/g, '');
  
  while (pos < expression.length) {
    const char = expression[pos];
    
    // Числа
    if (/[0-9]/.test(char)) {
      let num = '';
      const start = pos;
      while (pos < expression.length && /[0-9.]/.test(expression[pos])) {
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
    
    // Переменные
    if (/[a-zA-Z]/.test(char)) {
      let name = '';
      const start = pos;
      while (pos < expression.length && /[a-zA-Z]/.test(expression[pos])) {
        name += expression[pos++];
      }
      tokens.push({
        type: 'variable',
        value: name,
        start,
        end: pos
      });
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
