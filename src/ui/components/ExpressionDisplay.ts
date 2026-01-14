/**
 * Компонент отображения выражения с токенизацией и фреймами подвыражений
 */
import { tokenize, getTokenTypeName, getTokenColor } from '../../utils/tokenizer.js';
import { extractNodesFromMathStepsAst, assignLevels, calculateTotalHeight } from '../../core/analyzer.js';
import type { FrameSelection, MathStepsNode } from '../../types/index.js';

export interface ExpressionDisplayConfig {
  onFrameClick?: (selection: FrameSelection) => void;
}

export class ExpressionDisplay {
  private container: HTMLElement;
  private config: ExpressionDisplayConfig;
  private debug = false;

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
  render(exprString: string, rootNode: MathStepsNode): void {
    this.container.innerHTML = '';
    
    // Создаём текстовый элемент
    const textDiv = document.createElement('div');
    textDiv.className = 'expression-text';
    textDiv.id = 'expressionText';
    
    // Токенизация выражения
    const tokens = tokenize(exprString);
    
    // Создаём HTML с токенами и сохраняем позиции
    let searchPos = 0; // Позиция для поиска в исходной строке
    tokens.forEach((token, tokenIndex) => {
      const tokenSpan = document.createElement('span');
      tokenSpan.className = 'token';
      tokenSpan.textContent = token.value;
      tokenSpan.style.setProperty('--token-color', getTokenColor(token.type));
      
      // Добавляем уникальный ID токена
      tokenSpan.dataset.tokenId = `token_${tokenIndex}`;
      // Добавляем originalIndex из Token объекта для точного поиска
      tokenSpan.dataset.originalIndex = String(token.originalIndex ?? tokenIndex);
      
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

  private debugLog(...args: unknown[]): void {
    if (!this.debug) {
      return;
    }
    console.log(...args);
  }

  /**
   * Создаёт фреймы подвыражений на основе AST дерева
   */
  private createFrames(exprString: string, rootNode: MathStepsNode, rangesContainer: HTMLElement, textContainer: HTMLElement): void {
    const subexpressions = extractNodesFromMathStepsAst(rootNode, exprString);
    
    if (subexpressions.length === 0) {
      this.debugLog('No valid subexpressions found');
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
      frame.dataset.nodeId = '';
      
      // Создаём метку с ГЛАВНЫМ элементом узла внутри рамки
      const labelContainer = document.createElement('div');
      labelContainer.className = 'frame-label-container';
      
      const labelText = this.getNodeLabel(pos.node);
      
      // Для n-арных операций создаем отдельные span для каждого символа
      if (this.isOperatorNode(pos.node) && pos.node.args && pos.node.args.length > 2) {
        // Находим все токены операторов для вычисления позиций
        const tokens = (pos as any).tokens || [];
        const operatorTokens = tokens.filter((t: Element) => {
          const text = t.textContent || '';
          const operatorValue = pos.node.op;
          if (!operatorValue) {
            return false;
          }
          return text.startsWith(operatorValue);
        });
        
        // Создаем отдельный span для каждого символа оператора
        for (let i = 0; i < labelText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'frame-label';
          charSpan.textContent = labelText[i];
          
          // Если у нас есть информация о позициях операторов, позиционируем каждый символ
          if (operatorTokens[i]) {
            const operatorElement = operatorTokens[i] as HTMLElement;
            const leftPos = operatorElement.offsetLeft - pos.left;
            charSpan.style.left = leftPos + 'px';
          } else {
            // Резервное позиционирование
            charSpan.style.left = (i * 10) + 'px';
          }
          
          labelContainer.appendChild(charSpan);
        }
      } 
      // Для неявного умножения создаем отдельные span для каждого символа '×'
      else if (this.isImplicitMultiplicationNode(pos.node) && pos.node.args && pos.node.args.length > 2) {
        // Находим все токены операндов для вычисления позиций
        const tokens = (pos as any).tokens || [];
        const operandTokens = tokens.filter((t: Element) => {
          const text = t.textContent || '';
          // Исключаем явные операторы
          return !['+', '-', '*', '/'].some(op => text.startsWith(op));
        });
        
        // Создаем отдельный span для каждого символа '×'
        for (let i = 0; i < labelText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'frame-label';
          charSpan.textContent = labelText[i];
          
          // Для неявного умножения позиционируем символы между операндами
          if (operandTokens[i] && operandTokens[i + 1]) {
            const leftOperand = operandTokens[i] as HTMLElement;
            const rightOperand = operandTokens[i + 1] as HTMLElement;
            // Позиционируем символ посередине между операндами
            const midpoint = (leftOperand.offsetLeft + leftOperand.offsetWidth + rightOperand.offsetLeft) / 2;
            const leftPos = midpoint - pos.left - 5; // Корректируем позицию
            charSpan.style.left = leftPos + 'px';
          } else {
            // Резервное позиционирование
            charSpan.style.left = (i * 15) + 'px';
          }
          
          labelContainer.appendChild(charSpan);
        }
      }
      // Для групп (скобок) создаем отдельные span для каждой скобки
      else if (this.isParenthesisNode(pos.node)) {
        // Находим токены скобок для вычисления позиций
        const tokens = (pos as any).tokens || [];
        const bracketTokens = tokens.filter((t: Element) => {
          const text = t.textContent || '';
          return text.startsWith('(') || text.startsWith(')');
        });
        
        // Создаем отдельный span для каждой скобки
        for (let i = 0; i < labelText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'frame-label';
          charSpan.textContent = labelText[i];
          
          // Позиционируем каждую скобку
          if (bracketTokens[i]) {
            const bracketElement = bracketTokens[i] as HTMLElement;
            const leftPos = bracketElement.offsetLeft - pos.left;
            charSpan.style.left = leftPos + 'px';
          } else {
            // Резервное позиционирование
            charSpan.style.left = (i === 0 ? 0 : pos.width - 10) + 'px';
          }
          
          labelContainer.appendChild(charSpan);
        }
      }
      else {
        // Для остальных случаев используем обычный span
        const label = document.createElement('span');
        label.className = 'frame-label';
        label.textContent = labelText;
        
        // Позиционируем метку под главным элементом
        this.debugLog('Calculating label position for:', pos.text, 'tokens:', (pos as any).tokens?.length);
        const labelPosition = this.calculateLabelPosition(pos.node, (pos as any).tokens || [], pos.left);
        this.debugLog('Label position result:', labelPosition);
        if (labelPosition) {
          label.classList.add('frame-label-left');
          label.style.left = labelPosition.left + 'px';
          // Устанавливаем рассчитанную ширину для правильного выравнивания
          label.style.width = labelPosition.width + 'px';
          this.debugLog('Applied label styles:', label.style.left, label.style.width);
        } else {
          this.debugLog('No label position calculated!');
          // Резервное позиционирование
          label.classList.add('frame-label-center');
        }
        
        labelContainer.appendChild(label);
      }
      
      frame.appendChild(labelContainer);
      
      // Наведение для подсветки токенов
      frame.addEventListener('mouseenter', () => {
        this.highlightTokens((pos as any).tokens || [], true);
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
          this.config.onFrameClick({
            text: pos.text,
            path: pos.path || []
          });
        }
      });
      
      rangesContainer.appendChild(frame);
    });
    
    this.debugLog(`Создано ${positions.length} фреймов на ${levels.length} уровнях`);
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
        // Токен входит, если он начинается в диапазоне [subexpr.start, subexpr.end)
        return tokenStart >= subexpr.start && tokenStart < subexpr.end;
      });
      
