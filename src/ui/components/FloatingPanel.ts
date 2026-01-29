/**
 * Базовый класс для плавающих панелей
 * Обеспечивает общую функциональность: открытие, закрытие, позиционирование
 */

export interface FloatingPanelOptions {
  /** Заголовок панели */
  title: string;
  /** Ширина панели в пикселях */
  width?: number;
  /** Колбэк при закрытии панели */
  onClose?: () => void;
}

export abstract class FloatingPanel {
  protected element: HTMLElement;
  protected contentElement: HTMLElement;
  protected options: Required<FloatingPanelOptions>;
  protected isVisible = false;

  constructor(options: FloatingPanelOptions) {
    this.options = {
      title: options.title,
      width: options.width ?? 360,
      onClose: options.onClose ?? (() => {})
    };

    this.element = this.createPanel();
    this.contentElement = this.element.querySelector('.floating-panel-content')!;
    
    // Добавляем в DOM, но скрыто
    document.body.appendChild(this.element);
    
    // Обработчик клика вне панели
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    
    // Обработчик Escape
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Создаёт DOM-структуру панели
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'floating-panel';
    panel.style.width = `${this.options.width}px`;
    
    panel.innerHTML = `
      <div class="floating-panel-header">
        <h4>${this.options.title}</h4>
        <button type="button" class="floating-panel-close" aria-label="Закрыть">×</button>
      </div>
      <div class="floating-panel-content"></div>
    `;

    // Обработчик кнопки закрытия
    const closeBtn = panel.querySelector('.floating-panel-close')!;
    closeBtn.addEventListener('click', () => this.hide());

    // Предотвращаем закрытие при клике внутри панели
    panel.addEventListener('click', (e) => e.stopPropagation());

    return panel;
  }

  /**
   * Показывает панель, позиционируя относительно триггера
   * @param triggerElement - элемент, относительно которого позиционировать
   */
  show(triggerElement?: HTMLElement): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.element.classList.add('visible');
    
    // Позиционируем панель
    this.positionPanel(triggerElement);
    
    // Добавляем обработчики
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleKeyDown);
    }, 0);

    // Фокус на первый input
    const firstInput = this.element.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  }

  /**
   * Скрывает панель
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.element.classList.remove('visible');
    
    // Убираем обработчики
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    this.options.onClose();
  }

  /**
   * Переключает видимость панели
   */
  toggle(triggerElement?: HTMLElement): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(triggerElement);
    }
  }

  /**
   * Проверяет, видна ли панель
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Позиционирует панель на экране
   */
  private positionPanel(triggerElement?: HTMLElement): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelRect = this.element.getBoundingClientRect();

    let left: number;
    let top: number;

    if (triggerElement) {
      const triggerRect = triggerElement.getBoundingClientRect();
      
      // По умолчанию под триггером, выровнено по правому краю
      left = triggerRect.right - panelRect.width;
      top = triggerRect.bottom + 8;
      
      // Если не влезает снизу — показываем сверху
      if (top + panelRect.height > viewportHeight - 20) {
        top = triggerRect.top - panelRect.height - 8;
      }
      
      // Если не влезает слева — сдвигаем вправо
      if (left < 20) {
        left = 20;
      }
    } else {
      // Центрируем на экране
      left = (viewportWidth - panelRect.width) / 2;
      top = (viewportHeight - panelRect.height) / 2;
    }

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  /**
   * Обработчик клика вне панели
   */
  private handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Не закрываем если клик по меню утилит
    if (target.closest('.utility-menu') || target.closest('.utility-menu-dropdown')) {
      return;
    }
    
    this.hide();
  }

  /**
   * Обработчик нажатия клавиш
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.hide();
    }
  }

  /**
   * Устанавливает содержимое панели
   * @param html - HTML-строка или DOM-элемент
   */
  protected setContent(html: string | HTMLElement): void {
    if (typeof html === 'string') {
      this.contentElement.innerHTML = html;
    } else {
      this.contentElement.innerHTML = '';
      this.contentElement.appendChild(html);
    }
  }

  /**
   * Уничтожает панель и освобождает ресурсы
   */
  destroy(): void {
    this.hide();
    this.element.remove();
  }

  /**
   * Абстрактный метод для инициализации содержимого панели
   * Должен быть реализован в наследниках
   */
  protected abstract initContent(): void;
}
