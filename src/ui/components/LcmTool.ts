/**
 * Инструмент вычисления НОК (наименьшего общего кратного)
 * Плавающая панель с интерфейсом для нахождения НОК и множителей
 */
import { FloatingPanel, FloatingPanelOptions } from './FloatingPanel.js';
import {
  calculateLcm,
  formatLcmResult,
  LcmError,
  type LcmResult
} from '../../utils/lcm.js';

export class LcmTool extends FloatingPanel {
  private inputElement!: HTMLInputElement;
  private resultElement!: HTMLElement;
  private errorElement!: HTMLElement;

  constructor(options?: Partial<FloatingPanelOptions>) {
    super({
      title: '🔗 НОК (общее кратное)',
      width: 400,
      ...options
    });
    
    this.initContent();
  }

  /**
   * Инициализирует содержимое панели
   */
  protected initContent(): void {
    const content = document.createElement('div');
    content.className = 'lcm-tool';
    content.innerHTML = `
      <div class="tool-input-group">
        <label for="lcmInput">Числа (через запятую или пробел):</label>
        <div class="tool-input-row">
          <input 
            type="text" 
            id="lcmInput" 
            placeholder="Например: 12, 8 или 4 6 8"
            autocomplete="off"
          >
          <button type="button" class="tool-calculate-btn">Вычислить</button>
        </div>
        <div class="tool-hint">Введите минимум 2 положительных целых числа</div>
      </div>
      <div class="tool-error"></div>
      <div class="tool-result"></div>
    `;

    this.setContent(content);

    // Сохраняем ссылки на элементы
    this.inputElement = this.contentElement.querySelector('#lcmInput')!;
    this.resultElement = this.contentElement.querySelector('.tool-result')!;
    this.errorElement = this.contentElement.querySelector('.tool-error')!;

    // Обработчики
    const calculateBtn = this.contentElement.querySelector('.tool-calculate-btn')!;
    calculateBtn.addEventListener('click', () => this.calculate());
    
    this.inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.calculate();
      }
    });
  }

  /**
   * Парсит ввод пользователя в массив чисел
   */
  private parseInput(input: string): number[] {
    // Разбиваем по запятым, пробелам, точкам с запятой
    const parts = input.split(/[\s,;]+/).filter(s => s.trim() !== '');
    return parts.map(s => Number(s.trim()));
  }

  /**
   * Выполняет вычисление НОК
   */
  private calculate(): void {
    const input = this.inputElement.value.trim();
    
    // Очищаем предыдущие результаты
    this.errorElement.textContent = '';
    this.errorElement.classList.remove('visible');
    this.resultElement.innerHTML = '';

    if (!input) {
      this.showError('Введите числа');
      return;
    }

    const numbers = this.parseInput(input);
    
    if (numbers.some(n => isNaN(n))) {
      this.showError('Некорректный ввод. Используйте только числа.');
      return;
    }

    try {
      const result = calculateLcm(numbers);
      this.showResult(result);
    } catch (error) {
      if (error instanceof LcmError) {
        this.showError(error.message);
      } else {
        this.showError('Произошла ошибка');
      }
    }
  }

  /**
   * Показывает ошибку
   */
  private showError(message: string): void {
    this.errorElement.textContent = message;
    this.errorElement.classList.add('visible');
  }

  /**
   * Показывает результат вычисления
   */
  private showResult(result: LcmResult): void {
    const lcmStr = formatLcmResult(result);
    
    // Формируем строки множителей
    const multipliersHtml = result.numbers
      .map((n, i) => `<div class="multiplier-row">${n} × <span class="multiplier-value">${result.multipliers[i]}</span> = ${result.lcm}</div>`)
      .join('');

    this.resultElement.innerHTML = `
      <div class="result-section result-lcm-main">
        <div class="result-label">НАИМЕНЬШЕЕ ОБЩЕЕ КРАТНОЕ:</div>
        <div class="result-value result-lcm">${lcmStr}</div>
      </div>
      <div class="result-section">
        <div class="result-label">МНОЖИТЕЛИ ДЛЯ ПРИВЕДЕНИЯ К НОК:</div>
        <div class="result-value result-multipliers">${multipliersHtml}</div>
      </div>
      <div class="result-section">
        <div class="result-label">НОД (для справки):</div>
        <div class="result-value result-gcd">НОД(${result.numbers.join(', ')}) = ${result.gcd}</div>
      </div>
    `;
  }
}