      if (relevantTokens.length === 0) {
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
   * Подсвечивает указанные токены
   */
  private highlightTokens(tokens: Element[], highlight: boolean): void {
    if (!tokens || tokens.length === 0) {
      this.debugLog('highlightTokens: no tokens provided');
      return;
    }

    if (!highlight) {
      tokens.forEach(token => {
        token.classList.remove('token-hover', 'token-operator-highlight', 'token-operand-left', 'token-operand-right');
      });
      return;
    }

    tokens.forEach(token => {
      token.classList.add('token-hover');
    });
  }

  /**
   * Преобразует mathjs узел в строку для отображения в метке
   */
  private getNodeLabel(node: MathStepsNode): string {
    if (this.isOperatorNode(node)) {
      const op = node.op || '?';
      const argsCount = node.args ? node.args.length : 0;

      if (this.isImplicitMultiplicationNode(node)) {
        return argsCount > 2 ? '×'.repeat(argsCount - 1) : '×';
      }

      return argsCount > 2 ? op.repeat(argsCount - 1) : op;
    }

    if (this.isParenthesisNode(node)) {
      return '()';
    }

    if (node.type === 'ConstantNode') {
      return String(node.value);
    }

    if (node.type === 'SymbolNode') {
      return node.name || '';
    }

    return '?';
  }

  /**
   * Вычисляет позицию метки под главным элементом
   */
  private calculateLabelPosition(node: MathStepsNode, tokens: Element[], frameLeft: number): { left: number; width: number } | null {
    if (tokens.length === 0) return null;

    this.debugLog('calculateLabelPosition:', node.type, node.op, 'tokens:', tokens.map(t => t.textContent));

    if (this.isOperatorNode(node)) {
      const operatorValue = node.op || '';
      if (node.args && node.args.length > 2 && !this.isImplicitMultiplicationNode(node)) {
        const operatorTokens = operatorValue
          ? tokens.filter(t => {
              const text = t.textContent || '';
              return text.startsWith(operatorValue);
            }).map(t => t as HTMLElement)
          : [];

        this.debugLog('Looking for n-ary operators:', operatorValue, 'found:', operatorTokens.map(t => t.textContent));

        if (operatorTokens.length > 0) {
          const firstOperator = operatorTokens[0];
          const lastOperator = operatorTokens[operatorTokens.length - 1];
          const totalWidth = (lastOperator.offsetLeft + lastOperator.offsetWidth) - firstOperator.offsetLeft;
          const framePosition = firstOperator.offsetLeft - frameLeft;

          return {
            left: framePosition,
            width: totalWidth
          };
        }
      } else if (!this.isImplicitMultiplicationNode(node)) {
        const operatorToken = operatorValue
          ? tokens.find(t => {
              const text = t.textContent || '';
              return text.startsWith(operatorValue);
            })
          : undefined;
        this.debugLog('Looking for operator:', operatorValue, 'found:', operatorToken?.textContent);
        if (operatorToken) {
          const htmlToken = operatorToken as HTMLElement;
          return {
            left: htmlToken.offsetLeft - frameLeft,
            width: htmlToken.offsetWidth
          };
        }
      }
    }

    if (this.isImplicitMultiplicationNode(node)) {
      if (node.args && node.args.length > 2) {
        const operandTokens = tokens.filter(t => {
          const text = t.textContent || '';
          return !['+', '-', '*', '/'].some(op => text.startsWith(op));
        }).map(t => t as HTMLElement);

        if (operandTokens.length >= 2) {
          const firstOperand = operandTokens[0];
          const lastOperand = operandTokens[operandTokens.length - 1];
          const totalWidth = (lastOperand.offsetLeft + lastOperand.offsetWidth) - firstOperand.offsetLeft;
          const center = firstOperand.offsetLeft + totalWidth / 2;
          const operatorCount = node.args.length - 1;
          const labelWidth = operatorCount * 10;
          const left = center - labelWidth / 2 - frameLeft;

          return {
            left,
            width: labelWidth
          };
        }
      } else if (tokens.length >= 2) {
        const firstToken = tokens[0] as HTMLElement;
        let secondToken = tokens.find((_, i) => i > 0) as HTMLElement;

        if (!secondToken) {
          secondToken = tokens[tokens.length - 1] as HTMLElement;
        }

        const midpoint = (firstToken.offsetLeft + firstToken.offsetWidth + secondToken.offsetLeft) / 2;
        const left = midpoint - frameLeft - 10;

        return {
          left,
          width: 20
        };
      }
    }

    if (this.isParenthesisNode(node)) {
      const openBracket = tokens.find(t => (t.textContent || '').startsWith('('));
      const closeBracket = tokens.slice().reverse().find(t => (t.textContent || '').startsWith(')'));
      this.debugLog('Looking for brackets, open:', openBracket?.textContent, 'close:', closeBracket?.textContent);
      if (openBracket && closeBracket) {
        const openEl = openBracket as HTMLElement;
        const closeEl = closeBracket as HTMLElement;
        return {
          left: openEl.offsetLeft - frameLeft,
          width: (closeEl.offsetLeft + closeEl.offsetWidth) - openEl.offsetLeft
        };
      }
    }

    const firstToken = tokens[0] as HTMLElement;
    const lastToken = tokens[tokens.length - 1] as HTMLElement;
    const left = firstToken.offsetLeft - frameLeft;
    const width = (lastToken.offsetLeft + lastToken.offsetWidth) - firstToken.offsetLeft;

    return {
      left,
      width
    };
  }

  private isOperatorNode(node: MathStepsNode): boolean {
    return node.type === 'OperatorNode';
  }

  private isParenthesisNode(node: MathStepsNode): boolean {
    return node.type === 'ParenthesisNode';
  }

  private isImplicitMultiplicationNode(node: MathStepsNode): boolean {
    return this.isOperatorNode(node) && node.op === '*' && node.implicit === true;
  }
}
