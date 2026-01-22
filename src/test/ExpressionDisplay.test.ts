/**
 * Тесты для компонента отображения выражений
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { MathStepsEngine } from '../core/mathsteps-engine.js';

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
    const engine = new MathStepsEngine();
    const ast = engine.parse('2x');
    const exprString = engine.stringify(ast);
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render(exprString, ast);
    
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
      if (label && label.textContent === '·') {
        implicitMulFrame = frame as HTMLElement;
      }
    });
    
    // Должен быть найден фрейм с меткой '·'
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
      { expr: '2 + 3', expectedLabels: ['+'] },
      { expr: '2 * 3', expectedLabels: ['·'] },
      { expr: '2x', expectedLabels: ['·'] },
      { expr: '(2)', expectedLabels: ['(', ')'] }
    ];
    
    for (const testCase of testCases) {
      const engine = new MathStepsEngine();
      const ast = engine.parse(testCase.expr);
      const exprString = engine.stringify(ast);
      
      const display = new ExpressionDisplay('test-container');
      display.render(exprString, ast);
      
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

  describe('selectFrameByPath', () => {
    it('возвращает selection для существующего пути', () => {
      const engine = new MathStepsEngine();
      const ast = engine.parse('2 + 3');
      const exprString = engine.stringify(ast);
      
      const display = new ExpressionDisplay('test-container');
      display.render(exprString, ast);
      
      // Выбираем корневой узел (пустой путь)
      const selection = display.selectFrameByPath([]);
      
      expect(selection).not.toBeNull();
      expect(selection!.path).toEqual([]);
      expect(selection!.text).toBeTruthy();
      
      // Проверяем, что фрейм получил класс active
      const activeFrame = document.querySelector('.expression-range.active');
      expect(activeFrame).toBeTruthy();
    });

    it('возвращает selection для вложенного пути', () => {
      const engine = new MathStepsEngine();
      const ast = engine.parse('2 + 3');
      const exprString = engine.stringify(ast);
      
      const display = new ExpressionDisplay('test-container');
      display.render(exprString, ast);
      
      // Выбираем первый аргумент (2)
      const selection = display.selectFrameByPath(['args', 0]);
      
      expect(selection).not.toBeNull();
      expect(selection!.path).toEqual(['args', 0]);
    });

    it('возвращает null для несуществующего пути', () => {
      const engine = new MathStepsEngine();
      const ast = engine.parse('2 + 3');
      const exprString = engine.stringify(ast);
      
      const display = new ExpressionDisplay('test-container');
      display.render(exprString, ast);
      
      // Пытаемся выбрать несуществующий путь
      const selection = display.selectFrameByPath(['args', 99]);
      
      expect(selection).toBeNull();
    });

    it('снимает active с предыдущего фрейма при выборе нового', () => {
      const engine = new MathStepsEngine();
      const ast = engine.parse('2 + 3');
      const exprString = engine.stringify(ast);
      
      const display = new ExpressionDisplay('test-container');
      display.render(exprString, ast);
      
      // Выбираем первый фрейм
      display.selectFrameByPath([]);
      const firstActive = document.querySelectorAll('.expression-range.active');
      expect(firstActive.length).toBe(1);
      
      // Выбираем другой фрейм
      display.selectFrameByPath(['args', 0]);
      const secondActive = document.querySelectorAll('.expression-range.active');
      expect(secondActive.length).toBe(1);
      
      // Проверяем что это разные фреймы
      const activeFrame = document.querySelector('.expression-range.active') as HTMLElement;
      expect(activeFrame.dataset.pathKey).toBe('args.0');
    });
  });
});
