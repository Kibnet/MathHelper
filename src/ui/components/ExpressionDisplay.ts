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
    tokens.forEach((token, tokenIndex) => {
      const tokenSpan = document.createElement('span');
      tokenSpan.className = 'token';
      tokenSpan.textContent = token.value;
      tokenSpan.style.color = getTokenColor(token.type);
      
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
      
      // Создаём метку с ГЛАВНЫМ элементом узла внутри рамки
      const labelContainer = document.createElement('div');
      labelContainer.className = 'frame-label-container';
      labelContainer.style.position = 'absolute';
      labelContainer.style.bottom = '2px';
      labelContainer.style.left = '0';
      labelContainer.style.width = '100%';
      labelContainer.style.height = 'auto';
      labelContainer.style.pointerEvents = 'none';
      
      const labelText = this.getNodeLabel(pos.node);
      
      // Для n-арных операций создаем отдельные span для каждого символа
      if (pos.node.type === 'operator' && pos.node.children && pos.node.children.length > 2) {
        // Находим все токены операторов для вычисления позиций
        const tokens = (pos as any).tokens || [];
        const operatorTokens = tokens.filter((t: Element) => {
          const text = t.textContent || '';
          return text.startsWith(pos.node.value);
        });
        
        // Создаем отдельный span для каждого символа оператора
        for (let i = 0; i < labelText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'frame-label';
          charSpan.textContent = labelText[i];
          charSpan.style.fontFamily = "'Courier New', monospace";
          charSpan.style.fontSize = '0.65rem';
          charSpan.style.opacity = '0.8';
          charSpan.style.position = 'absolute';
          charSpan.style.pointerEvents = 'none';
          
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
      else if (pos.node.type === 'implicit_mul' && pos.node.children && pos.node.children.length > 2) {
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
          charSpan.style.fontFamily = "'Courier New', monospace";
          charSpan.style.fontSize = '0.65rem';
          charSpan.style.opacity = '0.8';
          charSpan.style.position = 'absolute';
          charSpan.style.pointerEvents = 'none';
          
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
      else if (pos.node.type === 'group') {
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
          charSpan.style.fontFamily = "'Courier New', monospace";
          charSpan.style.fontSize = '0.65rem';
          charSpan.style.opacity = '0.8';
          charSpan.style.position = 'absolute';
          charSpan.style.pointerEvents = 'none';
          
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
        console.log('Calculating label position for:', pos.text, 'tokens:', (pos as any).tokens?.length);
        const labelPosition = this.calculateLabelPosition(pos.node, (pos as any).tokens || [], pos.left);
        console.log('Label position result:', labelPosition);
        if (labelPosition) {
          label.style.position = 'absolute';
          label.style.left = labelPosition.left + 'px';
          // Устанавливаем рассчитанную ширину для правильного выравнивания
          label.style.width = labelPosition.width + 'px';
          label.style.textAlign = 'left'; // Выравниваем по левому краю для точного позиционирования
          console.log('Applied label styles:', label.style.left, label.style.width);
        } else {
          console.warn('No label position calculated!');
          // Резервное позиционирование
          label.style.position = 'absolute';
          label.style.left = '0px';
          label.style.width = 'auto';
          label.style.textAlign = 'center';
        }
        
        labelContainer.appendChild(label);
      }
      
      frame.appendChild(labelContainer);
      
      // Наведение для подсветки токенов
      frame.addEventListener('mouseenter', () => {
        this.highlightTokens((pos as any).tokens || [], true, pos.node);
      });
      
      frame.addEventListener('mouseleave', () => {
        this.highlightTokens((pos as any).tokens || [], false, pos.node);
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
   * Подсвечивает указанные токены с учётом структуры AST
   */
  private highlightTokens(tokens: Element[], highlight: boolean, node?: ASTNode): void {
    if (!tokens || tokens.length === 0) {
      console.warn('highlightTokens: no tokens provided');
      return;
    }
    
    console.log('=== highlightTokens ===' );
    console.log('  highlight:', highlight);
    console.log('  node type:', node?.type);
    console.log('  node tokenIds:', node?.tokenIds);
    console.log('  tokens count:', tokens.length);
    console.log('  tokens:', tokens.map((t, i) => `[${i}] ${t.textContent} (data-token-id: ${(t as HTMLElement).dataset.tokenId}, data-original-index: ${(t as HTMLElement).dataset.originalIndex})`));
    
    if (!highlight) {
      // Убираем все классы подсветки
      tokens.forEach(token => {
        token.classList.remove('token-hover', 'token-operator-highlight', 'token-operand-left', 'token-operand-right');
      });
      return;
    }
    
    // Для унарного минуса - выделяем минус как оператор, а выражение справа как операнд
    if (node && node.type === 'unary') {
      const operandChild = node.children[0];
      
      // Получаем ID токенов операнда из AST (фильтруем -1)
      const operandTokenIds = new Set((operandChild.tokenIds || []).filter((id: number) => id !== -1));
      const allTokenIds = new Set((node.tokenIds || []).filter((id: number) => id !== -1));
      
      console.log('  operandChild tokenIds:', Array.from(operandTokenIds));
      console.log('  allTokenIds:', Array.from(allTokenIds));
      
      // Ищем токен унарного минуса - тот, который есть в узле, но нет в операнде
      const operatorTokenIds = [...allTokenIds].filter((id: number) => !operandTokenIds.has(id));
      console.log('  operatorTokenIds:', operatorTokenIds);
      
      const operandTokens: Element[] = [];
      let operatorToken: Element | undefined;
      
      tokens.forEach((token) => {
        const originalIndex = parseInt((token as HTMLElement).dataset.originalIndex || '-2'); // -2 для отличия от -1
        console.log(`    Checking token: ${token.textContent}, originalIndex: ${originalIndex}`);
        
        if (operandTokenIds.has(originalIndex)) {
          operandTokens.push(token);
          console.log(`      -> Added to operandTokens`);
        } else if (operatorTokenIds.includes(originalIndex)) {
          operatorToken = token;
          console.log(`      -> Set as operatorToken`);
        } else {
          console.log(`      -> Not matched`);
        }
      });
      
      console.log('  Result:');
      console.log('    operator token:', operatorToken?.textContent);
      console.log('    operand tokens:', operandTokens.map(t => t.textContent));
      
      // Применяем классы
      if (operatorToken) {
        operatorToken.classList.add('token-operator-highlight');
        console.log(`    Applied token-operator-highlight to: ${operatorToken.textContent}`);
      }
      operandTokens.forEach(t => {
        t.classList.add('token-operand-right');
        console.log(`    Applied token-operand-right to: ${t.textContent}`);
      });
    } 
    // Для групп (скобок) - выделяем скобки как оператор, а выражение внутри как операнд
    else if (node && node.type === 'group') {
      const operandChild = node.children[0];
      
      // Получаем ID токенов операнда из AST (фильтруем -1)
      const operandTokenIds = new Set((operandChild.tokenIds || []).filter((id: number) => id !== -1));
      const allTokenIds = new Set((node.tokenIds || []).filter((id: number) => id !== -1));
      
      console.log('  operandChild tokenIds:', Array.from(operandTokenIds));
      console.log('  allTokenIds:', Array.from(allTokenIds));
      
      // Ищем токены скобок - те, которые есть в узле, но нет в операнде
      const bracketTokenIds = [...allTokenIds].filter((id: number) => !operandTokenIds.has(id));
      console.log('  bracketTokenIds:', bracketTokenIds);
      
      const operandTokens: Element[] = [];
      const bracketTokens: Element[] = [];
      
      tokens.forEach((token) => {
        const originalIndex = parseInt((token as HTMLElement).dataset.originalIndex || '-2'); // -2 для отличия от -1
        console.log(`    Checking token: ${token.textContent}, originalIndex: ${originalIndex}`);
        
        if (operandTokenIds.has(originalIndex)) {
          operandTokens.push(token);
          console.log(`      -> Added to operandTokens`);
        } else if (bracketTokenIds.includes(originalIndex)) {
          bracketTokens.push(token);
          console.log(`      -> Added to bracketTokens`);
        } else {
          console.log(`      -> Not matched`);
        }
      });
      
      console.log('  Result:');
      console.log('    bracket tokens:', bracketTokens.map(t => t.textContent));
      console.log('    operand tokens:', operandTokens.map(t => t.textContent));
      
      // Применяем классы - скобки как оператор, содержимое как операнд
      bracketTokens.forEach(t => {
        t.classList.add('token-operator-highlight');
        console.log(`    Applied token-operator-highlight to: ${t.textContent}`);
      });
      operandTokens.forEach(t => {
        t.classList.add('token-operand-right');
        console.log(`    Applied token-operand-right to: ${t.textContent}`);
      });
    }
    // Для операторов и неявного умножения - выделяем оператор и операнды
    else if (node && (node.type === 'operator' || node.type === 'implicit_mul')) {
      const children = (node as any).children;
      
      // Для n-арных операций (более 2 операндов)
      if (children && children.length > 2) {
        // Получаем все ID токенов операндов из AST (фильтруем -1)
        const operandTokenIdSets: Set<number>[] = [];
        const allOperandTokenIds = new Set<number>();
        
        children.forEach((child: ASTNode) => {
          const childTokenIds = new Set((child.tokenIds || []).filter((id: number) => id !== -1));
          operandTokenIdSets.push(childTokenIds);
          childTokenIds.forEach(id => allOperandTokenIds.add(id));
        });
        
        const allTokenIds = new Set((node.tokenIds || []).filter((id: number) => id !== -1));
        
        console.log('  operandTokenIdSets:', operandTokenIdSets.map(set => Array.from(set)));
        console.log('  allOperandTokenIds:', Array.from(allOperandTokenIds));
        console.log('  allTokenIds:', Array.from(allTokenIds));
        
        // Ищем токены операторов - те, которые есть в узле, но нет в операндах
        const operatorTokenIds = [...allTokenIds].filter((id: number) => !allOperandTokenIds.has(id));
        console.log('  operatorTokenIds:', operatorTokenIds);
        
        const operandTokensArrays: Element[][] = children.map(() => [] as Element[]);
        const operatorTokens: Element[] = [];
        
        tokens.forEach((token) => {
          const originalIndex = parseInt((token as HTMLElement).dataset.originalIndex || '-2'); // -2 для отличия от -1
          console.log(`    Checking token: ${token.textContent}, originalIndex: ${originalIndex}`);
          
          // Проверяем, является ли токен оператором
          if (operatorTokenIds.includes(originalIndex)) {
            operatorTokens.push(token);
            console.log(`      -> Added to operatorTokens`);
          } else {
            // Проверяем, к какому операнду относится токен
            operandTokenIdSets.forEach((operandTokenIds, operandIndex) => {
              if (operandTokenIds.has(originalIndex)) {
                operandTokensArrays[operandIndex].push(token);
                console.log(`      -> Added to operandTokens[${operandIndex}]`);
              }
            });
          }
        });
        
        console.log('  Result:');
        console.log('    operator tokens:', operatorTokens.map(t => t.textContent));
        operandTokensArrays.forEach((operandTokens, i) => {
          console.log(`    operand[${i}] tokens:`, operandTokens.map(t => t.textContent));
        });
        
        // Применяем классы - все операторы выделяем зеленой рамкой
        operatorTokens.forEach(token => {
          token.classList.add('token-operator-highlight');
          console.log(`    Applied token-operator-highlight to: ${token.textContent}`);
        });
        
        // Поочередно подсвечиваем операнды (чередующиеся цвета)
        operandTokensArrays.forEach((operandTokens, i) => {
          const highlightClass = i % 2 === 0 ? 'token-operand-left' : 'token-operand-right';
          operandTokens.forEach(t => {
            t.classList.add(highlightClass);
            console.log(`    Applied ${highlightClass} to: ${t.textContent}`);
          });
        });
      } else {
        // Для бинарных операций - старая логика
        const [leftChild, rightChild] = children;
        
        // Получаем ID токенов левого и правого операндов из AST (фильтруем -1)
        const leftTokenIds = new Set((leftChild.tokenIds || []).filter((id: number) => id !== -1));
        const rightTokenIds = new Set((rightChild.tokenIds || []).filter((id: number) => id !== -1));
        const allTokenIds = new Set((node.tokenIds || []).filter((id: number) => id !== -1));
        
        console.log('  leftChild tokenIds:', Array.from(leftTokenIds));
        console.log('  rightChild tokenIds:', Array.from(rightTokenIds));
        console.log('  allTokenIds:', Array.from(allTokenIds));
        
        // Ищем токен оператора - тот, который есть в узле, но нет ни в левом, ни в правом дочернем узле
        const operatorTokenIds = [...allTokenIds].filter((id: number) => !leftTokenIds.has(id) && !rightTokenIds.has(id));
        console.log('  operatorTokenIds:', operatorTokenIds);
        
        const leftTokens: Element[] = [];
        const rightTokens: Element[] = [];
        let operatorToken: Element | undefined;
        
        tokens.forEach((token) => {
          const originalIndex = parseInt((token as HTMLElement).dataset.originalIndex || '-2'); // -2 для отличия от -1
          console.log(`    Checking token: ${token.textContent}, originalIndex: ${originalIndex}`);
          
          if (leftTokenIds.has(originalIndex)) {
            leftTokens.push(token);
            console.log(`      -> Added to leftTokens`);
          } else if (rightTokenIds.has(originalIndex)) {
            rightTokens.push(token);
            console.log(`      -> Added to rightTokens`);
          } else if (operatorTokenIds.includes(originalIndex)) {
            operatorToken = token;
            console.log(`      -> Set as operatorToken`);
          } else {
            console.log(`      -> Not matched`);
          }
        });
        
        console.log('  Result:');
        console.log('    operator token:', operatorToken?.textContent);
        console.log('    left tokens:', leftTokens.map(t => t.textContent));
        console.log('    right tokens:', rightTokens.map(t => t.textContent));
        
        // Применяем классы
        if (operatorToken) {
          operatorToken.classList.add('token-operator-highlight');
          console.log(`    Applied token-operator-highlight to: ${operatorToken.textContent}`);
        }
        leftTokens.forEach(t => {
          t.classList.add('token-operand-left');
          console.log(`    Applied token-operand-left to: ${t.textContent}`);
        });
        rightTokens.forEach(t => {
          t.classList.add('token-operand-right');
          console.log(`    Applied token-operand-right to: ${t.textContent}`);
        });
      }
    } else {
      // Для остальных типов - просто подсвечиваем
      console.log('  Applying simple hover highlight');
      tokens.forEach(token => {
        token.classList.add('token-hover');
        console.log(`    Applied token-hover to: ${token.textContent}`);
      });
    }
  }

  /**
   * Преобразует AST узел в строку для отображения в метке
   */
  private getNodeLabel(node: ASTNode): string {
    switch (node.type) {
      case 'operator':
        // Для n-арных операций показываем все операторы
        if (node.children && node.children.length > 2) {
          // Для сложения показываем все +
          if (node.value === '+') {
            return '+'.repeat(node.children.length - 1);
          }
          // Для умножения показываем все *
          if (node.value === '*') {
            return '*'.repeat(node.children.length - 1);
          }
        }
        return node.value;
      
      case 'implicit_mul':
        // Для n-арных неявных умножений показываем символы ×
        if (node.children && node.children.length > 2) {
          // Показываем × для каждого неявного умножения между операндами
          return '×'.repeat(node.children.length - 1);
        }
        // Для бинарного неявного умножения показываем один символ
        return '×';
      
      case 'group':
        // Для групп показываем скобки
        return '()';
      
      case 'unary':
        // Для унарного минуса показываем -
        return '-';
      
      case 'constant':
      case 'variable':
        // Для чисел и переменных показываем значение
        return String(node.value);
      
      default:
        return '?';
    }
  }
  /**
   * Вычисляет позицию метки под главным элементом
   */
  private calculateLabelPosition(node: ASTNode, tokens: Element[], frameLeft: number): { left: number; width: number } | null {
    if (tokens.length === 0) return null;

    console.log('calculateLabelPosition:', node.type, node.value, 'tokens:', tokens.map(t => t.textContent));

    switch (node.type) {
      case 'operator': {
        // Для n-арных операций (более 2 операндов) находим все токены операторов
        if (node.children && node.children.length > 2) {
          // Находим все токены операторов (ищем по содержимому, игнорируя суффиксы)
          const operatorTokens = tokens.filter(t => {
            const text = t.textContent || '';
            // Ищем оператор в начале текста (до возможного суффикса типа "Оператор")
            return text.startsWith(node.value);
          }).map(t => t as HTMLElement);
          
          console.log('Looking for n-ary operators:', node.value, 'found:', operatorTokens.map(t => t.textContent));
          
          if (operatorTokens.length > 0) {
            // Для точного выравнивания каждого символа в метке с каждым оператором в выражении
            // Используем позицию первого оператора как базовую точку
            const firstOperator = operatorTokens[0];
            // Ширина метки рассчитывается для размещения всех символов с учетом их позиций
            const lastOperator = operatorTokens[operatorTokens.length - 1];
            const totalWidth = (lastOperator.offsetLeft + lastOperator.offsetWidth) - firstOperator.offsetLeft;
            
            // Позиционируем метку относительно фрейма
            // Для n-арных операций позиционируем метку так, чтобы она была центрирована
            // над всеми операторами
            const framePosition = firstOperator.offsetLeft - frameLeft;
            
            return {
              left: framePosition,
              width: totalWidth
            };
          }
        } else {
          // Для бинарных операций - старая логика
          // Находим токен оператора (ищем по содержимому, игнорируя суффиксы)
          const operatorToken = tokens.find(t => {
            const text = t.textContent || '';
            // Ищем оператор в начале текста (до возможного суффикса типа "Оператор")
            return text.startsWith(node.value);
          });
          console.log('Looking for operator:', node.value, 'found:', operatorToken?.textContent);
          if (operatorToken) {
            const htmlToken = operatorToken as HTMLElement;
            return {
              left: htmlToken.offsetLeft - frameLeft,
              width: htmlToken.offsetWidth
            };
          }
        }
        break;
      }
      
      case 'implicit_mul': {
        // Для n-арных неявных умножений
        if (node.children && node.children.length > 2) {
          // Находим все токены операторов (операнды для неявного умножения)
          const operandTokens = tokens.filter(t => {
            const text = t.textContent || '';
            // Исключаем явные операторы
            return !['+', '-', '*', '/'].some(op => text.startsWith(op));
          }).map(t => t as HTMLElement);
          
          if (operandTokens.length >= 2) {
            // Для неявного умножения позиционируем метку по центру между первым и последним операндом
            const firstOperand = operandTokens[0];
            const lastOperand = operandTokens[operandTokens.length - 1];
            
            // Вычисляем центральную позицию
            const totalWidth = (lastOperand.offsetLeft + lastOperand.offsetWidth) - firstOperand.offsetLeft;
            const center = firstOperand.offsetLeft + totalWidth / 2;
            
            // Для n-1 операторов ×, позиционируем по центру
            const operatorCount = node.children.length - 1;
            const labelWidth = operatorCount * 10; // Примерная ширина для ×××
            const left = center - labelWidth / 2 - frameLeft;
            
            return { 
              left, 
              width: labelWidth
            };
          }
        } else {
          // Для неявного умножения позиционируем метку между операндами
          if (tokens.length >= 2) {
            // Находим токены операндов
            const firstToken = tokens[0] as HTMLElement;
            // Ищем токен, который соответствует началу второго операнда
            let secondToken = tokens.find((t, i) => i > 0) as HTMLElement;
            
            // Если не нашли второй токен, используем последний
            if (!secondToken) {
              secondToken = tokens[tokens.length - 1] as HTMLElement;
            }
            
            // Позиция между первым и вторым токенами
            const midpoint = (firstToken.offsetLeft + firstToken.offsetWidth + secondToken.offsetLeft) / 2;
            const left = midpoint - frameLeft - 10; // Центрируем метку (примерно 20px ширина)
            
            return { 
              left, 
              width: 20 // Фиксированная ширина для символа ×
            };
          }
        }
        break;
      }
      
      case 'group': {
        // Находим скобки (ищем по содержимому, игнорируя суффиксы)
        const openBracket = tokens.find(t => (t.textContent || '').startsWith('('));
        const closeBracket = tokens.reverse().find(t => (t.textContent || '').startsWith(')'));
        tokens.reverse(); // Возвращаем порядок
        console.log('Looking for brackets, open:', openBracket?.textContent, 'close:', closeBracket?.textContent);
        if (openBracket && closeBracket) {
          const openEl = openBracket as HTMLElement;
          const closeEl = closeBracket as HTMLElement;
          return {
            left: openEl.offsetLeft - frameLeft,
            width: (closeEl.offsetLeft + closeEl.offsetWidth) - openEl.offsetLeft
          };
        }
        break;
      }
      
      case 'unary': {
        // Под унарным минусом (ищем по содержимому, игнорируя суффиксы)
        const minusToken = tokens.find(t => (t.textContent || '').startsWith('-'));
        console.log('Looking for unary minus, found:', minusToken?.textContent);
        if (minusToken) {
          const htmlToken = minusToken as HTMLElement;
          return {
            left: htmlToken.offsetLeft - frameLeft,
            width: htmlToken.offsetWidth
          };
        }
        break;
      }
      
      case 'constant':
      case 'variable': {
        // Под числом или переменной - все токены
        const firstToken = tokens[0] as HTMLElement;
        const lastToken = tokens[tokens.length - 1] as HTMLElement;
        return {
          left: 0, // Относительно начала рамки
          width: (lastToken.offsetLeft + lastToken.offsetWidth) - firstToken.offsetLeft
        };
      }
    }

    console.warn('No matching case for node type:', node.type);
    return null;
  }
}
