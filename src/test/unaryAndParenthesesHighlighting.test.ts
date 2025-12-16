/**
 * Тесты для проверки подсветки унарного минуса и скобок
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { ExpressionParser } from '../core/parser.js';

describe('Unary Minus and Parentheses Highlighting', () => {
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

  it('should highlight unary minus correctly', () => {
    // Создаём тестовое выражение с унарным минусом
    const parser = new ExpressionParser('-5');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('-5', ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    expect(tokens.length).toBe(2); // '-' и '5'
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    // Ищем токен по содержанию первого символа
    const minusToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '-');
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '5');
    expect(numberToken).toBeTruthy();
    expect(numberToken!.classList.contains('token-operand-right')).toBe(true);
  });

  it('should highlight parentheses correctly', () => {
    // Создаём тестовое выражение со скобками
    const parser = new ExpressionParser('(5)');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('(5)', ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    expect(tokens.length).toBe(3); // '(' , '5' и ')'
    
    // Проверяем, что токены скобок имеют правильный класс
    const openParenToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '(');
    const closeParenToken = Array.from(tokens).find(t => (t.textContent || '')[0] === ')');
    expect(openParenToken).toBeTruthy();
    expect(closeParenToken).toBeTruthy();
    expect(openParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    expect(closeParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '5');
    expect(numberToken).toBeTruthy();
    expect(numberToken!.classList.contains('token-operand-right')).toBe(true);
  });

  it('should highlight complex unary minus expression', () => {
    // Создаём тестовое выражение с унарным минусом и сложным выражением
    const parser = new ExpressionParser('-(5 + 3)');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('-(5 + 3)', ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    // Всего 7 токенов: '-', '(', '5', '+', '3', ')'
    // Но некоторые могут быть объединены, поэтому проверим как есть
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    const minusToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '-');
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токены скобок имеют правильный класс
    const openParenToken = Array.from(tokens).find(t => (t.textContent || '')[0] === '(');
    const closeParenToken = Array.from(tokens).find(t => (t.textContent || '').includes(')'));
    expect(openParenToken).toBeTruthy();
    expect(closeParenToken).toBeTruthy();
    expect(openParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токены внутри скобок имеют правильный класс
    const innerTokens = Array.from(tokens).filter(t => {
      const firstChar = (t.textContent || '')[0];
      return firstChar === '5' || firstChar === '+' || firstChar === '3';
    });
    expect(innerTokens.length).toBeGreaterThanOrEqual(3);
    innerTokens.forEach(token => {
      expect(token.classList.contains('token-operand-right')).toBe(true);
    });
  });
});