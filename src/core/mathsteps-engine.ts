/**
 * Адаптер для работы с mathsteps (Kibnet)
 */
import type {
  EquationNode,
  MathStepsNode,
  MathStepsOperation,
  MathStepsPath,
  MathStepsTransform,
  MathStepsTransformPreview
} from '../types/index.js';

import mathsteps from 'mathsteps';
import * as mathjs from 'mathjs';

type EquationSplit = {
  left: string;
  right: string;
  comparator: string;
};

const COMPARATORS = ['<=', '>=', '=', '<', '>'];

const CATEGORY_ORDER = [
  'Арифметика',
  'Упрощения',
  'Дроби',
  'Степени и корни',
  'Преобразования',
  'Функции',
  'Уравнения'
];

const CHANGE_TYPE_CATEGORY: Record<string, string> = {
  SIMPLIFY_ARITHMETIC: 'Арифметика',

  DIVISION_BY_NEGATIVE_ONE: 'Упрощения',
  DIVISION_BY_ONE: 'Упрощения',
  MULTIPLY_BY_ZERO: 'Упрощения',
  REARRANGE_COEFF: 'Упрощения',
  REDUCE_EXPONENT_BY_ZERO: 'Упрощения',
  REDUCE_ZERO_NUMERATOR: 'Упрощения',
  REMOVE_ADDING_ZERO: 'Упрощения',
  REMOVE_EXPONENT_BY_ONE: 'Упрощения',
  REMOVE_EXPONENT_BASE_ONE: 'Упрощения',
  REMOVE_MULTIPLYING_BY_NEGATIVE_ONE: 'Упрощения',
  REMOVE_MULTIPLYING_BY_ONE: 'Упрощения',
  RESOLVE_DOUBLE_MINUS: 'Упрощения',

  BREAK_UP_FRACTION: 'Дроби',
  CANCEL_MINUSES: 'Дроби',
  CANCEL_TERMS: 'Дроби',
  SIMPLIFY_FRACTION: 'Дроби',
  SIMPLIFY_SIGNS: 'Дроби',
  FIND_GCD: 'Дроби',
  CANCEL_GCD: 'Дроби',
  CONVERT_MIXED_NUMBER_TO_IMPROPER_FRACTION: 'Дроби',
  IMPROPER_FRACTION_NUMERATOR: 'Дроби',
  ADD_FRACTIONS: 'Дроби',
  ADD_NUMERATORS: 'Дроби',
  COMBINE_NUMERATORS: 'Дроби',
  COMMON_DENOMINATOR: 'Дроби',
  CONVERT_INTEGER_TO_FRACTION: 'Дроби',
  DIVIDE_FRACTION_FOR_ADDITION: 'Дроби',
  MULTIPLY_DENOMINATORS: 'Дроби',
  MULTIPLY_NUMERATORS: 'Дроби',
  MULTIPLY_FRACTIONS: 'Дроби',

  ADD_EXPONENT_OF_ONE: 'Степени и корни',
  COLLECT_CONSTANT_EXPONENTS: 'Степени и корни',
  COLLECT_POLYNOMIAL_EXPONENTS: 'Степени и корни',
  MULTIPLY_POLYNOMIAL_TERMS: 'Степени и корни',
  EXPAND_EXPONENT: 'Степени и корни',
  CANCEL_EXPONENT: 'Степени и корни',
  CANCEL_EXPONENT_AND_ROOT: 'Степени и корни',
  CANCEL_ROOT: 'Степени и корни',
  NTH_ROOT_VALUE: 'Степени и корни',
  FACTOR_INTO_PRIMES: 'Степени и корни',
  GROUP_TERMS_BY_ROOT: 'Степени и корни',
  CONVERT_MULTIPLICATION_TO_EXPONENT: 'Степени и корни',
  DISTRIBUTE_NTH_ROOT: 'Степени и корни',
  EVALUATE_DISTRIBUTED_NTH_ROOT: 'Степени и корни',
  COMBINE_UNDER_ROOT: 'Степени и корни',
  ADD_NTH_ROOTS: 'Степени и корни',
  MULTIPLY_NTH_ROOTS: 'Степени и корни',

  DISTRIBUTE: 'Преобразования',
  DISTRIBUTE_NEGATIVE_ONE: 'Преобразования',
  SIMPLIFY_TERMS: 'Преобразования',
  COLLECT_AND_COMBINE_LIKE_TERMS: 'Преобразования',
  COLLECT_LIKE_TERMS: 'Преобразования',
  ADD_COEFFICIENT_OF_ONE: 'Преобразования',
  ADD_POLYNOMIAL_TERMS: 'Преобразования',
  GROUP_COEFFICIENTS: 'Преобразования',
  UNARY_MINUS_TO_NEGATIVE_ONE: 'Преобразования',
  MULTIPLY_COEFFICIENTS: 'Преобразования',
  MULTIPLY_BY_INVERSE: 'Преобразования',
  SIMPLIFY_DIVISION: 'Преобразования',

  ABSOLUTE_VALUE: 'Функции',

  ADD_TO_BOTH_SIDES: 'Уравнения',
  DIVIDE_FROM_BOTH_SIDES: 'Уравнения',
  MULTIPLY_BOTH_SIDES_BY_INVERSE_FRACTION: 'Уравнения',
  MULTIPLY_BOTH_SIDES_BY_NEGATIVE_ONE: 'Уравнения',
  MULTIPLY_TO_BOTH_SIDES: 'Уравнения',
  SIMPLIFY_LEFT_SIDE: 'Уравнения',
  SIMPLIFY_RIGHT_SIDE: 'Уравнения',
  SUBTRACT_FROM_BOTH_SIDES: 'Уравнения',
  SWAP_SIDES: 'Уравнения',
  FIND_ROOTS: 'Уравнения',
  STATEMENT_IS_TRUE: 'Уравнения',
  STATEMENT_IS_FALSE: 'Уравнения',

  FACTOR_SYMBOL: 'Преобразования',
  FACTOR_DIFFERENCE_OF_SQUARES: 'Преобразования',
  FACTOR_PERFECT_SQUARE: 'Преобразования',
  FACTOR_SUM_PRODUCT_RULE: 'Преобразования',
  BREAK_UP_TERM: 'Преобразования'
};

