/**
 * Компонент панели истории преобразований
 */
import type { EquationNode, HistoryState, MathStepsNode } from '../../types/index.js';

export interface HistoryPanelConfig {
  onHistoryClick?: (index: number) => void;
}

export class HistoryPanel {
  private container: HTMLElement;
  private config: HistoryPanelConfig;
  private states: HistoryState[] = [];
  private currentIndex: number = -1;

  constructor(containerId: string, config: HistoryPanelConfig = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id "${containerId}" not found`);
    }
    this.container = element;
    this.config = config;
  }

  /**
   * Добавляет новое состояние в историю
   */
  addState(expression: string, ruleName: string, node: MathStepsNode | EquationNode, assumptions: string[] = []): void {
    // Обрезаем историю, если мы не в конце
    if (this.currentIndex < this.states.length - 1) {
      this.states = this.states.slice(0, this.currentIndex + 1);
    }
    
    this.states.push({
      expression,
      ruleName,
      node,
      assumptions: assumptions.length > 0 ? assumptions : undefined,
      timestamp: Date.now()
    });
    
    this.currentIndex = this.states.length - 1;
    this.render();
  }

  /**
   * Получает состояние по индексу
   */
  getState(index: number): HistoryState | null {
    if (index < 0 || index >= this.states.length) return null;
    return this.states[index];
  }

  /**
   * Получает текущее состояние
   */
  getCurrentState(): HistoryState | null {
    return this.getState(this.currentIndex);
  }

  /**
   * Устанавливает текущий индекс
   */
  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.states.length) {
      this.currentIndex = index;
      this.render();
    }
  }

  /**
   * Очищает историю
   */
  clear(): void {
    this.states = [];
    this.currentIndex = -1;
    this.showPlaceholder();
  }

  /**
   * Отображает историю
   */
  private render(): void {
    if (this.states.length === 0) {
      this.showPlaceholder();
      return;
    }
    
    this.container.innerHTML = '';
    
    this.states.forEach((state, index) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      if (index === this.currentIndex) {
        item.classList.add('active');
      }
      
      const expr = document.createElement('div');
      expr.className = 'history-expression';
      expr.textContent = state.expression;
      
      const rule = document.createElement('div');
      rule.className = 'history-rule';
      rule.textContent = `${index === 0 ? '🎯' : '→'} ${state.ruleName}`;

      item.appendChild(expr);
      item.appendChild(rule);

      if (state.assumptions && state.assumptions.length > 0) {
        const assumptions = document.createElement('div');
        assumptions.className = 'history-assumptions';
        assumptions.textContent = `Допущения: ${state.assumptions.join(', ')}`;
        item.appendChild(assumptions);
      }
      
      item.addEventListener('click', () => {
        if (this.config.onHistoryClick) {
          this.config.onHistoryClick(index);
        }
      });
      
      this.container.appendChild(item);
    });
  }

  /**
   * Показывает placeholder
   */
  private showPlaceholder(): void {
    this.container.innerHTML = '<p class="placeholder">История преобразований появится здесь</p>';
  }
}
