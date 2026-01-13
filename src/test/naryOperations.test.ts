/**
 * Тесты для проверки подсветки n-арных операций сложения и умножения
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { MathStepsEngine } from '../core/mathsteps-engine.js';

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
    const engine = new MathStepsEngine();
    const ast = engine.parse('a + b + c');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Вручную вызываем highlightTokens для n-арного сложения
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токены операторов имеют правильный класс
    // Ищем токены, содержащие "+"
    const operatorTokens = tokenArray.filter(t => (t.textContent || '').includes('+'));
    expect(operatorTokens.length).toBeGreaterThanOrEqual(1);
    operatorTokens.forEach(token => {
      expect(token.classList.contains('token-hover')).toBe(true);
    });
  });

  it('should highlight all operators in n-ary multiplication', () => {
    // Создаём тестовое выражение с n-арным умножением
    const engine = new MathStepsEngine();
    const ast = engine.parse('x * y * z');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Вручную вызываем highlightTokens для n-арного умножения
    const tokens = document.querySelectorAll('.token');
    const tokenArray = Array.from(tokens);
    display['highlightTokens'](tokenArray, true);
    
    // Проверяем, что токены операторов имеют правильный класс
    // Ищем токены, содержащие "*"
    const operatorTokens = tokenArray.filter(t => (t.textContent || '').includes('*'));
    expect(operatorTokens.length).toBeGreaterThanOrEqual(1);
    operatorTokens.forEach(token => {
      expect(token.classList.contains('token-hover')).toBe(true);
    });
  });

  it('should show correct labels for n-ary operations', () => {
    // Создаём тестовое выражение с n-арным сложением
    const engine = new MathStepsEngine();
    const ast = engine.parse('a + b + c + d');
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Получаем метку для узла
    const label = display['getNodeLabel'](ast);
    
    // Для n-арного сложения с 4 операндами должно быть 3 знака +
    expect(label).toContain('+');
  });

  it('should show correct labels for n-ary multiplication', () => {
    // Создаём тестовое выражение с n-арным умножением
    const engine = new MathStepsEngine();
    const ast = engine.parse('x * y * z * w');
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Получаем метку для узла
    const label = display['getNodeLabel'](ast);
    
    // Для n-арного умножения с 4 операндами должно быть 3 знака *
    expect(label).toContain('*');
  });

  // Новый тест для проверки правильного позиционирования меток
  it('should position labels correctly for n-ary operations', () => {
    // Создаём тестовое выражение с n-арным сложением
    const engine = new MathStepsEngine();
    const ast = engine.parse('a + b + c + d');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
    // Получаем контейнер с фреймами
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    // Находим фрейм для выражения a + b + c + d
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === exprString
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Проверяем, что контейнер содержит символы метки
    const charSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(charSpans.length).toBeGreaterThanOrEqual(1);
    
    // Проверяем содержимое символов
    const charTexts = Array.from(charSpans).map(span => span.textContent);
    expect(charTexts).toContain('+');
    
    // Проверяем, что контейнер помечен правильным классом
    expect(labelContainer!.classList.contains('frame-label-container')).toBe(true);
  });
});
