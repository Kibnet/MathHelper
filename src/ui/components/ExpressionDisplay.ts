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
      const label = document.createElement('span');
      label.className = 'frame-label';
      label.textContent = this.getNodeLabel(pos.node);
      
      // Позиционируем метку под главным элементом
      console.log('Calculating label position for:', pos.text, 'tokens:', (pos as any).tokens?.length);
      const labelPosition = this.calculateLabelPosition(pos.node, (pos as any).tokens || [], pos.left);
      console.log('Label position result:', labelPosition);
      if (labelPosition) {
        label.style.position = 'absolute';
        label.style.left = labelPosition.left + 'px';
        label.style.width = labelPosition.width > 0 ? labelPosition.width + 'px' : 'auto';
        label.style.textAlign = labelPosition.width > 0 ? 'center' : 'left';
        console.log('Applied label styles:', label.style.left, label.style.width);
      } else {
        console.warn('No label position calculated!');
      }
      
      frame.appendChild(label);
      
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
      const [leftChild, rightChild] = (node as any).children;
      
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
   * Преобразует AST узел в строку
   */
  private expressionToString(node: ASTNode): string {
    // Используем ту же логику, что и в helpers
    switch (node.type) {
      case 'constant':
        return String(node.value);
      case 'variable':
        return node.value;
      case 'operator':
        const [left, right] = node.children;
        return `${this.expressionToString(left)} ${node.value} ${this.expressionToString(right)}`;
      case 'unary':
        return `${node.value}${this.expressionToString(node.children[0])}`;
      case 'group':
        return `(${this.expressionToString(node.children[0])})`;
      case 'implicit_mul':
        const [leftOp, rightOp] = node.children;
        return `${this.expressionToString(leftOp)}${this.expressionToString(rightOp)}`;
      default:
        return '';
    }
  }

  /**
   * Получает метку главного элемента узла для отображения в рамке
   */
  private getNodeLabel(node: ASTNode): string {
    switch (node.type) {
      case 'constant':
        return String(node.value);
      case 'variable':
        return node.value;
      case 'operator':
        return node.value; // +, -, *, /
      case 'implicit_mul':
        return '×'; // Символ неявного умножения
      case 'unary':
        return node.value; // унарный минус
      case 'group':
        return '( )'; // Скобки
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
        // Находим токен оператора (используем только первый символ textContent)
        const operatorToken = tokens.find(t => {
          const text = t.textContent || '';
          return text[0] === node.value;
        });
        console.log('Looking for operator:', node.value, 'found:', operatorToken?.textContent);
        if (operatorToken) {
          const htmlToken = operatorToken as HTMLElement;
          return {
            left: htmlToken.offsetLeft - frameLeft,
            width: htmlToken.offsetWidth
          };
        }
        break;
      }
      
      case 'implicit_mul': {
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
        break;
      }
      
      case 'group': {
        // Находим скобки (используем только первый символ)
        const openBracket = tokens.find(t => (t.textContent || '')[0] === '(');
        const closeBracket = tokens.reverse().find(t => (t.textContent || '')[0] === ')');
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
        // Под унарным минусом (используем только первый символ)
        const minusToken = tokens.find(t => (t.textContent || '')[0] === '-');
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
