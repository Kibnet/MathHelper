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
  'remove_double_parens': 'Убирает лишний уровень скобок, оставляя одну группу для сохранения приоритета.',
  'remove_unary_parens': 'Убирает скобки после унарного минуса, если внутри атомарное выражение.',
  'distributive_forward': 'Раскрывает умножение на сумму/разность, используя распределительное свойство: a*(b+c) = a*b + a*c',
  'distributive_forward_left': 'Раскрывает умножение на сумму/разность, используя распределительное свойство: (a+b)*c = a*c + b*c',
  'assoc_flatten_add': 'Снимает ассоциативные скобки в сложении, объединяя вложенные суммы.',
  'assoc_flatten_mul': 'Снимает ассоциативные скобки в умножении, объединяя вложенные произведения.',
  'distribute_unary_minus': 'Распределяет унарный минус по сумме: -(a+b) = -a + -b.',
  'factor_unary_minus': 'Выносит общий минус из суммы: -a + -b = -(a+b).',
  'factor_common_left_all': 'Выносит общий множитель слева для всей суммы: a*b + a*c + ... = a*(b+c+...).',
  'factor_common_right_all': 'Выносит общий множитель справа для всей суммы: b*a + c*a + ... = (b+c+...)*a.',
  'div_to_mul_inverse': 'Заменяет деление на умножение на обратное: a/b = a*(1/b).',
  'remove_double_neg_div': 'Убирает двойной минус в дроби: (-a)/(-b) = a/b.',
  'pull_unary_minus_div_left': 'Выносит минус из числителя: (-a)/b = -(a/b).',
  'pull_unary_minus_div_right': 'Выносит минус из знаменателя: a/(-b) = -(a/b).',
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

const RULE_DESCRIPTION_PREFIXES: Array<[string, string]> = [
  ['eval_mul_', 'Вычисляет произведение двух числовых констант, заменяя выражение результатом.'],
  ['eval_add_', 'Вычисляет сумму двух числовых констант, заменяя выражение результатом.'],
  ['sum_to_sub_', 'Преобразует сложение с отрицательным слагаемым в вычитание: a + (-b) = a - b.'],
  ['sub_to_sum_', 'Преобразует вычитание в сложение с отрицательным слагаемым: a - b = a + (-b).'],
  ['pull_unary_minus_mul_', 'Выносит минус из множителя: -a*b = -(a*b).']
];

function getRuleDescription(ruleId: string): string {
  if (RULE_DESCRIPTIONS[ruleId]) {
    return RULE_DESCRIPTIONS[ruleId];
  }
  for (const [prefix, description] of RULE_DESCRIPTION_PREFIXES) {
    if (ruleId.startsWith(prefix)) {
      return description;
    }
  }
  return 'Описание для этого правила недоступно.';
}

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
    const description = getRuleDescription(rule.id);
    
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
