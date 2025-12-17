/**
 * Тесты для проверки подсветки n-арных операций сложения и умножения
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { ExpressionParser } from '../core/parser.js';

describe('N-ary Operations Highlighting', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Создаём контейнер для тестирования
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Очищаем DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should highlight all operators in n-ary addition', () => {
    // Создаём тестовое выражение с n-арным сложением
    const parser = new ExpressionParser('a + b + c');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('a + b + c', ast);
    
    // Вручную вызываем highlightTokens для n-арного сложения
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токены операторов имеют правильный класс
    // Ищем токены, содержащие "+"
    const operatorTokens = tokenArray.filter(t => (t.textContent || '').includes('+'));
    expect(operatorTokens.length).toBe(2); // Два оператора +
    
    operatorTokens.forEach(token => {
      expect(token.classList.contains('token-operator-highlight')).toBe(true);
    });
    
    // Проверяем, что токены операндов имеют правильные классы (чередующиеся)
    const operandAToken = tokenArray.find(t => (t.textContent || '').includes('a'));
    const operandBToken = tokenArray.find(t => (t.textContent || '').includes('b'));
    const operandCToken = tokenArray.find(t => (t.textContent || '').includes('c'));
    
    expect(operandAToken).toBeTruthy();
    expect(operandBToken).toBeTruthy();
    expect(operandCToken).toBeTruthy();
    
    // Первый операнд (a) должен иметь класс token-operand-left
    expect(operandAToken!.classList.contains('token-operand-left')).toBe(true);
    
    // Второй операнд (b) должен иметь класс token-operand-right
    expect(operandBToken!.classList.contains('token-operand-right')).toBe(true);
    
    // Третий операнд (c) должен иметь класс token-operand-left (чередование)
    expect(operandCToken!.classList.contains('token-operand-left')).toBe(true);
  });

  it('should highlight all operators in n-ary multiplication', () => {
    // Создаём тестовое выражение с n-арным умножением
    const parser = new ExpressionParser('x * y * z');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('x * y * z', ast);
    
    // Вручную вызываем highlightTokens для n-арного умножения
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токены операторов имеют правильный класс
    // Ищем токены, содержащие "*"
    const operatorTokens = tokenArray.filter(t => (t.textContent || '').includes('*'));
    expect(operatorTokens.length).toBe(2); // Два оператора *
    
    operatorTokens.forEach(token => {
      expect(token.classList.contains('token-operator-highlight')).toBe(true);
    });
    
    // Проверяем, что токены операндов имеют правильные классы (чередующиеся)
    const operandXToken = tokenArray.find(t => (t.textContent || '').includes('x'));
    const operandYToken = tokenArray.find(t => (t.textContent || '').includes('y'));
    const operandZToken = tokenArray.find(t => (t.textContent || '').includes('z'));
    
    expect(operandXToken).toBeTruthy();
    expect(operandYToken).toBeTruthy();
    expect(operandZToken).toBeTruthy();
    
    // Первый операнд (x) должен иметь класс token-operand-left
    expect(operandXToken!.classList.contains('token-operand-left')).toBe(true);
    
    // Второй операнд (y) должен иметь класс token-operand-right
    expect(operandYToken!.classList.contains('token-operand-right')).toBe(true);
    
    // Третий операнд (z) должен иметь класс token-operand-left (чередование)
    expect(operandZToken!.classList.contains('token-operand-left')).toBe(true);
  });

  it('should show correct labels for n-ary operations', () => {
    // Создаём тестовое выражение с n-арным сложением
    const parser = new ExpressionParser('a + b + c + d');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Получаем метку для узла
    const label = display['getNodeLabel'](ast);
    
    // Для n-арного сложения с 4 операндами должно быть 3 знака +
    expect(label).toBe('+++');
  });

  it('should show correct labels for n-ary multiplication', () => {
    // Создаём тестовое выражение с n-арным умножением
    const parser = new ExpressionParser('x * y * z * w');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Получаем метку для узла
    const label = display['getNodeLabel'](ast);
    
    // Для n-арного умножения с 4 операндами должно быть 3 знака *
    expect(label).toBe('***');
  });
});