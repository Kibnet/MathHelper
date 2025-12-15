/**
 * Компонент панели команд (доступных преобразований)
 */
import type { ASTNode } from '../../types/index.js';

export interface CommandPanelConfig {
  onCommandClick?: (rule: any, node: ASTNode) => void;
}

export class CommandPanel {
  private container: HTMLElement;
  private config: CommandPanelConfig;
  private currentNode: ASTNode | null = null;

  constructor(containerId: string, config: CommandPanelConfig = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id "${containerId}" not found`);
    }
    this.container = element;
    this.config = config;
  }

  /**
   * Показывает доступные команды для выбранного узла
   */
  showCommands(node: ASTNode, text: string, rules: any[]): void {
    this.currentNode = node;
    this.container.innerHTML = '';
    
    // Показываем выбранное выражение
    const selectionDiv = document.createElement('div');
    selectionDiv.style.cssText = `
      background: var(--accent-soft);
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 15px;
      color: var(--accent);
      font-family: 'Courier New', monospace;
      word-break: break-all;
    `;
    selectionDiv.textContent = `Выбрано: ${text}`;
    this.container.appendChild(selectionDiv);
    
    if (rules.length === 0) {
      this.showPlaceholder('Нет доступных преобразований');
      return;
    }
    
    // Группируем правила по категориям
    const grouped: Record<string, any[]> = {};
    rules.forEach(rule => {
      if (!grouped[rule.category]) grouped[rule.category] = [];
      grouped[rule.category].push(rule);
    });
    
    // Отображаем сгруппированные команды
    Object.entries(grouped).forEach(([category, categoryRules]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'command-category';
      if (category === '1. Computation') categoryDiv.style.marginTop = '0';
      if (category === '1. Computation') categoryDiv.style.borderTop = 'none';
      categoryDiv.textContent = category;
      this.container.appendChild(categoryDiv);
      
      categoryRules.forEach(rule => {
        const item = document.createElement('div');
        item.className = 'command-item';
        
        const name = document.createElement('div');
        name.className = 'command-name';
        name.textContent = rule.name;
        
        const preview = document.createElement('div');
        preview.className = 'command-preview';
        preview.textContent = rule.preview;
        
        item.appendChild(name);
        item.appendChild(preview);
        
        item.addEventListener('click', () => {
          if (this.config.onCommandClick && this.currentNode) {
            this.config.onCommandClick(rule, this.currentNode);
          }
        });
        
        this.container.appendChild(item);
      });
    });
  }

  /**
   * Показывает placeholder
   */
  showPlaceholder(message: string): void {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = message;
    this.container.appendChild(placeholder);
  }

  /**
   * Очищает панель
   */
  clear(): void {
    this.currentNode = null;
    this.showPlaceholder('Выберите фрейм для просмотра преобразований');
  }
}
