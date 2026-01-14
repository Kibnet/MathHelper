/**
 * Компонент панели описания правил
 */

import type { MathStepsOperation } from '../../types/index.js';

export class DescriptionPanel {
  private container: HTMLElement;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id "${containerId}" not found`);
    }
    this.container = element;
  }

  /**
   * Показывает описание правила
   */
  showRule(rule: MathStepsOperation): void {
    const assumptions = rule.assumptions && rule.assumptions.length > 0
      ? `<p><strong>Предположения:</strong> ${rule.assumptions.join(', ')}</p>`
      : '';

    this.container.innerHTML = `
      <p><strong>Правило:</strong> ${rule.name}</p>
      <p><strong>Категория:</strong> ${rule.category}</p>
      <p><strong>Предпросмотр:</strong> <code>${rule.preview}</code></p>
      <p><strong>Описание:</strong> ${rule.description}</p>
      ${assumptions}
    `;
  }

  /**
   * Показывает placeholder
   */
  showPlaceholder(): void {
    this.container.innerHTML = '<p class="placeholder">Выберите преобразование для просмотра описания</p>';
  }

  /**
   * Очищает панель
   */
  clear(): void {
    this.showPlaceholder();
  }
}