const CHANGE_TYPE_ORDER: Record<string, number> = (() => {
  const order: Record<string, number> = {};
  const lists: Array<[string, string[]]> = [
    ['Арифметика', [
      'SIMPLIFY_ARITHMETIC'
    ]],
    ['Упрощения', [
      'DIVISION_BY_NEGATIVE_ONE',
      'DIVISION_BY_ONE',
      'MULTIPLY_BY_ZERO',
      'REARRANGE_COEFF',
      'REDUCE_EXPONENT_BY_ZERO',
      'REDUCE_ZERO_NUMERATOR',
      'REMOVE_ADDING_ZERO',
      'REMOVE_EXPONENT_BY_ONE',
      'REMOVE_EXPONENT_BASE_ONE',
      'REMOVE_MULTIPLYING_BY_NEGATIVE_ONE',
      'REMOVE_MULTIPLYING_BY_ONE',
      'RESOLVE_DOUBLE_MINUS'
    ]],
    ['Дроби', [
      'BREAK_UP_FRACTION',
      'CANCEL_MINUSES',
      'CANCEL_TERMS',
      'SIMPLIFY_FRACTION',
      'SIMPLIFY_SIGNS',
      'FIND_GCD',
      'CANCEL_GCD',
      'CONVERT_MIXED_NUMBER_TO_IMPROPER_FRACTION',
      'IMPROPER_FRACTION_NUMERATOR',
      'ADD_FRACTIONS',
      'ADD_NUMERATORS',
      'COMBINE_NUMERATORS',
      'COMMON_DENOMINATOR',
      'CONVERT_INTEGER_TO_FRACTION',
      'DIVIDE_FRACTION_FOR_ADDITION',
      'MULTIPLY_DENOMINATORS',
      'MULTIPLY_NUMERATORS',
      'MULTIPLY_FRACTIONS'
    ]],
    ['Степени и корни', [
      'ADD_EXPONENT_OF_ONE',
      'COLLECT_CONSTANT_EXPONENTS',
      'COLLECT_POLYNOMIAL_EXPONENTS',
      'MULTIPLY_POLYNOMIAL_TERMS',
      'EXPAND_EXPONENT',
      'CANCEL_EXPONENT',
      'CANCEL_EXPONENT_AND_ROOT',
      'CANCEL_ROOT',
      'NTH_ROOT_VALUE',
      'FACTOR_INTO_PRIMES',
      'GROUP_TERMS_BY_ROOT',
      'CONVERT_MULTIPLICATION_TO_EXPONENT',
      'DISTRIBUTE_NTH_ROOT',
      'EVALUATE_DISTRIBUTED_NTH_ROOT',
      'COMBINE_UNDER_ROOT',
      'ADD_NTH_ROOTS',
      'MULTIPLY_NTH_ROOTS'
    ]],
    ['Преобразования', [
      'DISTRIBUTE',
      'DISTRIBUTE_NEGATIVE_ONE',
      'SIMPLIFY_TERMS',
      'COLLECT_AND_COMBINE_LIKE_TERMS',
      'COLLECT_LIKE_TERMS',
      'ADD_COEFFICIENT_OF_ONE',
      'ADD_POLYNOMIAL_TERMS',
      'GROUP_COEFFICIENTS',
      'UNARY_MINUS_TO_NEGATIVE_ONE',
      'MULTIPLY_COEFFICIENTS',
      'MULTIPLY_BY_INVERSE',
      'SIMPLIFY_DIVISION'
    ]],
    ['Функции', [
      'ABSOLUTE_VALUE'
    ]],
    ['Уравнения', [
      'ADD_TO_BOTH_SIDES',
      'DIVIDE_FROM_BOTH_SIDES',
      'MULTIPLY_BOTH_SIDES_BY_INVERSE_FRACTION',
      'MULTIPLY_BOTH_SIDES_BY_NEGATIVE_ONE',
      'MULTIPLY_TO_BOTH_SIDES',
      'SIMPLIFY_LEFT_SIDE',
      'SIMPLIFY_RIGHT_SIDE',
      'SUBTRACT_FROM_BOTH_SIDES',
      'SWAP_SIDES',
      'FIND_ROOTS',
      'STATEMENT_IS_TRUE',
      'STATEMENT_IS_FALSE'
    ]]
  ];

  let offset = 0;
  for (const [, changeTypes] of lists) {
    changeTypes.forEach((changeType, index) => {
      order[changeType] = offset + index;
    });
    offset += changeTypes.length + 1;
  }

  return order;
})();

