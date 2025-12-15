/**
 * Компонент панели описания правил
 */

// Описания правил
const RULE_DESCRIPTIONS: Record<string, string> = {
  'eval_mul': 'Вычисляет произведение двух числовых констант, заменяя выражение результатом.',
  'eval_div': 'Вычисляет деление двух числовых констант, заменяя выражение результатом.',
  'eval_add_sub': 'Вычисляет сумму или разность двух числовых констант, заменяя выражение результатом.',
  'remove_mult_one': 'Убирает умножение на 1, так как умножение любого выражения на 1 даёт то же выражение (свойство идентичности).',
  'simplify_mult_zero': 'Упрощает умножение на 0 до 0, так как любое выражение, умноженное на 0, равно 0.',
  'remove_div_one': 'Убирает деление на 1, так как деление любого выражения на 1 даёт то же выражение.',
  'remove_add_zero': 'Убирает сложение с 0, так как прибавление 0 к любому выражению даёт то же выражение (свойство идентичности).',
  'remove_sub_zero': 'Убирает вычитание 0, так как вычитание 0 из любого выражения даёт то же выражение.',
  'double_negation': 'Убирает двойное отрицание, так как двойное отрицание выражения даёт исходное выражение.',
  'remove_parens': 'Убирает ненужные скобки вокруг не-операторных выражений.',
  'distributive_forward': 'Раскрывает умножение на сумму/разность, используя распределительное свойство: a*(b+c) = a*b + a*c',
  'distributive_forward_left': 'Раскрывает умножение на сумму/разность, используя распределительное свойство: (a+b)*c = a*c + b*c',
  'commutative_mul': 'Меняет местами операнды умножения, используя свойство коммутативности: a*b = b*a',
  'commutative_add': 'Меняет местами операнды сложения, используя свойство коммутативности: a+b = b+a',
  'add_parens': 'Оборачивает выражение в скобки для группировки.',
  'add_double_neg': 'Применяет двойное отрицание к выражению.',
  'multiply_by_one': 'Умножает выражение на 1 (тождественное преобразование).',
  'divide_by_one': 'Делит выражение на 1 (тождественное преобразование).',
  'add_zero': 'Прибавляет 0 к выражению (тождественное преобразование).',
  'expand_implicit_mul': 'Раскрывает неявное умножение, превращая его в явный оператор * (2a → 2*a, abc → a*b*c)',
  'collapse_to_implicit_mul': 'Сворачивает явное умножение в неявное, убирая оператор * (2*a → 2a, a*b*c → abc)'
};

export class DescriptionPanel {
  private container: HTMLElement;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id "${containerId}" not found`);
    }
    this.container = element;
  }

  /**
   * Показывает описание правила
   */
  showRule(rule: any): void {
    const description = RULE_DESCRIPTIONS[rule.id] || 'Описание для этого правила недоступно.';
    
    this.container.innerHTML = `
      <p><strong>Правило:</strong> ${rule.name}</p>
      <p><strong>Категория:</strong> ${rule.category}</p>
      <p><strong>Предпросмотр:</strong> <code>${rule.preview}</code></p>
      <p><strong>Описание:</strong> ${description}</p>
    `;
  }

  /**
   * Показывает placeholder
   */
  showPlaceholder(): void {
    this.container.innerHTML = '<p class="placeholder">Выберите преобразование для просмотра описания</p>';
  }

  /**
   * Очищает панель
   */
  clear(): void {
    this.showPlaceholder();
  }
}
