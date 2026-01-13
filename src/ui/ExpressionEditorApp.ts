/**
 * Главное приложение редактора выражений
 * Управляет всеми компонентами и координирует их взаимодействие
 */
import { MathStepsEngine } from '../core/mathsteps-engine.js';
import { ExpressionDisplay } from './components/ExpressionDisplay.js';
import { CommandPanel } from './components/CommandPanel.js';
import { HistoryPanel } from './components/HistoryPanel.js';
import { DescriptionPanel } from './components/DescriptionPanel.js';
import type { FrameSelection, MathStepsOperation } from '../types/index.js';

export class ExpressionEditorApp {
  // UI компоненты
  private expressionDisplay: ExpressionDisplay;
  private commandPanel: CommandPanel;
  private historyPanel: HistoryPanel;
  private descriptionPanel: DescriptionPanel;
  
  // DOM элементы
  private expressionInput: HTMLInputElement;
  private errorMessage: HTMLElement;
  
  // Состояние приложения
  private currentExpression = '';
  private mathStepsEngine: MathStepsEngine;
  private debug = false;

  constructor() {
    // Инициализация DOM элементов
    this.expressionInput = this.getElement<HTMLInputElement>('expressionInput');
    this.errorMessage = this.getElement('errorMessage');
    
    // Инициализация компонентов
    this.expressionDisplay = new ExpressionDisplay('expressionContainer', {
      onFrameClick: (selection) => this.handleFrameClick(selection)
    });
    
    this.commandPanel = new CommandPanel('commandsPanel', {
      onCommandClick: (operation) => this.handleCommandClick(operation)
    });
    
    this.historyPanel = new HistoryPanel('historyPanel', {
      onHistoryClick: (index) => this.handleHistoryClick(index)
    });
    
    this.descriptionPanel = new DescriptionPanel('descriptionPanel');
    
    this.mathStepsEngine = new MathStepsEngine();

    // Настройка обработчиков событий
    this.setupEventHandlers();
    
    // Автоматическая загрузка примера
    this.loadExample();
  }

  /**
   * Получает DOM элемент по ID с проверкой типа
   */
  private getElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    return element as T;
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    const buildBtn = this.getElement('buildBtn');
    const clearBtn = this.getElement('clearBtn');
    
    buildBtn.addEventListener('click', () => this.buildExpression());
    clearBtn.addEventListener('click', () => this.clearAll());
    
    this.expressionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.buildExpression();
      }
    });

    this.setupPanelToggles();
  }

  /**
   * Настройка обработчиков для мобильных сворачиваемых панелей
   */
  private setupPanelToggles(): void {
    const toggleButtons = document.querySelectorAll<HTMLButtonElement>('.panel-toggle[data-panel-toggle]');
    toggleButtons.forEach((button) => {
      button.addEventListener('click', () => this.togglePanel(button));
    });
  }

  /**
   * Переключает видимость панели и обновляет доступность
   */
  private togglePanel(button: HTMLButtonElement): void {
    const targetId = button.dataset.panelToggle;
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    const panel = target.closest('.collapsible-panel');
    if (!panel) {
      return;
    }

    const isCollapsed = panel.classList.toggle('collapsed');
    button.setAttribute('aria-expanded', (!isCollapsed).toString());
    button.textContent = isCollapsed ? 'Показать' : 'Скрыть';
  }

  /**
   * Строит и отображает выражение
   */
  private buildExpression(): void {
    const input = this.expressionInput.value.trim();
    
    if (!input) {
      this.showError('Пожалуйста, введите выражение');
      return;
    }

    try {
      const node = this.mathStepsEngine.parse(input);
      const exprString = this.mathStepsEngine.stringify(node);
      this.currentExpression = exprString;
      
      // Добавляем в историю
      this.historyPanel.addState(exprString, 'Исходное выражение', node);
      
      // Отображаем выражение с AST деревом
      this.expressionDisplay.render(exprString, node);
      this.hideError();
    } catch (error) {
      this.showError((error as Error).message);
    }
  }

  /**
   * Очищает всё приложение
   */
  private clearAll(): void {
    this.expressionInput.value = '';
    this.expressionDisplay.showPlaceholder(
      'Введите выражение и нажмите "Построить"<br><br>' +
      '• Цветные фреймы показывают подвыражения<br>' +
      '• Клик на фрейм → показать команды<br>' +
      '• Наведение → подсветка текста'
    );
    this.commandPanel.clear();
    this.historyPanel.clear();
    this.descriptionPanel.clear();
    this.hideError();
    this.currentExpression = '';
  }

  /**
   * Обработчик клика на фрейм
   */
  private handleFrameClick(selection: FrameSelection): void {
    if (!this.currentExpression) {
      this.showError('Ошибка: нет текущего выражения');
      return;
    }

    const operations = this.mathStepsEngine.listOps(this.currentExpression, selection.path);
    this.commandPanel.showCommands(selection, operations);
  }

  private debugLog(...args: unknown[]): void {
    if (!this.debug) {
      return;
    }
    console.log(...args);
  }

  /**
   * Обработчик клика на команду
   */
  private handleCommandClick(operation: MathStepsOperation): void {
    this.debugLog('Applying transformation:', operation.name, 'to path:', operation.selectionPath);
    try {
      if (!this.currentExpression) {
        this.showError('Ошибка: нет текущего выражения');
        return;
      }

      const result = this.mathStepsEngine.apply(this.currentExpression, operation.selectionPath, operation.id);
      const newExpr = this.mathStepsEngine.stringify(result.newNode);
      this.currentExpression = newExpr;

      this.descriptionPanel.showRule(operation);
      this.historyPanel.addState(newExpr, operation.name, result.newNode);

      this.expressionInput.value = newExpr;
      this.expressionDisplay.render(newExpr, result.newNode);
      this.commandPanel.clear();
    } catch (error) {
      this.showError('Ошибка преобразования: ' + (error as Error).message);
    }
  }

  /**
   * Обработчик клика на элемент истории
   */
  private handleHistoryClick(index: number): void {
    const state = this.historyPanel.getState(index);
    if (!state) return;
    
    this.historyPanel.setCurrentIndex(index);
    this.expressionInput.value = state.expression;
    this.currentExpression = state.expression;
    
    this.expressionDisplay.render(state.expression, state.node);
  }

  /**
   * Показывает сообщение об ошибке
   */
  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
  }

  /**
   * Скрывает сообщение об ошибке
   */
  private hideError(): void {
    this.errorMessage.classList.remove('show');
  }

  /**
   * Загружает пример при старте
   */
  private loadExample(): void {
    setTimeout(() => {
      this.expressionInput.value = '2x + 3 * -(4 --- 2.4 )/ 23+abc';
      this.buildExpression();
    }, 500);
  }
}

// Инициализация приложения при загрузке DOM
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new ExpressionEditorApp();
  });
}
