/**
 * Тесты для компонента отображения выражений
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { ExpressionParser } from '../core/parser.js';

describe('ExpressionDisplay', () => {
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

  it('should create frame labels with correct positioning for implicit multiplication', () => {
    // Создаём тестовое выражение с неявным умножением
    const parser = new ExpressionParser('2x');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('2x', ast);
    
    // Проверяем, что контейнер создан
    const textContainer = document.querySelector('.expression-text');
    expect(textContainer).toBeTruthy();
    
    // Проверяем, что созданы фреймы
    const frames = document.querySelectorAll('.expression-range');
    expect(frames.length).toBeGreaterThan(0);
    
    // Проверяем, что есть фрейм для неявного умножения
    let implicitMulFrame: HTMLElement | null = null;
    frames.forEach((frame: Element) => {
      const label = frame.querySelector('.frame-label');
      if (label && label.textContent === '×') {
        implicitMulFrame = frame as HTMLElement;
      }
    });
    
    // Должен быть найден фрейм с меткой '×'
    expect(implicitMulFrame).toBeTruthy();
    
    // Проверяем, что у метки есть позиционирование
    const label = implicitMulFrame!.querySelector('.frame-label') as HTMLElement;
    expect(label).toBeTruthy();
    
    // Проверяем, что позиция установлена
    expect(label.classList.contains('frame-label')).toBe(true);
    expect(label.style.left).not.toBe('');
  });

  it('should position frame labels correctly for different node types', () => {
    // Тест для различных типов узлов
    const testCases = [
      { expr: '2 + 3', expectedLabels: ['+', '2', '3'] },
      { expr: '2 * 3', expectedLabels: ['*', '2', '3'] },
      { expr: '2x', expectedLabels: ['×', '2', 'x'] },
      { expr: '(2)', expectedLabels: ['(', ')', '2'] }
    ];
    
    for (const testCase of testCases) {
      const parser = new ExpressionParser(testCase.expr);
      const ast = parser.parse();
      
      const display = new ExpressionDisplay('test-container');
      display.render(testCase.expr, ast);
      
      // Проверяем, что созданы фреймы с ожидаемыми метками
      const frames = document.querySelectorAll('.expression-range');
      const labels = Array.from(frames).flatMap((frame: Element) =>
        Array.from(frame.querySelectorAll('.frame-label'))
          .map(label => label.textContent)
          .filter(Boolean)
      );
      
      // Проверяем, что все ожидаемые метки присутствуют
      for (const expectedLabel of testCase.expectedLabels) {
        expect(labels).toContain(expectedLabel);
      }
      
      // Очищаем контейнер для следующей итерации
      container.innerHTML = '';
    }
  });
});
