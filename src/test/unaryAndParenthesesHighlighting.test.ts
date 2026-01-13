/**
 * Тесты для проверки подсветки унарного минуса и скобок
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { MathStepsEngine } from '../core/mathsteps-engine.js';

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
    const engine = new MathStepsEngine();
    const ast = engine.parse('-5');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    expect(tokens.length).toBe(2); // '-' и '5'
    
    // Вручную вызываем highlightTokens для унарного минуса
    // Находим токены
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    // Ищем токен по содержанию первого символа
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-hover')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = tokenArray.find(t => (t.textContent || '').includes('5'));
    expect(numberToken).toBeTruthy();
    expect(numberToken!.classList.contains('token-hover')).toBe(true);
  });

  it('should highlight parentheses correctly', () => {
    // Создаём тестовое выражение со скобками
    const engine = new MathStepsEngine();
    const ast = engine.parse('(5)');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    expect(tokens.length).toBe(3); // '(' , '5' и ')'
    
    // Вручную вызываем highlightTokens для группы
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токены скобок имеют правильный класс
    const openParenToken = tokenArray.find(t => (t.textContent || '').includes('('));
    const closeParenToken = tokenArray.find(t => (t.textContent || '').includes(')'));
    expect(openParenToken).toBeTruthy();
    expect(closeParenToken).toBeTruthy();
    expect(openParenToken!.classList.contains('token-hover')).toBe(true);
    expect(closeParenToken!.classList.contains('token-hover')).toBe(true);
    
    // Проверяем, что токен числа имеет правильный класс
    const numberToken = tokenArray.find(t => (t.textContent || '').includes('5'));
    expect(numberToken).toBeTruthy();
    expect(numberToken!.classList.contains('token-hover')).toBe(true);
  });

  it('should highlight complex unary minus expression', () => {
    // Создаём тестовое выражение с унарным минусом и сложным выражением
    const engine = new MathStepsEngine();
    const ast = engine.parse('-(5 + 3)');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы токены
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    
    // Вручную вызываем highlightTokens для унарного минуса
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-hover')).toBe(true);
    
    // Проверяем, что токены внутри скобок имеют правильный класс
    // Для групп (скобок) внутренние токены подсвечиваются как операнды
    const innerTokens = tokenArray.filter(t => {
      const text = t.textContent || '';
      return text.includes('5') || text.includes('+') || text.includes('3');
    });
    expect(innerTokens.length).toBeGreaterThanOrEqual(3);
    innerTokens.forEach(token => {
      expect(token.classList.contains('token-hover')).toBe(true);
    });
  });

  // Проверка, что токен подсвечивается через token-hover
  it('should apply hover class to highlighted tokens', () => {
    // Создаём тестовое выражение с унарным минусом
    const engine = new MathStepsEngine();
    const ast = engine.parse('-5');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Вручную вызываем highlightTokens для унарного минуса
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токен унарного минуса имеет правильный класс
    const minusToken = tokenArray.find(t => (t.textContent || '').includes('-'));
    expect(minusToken).toBeTruthy();
    expect(minusToken!.classList.contains('token-hover')).toBe(true);
    
    // Проверяем, что класс token-hover используется при подсветке
  });
});
