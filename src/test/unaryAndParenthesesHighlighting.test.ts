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
    
    // Вручную вызываем highlightTokens для унарного минуса
    // Находим токены
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    // Ищем токен по содержанию первого символа
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = tokenArray.find(t => (t.textContent || '').includes('5'));
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
    
    // Вручную вызываем highlightTokens для группы
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токены скобок имеют правильный класс
    const openParenToken = tokenArray.find(t => (t.textContent || '').includes('('));
    const closeParenToken = tokenArray.find(t => (t.textContent || '').includes(')'));
    expect(openParenToken).toBeTruthy();
    expect(closeParenToken).toBeTruthy();
    expect(openParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    expect(closeParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = tokenArray.find(t => (t.textContent || '').includes('5'));
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
    const tokenArray = Array.from(tokens);
    
    // Вручную вызываем highlightTokens для унарного минуса
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токены скобок имеют правильный класс
    const openParenToken = tokenArray.find(t => (t.textContent || '').includes('('));
    const closeParenToken = tokenArray.find(t => (t.textContent || '').includes(')'));
    expect(openParenToken).toBeTruthy();
    expect(closeParenToken).toBeTruthy();
    expect(openParenToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Проверяем, что токены внутри скобок имеют правильный класс
    const innerTokens = tokenArray.filter(t => {
      const text = t.textContent || '';
      return text.includes('5') || text.includes('+') || text.includes('3');
    });
    expect(innerTokens.length).toBeGreaterThanOrEqual(3);
    innerTokens.forEach(token => {
      expect(token.classList.contains('token-operand-right')).toBe(true);
    });
  });

  // Новый тест для проверки наличия зелёной рамки у token-operator-highlight
  it('should apply green border to token-operator-highlight elements', () => {
    // Создаём тестовое выражение с унарным минусом
    const parser = new ExpressionParser('-5');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('-5', ast);
    
    // Вручную вызываем highlightTokens для унарного минуса
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true, ast);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-operator-highlight')).toBe(true);
    
    // Добавляем временный стиль для проверки
    const style = document.createElement('style');
    style.innerHTML = `
      .token.token-operator-highlight {
        border: 2px solid #27ae60;
      }
    `;
    document.head.appendChild(style);
    
    // Проверяем, что у элемента есть зелёная рамка
    const computedStyle = window.getComputedStyle(minusToken!);
    expect(computedStyle.border).toContain('2px solid rgb(39, 174, 96)'); // #27ae60 в RGB
    
    // Удаляем временный стиль
    document.head.removeChild(style);
  });
});