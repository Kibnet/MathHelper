/**
 * Инструмент конвертации дробей
 * Плавающая панель для преобразования дробей в различные формы
 */
import { FloatingPanel, FloatingPanelOptions } from './FloatingPanel.js';
import {
  convertFraction,
  formatSimplifiedFraction,
  formatMixedNumber,
  formatDecimal,
  FractionError,
  type FractionResult
} from '../../utils/fractions.js';

export class FractionConverterTool extends FloatingPanel {
  private numeratorInput!: HTMLInputElement;
  private denominatorInput!: HTMLInputElement;
  private resultElement!: HTMLElement;
  private errorElement!: HTMLElement;

  constructor(options?: Partial<FloatingPanelOptions>) {
    super({
      title: '➗ Конвертер дробей',
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
    content.className = 'fraction-tool';
    content.innerHTML = `
      <div class="tool-input-group">
        <label>Дробь:</label>
        <div class="fraction-input-row">
          <input 
            type="text" 
            id="fractionNumerator" 
            placeholder="Числитель"
            autocomplete="off"
            inputmode="numeric"
            class="fraction-numerator"
          >
          <span class="fraction-divider">/</span>
          <input 
            type="text" 
            id="fractionDenominator" 
            placeholder="Знаменатель"
            autocomplete="off"
            inputmode="numeric"
            class="fraction-denominator"
          >
          <button type="button" class="tool-calculate-btn">Конвертировать</button>
        </div>
      </div>
      <div class="tool-error"></div>
      <div class="tool-result"></div>
    `;

    this.setContent(content);

    // Сохраняем ссылки на элементы
    this.numeratorInput = this.contentElement.querySelector('#fractionNumerator')!;
    this.denominatorInput = this.contentElement.querySelector('#fractionDenominator')!;
    this.resultElement = this.contentElement.querySelector('.tool-result')!;
    this.errorElement = this.contentElement.querySelector('.tool-error')!;

    // Обработчики
    const calculateBtn = this.contentElement.querySelector('.tool-calculate-btn')!;
    calculateBtn.addEventListener('click', () => this.calculate());
    
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.calculate();
      }
    };
    
    this.numeratorInput.addEventListener('keypress', handleEnter);
    this.denominatorInput.addEventListener('keypress', handleEnter);
  }

  /**
   * Выполняет конвертацию введённой дроби
   */
  private calculate(): void {
    const numStr = this.numeratorInput.value.trim();
    const denStr = this.denominatorInput.value.trim();
    
    // Очищаем предыдущие результаты
    this.errorElement.textContent = '';
    this.errorElement.classList.remove('visible');
    this.resultElement.innerHTML = '';

    if (!numStr || !denStr) {
      this.showError('Введите числитель и знаменатель');
      return;
    }

    const numerator = Number(numStr);
    const denominator = Number(denStr);
    
    if (isNaN(numerator) || isNaN(denominator)) {
      this.showError('Некорректные числа');
      return;
    }

    try {
      const result = convertFraction(numerator, denominator);
      this.showResult(result);
    } catch (error) {
      if (error instanceof FractionError) {
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
   * Показывает результат конвертации
   */
  private showResult(result: FractionResult): void {
    const decimalStr = formatDecimal(result.decimal, result.isRepeating);
    const simplifiedStr = formatSimplifiedFraction(result.simplified);
    
    let html = `
      <div class="result-section">
        <div class="result-label">Десятичная дробь:</div>
        <div class="result-value result-decimal">${decimalStr}</div>
      </div>
      <div class="result-section">
        <div class="result-label">Сокращённая дробь:</div>
        <div class="result-value result-simplified">${simplifiedStr}</div>
      </div>
    `;

    // Смешанное число (если применимо)
    if (result.mixed) {
      const mixedStr = formatMixedNumber(result.mixed);
      html += `
        <div class="result-section">
          <div class="result-label">Смешанное число:</div>
          <div class="result-value result-mixed">${mixedStr}</div>
        </div>
      `;
    }

    // Информация о периодичности
    if (result.isRepeating) {
      html += `
        <div class="result-note">
          ℹ️ Дробь является периодической
        </div>
      `;
    }

    this.resultElement.innerHTML = html;
  }
}
