/**
 * Компонент отображения выражения с токенизацией и фреймами подвыражений
 */
import { tokenize, getTokenTypeName, getTokenColor } from '../../utils/tokenizer.js';
import { findAllSubexpressions, assignLevels, calculateFramePositions, calculateTotalHeight } from '../../core/analyzer.js';
import { getApplicableRules } from '../../core/rules.js';
import type { ASTNode } from '../../types/index.js';

export interface ExpressionDisplayConfig {
  onFrameClick?: (node: ASTNode, text: string, rules: any[]) => void;
}

export class ExpressionDisplay {
  private container: HTMLElement;
  private config: ExpressionDisplayConfig;

  constructor(containerId: string, config: ExpressionDisplayConfig = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id "${containerId}" not found`);
    }
    this.container = element;
    this.config = config;
  }

  /**
   * Отображает выражение с подсветкой токенов и фреймами
   */
  render(exprString: string): void {
    this.container.innerHTML = '';
    
    // Создаём текстовый элемент
    const textDiv = document.createElement('div');
    textDiv.className = 'expression-text';
    textDiv.id = 'expressionText';
    
    // Токенизация выражения
    const tokens = tokenize(exprString);
    
    // Создаём HTML с токенами
    tokens.forEach(token => {
      const tokenSpan = document.createElement('span');
      tokenSpan.className = 'token';
      tokenSpan.textContent = token.value;
      tokenSpan.style.color = getTokenColor(token.type);
      
      // Добавляем tooltip с названием типа лексемы
      const tooltip = document.createElement('span');
      tooltip.className = 'token-tooltip';
      tooltip.textContent = getTokenTypeName(token.type);
      tokenSpan.appendChild(tooltip);
      
      textDiv.appendChild(tokenSpan);
    });
    
    // Создаём элемент подсветки
    const highlightDiv = document.createElement('div');
    highlightDiv.className = 'expression-highlight';
    highlightDiv.id = 'expressionHighlight';
    textDiv.appendChild(highlightDiv);
    
    // Создаём контейнер для фреймов
    const rangesDiv = document.createElement('div');
    rangesDiv.className = 'expression-ranges';
    rangesDiv.id = 'expressionRanges';
    textDiv.appendChild(rangesDiv);
    
    this.container.appendChild(textDiv);
    
    // Создаём фреймы
    this.createFrames(exprString, rangesDiv, highlightDiv);
  }

  /**
   * Показывает placeholder
   */
  showPlaceholder(message: string): void {
    this.container.innerHTML = `<p class="placeholder">${message}</p>`;
  }

  /**
   * Создаёт фреймы подвыражений
   */
  private createFrames(exprString: string, rangesContainer: HTMLElement, highlightElement: HTMLElement): void {
    const subexpressions = findAllSubexpressions(exprString);
    
    if (subexpressions.length === 0) {
      console.log('No valid subexpressions found');
      return;
    }

    // Сортируем по начальной позиции, затем по длине
    subexpressions.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.length - b.length;
    });

    // Назначаем уровни
    const levels = assignLevels(subexpressions);
    
    // Вычисляем позиции
    const config = { LEVEL_HEIGHT: 18, BASE_OFFSET: 5 };
    const positions = calculateFramePositions(subexpressions, exprString, config);
    
    // Устанавливаем высоту контейнера
    const totalHeight = calculateTotalHeight(levels, config);
    rangesContainer.style.height = totalHeight + 'px';
    
    // Создаём элементы фреймов
    positions.forEach(pos => {
      const frame = document.createElement('div');
      frame.className = `expression-range level-${pos.level % 8}`;
      
      frame.style.left = pos.left + 'px';
      frame.style.width = pos.width + 'px';
      frame.style.top = pos.top + 'px';
      
      frame.title = pos.text;
      frame.dataset.text = pos.text;
      frame.dataset.start = pos.start.toString();
      frame.dataset.end = pos.end.toString();
      
      // Наведение для подсветки
      frame.addEventListener('mouseenter', () => {
        highlightElement.style.left = pos.left + 'px';
        highlightElement.style.width = pos.width + 'px';
        highlightElement.classList.add('active');
      });
      
      frame.addEventListener('mouseleave', () => {
        highlightElement.classList.remove('active');
      });
      
      // Клик для показа команд
      frame.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.expression-range').forEach(f => f.classList.remove('active'));
        frame.classList.add('active');
        
        if (this.config.onFrameClick) {
          this.config.onFrameClick(pos.node, pos.text, pos.rules);
        }
      });
      
      rangesContainer.appendChild(frame);
    });
    
    console.log(`Создано ${positions.length} фреймов на ${levels.length} уровнях`);
  }
}
