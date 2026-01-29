/**
 * Инструмент факторизации чисел
 * Плавающая панель с интерфейсом для разложения числа на множители
 */
import { FloatingPanel, FloatingPanelOptions } from './FloatingPanel.js';
import {
  factorize,
  formatPrimeFactors,
  formatFactorPairs,
  formatDivisors,
  FactorizationError,
  type FactorizationResult
} from '../../utils/factorization.js';

export class FactorizationTool extends FloatingPanel {
  private inputElement!: HTMLInputElement;
  private resultElement!: HTMLElement;
  private errorElement!: HTMLElement;

  constructor(options?: Partial<FloatingPanelOptions>) {
    super({
      title: '🔢 Факторизация числа',
      width: 380,
      ...options
    });
    
    this.initContent();
  }

  /**
   * Инициализирует содержимое панели
   */
  protected initContent(): void {
    const content = document.createElement('div');
    content.className = 'factorization-tool';
    content.innerHTML = `
      <div class="tool-input-group">
        <label for="factorizationInput">Число:</label>
        <div class="tool-input-row">
          <input 
            type="text" 
            id="factorizationInput" 
            placeholder="Например: 120"
            autocomplete="off"
            inputmode="numeric"
          >
          <button type="button" class="tool-calculate-btn">Разложить</button>
        </div>
      </div>
      <div class="tool-error"></div>
      <div class="tool-result"></div>
    `;

    this.setContent(content);

    // Сохраняем ссылки на элементы
    this.inputElement = this.contentElement.querySelector('#factorizationInput')!;
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
   * Выполняет факторизацию введённого числа
   */
  private calculate(): void {
    const input = this.inputElement.value.trim();
    
    // Очищаем предыдущие результаты
    this.errorElement.textContent = '';
    this.errorElement.classList.remove('visible');
    this.resultElement.innerHTML = '';

    if (!input) {
      this.showError('Введите число');
      return;
    }

    const num = Number(input);
    
    if (isNaN(num)) {
      this.showError('Некорректное число');
      return;
    }

    try {
      const result = factorize(num);
      this.showResult(result);
    } catch (error) {
      if (error instanceof FactorizationError) {
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
   * Показывает результат факторизации
   */
  private showResult(result: FactorizationResult): void {
    const primeStr = formatPrimeFactors(result.primeFactors);
    const pairsStr = formatFactorPairs(result.factorPairs);
    const divisorsStr = formatDivisors(result.allDivisors);

    this.resultElement.innerHTML = `
      <div class="result-section">
        <div class="result-label">Простые множители:</div>
        <div class="result-value result-prime">${result.original} = ${primeStr}</div>
      </div>
      <div class="result-section">
        <div class="result-label">Пары множителей:</div>
        <div class="result-value result-pairs">${pairsStr}</div>
      </div>
      <div class="result-section">
        <div class="result-label">Все делители (${result.allDivisors.length}):</div>
        <div class="result-value result-divisors">${divisorsStr}</div>
      </div>
    `;
  }
}
