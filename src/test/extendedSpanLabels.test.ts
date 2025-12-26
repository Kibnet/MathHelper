/**
 * Расширенные тесты для проверки создания отдельных span элементов для меток
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressionDisplay } from '../ui/components/ExpressionDisplay.js';
import { ExpressionParser } from '../core/parser.js';

describe('Extended Span Labels', () => {
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

  it('should create separate spans for n-ary addition operators', () => {
    // Создаём тестовое выражение с n-арным сложением
    const parser = new ExpressionParser('a + b + c + d');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('a + b + c + d', ast);
    
    // Находим фрейм для выражения a + b + c + d
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === 'a + b + c + d'
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Проверяем, что контейнер содержит символы метки
    const charSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(charSpans.length).toBe(3); // Три знака + для четырех операндов
    
    // Проверяем содержимое символов
    const charTexts = Array.from(charSpans).map(span => span.textContent);
    expect(charTexts).toEqual(['+', '+', '+']);
  });

  it('should create separate spans for implicit multiplication', () => {
    // Создаём тестовое выражение с неявным умножением
    const parser = new ExpressionParser('2x');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('2x', ast);
    
    // Находим фрейм для выражения 2x
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    // Находим фрейм для неявного умножения по тексту
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === '2x'
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Для бинарного неявного умножения должна быть одна обычная метка
    const labelSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(labelSpans.length).toBe(1);
    expect(labelSpans[0].textContent).toBe('×');
  });

  it('should create separate spans for n-ary implicit multiplication', () => {
    // Создаём тестовое выражение с n-арным неявным умножением
    const parser = new ExpressionParser('2xy');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('2xy', ast);
    
    // Находим фрейм для выражения 2xy
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    // Находим фрейм для неявного умножения
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === '2xy'
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Для n-арного неявного умножения должны быть отдельные символы
    const charSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(charSpans.length).toBe(2); // Два знака × для трех операндов
    
    // Проверяем содержимое символов
    const charTexts = Array.from(charSpans).map(span => span.textContent);
    expect(charTexts).toEqual(['×', '×']);
  });

  it('should create separate spans for group brackets', () => {
    // Создаём тестовое выражение с группой
    const parser = new ExpressionParser('(a + b)');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('(a + b)', ast);
    
    // Находим фрейм для выражения (a + b)
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === '(a + b)'
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Проверяем, что контейнер содержит символы метки
    const charSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(charSpans.length).toBe(2); // Две скобки
    
    // Проверяем содержимое символов
    const charTexts = Array.from(charSpans).map(span => span.textContent);
    expect(charTexts).toEqual(['(', ')']);
  });

  it('should use regular label for binary operations', () => {
    // Создаём тестовое выражение с бинарным сложением
    const parser = new ExpressionParser('a + b');
    const ast = parser.parse();
    
    // Создаём компонент отображения
    const display = new ExpressionDisplay('test-container');
    
    // Рендерим выражение
    display.render('a + b', ast);
    
    // Находим фрейм для выражения a + b
    const rangesContainer = document.querySelector('.expression-ranges');
    expect(rangesContainer).toBeTruthy();
    
    const frame = Array.from(rangesContainer!.children).find(el => 
      el instanceof HTMLElement && el.dataset.text === 'a + b'
    ) as HTMLElement;
    
    expect(frame).toBeTruthy();
    
    // Проверяем, что у фрейма есть контейнер для меток
    const labelContainer = frame.querySelector('.frame-label-container');
    expect(labelContainer).toBeTruthy();
    
    // Для бинарных операций должна быть одна обычная метка
    const labelSpans = labelContainer!.querySelectorAll('.frame-label');
    expect(labelSpans.length).toBe(1);
    expect(labelSpans[0].textContent).toBe('+');
  });
});
