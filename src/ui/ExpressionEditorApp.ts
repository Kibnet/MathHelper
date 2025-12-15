/**
 * Главное приложение редактора выражений
 * Управляет всеми компонентами и координирует их взаимодействие
 */
import { ExpressionParser, resetIdCounter } from '../core/parser.js';
import { expressionToString } from '../utils/helpers.js';
import { ExpressionDisplay } from './components/ExpressionDisplay.js';
import { CommandPanel } from './components/CommandPanel.js';
import { HistoryPanel } from './components/HistoryPanel.js';
import { DescriptionPanel } from './components/DescriptionPanel.js';
import type { ASTNode } from '../types/index.js';

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
  private currentExpression: string | null = null;
  private currentNode: ASTNode | null = null;

  constructor() {
    // Инициализация DOM элементов
    this.expressionInput = this.getElement<HTMLInputElement>('expressionInput');
    this.errorMessage = this.getElement('errorMessage');
    
    // Инициализация компонентов
    this.expressionDisplay = new ExpressionDisplay('expressionContainer', {
      onFrameClick: (node, text, rules) => this.handleFrameClick(node, text, rules)
    });
    
    this.commandPanel = new CommandPanel('commandsPanel', {
      onCommandClick: (rule, node) => this.handleCommandClick(rule, node)
    });
    
    this.historyPanel = new HistoryPanel('historyPanel', {
      onHistoryClick: (index) => this.handleHistoryClick(index)
    });
    
    this.descriptionPanel = new DescriptionPanel('descriptionPanel');
    
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
      resetIdCounter();
      const parser = new ExpressionParser(input);
      const ast = parser.parse();
      this.currentNode = ast;
      
      const exprString = expressionToString(ast);
      this.currentExpression = exprString;
      
      // Добавляем в историю
      this.historyPanel.addState(exprString, 'Исходное выражение', ast);
      
      // Отображаем выражение
      this.expressionDisplay.render(exprString);
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
    this.currentExpression = null;
    this.currentNode = null;
  }

  /**
   * Обработчик клика на фрейм
   */
  private handleFrameClick(node: ASTNode, text: string, rules: any[]): void {
    this.commandPanel.showCommands(node, text, rules);
  }

  /**
   * Обработчик клика на команду
   */
  private handleCommandClick(rule: any, node: ASTNode): void {
    console.log('Applying transformation:', rule.name, 'to node:', node);
    try {
      const newNode = rule.apply(node);
      const newExpr = expressionToString(newNode);
      
      // Добавляем в историю
      this.historyPanel.addState(newExpr, rule.name, newNode);
      
      // Показываем описание
      this.descriptionPanel.showRule(rule);
      
      // Обновляем выражение
      this.expressionInput.value = newExpr;
      this.buildExpression();
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
    this.currentNode = state.node;
    this.currentExpression = state.expression;
    
    this.expressionDisplay.render(state.expression);
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
