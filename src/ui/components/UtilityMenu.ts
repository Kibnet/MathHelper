/**
 * Выпадающее меню утилит в заголовке
 */

export type UtilityType = 'factorization' | 'fraction' | 'lcm';

export interface UtilityMenuOptions {
  /** Колбэк при выборе утилиты */
  onSelect: (utility: UtilityType) => void;
}

export class UtilityMenu {
  private button: HTMLElement;
  private dropdown: HTMLElement;
  private isOpen = false;
  private options: UtilityMenuOptions;

  constructor(containerId: string, options: UtilityMenuOptions) {
    this.options = options;
    
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    // Создаём кнопку меню
    this.button = this.createButton();
    this.dropdown = this.createDropdown();
    
    container.appendChild(this.button);
    container.appendChild(this.dropdown);

    this.setupEventHandlers();
  }

  /**
   * Создаёт кнопку меню
   */
  private createButton(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'utility-menu-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');
    button.innerHTML = `
      <span class="utility-menu-icon">🛠️</span>
      <span class="utility-menu-text">Утилиты</span>
      <span class="utility-menu-arrow">▼</span>
    `;
    return button;
  }

  /**
   * Создаёт выпадающий список
   */
  private createDropdown(): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'utility-menu-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.innerHTML = `
      <button type="button" class="utility-menu-item" data-utility="factorization" role="menuitem">
        <span class="utility-item-icon">🔢</span>
        <span class="utility-item-text">Факторизация числа</span>
      </button>
      <button type="button" class="utility-menu-item" data-utility="fraction" role="menuitem">
        <span class="utility-item-icon">➗</span>
        <span class="utility-item-text">Конвертер дробей</span>
      </button>
      <button type="button" class="utility-menu-item" data-utility="lcm" role="menuitem">
        <span class="utility-item-icon">🔗</span>
        <span class="utility-item-text">НОК (общее кратное)</span>
      </button>
    `;
    return dropdown;
  }

  /**
   * Настраивает обработчики событий
   */
  private setupEventHandlers(): void {
    // Открытие/закрытие по клику на кнопку
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Выбор пункта меню
    this.dropdown.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const menuItem = target.closest('.utility-menu-item') as HTMLElement;
      
      if (menuItem) {
        const utility = menuItem.dataset.utility as UtilityType;
        this.close();
        this.options.onSelect(utility);
      }
    });

    // Закрытие по клику вне меню
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.utility-menu-button') && !target.closest('.utility-menu-dropdown')) {
        this.close();
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        this.button.focus();
      }
    });
  }

  /**
   * Открывает меню
   */
  open(): void {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.dropdown.classList.add('visible');
    this.button.setAttribute('aria-expanded', 'true');
    this.button.classList.add('active');
  }

  /**
   * Закрывает меню
   */
  close(): void {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.dropdown.classList.remove('visible');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.classList.remove('active');
  }

  /**
   * Переключает состояние меню
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Возвращает кнопку меню (для позиционирования панелей)
   */
  getButton(): HTMLElement {
    return this.button;
  }
}
