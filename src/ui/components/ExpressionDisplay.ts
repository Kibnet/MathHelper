/**
 * Компонент отображения выражения с рендером по AST и фреймами подвыражений
 */
import { getTokenTypeName, getTokenColor } from '../../utils/tokenizer.js';
import type { FrameSelection, EquationNode, MathStepsNode, MathStepsPath } from '../../types/index.js';

export interface ExpressionDisplayConfig {
  onFrameClick?: (selection: FrameSelection) => void;
}

type RenderedNode = {
  element: HTMLElement;
  node: MathStepsNode | EquationNode;
  path: MathStepsPath;
  text: string;
};

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
  render(exprString: string, rootNode: MathStepsNode | EquationNode): void {
    this.container.innerHTML = '';

    const textDiv = document.createElement('div');
    textDiv.className = 'expression-text';
    textDiv.id = 'expressionText';

    const renderedNodes: RenderedNode[] = [];
    const rootElement = this.renderNode(rootNode, [], renderedNodes);
    textDiv.appendChild(rootElement);

    const rangesDiv = document.createElement('div');
    rangesDiv.className = 'expression-ranges';
    rangesDiv.id = 'expressionRanges';
    textDiv.appendChild(rangesDiv);

    this.container.appendChild(textDiv);

    this.createFramesFromDom(renderedNodes, rangesDiv, textDiv, exprString);
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

  private renderNode(node: MathStepsNode | EquationNode, path: MathStepsPath, renderedNodes: RenderedNode[]): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'expr-node';

    const nodeText = this.nodeToString(node);
    wrapper.dataset.text = nodeText;
    wrapper.dataset.path = JSON.stringify(path);

    renderedNodes.push({ element: wrapper, node, path, text: nodeText });

    if (this.isEquationNode(node)) {
      const leftNode = this.renderNode(node.leftNode, ['left'], renderedNodes);
      const rightNode = this.renderNode(node.rightNode, ['right'], renderedNodes);

      wrapper.appendChild(leftNode);
      wrapper.appendChild(this.createTokenSpan(node.comparator, 'operator'));
      wrapper.appendChild(rightNode);

      return wrapper;
    }

    if (this.isParenthesisNode(node)) {
      wrapper.appendChild(this.createTokenSpan('(', 'paren'));
      if (node.content) {
        wrapper.appendChild(this.renderNode(node.content, [...path, 'content'], renderedNodes));
      }
      wrapper.appendChild(this.createTokenSpan(')', 'paren'));
      return wrapper;
    }

    if (this.isOperatorNode(node)) {
      const args = node.args || [];
      const op = node.op || '';

      if (op === '^' && args.length === 2) {
        const powerWrapper = document.createElement('span');
        powerWrapper.className = 'expr-power';

        const base = this.renderNode(args[0], [...path, 'args', 0], renderedNodes);
        const exponent = this.renderNode(args[1], [...path, 'args', 1], renderedNodes);

        const sup = document.createElement('sup');
        sup.className = 'expr-sup';
        sup.appendChild(exponent);

        powerWrapper.appendChild(base);
        powerWrapper.appendChild(sup);
        wrapper.appendChild(powerWrapper);
        return wrapper;
      }

      if (op === '-' && args.length == 1) {
        wrapper.appendChild(this.createTokenSpan('-', 'unary'));
        wrapper.appendChild(this.renderNode(args[0], [...path, 'args', 0], renderedNodes));
        return wrapper;
      }

      args.forEach((arg, index) => {
        if (index > 0) {
          if (op === '*' && this.shouldElideMultiplication(node, args[index - 1], arg)) {
            // Не добавляем символ умножения для простых случаев
          } else {
            const operatorToken = op === '*' ? '·' : op;
            wrapper.appendChild(this.createTokenSpan(operatorToken, 'operator'));
          }
        }
        wrapper.appendChild(this.renderNode(arg, [...path, 'args', index], renderedNodes));
      });

      return wrapper;
    }

    if (this.isFunctionNode(node)) {
      const fnName = this.getFunctionName(node);
      const args = node.args || [];

      if (fnName === 'abs' && args.length > 0) {
        wrapper.appendChild(this.createTokenSpan('|', 'operator'));
        wrapper.appendChild(this.renderNode(args[0], [...path, 'args', 0], renderedNodes));
        wrapper.appendChild(this.createTokenSpan('|', 'operator'));
        return wrapper;
      }

      if (fnName === 'nthRoot' && args.length > 0) {
        const rootWrapper = document.createElement('span');
        rootWrapper.className = 'expr-nth-root';

        const indexNode = args.length > 1 ? args[1] : null;
        if (indexNode && !this.isDefaultRootIndex(indexNode)) {
          const indexEl = document.createElement('sup');
          indexEl.className = 'expr-root-index';
          indexEl.appendChild(this.renderNode(indexNode, [...path, 'args', 1], renderedNodes));
          rootWrapper.appendChild(indexEl);
        }

        const rootSymbol = document.createElement('span');
        rootSymbol.className = 'expr-root-symbol token';
        rootSymbol.textContent = '√';
        rootWrapper.appendChild(rootSymbol);

        const radicand = this.renderNode(args[0], [...path, 'args', 0], renderedNodes);
        rootWrapper.appendChild(radicand);

        wrapper.appendChild(rootWrapper);
        return wrapper;
      }

      if (fnName) {
        wrapper.appendChild(this.createTokenSpan(fnName, 'variable'));
      }

      wrapper.appendChild(this.createTokenSpan('(', 'paren'));
      args.forEach((arg, index) => {
        if (index > 0) {
          wrapper.appendChild(this.createTokenSpan(',', 'operator'));
        }
        wrapper.appendChild(this.renderNode(arg, [...path, 'args', index], renderedNodes));
      });
      wrapper.appendChild(this.createTokenSpan(')', 'paren'));

      return wrapper;
    }

    if (this.isConstantNode(node)) {
      wrapper.appendChild(this.createTokenSpan(String(node.value), 'number'));
      return wrapper;
    }

    if (this.isSymbolNode(node)) {
      wrapper.appendChild(this.createTokenSpan(node.name || '', 'variable'));
      return wrapper;
    }

    wrapper.appendChild(this.createTokenSpan(node.toString(), 'variable'));
    return wrapper;
  }

  private createFramesFromDom(
    renderedNodes: RenderedNode[],
    rangesContainer: HTMLElement,
    textContainer: HTMLElement,
    exprString: string
  ): void {
    if (renderedNodes.length === 0) {
      this.debugLog('No nodes to render');
      return;
    }

    const textRect = textContainer.getBoundingClientRect();
    const baseOffset = 5;
    const levelHeight = 18;

    const positions = renderedNodes.map((entry) => {
      const rect = entry.element.getBoundingClientRect();
      const left = rect.left - textRect.left;
      const width = Math.max(rect.width, 10);
      return {
        ...entry,
        left: Number.isFinite(left) ? left : 0,
        width
      };
    });

    positions.sort((a, b) => {
      if (a.left !== b.left) return a.left - b.left;
      return a.width - b.width;
    });

    const levels: Array<Array<{ left: number; right: number }>> = [];
    positions.forEach((pos) => {
      const range = { left: pos.left, right: pos.left + pos.width };
      let assignedLevel = -1;

      for (let level = 0; level < levels.length; level++) {
        const overlaps = levels[level].some((item) => this.doRangesOverlap(range.left, range.right, item.left, item.right));
        if (!overlaps) {
          assignedLevel = level;
          break;
        }
      }

      if (assignedLevel === -1) {
        assignedLevel = levels.length;
        levels.push([]);
      }

      levels[assignedLevel].push(range);
      (pos as any).level = assignedLevel;
    });

    const totalHeight = baseOffset + (levels.length + 1) * levelHeight;
    rangesContainer.style.height = `${totalHeight}px`;

    positions.forEach((pos) => {
      const frame = document.createElement('div');
      frame.className = `expression-range level-${(pos as any).level % 8}`;

      frame.style.left = `${pos.left}px`;
      frame.style.width = `${pos.width}px`;
      frame.style.top = `${baseOffset + (pos as any).level * levelHeight}px`;

      frame.dataset.testid = 'expression-frame';
      frame.title = pos.text;
      frame.dataset.text = pos.text;
      frame.dataset.nodeId = '';
      frame.dataset.path = JSON.stringify(pos.path);
      frame.dataset.pathKey = this.pathToKey(pos.path);
      frame.dataset.nodeType = this.getNodeType(pos.node);
      if (this.isOperatorNode(pos.node)) {
        frame.dataset.operator = pos.node.op || '';
        if (pos.node.implicit === true) {
          frame.dataset.implicit = 'true';
        }
      }
      if (this.isFunctionNode(pos.node)) {
        frame.dataset.function = this.getFunctionName(pos.node);
      }

      const labelContainer = document.createElement('div');
      labelContainer.className = 'frame-label-container';

      const labelText = this.getNodeLabel(pos.node);
      if (labelText.length > 1) {
        for (let i = 0; i < labelText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'frame-label';
          charSpan.textContent = labelText[i];
          charSpan.style.left = `${i * 10}px`;
          labelContainer.appendChild(charSpan);
        }
      } else {
        const label = document.createElement('span');
        label.className = 'frame-label frame-label-left';
        label.textContent = labelText;
        label.style.left = '0px';
        label.style.width = `${pos.width}px`;
        labelContainer.appendChild(label);
      }

      frame.appendChild(labelContainer);

      frame.addEventListener('mouseenter', () => {
        const tokens = Array.from(pos.element.querySelectorAll('.token'));
        this.highlightTokens(tokens, true);
      });

      frame.addEventListener('mouseleave', () => {
        const tokens = Array.from(pos.element.querySelectorAll('.token'));
        this.highlightTokens(tokens, false);
      });

      frame.addEventListener('click', (event) => {
        event.stopPropagation();
        document.querySelectorAll('.expression-range').forEach(frameEl => frameEl.classList.remove('active'));
        frame.classList.add('active');

        if (this.config.onFrameClick) {
          this.config.onFrameClick({
            text: pos.text === exprString ? exprString : pos.text,
            path: pos.path
          });
        }
      });

      rangesContainer.appendChild(frame);
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
  private getNodeLabel(node: MathStepsNode | EquationNode): string {
    if (this.isEquationNode(node)) {
      return node.comparator || '=';
    }
    if (this.isOperatorNode(node)) {
      const op = node.op || '?';
      const argsCount = node.args ? node.args.length : 0;
      const labelOp = op === '*' ? '·' : op;

      if (this.isImplicitMultiplicationNode(node)) {
        return argsCount > 2 ? labelOp.repeat(argsCount - 1) : labelOp;
      }

      return argsCount > 2 ? labelOp.repeat(argsCount - 1) : labelOp;
    }

    if (this.isParenthesisNode(node)) {
      return '()';
    }

    if (this.isConstantNode(node)) {
      return String(node.value ?? '');
    }

    if (this.isSymbolNode(node)) {
      return node.name || '';
    }

    return '?';
  }

  private createTokenSpan(text: string, type: 'number' | 'variable' | 'operator' | 'paren' | 'unary'): HTMLElement {
    const tokenSpan = document.createElement('span');
    tokenSpan.className = 'token';
    tokenSpan.textContent = text;
    tokenSpan.style.setProperty('--token-color', getTokenColor(type));

    const tooltip = document.createElement('span');
    tooltip.className = 'token-tooltip';
    tooltip.textContent = getTokenTypeName(type);
    tokenSpan.appendChild(tooltip);

    return tokenSpan;
  }

  private shouldElideMultiplication(node: MathStepsNode, left: MathStepsNode, right: MathStepsNode): boolean {
    if (!this.isImplicitMultiplicationNode(node)) {
      return false;
    }
    return this.isSimpleImplicitOperand(left) && this.isSimpleImplicitOperand(right);
  }

  private isSimpleImplicitOperand(node: MathStepsNode): boolean {
    return this.isConstantNode(node) || this.isSymbolNode(node) || this.isParenthesisNode(node) || this.isFunctionNode(node);
  }

  private getFunctionName(node: MathStepsNode): string {
    const fn = (node as any).fn;
    if (typeof fn === 'string') {
      return fn;
    }
    if (fn && typeof fn === 'object' && 'name' in fn) {
      return (fn as any).name || '';
    }
    return '';
  }

  private isDefaultRootIndex(node: MathStepsNode): boolean {
    return this.isConstantNode(node) && Number(node.value) == 2;
  }

  private nodeToString(node: MathStepsNode | EquationNode): string {
    if (this.isEquationNode(node)) {
      return node.toString();
    }
    return node.toString();
  }

  private doRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return !(end1 <= start2 || end2 <= start1);
  }

  private pathToKey(path: MathStepsPath): string {
    if (!path || path.length === 0) {
      return 'root';
    }
    return path.map(part => String(part)).join('.');
  }

  private getNodeType(node: MathStepsNode | EquationNode): string {
    if (this.isEquationNode(node)) {
      return node.type;
    }
    return node.type || 'Unknown';
  }

  private isEquationNode(node: MathStepsNode | EquationNode): node is EquationNode {
    return (node as EquationNode).type === 'EquationNode';
  }

  private isOperatorNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'OperatorNode' } {
    return !this.isEquationNode(node) && node.type === 'OperatorNode';
  }

  private isParenthesisNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'ParenthesisNode' } {
    return !this.isEquationNode(node) && node.type === 'ParenthesisNode';
  }

  private isFunctionNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'FunctionNode' } {
    return !this.isEquationNode(node) && node.type === 'FunctionNode';
  }

  private isConstantNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'ConstantNode' } {
    return !this.isEquationNode(node) && node.type === 'ConstantNode';
  }

  private isSymbolNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'SymbolNode' } {
    return !this.isEquationNode(node) && node.type === 'SymbolNode';
  }

  private isImplicitMultiplicationNode(node: MathStepsNode | EquationNode): node is MathStepsNode & { type: 'OperatorNode' } {
    return this.isOperatorNode(node) && node.op === '*' && node.implicit === true;
  }
}