const CHANGE_TYPE_DESCRIPTION: Record<string, string> = {
  SIMPLIFY_ARITHMETIC: 'Вычислить арифметическое выражение.',
  DIVISION_BY_NEGATIVE_ONE: 'Избавить от деления на -1.',
  DIVISION_BY_ONE: 'Убрать деление на 1.',
  MULTIPLY_BY_ZERO: 'Упростить умножение на 0.',
  REARRANGE_COEFF: 'Переставить коэффициент к началу.',
  REDUCE_EXPONENT_BY_ZERO: 'Заменить степень нуля единицей.',
  REDUCE_ZERO_NUMERATOR: 'Упростить дробь с нулём в числителе.',
  REMOVE_ADDING_ZERO: 'Убрать прибавление нуля.',
  REMOVE_EXPONENT_BY_ONE: 'Убрать степень 1.',
  REMOVE_EXPONENT_BASE_ONE: 'Заменить основание 1.',
  REMOVE_MULTIPLYING_BY_NEGATIVE_ONE: 'Убрать умножение на -1.',
  REMOVE_MULTIPLYING_BY_ONE: 'Убрать умножение на 1.',
  RESOLVE_DOUBLE_MINUS: 'Убрать двойной минус.',
  COLLECT_AND_COMBINE_LIKE_TERMS: 'Собрать и объединить подобные слагаемые.',
  COLLECT_LIKE_TERMS: 'Сгруппировать подобные слагаемые.',
  COLLECT_CONSTANT_EXPONENTS: 'Собрать показатели степеней одинаковых оснований.',
  ADD_COEFFICIENT_OF_ONE: 'Добавить коэффициент 1 к слагаемому.',
  ADD_POLYNOMIAL_TERMS: 'Сложить подобные члены многочлена.',
  GROUP_COEFFICIENTS: 'Сгруппировать коэффициенты.',
  UNARY_MINUS_TO_NEGATIVE_ONE: 'Заменить унарный минус на умножение на -1.',
  ADD_EXPONENT_OF_ONE: 'Добавить степень 1 для множителя.',
  COLLECT_POLYNOMIAL_EXPONENTS: 'Собрать показатели степеней многочлена.',
  MULTIPLY_COEFFICIENTS: 'Перемножить коэффициенты.',
  MULTIPLY_POLYNOMIAL_TERMS: 'Перемножить члены многочлена.',
  BREAK_UP_FRACTION: 'Разложить дробь на сумму.',
  CANCEL_MINUSES: 'Упростить знаки минусов в дроби.',
  CANCEL_TERMS: 'Сократить общие множители.',
  SIMPLIFY_FRACTION: 'Упростить дробь.',
  SIMPLIFY_SIGNS: 'Упростить знаки в дроби.',
  FIND_GCD: 'Найти НОД числителя и знаменателя.',
  CANCEL_GCD: 'Сократить по НОД.',
  CONVERT_MIXED_NUMBER_TO_IMPROPER_FRACTION: 'Преобразовать смешанное число в неправильную дробь.',
  IMPROPER_FRACTION_NUMERATOR: 'Вычислить числитель неправильной дроби.',
  ADD_FRACTIONS: 'Сложить дроби.',
  ADD_NUMERATORS: 'Сложить числители.',
  COMBINE_NUMERATORS: 'Объединить числители.',
  COMMON_DENOMINATOR: 'Привести к общему знаменателю.',
  CONVERT_INTEGER_TO_FRACTION: 'Преобразовать целое число в дробь.',
  DIVIDE_FRACTION_FOR_ADDITION: 'Преобразовать дробь для сложения.',
  MULTIPLY_DENOMINATORS: 'Перемножить знаменатели.',
  MULTIPLY_NUMERATORS: 'Перемножить числители.',
  MULTIPLY_FRACTIONS: 'Перемножить дроби.',
  SIMPLIFY_DIVISION: 'Упростить цепочку делений.',
  MULTIPLY_BY_INVERSE: 'Заменить деление умножением на обратную дробь.',
  DISTRIBUTE: 'Раскрыть скобки по распределительному закону.',
  DISTRIBUTE_NEGATIVE_ONE: 'Распределить минус по скобкам.',
  SIMPLIFY_TERMS: 'Упростить полученные члены.',
  EXPAND_EXPONENT: 'Раскрыть степень как произведение.',
  ABSOLUTE_VALUE: 'Вычислить модуль.',
  CANCEL_EXPONENT: 'Сократить показатель степени.',
  CANCEL_EXPONENT_AND_ROOT: 'Сократить степень и корень.',
  CANCEL_ROOT: 'Упростить корень.',
  COMBINE_UNDER_ROOT: 'Объединить множители под корнем.',
  CONVERT_MULTIPLICATION_TO_EXPONENT: 'Заменить повторяющееся умножение степенью.',
  DISTRIBUTE_NTH_ROOT: 'Распределить корень по множителям.',
  EVALUATE_DISTRIBUTED_NTH_ROOT: 'Упростить распределённый корень.',
  FACTOR_INTO_PRIMES: 'Разложить на простые множители.',
  GROUP_TERMS_BY_ROOT: 'Сгруппировать множители по корню.',
  NTH_ROOT_VALUE: 'Вычислить значение корня.',
  ADD_NTH_ROOTS: 'Сложить одинаковые корни.',
  MULTIPLY_NTH_ROOTS: 'Перемножить одинаковые корни.',
  ADD_TO_BOTH_SIDES: 'Прибавить одно и то же к обеим частям уравнения.',
  DIVIDE_FROM_BOTH_SIDES: 'Разделить обе части уравнения на одно и то же.',
  MULTIPLY_BOTH_SIDES_BY_INVERSE_FRACTION: 'Умножить обе части на обратную дробь.',
  MULTIPLY_BOTH_SIDES_BY_NEGATIVE_ONE: 'Умножить обе части на -1.',
  MULTIPLY_TO_BOTH_SIDES: 'Умножить обе части на одно и то же.',
  SIMPLIFY_LEFT_SIDE: 'Упростить левую часть уравнения.',
  SIMPLIFY_RIGHT_SIDE: 'Упростить правую часть уравнения.',
  SUBTRACT_FROM_BOTH_SIDES: 'Вычесть одно и то же из обеих частей уравнения.',
  SWAP_SIDES: 'Поменять части уравнения местами.',
  FIND_ROOTS: 'Найти корни уравнения.',
  STATEMENT_IS_TRUE: 'Показать, что утверждение истинно.',
  STATEMENT_IS_FALSE: 'Показать, что утверждение ложно.',
  FACTOR_SYMBOL: 'Вынести общий множитель.',
  FACTOR_DIFFERENCE_OF_SQUARES: 'Разложить разность квадратов.',
  FACTOR_PERFECT_SQUARE: 'Разложить полный квадрат.',
  FACTOR_SUM_PRODUCT_RULE: 'Разложить по правилу суммы и произведения.',
  BREAK_UP_TERM: 'Разбить член на сумму.'
};

