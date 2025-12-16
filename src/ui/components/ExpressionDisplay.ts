/**
 * Компонент отображения выражения с токенизацией и фреймами подвыражений
 */
import { tokenize, getTokenTypeName, getTokenColor } from '../../utils/tokenizer.js';
import { extractNodesFromAST, assignLevels, calculateFramePositions, calculateTotalHeight } from '../../core/analyzer.js';
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
  render(exprString: string, rootNode: ASTNode): void {
    this.container.innerHTML = '';
    
    // Создаём текстовый элемент
    const textDiv = document.createElement('div');
    textDiv.className = 'expression-text';
    textDiv.id = 'expressionText';
    
    // Токенизация выражения
    const tokens = tokenize(exprString);
    
    // Создаём HTML с токенами и сохраняем позиции
    let searchPos = 0; // Позиция для поиска в исходной строке
    tokens.forEach(token => {
      const tokenSpan = document.createElement('span');
      tokenSpan.className = 'token';
      tokenSpan.textContent = token.value;
      tokenSpan.style.color = getTokenColor(token.type);
      
      // Находим реальную позицию токена в исходной строке (с учётом пробелов)
      const tokenStart = exprString.indexOf(token.value, searchPos);
      if (tokenStart === -1) {
        console.error('Token not found in expression:', token.value);
        tokenSpan.dataset.start = searchPos.toString();
        tokenSpan.dataset.end = (searchPos + token.value.length).toString();
      } else {
        tokenSpan.dataset.start = tokenStart.toString();
        tokenSpan.dataset.end = (tokenStart + token.value.length).toString();
        searchPos = tokenStart + token.value.length; // Обновляем позицию для следующего поиска
      }
      
      // Добавляем tooltip с названием типа лексемы
      const tooltip = document.createElement('span');
      tooltip.className = 'token-tooltip';
      tooltip.textContent = getTokenTypeName(token.type);
      tokenSpan.appendChild(tooltip);
      
      textDiv.appendChild(tokenSpan);
    });
    
    // Создаём контейнер для фреймов
    const rangesDiv = document.createElement('div');
    rangesDiv.className = 'expression-ranges';
    rangesDiv.id = 'expressionRanges';
    textDiv.appendChild(rangesDiv);
    
    this.container.appendChild(textDiv);
    
    // Создаём фреймы на основе AST дерева
    this.createFrames(exprString, rootNode, rangesDiv, textDiv);
  }

  /**
   * Показывает placeholder
   */
  showPlaceholder(message: string): void {
    this.container.innerHTML = `<p class="placeholder">${message}</p>`;
  }

  /**
   * Создаёт фреймы подвыражений на основе AST дерева
   */
  private createFrames(exprString: string, rootNode: ASTNode, rangesContainer: HTMLElement, textContainer: HTMLElement): void {
    const subexpressions = extractNodesFromAST(rootNode, exprString);
    
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
    
    // Вычисляем позиции на основе реальных размеров токенов
    const config = { LEVEL_HEIGHT: 18, BASE_OFFSET: 5 };
    const positions = this.calculateFramePositionsFromTokens(subexpressions, textContainer, config);
    
    // Устанавливаем высоту контейнера
    const totalHeight = calculateTotalHeight(levels, config);
    rangesContainer.style.height = totalHeight + 'px';
    
    // Создаём элементы фреймов
    positions.forEach(pos => {
      const frame = document.createElement('div');
      frame.className = `expression-range level-${(pos.level || 0) % 8}`;
      
      frame.style.left = pos.left + 'px';
      frame.style.width = pos.width + 'px';
      frame.style.top = pos.top + 'px';
      
      frame.title = pos.text;
      frame.dataset.text = pos.text;
      frame.dataset.start = pos.start.toString();
      frame.dataset.end = pos.end.toString();
      frame.dataset.nodeId = pos.node.id;
      
      // Создаём метку с текстом подвыражения внутри рамки
      const label = document.createElement('span');
      label.className = 'frame-label';
      label.textContent = pos.text;
      frame.appendChild(label);
      
      // Наведение для подсветки токенов
      frame.addEventListener('mouseenter', () => {
        console.log('Mouseenter on frame:', pos.text, 'tokens:', pos.tokens?.length || 0);
        this.highlightTokens((pos as any).tokens || [], true, pos.node);
      });
      
      frame.addEventListener('mouseleave', () => {
        this.highlightTokens((pos as any).tokens || [], false);
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

  /**
   * Вычисляет позиции фреймов на основе реальных размеров токенов в DOM
   */
  private calculateFramePositionsFromTokens(
    subexpressions: any[],
    textContainer: HTMLElement,
    config: { LEVEL_HEIGHT: number; BASE_OFFSET: number }
  ): any[] {
    const tokens = Array.from(textContainer.querySelectorAll('.token'));
    
    return subexpressions.map(subexpr => {
      // Находим токены, которые входят в диапазон подвыражения [start, end)
      const relevantTokens = tokens.filter(token => {
        const tokenStart = parseInt((token as HTMLElement).dataset.start || '0');
        const tokenEnd = parseInt((token as HTMLElement).dataset.end || '0');
        // Токен входит, если он начинается в диапазоне [subexpr.start, subexpr.end)
        return tokenStart >= subexpr.start && tokenStart < subexpr.end;
      });
      
      console.log(`Subexpr "${subexpr.text}" [${subexpr.start}, ${subexpr.end}): found ${relevantTokens.length} tokens`);
      
      if (relevantTokens.length === 0) {
        console.warn('No tokens found for subexpression:', subexpr.text);
        return {
          ...subexpr,
          left: 0,
          width: 50,
          top: config.BASE_OFFSET + ((subexpr.level || 0) * config.LEVEL_HEIGHT),
          tokens: []
        };
      }
      
      // Вычисляем границы рамки от первого до последнего токена
      const firstToken = relevantTokens[0] as HTMLElement;
      const lastToken = relevantTokens[relevantTokens.length - 1] as HTMLElement;
      
      const left = firstToken.offsetLeft;
      const width = (lastToken.offsetLeft + lastToken.offsetWidth) - left;
      const top = config.BASE_OFFSET + ((subexpr.level || 0) * config.LEVEL_HEIGHT);
      
      return {
        ...subexpr,
        left,
        width,
        top,
        tokens: relevantTokens // Сохраняем ссылки на токены
      };
    });
  }

  /**
   * Подсвечивает указанные токены с учётом структуры AST
   */
  private highlightTokens(tokens: Element[], highlight: boolean, node?: ASTNode): void {
    if (!tokens || tokens.length === 0) return;
    
    // Определяем позицию оператора для бинарных операторов
    let operatorIndex = -1;
    if (node && (node.type === 'operator' || node.type === 'implicit_mul')) {
      // Для оператора ищем токен с символом оператора
      if (node.type === 'operator') {
        operatorIndex = tokens.findIndex(token => 
          token.textContent?.trim() === node.value
        );
      }
      // Для неявного умножения оператора нет видимого
    }
    
    tokens.forEach((token, index) => {
      if (highlight) {
        if (index === operatorIndex) {
          // Основной оператор
          token.classList.add('token-operator-highlight');
        } else if (operatorIndex !== -1) {
          // Есть оператор - делим на левый и правый операнды
          if (index < operatorIndex) {
            token.classList.add('token-operand-left');
          } else {
            token.classList.add('token-operand-right');
          }
        } else {
          // Нет оператора - просто подсвечиваем
          token.classList.add('token-hover');
        }
      } else {
        token.classList.remove('token-hover', 'token-operator-highlight', 'token-operand-left', 'token-operand-right');
      }
    });
  }
}
