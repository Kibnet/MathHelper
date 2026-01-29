/**
 * Компонент панели команд (доступных преобразований)
 */
import type { FrameSelection, MathStepsOperation } from '../../types/index.js';

export interface CommandPanelConfig {
  onCommandClick?: (operation: MathStepsOperation, assumptions: string[]) => void;
}

export class CommandPanel {
  private container: HTMLElement;
  private config: CommandPanelConfig;
  private currentSelection: FrameSelection | null = null;
  private currentExpression: string = '';

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
   * @param selection - информация о выбранном подвыражении
   * @param operations - список доступных операций
   * @param currentExpression - полное текущее выражение (для подсветки изменений)
   */
  showCommands(selection: FrameSelection, operations: MathStepsOperation[], currentExpression: string = ''): void {
    this.currentSelection = selection;
    this.currentExpression = currentExpression;
    this.container.innerHTML = '';
    
    // Показываем выбранное выражение
    const selectionDiv = document.createElement('div');
    selectionDiv.className = 'command-selection';
    selectionDiv.textContent = `Выбрано: ${selection.text}`;
    this.container.appendChild(selectionDiv);
    
    if (operations.length === 0) {
      this.showPlaceholder('Нет доступных преобразований');
      return;
    }
    
    // Группируем правила по категориям
    const grouped: Record<string, MathStepsOperation[]> = {};
    operations.forEach(operation => {
      if (!grouped[operation.category]) grouped[operation.category] = [];
      grouped[operation.category].push(operation);
    });
    
    // Отображаем сгруппированные команды
    Object.entries(grouped).forEach(([category, categoryRules]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'command-category';
      categoryDiv.textContent = category;
      this.container.appendChild(categoryDiv);
      
      categoryRules.forEach(operation => {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.dataset.testid = 'command-item';
        item.dataset.operationId = operation.id;
        item.dataset.operationName = operation.name;
        item.dataset.operationPreview = operation.preview;
        const changeType = this.getChangeType(operation);
        if (changeType) {
          item.dataset.changeType = changeType;
        }
        
        const description = document.createElement('div');
        description.className = 'command-description';
        description.textContent = operation.description;

        const preview = document.createElement('div');
        preview.className = 'command-preview';
        // Подсветка изменений: сравниваем полное выражение с результатом преобразования
        preview.innerHTML = this.highlightChanges(this.currentExpression || selection.text, operation.preview);

        item.appendChild(description);
        item.appendChild(preview);

        let selectedAssumptions: string[] = [];
        if (operation.assumptions && operation.assumptions.length > 0) {
          const assumptionsContainer = document.createElement('div');
          assumptionsContainer.className = 'command-assumptions';

          operation.assumptions.forEach((assumption) => {
            const label = document.createElement('label');
            label.className = 'command-assumption';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('click', (event) => event.stopPropagation());
            checkbox.addEventListener('change', () => {
              if (checkbox.checked) {
                selectedAssumptions = [...selectedAssumptions, assumption];
              } else {
                selectedAssumptions = selectedAssumptions.filter(item => item !== assumption);
              }
            });

            const text = document.createElement('span');
            text.textContent = assumption;

            label.appendChild(checkbox);
            label.appendChild(text);
            assumptionsContainer.appendChild(label);
          });

          item.appendChild(assumptionsContainer);
        }
        
        item.addEventListener('click', () => {
          if (this.config.onCommandClick && this.currentSelection) {
            this.config.onCommandClick(operation, selectedAssumptions);
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
    this.currentSelection = null;
    this.container.innerHTML = '';
    this.showPlaceholder('Выберите фрейм для просмотра преобразований');
  }

  private getChangeType(operation: MathStepsOperation): string {
    if (operation.transform?.changeType) {
      return operation.transform.changeType;
    }
    if (operation.id.startsWith('solve:')) {
      const parts = operation.id.split(':');
      return parts[1] || '';
    }
    if (operation.id.startsWith('custom:')) {
      const parts = operation.id.split(':');
      return parts[1] || '';
    }
    return '';
  }

  /**
   * Подсвечивает изменившуюся часть в превью
   * Сравнивает исходное выражение с результатом и оборачивает отличия в <mark>
   */
  private highlightChanges(original: string, result: string): string {
    // Экранируем HTML
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const origEsc = escapeHtml(original);
    const resEsc = escapeHtml(result);

    // Если строки одинаковые - просто возвращаем
    if (origEsc === resEsc) {
      return resEsc;
    }

    // Находим общий префикс
    let prefixLen = 0;
    const minLen = Math.min(origEsc.length, resEsc.length);
    while (prefixLen < minLen && origEsc[prefixLen] === resEsc[prefixLen]) {
      prefixLen++;
    }

    // Находим общий суффикс (не заходя за префикс)
    let suffixLen = 0;
    while (
      suffixLen < minLen - prefixLen &&
      origEsc[origEsc.length - 1 - suffixLen] === resEsc[resEsc.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    // Разбиваем результат на части
    const prefix = resEsc.slice(0, prefixLen);
    const changed = resEsc.slice(prefixLen, resEsc.length - suffixLen || undefined);
    const suffix = suffixLen > 0 ? resEsc.slice(-suffixLen) : '';

    // Если изменённая часть пустая - всё удалено, подсветим место
    if (changed === '') {
      return `${prefix}<mark class="preview-deleted">∅</mark>${suffix}`;
    }

    return `${prefix}<mark class="preview-changed">${changed}</mark>${suffix}`;
  }
}