const SOLVE_ASSUMPTIONS: Record<string, string[]> = {
  DIVIDE_FROM_BOTH_SIDES: ['Делитель не равен 0.'],
  MULTIPLY_BOTH_SIDES_BY_INVERSE_FRACTION: ['Знаменатель дроби не равен 0.'],
  FIND_ROOTS: ['Подкоренное выражение неотрицательно (для чётных степеней).']
};

function splitEquation(expression: string): EquationSplit | null {
  for (const comparator of COMPARATORS) {
    const parts = expression.split(comparator);
    if (parts.length !== 2) {
      continue;
    }
    const left = parts[0].trim();
    const right = parts[1].trim();
    if (!left || !right) {
      continue;
    }
    return { left, right, comparator };
  }
  return null;
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class MathStepsEngine {
  /**
   * Нормализует выражение в формат mathsteps
   */
  normalizeExpression(expression: string): string {
    const equation = splitEquation(expression);
    if (equation) {
      const left = mathsteps.applicableTransforms.normalizeExpressionString(equation.left);
      const right = mathsteps.applicableTransforms.normalizeExpressionString(equation.right);
      return `${left} ${equation.comparator} ${right}`;
    }
    return mathsteps.applicableTransforms.normalizeExpressionString(expression);
  }

  /**
   * Парсит выражение в mathjs AST
   */
  parse(expression: string): MathStepsNode | EquationNode {
    const equation = splitEquation(expression);
    if (equation) {
      const left = mathjs.parse(this.normalizeExpression(equation.left)) as MathStepsNode;
      const right = mathjs.parse(this.normalizeExpression(equation.right)) as MathStepsNode;
      return this.createEquationNode(left, right, equation.comparator);
    }
    const normalized = this.normalizeExpression(expression);
    return mathjs.parse(normalized) as MathStepsNode;
  }

  /**
   * Преобразует mathjs AST в строку для отображения
   */
  stringify(node: MathStepsNode | EquationNode): string {
    if (this.isEquationNode(node)) {
      return node.toString();
    }
    return node.toString();
  }

  /**
   * Получает список доступных преобразований для подвыражения
   */
  listOps(expression: string, selectionPath: MathStepsPath): MathStepsOperation[] {
    const equation = splitEquation(expression);
    const operations: MathStepsOperation[] = [];

    if (equation) {
      const side = selectionPath[0];
      if (side === 'left' || side === 'right') {
        const sideExpression = side === 'left' ? equation.left : equation.right;
        const sidePath = selectionPath.slice(1) as MathStepsPath;
        operations.push(...this.listSimplifyOps(sideExpression, sidePath, selectionPath));
      } else if (selectionPath.length === 0) {
        operations.push(...this.listSolveOps(expression));
      }

      return this.sortOperations(operations);
    }

    operations.push(...this.listSimplifyOps(expression, selectionPath, selectionPath));
    return this.sortOperations(operations);
  }

  /**
   * Применяет преобразование по ID и возвращает результат
   */
  apply(expression: string, selectionPath: MathStepsPath, operationId: string): MathStepsTransformPreview {
    const equation = splitEquation(expression);

    if (equation && operationId.startsWith('solve:')) {
      return this.applySolveOperation(expression, operationId);
    }

    if (equation) {
      const side = selectionPath[0];
      if (side === 'left' || side === 'right') {
        const sideExpression = side === 'left' ? equation.left : equation.right;
        const sidePath = selectionPath.slice(1) as MathStepsPath;
        const preview = mathsteps.applicableTransforms.applyTransform(
          sideExpression,
          sidePath,
          operationId,
          { dedupe: 'byId' }
        ) as MathStepsTransformPreview;

        const leftNode = mathjs.parse(this.normalizeExpression(equation.left)) as MathStepsNode;
        const rightNode = mathjs.parse(this.normalizeExpression(equation.right)) as MathStepsNode;
        const oldLeft = side === 'left' ? preview.oldNode : leftNode;
        const oldRight = side === 'right' ? preview.oldNode : rightNode;
        const newLeft = side === 'left' ? preview.newNode : leftNode;
        const newRight = side === 'right' ? preview.newNode : rightNode;

        return {
          oldNode: this.createEquationNode(oldLeft, oldRight, equation.comparator),
          newNode: this.createEquationNode(newLeft, newRight, equation.comparator),
          changeType: preview.changeType,
          substeps: preview.substeps
        } as MathStepsTransformPreview;
      }
    }

    return mathsteps.applicableTransforms.applyTransform(expression, selectionPath, operationId, { dedupe: 'byId' }) as MathStepsTransformPreview;
  }

  private listSimplifyOps(
    expression: string,
    selectionPath: MathStepsPath,
    fullPath: MathStepsPath
  ): MathStepsOperation[] {
    const transforms = mathsteps.applicableTransforms.listApplicableTransforms(
      expression,
      selectionPath,
      { dedupe: 'byId' }
    ) as MathStepsTransform[];

    return transforms.map((transform) => {
      const changeType = transform.changeType;
      const category = this.getCategory(changeType);
      return {
        id: transform.id,
        name: transform.title || changeType,
        preview: this.stringify(transform.preview.newNode),
        category,
        order: this.getOrder(changeType),
        description: this.getDescription(changeType),
        selectionPath: fullPath,
        transform
      };
    });
  }

  private listSolveOps(expression: string): MathStepsOperation[] {
    const steps = mathsteps.solveEquation(expression) as Array<{ changeType: string; newEquation: { ascii: () => string } }>;
    if (!steps || steps.length === 0) {
      return [];
    }

    const step = steps[0];
    const changeType = step.changeType;
    const preview = step.newEquation.ascii();
    const id = `solve:${changeType}:${hashString(preview)}`;
    const assumptions = SOLVE_ASSUMPTIONS[changeType];

    return [{
      id,
      name: changeType,
      preview,
      category: this.getCategory(changeType),
      order: this.getOrder(changeType),
      description: this.getDescription(changeType),
      assumptions,
      selectionPath: []
    }];
  }

  private applySolveOperation(expression: string, operationId: string): MathStepsTransformPreview {
    const steps = mathsteps.solveEquation(expression) as Array<{ changeType: string; newEquation: { ascii: () => string; leftNode: MathStepsNode; rightNode: MathStepsNode; comparator: string }; oldEquation?: { leftNode: MathStepsNode; rightNode: MathStepsNode; comparator: string } }>;
    if (!steps || steps.length === 0) {
      throw new Error('Нет доступных шагов решения');
    }

    const step = steps.find((candidate) => {
      const preview = candidate.newEquation.ascii();
      const id = `solve:${candidate.changeType}:${hashString(preview)}`;
      return id === operationId;
    });

    if (!step) {
      throw new Error('Неизвестный шаг решения');
    }

    const oldEquation = step.oldEquation
      ? this.createEquationNode(step.oldEquation.leftNode, step.oldEquation.rightNode, step.oldEquation.comparator)
      : (this.parse(expression) as EquationNode);

    const newEquation = this.createEquationNode(step.newEquation.leftNode, step.newEquation.rightNode, step.newEquation.comparator);

    return {
      oldNode: oldEquation,
      newNode: newEquation,
      changeType: step.changeType,
      substeps: []
    } as MathStepsTransformPreview;
  }

  private sortOperations(operations: MathStepsOperation[]): MathStepsOperation[] {
    const categoryOrder = new Map(CATEGORY_ORDER.map((name, index) => [name, index]));
    return operations.slice().sort((a, b) => {
      const categoryA = categoryOrder.get(a.category) ?? 999;
      const categoryB = categoryOrder.get(b.category) ?? 999;
      if (categoryA !== categoryB) return categoryA - categoryB;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }

  private getCategory(changeType: string): string {
    return CHANGE_TYPE_CATEGORY[changeType] || 'Преобразования';
  }

  private getOrder(changeType: string): number {
    return CHANGE_TYPE_ORDER[changeType] ?? 999;
  }

  private getDescription(changeType: string): string {
    return CHANGE_TYPE_DESCRIPTION[changeType] || 'Преобразовать выражение.';
  }

  private createEquationNode(leftNode: MathStepsNode, rightNode: MathStepsNode, comparator: string): EquationNode {
    return {
      type: 'EquationNode',
      comparator,
      leftNode,
      rightNode,
      toString: () => `${leftNode.toString()} ${comparator} ${rightNode.toString()}`
    };
  }

  private isEquationNode(node: MathStepsNode | EquationNode): node is EquationNode {
    return (node as EquationNode).type === 'EquationNode';
  }
}
