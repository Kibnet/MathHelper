/**
 * Адаптер для работы с mathsteps (Kibnet)
 */
import type {
  ASTNode,
  ConstantNode,
  EquationNode,
  GroupNode,
  ImplicitMulNode,
  MathStepsNode,
  MathStepsOperation,
  MathStepsPath,
  MathStepsTransform,
  MathStepsTransformPreview,
  OperatorNode,
  RuleCategory,
  TransformationRule,
  UnaryNode
} from '../types/index.js';

import mathsteps from 'mathsteps';
import * as mathjs from 'mathjs';
import { ExpressionParser, generateId } from './parser.js';
import { cloneNode, expressionToString, nodesEqual } from '../utils/helpers.js';
import { 
  getNodeAtPath as getNodeAtPathUtil, 
  replaceNodeAtPath as replaceNodeAtPathUtil
} from './path-utils.js';

type EquationSplit = {
  left: string;
  right: string;
  comparator: string;
};

const COMPARATORS = ['<=', '>=', '=', '<', '>'];
const EQUIVALENCE_VALUES = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, 4, 5, 10, -10, 0.1, -0.1, 100];
const EQUIVALENCE_MIN_VALID = 6;
const EQUIVALENCE_TOLERANCE = 1e-9;

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
  ,
  CUSTOM_COMMUTATIVE: 'Преобразования',
  CUSTOM_DISTRIBUTE: 'Преобразования',
  CUSTOM_FACTOR: 'Преобразования',
  CUSTOM_ADD_PARENS: 'Преобразования',
  CUSTOM_REMOVE_PARENS: 'Преобразования',
  ADD_ADDING_ZERO: 'Преобразования',
  ADD_MULTIPLYING_BY_ONE: 'Преобразования'
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
      'SIMPLIFY_DIVISION',
      'CUSTOM_COMMUTATIVE',
      'CUSTOM_DISTRIBUTE',
      'CUSTOM_FACTOR',
      'CUSTOM_ADD_PARENS',
      'CUSTOM_REMOVE_PARENS',
      'ADD_ADDING_ZERO',
      'ADD_MULTIPLYING_BY_ONE'
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
  BREAK_UP_TERM: 'Разбить член на сумму.',
  CUSTOM_COMMUTATIVE: 'Поменять местами слагаемые или множители.',
  CUSTOM_DISTRIBUTE: 'Распределить множитель по сумме.',
  CUSTOM_FACTOR: 'Вынести общий множитель за скобки.',
  CUSTOM_ADD_PARENS: 'Добавить скобки вокруг выражения.',
  CUSTOM_REMOVE_PARENS: 'Убрать один уровень скобок.',
  ADD_ADDING_ZERO: 'Добавить нулевое слагаемое.',
  ADD_MULTIPLYING_BY_ONE: 'Добавить множитель 1.'
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
   * Преобразует mathjs AST в строку для отображения.
   * Использует нормализацию mathsteps для совместимости путей.
   */
  stringify(node: MathStepsNode | EquationNode): string {
    if (this.isEquationNode(node)) {
      return node.toString();
    }
    // Используем normalizeExpression который вызывает normalizeExpressionString
    // на результате node.toString(). Это нужно чтобы пути были совместимы
    // с тем, что ожидает mathsteps внутри listApplicableTransforms.
    return this.normalizeExpression(node.toString());
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
        const sideNode = this.parse(sideExpression);
        const simplifyOps = this.listSimplifyOps(sideExpression, sidePath, selectionPath);
        const existingPreviews = new Set(simplifyOps.map((op) => op.preview));
        operations.push(...simplifyOps);
        operations.push(...this.listCustomOps(sideExpression, sideNode, sidePath, selectionPath, existingPreviews));
      } else if (selectionPath.length === 0) {
        operations.push(...this.listSolveOps(expression));
      }

      return this.sortOperations(this.dedupeOperations(operations));
    }

    const rootNode = this.parse(expression);
    const simplifyOps = this.listSimplifyOps(expression, selectionPath, selectionPath);
    const existingPreviews = new Set(simplifyOps.map((op) => op.preview));
    operations.push(...simplifyOps);
    operations.push(...this.listCustomOps(expression, rootNode, selectionPath, selectionPath, existingPreviews));
    return this.sortOperations(this.dedupeOperations(operations));
  }

  /**
   * Применяет преобразование по ID и возвращает результат
   */
  apply(expression: string, selectionPath: MathStepsPath, operationId: string): MathStepsTransformPreview {
    const equation = splitEquation(expression);

    if (operationId.startsWith('custom:')) {
      return this.applyCustomOperation(expression, selectionPath, operationId);
    }

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
    // Обёртка в try-catch для обработки несовместимости путей между AST структурами.
    // Такое может произойти когда:
    // 1. MathStepsEngine.parse() создаёт одну структуру AST (например, вложенные unaryMinus)
    // 2. mathsteps.applicableTransforms нормализует выражение и получает другую структуру
    //    (например, с ParenthesisNode вместо прямого вложения)
    // В этом случае путь, сгенерированный для первой структуры, не работает во второй.
    let transforms: MathStepsTransform[];
    try {
      transforms = mathsteps.applicableTransforms.listApplicableTransforms(
        expression,
        selectionPath,
        { dedupe: 'byId' }
      ) as MathStepsTransform[];
    } catch (error) {
      // Если путь некорректен для нормализованной структуры mathsteps,
      // возвращаем пустой список операций вместо выброса исключения
      const err = error as { code?: string };
      if (err.code === 'INVALID_PATH') {
        return [];
      }
      throw error;
    }

    const operations = transforms.map((transform) => {
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

    return this.filterOperationsByEquivalence(expression, operations);
  }

  private listLegacyRuleOps(
    selectionPath: MathStepsPath,
    fullPath: MathStepsPath,
    rootNode: MathStepsNode,
    targetNode: MathStepsNode,
    existingPreviews?: Set<string>
  ): MathStepsOperation[] {
    let legacyNode: ASTNode;
    try {
      const parser = new ExpressionParser(targetNode.toString());
      legacyNode = parser.parse();
    } catch {
      return [];
    }

    const rules = getLegacyApplicableRules(legacyNode);
    if (rules.length === 0) {
      return [];
    }

    const operations: MathStepsOperation[] = [];

    for (const rule of rules) {
      const transformed = rule.apply(cloneNode(legacyNode));
      const transformedText = expressionToString(transformed);
      const transformedNode = this.parseMathjsNode(transformedText);
      if (!transformedNode) {
        continue;
      }

      const newRoot = this.replaceNodeAtPath(rootNode, selectionPath, transformedNode);
      const preview = this.stringify(newRoot);
      if (existingPreviews?.has(preview)) {
        continue;
      }

      const changeType = `LEGACY_${rule.id}`;
      operations.push({
        id: `custom:${changeType}:${hashString(preview)}`,
        name: this.getLegacyRuleName(rule),
        preview,
        category: this.getLegacyRuleCategory(rule.category),
        order: this.getLegacyRuleOrder(rule),
        description: this.getLegacyRuleDescription(rule),
        selectionPath: fullPath
      });
      existingPreviews?.add(preview);
    }

    return operations;
  }

  private applyLegacyRule(targetNode: MathStepsNode, ruleId: string): MathStepsNode {
    let legacyNode: ASTNode;
    try {
      const parser = new ExpressionParser(targetNode.toString());
      legacyNode = parser.parse();
    } catch {
      throw new Error('Не удалось разобрать выражение для правила');
    }

    const rules = getLegacyApplicableRules(legacyNode);
    const rule = rules.find((candidate) => candidate.id === ruleId);
    if (!rule) {
      throw new Error('Правило недоступно для выбранного выражения');
    }

    const transformed = rule.apply(cloneNode(legacyNode));
    const transformedText = expressionToString(transformed);
    const transformedNode = this.parseMathjsNode(transformedText);
    if (!transformedNode) {
      throw new Error('Не удалось применить правило');
    }

    return transformedNode;
  }

  private getLegacyRuleCategory(category: RuleCategory): string {
    const mapping: Record<RuleCategory, string> = {
      '1. Вычисления': 'Арифметика',
      '2. Упрощения': 'Упрощения',
      '3. Преобразования': 'Преобразования',
      '4. Перестановка': 'Преобразования',
      '5. Обертывание': 'Преобразования',
      '6. Нотация': 'Преобразования'
    };
    return mapping[category] || 'Преобразования';
  }

  private getLegacyRuleName(rule: TransformationRule): string {
    return this.cleanLegacyRuleTitle(rule.name);
  }

  private getLegacyRuleDescription(rule: TransformationRule): string {
    return this.cleanLegacyRuleTitle(rule.name);
  }

  private getLegacyRuleOrder(_rule: TransformationRule): number {
    return 999;
  }

  private cleanLegacyRuleTitle(title: string): string {
    return title.replace(/^→\s*/u, '').replace(/^\+\s*/u, '');
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

    const operations = [{
      id,
      name: changeType,
      preview,
      category: this.getCategory(changeType),
      order: this.getOrder(changeType),
      description: this.getDescription(changeType),
      assumptions,
      selectionPath: []
    }];

    return this.filterOperationsByEquivalence(expression, operations);
  }

  private listCustomOps(
    expression: string,
    rootNode: MathStepsNode,
    selectionPath: MathStepsPath,
    fullPath: MathStepsPath,
    existingPreviews?: Set<string>
  ): MathStepsOperation[] {
    const targetNode = this.getNodeAtPath(rootNode, selectionPath);
    if (!targetNode) {
      return [];
    }

    const operations: MathStepsOperation[] = [];

    const addOperation = (changeType: string, name: string, description: string, newNode: MathStepsNode) => {
      const newRoot = this.replaceNodeAtPath(rootNode, selectionPath, newNode);
      const preview = this.stringify(newRoot);
      if (existingPreviews?.has(preview)) {
        return;
      }

      operations.push({
        id: `custom:${changeType}:${hashString(preview)}`,
        name,
        preview,
        category: this.getCategory(changeType),
        order: this.getOrder(changeType),
        description,
        selectionPath: fullPath
      });
      existingPreviews?.add(preview);
    };

    const operator = this.getOperatorNode(targetNode);
    if (operator) {
      const args = operator.args || [];
      if ((operator.op === '+' || operator.op === '*') && args.length === 2) {
        const swapped = this.cloneMathjsNode(operator);
        swapped.args = [this.cloneMathjsNode(args[1]), this.cloneMathjsNode(args[0])];
        const name = operator.op === '+' ? 'Поменять местами слагаемые' : 'Поменять местами множители';
        const description = operator.op === '+' ? 'Поменять местами слагаемые.' : 'Поменять местами множители.';
        addOperation('CUSTOM_COMMUTATIVE', name, description, swapped);
      }

      if (operator.op === '*' && args.length === 2) {
        const distribute = this.buildDistributeNode(args[0], args[1]);
        if (distribute) {
          addOperation('CUSTOM_DISTRIBUTE', 'Раскрыть скобки', this.getDescription('CUSTOM_DISTRIBUTE'), distribute);
        }
      }

      if (operator.op === '+' && args.length === 2) {
        const factor = this.buildFactorNode(args[0], args[1]);
        if (factor) {
          addOperation('CUSTOM_FACTOR', 'Вынести общий множитель', this.getDescription('CUSTOM_FACTOR'), factor);
        }
      }

      if (operator.op === '+' && args.length === 2) {
        const withoutZero = this.removeNeutralElement(operator, 0);
        if (withoutZero) {
          addOperation('REMOVE_ADDING_ZERO', 'Убрать +0', this.getDescription('REMOVE_ADDING_ZERO'), withoutZero);
        }
      }

      if (operator.op === '*' && args.length === 2) {
        const withoutOne = this.removeNeutralElement(operator, 1);
        if (withoutOne) {
          addOperation('REMOVE_MULTIPLYING_BY_ONE', 'Убрать *1', this.getDescription('REMOVE_MULTIPLYING_BY_ONE'), withoutOne);
        }
      }
    }

    const nodeText = targetNode.toString();
    const addZeroNode = this.parseMathjsNode(`(${nodeText} + 0)`);
    if (addZeroNode) {
      addOperation('ADD_ADDING_ZERO', 'Добавить +0', this.getDescription('ADD_ADDING_ZERO'), addZeroNode);
    }

    const addOneNode = this.parseMathjsNode(`(${nodeText}) * 1`);
    if (addOneNode) {
      addOperation('ADD_MULTIPLYING_BY_ONE', 'Добавить *1', this.getDescription('ADD_MULTIPLYING_BY_ONE'), addOneNode);
    }

    const addParensNode = this.parseMathjsNode(`(${nodeText})`);
    if (addParensNode) {
      addOperation('CUSTOM_ADD_PARENS', 'Добавить скобки', this.getDescription('CUSTOM_ADD_PARENS'), addParensNode);
    }

    if (this.isParenthesisNode(targetNode) && targetNode.content) {
      addOperation('CUSTOM_REMOVE_PARENS', 'Убрать скобки', this.getDescription('CUSTOM_REMOVE_PARENS'), this.cloneMathjsNode(targetNode.content));
    }

    operations.push(...this.listLegacyRuleOps(selectionPath, fullPath, rootNode, targetNode, existingPreviews));

    return this.filterOperationsByEquivalence(expression, operations);
  }

  private applyCustomOperation(expression: string, selectionPath: MathStepsPath, operationId: string): MathStepsTransformPreview {
    const [, changeType] = operationId.split(':', 3);
    if (!changeType) {
      throw new Error('Неизвестное пользовательское преобразование');
    }

    const equation = splitEquation(expression);
    if (equation) {
      const side = selectionPath[0];
      if (side === 'left' || side === 'right') {
        const sideExpression = side === 'left' ? equation.left : equation.right;
        const sidePath = selectionPath.slice(1) as MathStepsPath;
        const result = this.applyCustomToExpression(sideExpression, sidePath, changeType);

        const leftNode = mathjs.parse(this.normalizeExpression(equation.left)) as MathStepsNode;
        const rightNode = mathjs.parse(this.normalizeExpression(equation.right)) as MathStepsNode;

        const newLeft = side === 'left' ? result : leftNode;
        const newRight = side === 'right' ? result : rightNode;

        return {
          oldNode: this.createEquationNode(leftNode, rightNode, equation.comparator),
          newNode: this.createEquationNode(newLeft, newRight, equation.comparator),
          changeType,
          substeps: []
        } as MathStepsTransformPreview;
      }

      throw new Error('Нельзя применить пользовательское преобразование к уравнению целиком');
    }

    const newNode = this.applyCustomToExpression(expression, selectionPath, changeType);
    const oldNode = this.parse(expression) as MathStepsNode;

    return {
      oldNode,
      newNode,
      changeType,
      substeps: []
    } as MathStepsTransformPreview;
  }

  private applyCustomToExpression(expression: string, selectionPath: MathStepsPath, changeType: string): MathStepsNode {
    const rootNode = this.parseMathjsNode(expression);
    if (!rootNode) {
      throw new Error('Не удалось разобрать выражение');
    }

    const targetNode = this.getNodeAtPath(rootNode, selectionPath);
    if (!targetNode) {
      throw new Error('Не удалось найти выбранный узел');
    }

    const operator = this.getOperatorNode(targetNode);
    if (changeType === 'CUSTOM_COMMUTATIVE') {
      if (!operator || !operator.args || operator.args.length !== 2 || (operator.op !== '+' && operator.op !== '*')) {
        throw new Error('Коммутативность неприменима');
      }
      const swapped = this.cloneMathjsNode(operator);
      swapped.args = [this.cloneMathjsNode(operator.args[1]), this.cloneMathjsNode(operator.args[0])];
      return this.replaceNodeAtPath(rootNode, selectionPath, swapped);
    }

    if (changeType === 'CUSTOM_DISTRIBUTE') {
      if (!operator || !operator.args || operator.args.length !== 2 || operator.op !== '*') {
        throw new Error('Распределение неприменимо');
      }
      const distributed = this.buildDistributeNode(operator.args[0], operator.args[1]);
      if (!distributed) {
        throw new Error('Распределение неприменимо');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, distributed);
    }

    if (changeType === 'CUSTOM_FACTOR') {
      if (!operator || !operator.args || operator.args.length !== 2 || operator.op !== '+') {
        throw new Error('Вынесение множителя неприменимо');
      }
      const factored = this.buildFactorNode(operator.args[0], operator.args[1]);
      if (!factored) {
        throw new Error('Вынесение множителя неприменимо');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, factored);
    }

    if (changeType === 'CUSTOM_ADD_PARENS') {
      const nodeText = targetNode.toString();
      const parens = this.parseMathjsNode(`(${nodeText})`);
      if (!parens) {
        throw new Error('Нельзя добавить скобки');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, parens);
    }

    if (changeType === 'CUSTOM_REMOVE_PARENS') {
      if (!this.isParenthesisNode(targetNode) || !targetNode.content) {
        throw new Error('Нельзя убрать скобки');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, this.cloneMathjsNode(targetNode.content));
    }

    if (changeType === 'ADD_ADDING_ZERO') {
      const nodeText = targetNode.toString();
      const addZero = this.parseMathjsNode(`(${nodeText} + 0)`);
      if (!addZero) {
        throw new Error('Нельзя добавить +0');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, addZero);
    }

    if (changeType === 'ADD_MULTIPLYING_BY_ONE') {
      const nodeText = targetNode.toString();
      const addOne = this.parseMathjsNode(`(${nodeText}) * 1`);
      if (!addOne) {
        throw new Error('Нельзя добавить *1');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, addOne);
    }

    if (changeType === 'REMOVE_ADDING_ZERO') {
      if (!operator || !operator.args || operator.args.length !== 2 || operator.op !== '+') {
        throw new Error('Нельзя убрать +0');
      }
      const withoutZero = this.removeNeutralElement(operator, 0);
      if (!withoutZero) {
        throw new Error('Нельзя убрать +0');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, withoutZero);
    }

    if (changeType === 'REMOVE_MULTIPLYING_BY_ONE') {
      if (!operator || !operator.args || operator.args.length !== 2 || operator.op !== '*') {
        throw new Error('Нельзя убрать *1');
      }
      const withoutOne = this.removeNeutralElement(operator, 1);
      if (!withoutOne) {
        throw new Error('Нельзя убрать *1');
      }
      return this.replaceNodeAtPath(rootNode, selectionPath, withoutOne);
    }

    if (changeType.startsWith('LEGACY_')) {
      const ruleId = changeType.slice('LEGACY_'.length);
      const result = this.applyLegacyRule(targetNode, ruleId);
      return this.replaceNodeAtPath(rootNode, selectionPath, result);
    }

    throw new Error('Неизвестное пользовательское преобразование');
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

  private filterOperationsByEquivalence(expression: string, operations: MathStepsOperation[]): MathStepsOperation[] {
    return operations.filter((operation) => {
      const preview = operation.preview;
      if (!preview) {
        return false;
      }
      if (expression.trim() === preview.trim()) {
        return false;
      }
      return this.isEquivalentExpression(expression, preview);
    });
  }

  private dedupeOperations(operations: MathStepsOperation[]): MathStepsOperation[] {
    const seen = new Set<string>();
    const result: MathStepsOperation[] = [];

    for (const operation of operations) {
      const changeType = this.getOperationChangeType(operation);
      const key = `${changeType}::${operation.preview}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(operation);
    }

    return result;
  }

  private getOperationChangeType(operation: MathStepsOperation): string {
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

  private isEquivalentExpression(original: string, candidate: string): boolean {
    const originalEquation = splitEquation(original);
    const candidateEquation = splitEquation(candidate);

    if (originalEquation || candidateEquation) {
      if (!originalEquation || !candidateEquation) {
        return false;
      }
      return this.isEquivalentEquation(originalEquation, candidateEquation);
    }

    const variables = this.collectVariables(original);
    const scopes = this.buildScopes(variables);
    let validPoints = 0;

    for (const scope of scopes) {
      const left = this.evaluateExpression(original, scope);
      const right = this.evaluateExpression(candidate, scope);

      if (!left.valid && !right.valid) {
        continue;
      }
      if (!left.valid || !right.valid) {
        return false;
      }
      validPoints++;
      if (!this.areValuesEquivalent(left.value, right.value)) {
        return false;
      }
    }

    return validPoints >= EQUIVALENCE_MIN_VALID;
  }

  private isEquivalentEquation(
    original: { left: string; right: string; comparator: string },
    candidate: { left: string; right: string; comparator: string }
  ): boolean {
    if (original.comparator !== candidate.comparator) {
      return false;
    }

    const variables = Array.from(new Set([
      ...this.collectVariables(original.left),
      ...this.collectVariables(original.right),
      ...this.collectVariables(candidate.left),
      ...this.collectVariables(candidate.right)
    ]));
    const scopes = this.buildScopes(variables);
    let validPoints = 0;

    for (const scope of scopes) {
      const originalResult = this.evaluateEquation(original.left, original.right, scope);
      const candidateResult = this.evaluateEquation(candidate.left, candidate.right, scope);

      if (!originalResult.valid && !candidateResult.valid) {
        continue;
      }
      if (!originalResult.valid || !candidateResult.valid) {
        return false;
      }
      validPoints++;
      if (originalResult.value !== candidateResult.value) {
        return false;
      }
    }

    return validPoints >= EQUIVALENCE_MIN_VALID;
  }

  private evaluateEquation(left: string, right: string, scope: Record<string, number>): { valid: boolean; value: boolean } {
    const leftEval = this.evaluateExpression(left, scope);
    const rightEval = this.evaluateExpression(right, scope);
    if (!leftEval.valid || !rightEval.valid) {
      return { valid: false, value: false };
    }
    return { valid: true, value: this.areValuesEquivalent(leftEval.value, rightEval.value) };
  }

  private evaluateExpression(expression: string, scope: Record<string, number>): { valid: boolean; value: unknown } {
    try {
      const normalized = this.normalizeExpression(expression);
      const compiled = mathjs.compile(normalized);
      const evaluator = (compiled as { evaluate?: (scope: Record<string, number>) => unknown; eval?: (scope: Record<string, number>) => unknown });
      const result = typeof evaluator.evaluate === 'function' ? evaluator.evaluate(scope) : evaluator.eval?.(scope);
      if (typeof result === 'undefined') {
        return { valid: false, value: null };
      }
      const normalizedValue = this.normalizeEvalResult(result);
      if (!normalizedValue.valid) {
        return { valid: false, value: null };
      }
      return { valid: true, value: normalizedValue.value };
    } catch {
      return { valid: false, value: null };
    }
  }

  private normalizeEvalResult(result: unknown): { valid: boolean; value: unknown } {
    if (typeof result === 'number') {
      if (!Number.isFinite(result)) {
        return { valid: false, value: null };
      }
      return { valid: true, value: result };
    }

    if (result && typeof result === 'object') {
      if (this.isComplexValue(result)) {
        return { valid: false, value: null };
      }
      if (mathjs.isMatrix(result)) {
        const array = (result as { toArray: () => unknown[] }).toArray();
        return { valid: true, value: array };
      }
      if (Array.isArray(result)) {
        return { valid: true, value: result };
      }
      if (mathjs.isBigNumber(result)) {
        const value = mathjs.number(result);
        if (!Number.isFinite(value)) {
          return { valid: false, value: null };
        }
        return { valid: true, value };
      }
    }

    return { valid: false, value: null };
  }

  private areValuesEquivalent(a: unknown, b: unknown): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      const diff = Math.abs(a - b);
      if (diff <= EQUIVALENCE_TOLERANCE) {
        return true;
      }
      const scale = Math.max(Math.abs(a), Math.abs(b), 1);
      return diff / scale <= EQUIVALENCE_TOLERANCE;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!this.areValuesEquivalent(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }

    return a === b;
  }

  private isComplexValue(result: object): boolean {
    return 'im' in result && 're' in result;
  }

  private collectVariables(expression: string): string[] {
    const normalized = this.normalizeExpression(expression);
    const node = this.parseMathjsNode(normalized);
    const names = new Set<string>();

    const walk = (current: MathStepsNode | undefined): void => {
      if (!current) {
        return;
      }
      if (current.type === 'SymbolNode' && current.name) {
        if (this.isMathConstant(current.name)) {
          return;
        }
        names.add(current.name);
      }
      if (current.content) {
        walk(current.content);
      }
      if (current.args) {
        current.args.forEach((child) => walk(child));
      }
    };

    walk(node || undefined);
    return Array.from(names);
  }

  private isMathConstant(name: string): boolean {
    return typeof (mathjs as Record<string, unknown>)[name] === 'number';
  }

  private buildScopes(variables: string[]): Array<Record<string, number>> {
    const scopes: Array<Record<string, number>> = [];
    const values = EQUIVALENCE_VALUES;

    for (let i = 0; i < values.length; i++) {
      const scope: Record<string, number> = {};
      variables.forEach((variable, index) => {
        scope[variable] = values[(i + index) % values.length];
      });
      scopes.push(scope);
    }

    return scopes;
  }

  private parseMathjsNode(expression: string): MathStepsNode | null {
    try {
      return mathjs.parse(this.normalizeExpression(expression)) as MathStepsNode;
    } catch {
      return null;
    }
  }

  private cloneMathjsNode(node: MathStepsNode): MathStepsNode {
    const candidate = node as { clone?: () => MathStepsNode };
    if (typeof candidate.clone === 'function') {
      return candidate.clone();
    }
    return mathjs.parse(node.toString()) as MathStepsNode;
  }

  private getNodeAtPath(root: MathStepsNode, path: MathStepsPath): MathStepsNode | null {
    // Делегируем в централизованную утилиту path-utils
    return getNodeAtPathUtil(root, path);
  }

  private replaceNodeAtPath(root: MathStepsNode, path: MathStepsPath, replacement: MathStepsNode): MathStepsNode {
    // Делегируем в централизованную утилиту path-utils
    return replaceNodeAtPathUtil(root, path, replacement, (node) => this.cloneMathjsNode(node));
  }

  private getOperatorNode(node: MathStepsNode): MathStepsNode & { type: 'OperatorNode'; op: string; args: MathStepsNode[] } | null {
    if (node.type === 'OperatorNode' && node.op && node.args) {
      return node as MathStepsNode & { type: 'OperatorNode'; op: string; args: MathStepsNode[] };
    }
    return null;
  }

  private buildDistributeNode(
    left: MathStepsNode,
    right: MathStepsNode
  ): MathStepsNode | null {
    const leftAdd = this.getAddNode(left);
    const rightAdd = this.getAddNode(right);
    const leftIsAdd = Boolean(leftAdd);
    const rightIsAdd = Boolean(rightAdd);
    if (leftIsAdd === rightIsAdd) {
      return null;
    }

    const sumNode = leftIsAdd ? leftAdd! : rightAdd!;
    const factorNode = leftIsAdd ? right : left;
    const factorOnLeft = !leftIsAdd;

    if (!sumNode.args || sumNode.args.length !== 2) {
      return null;
    }

    const [first, second] = sumNode.args;
    const factorText = factorNode.toString();
    const firstText = first.toString();
    const secondText = second.toString();

    const firstTerm = factorOnLeft
      ? `(${factorText}) * (${firstText})`
      : `(${firstText}) * (${factorText})`;
    const secondTerm = factorOnLeft
      ? `(${factorText}) * (${secondText})`
      : `(${secondText}) * (${factorText})`;

    return this.parseMathjsNode(`${firstTerm} + ${secondTerm}`);
  }

  private buildFactorNode(
    left: MathStepsNode,
    right: MathStepsNode
  ): MathStepsNode | null {
    const leftFactors = this.extractBinaryFactors(left);
    const rightFactors = this.extractBinaryFactors(right);
    if (!leftFactors || !rightFactors) {
      return null;
    }

    const matches = this.findCommonFactor(leftFactors, rightFactors);
    if (!matches) {
      return null;
    }

    const { factor, leftRemainder, rightRemainder, position } = matches;
    const sumText = `(${leftRemainder.toString()} + ${rightRemainder.toString()})`;
    const factorText = `(${factor.toString()})`;

    const result = position === 'left'
      ? `${factorText} * ${sumText}`
      : `${sumText} * ${factorText}`;

    return this.parseMathjsNode(result);
  }

  private extractBinaryFactors(node: MathStepsNode): { left: MathStepsNode; right: MathStepsNode } | null {
    if (node.type === 'OperatorNode' && node.op === '*' && node.args && node.args.length === 2) {
      return { left: node.args[0], right: node.args[1] };
    }
    return null;
  }

  private findCommonFactor(
    left: { left: MathStepsNode; right: MathStepsNode },
    right: { left: MathStepsNode; right: MathStepsNode }
  ): { factor: MathStepsNode; leftRemainder: MathStepsNode; rightRemainder: MathStepsNode; position: 'left' | 'right' } | null {
    const leftLeft = left.left.toString();
    const leftRight = left.right.toString();
    const rightLeft = right.left.toString();
    const rightRight = right.right.toString();

    if (leftLeft === rightLeft) {
      return { factor: left.left, leftRemainder: left.right, rightRemainder: right.right, position: 'left' };
    }
    if (leftRight === rightRight) {
      return { factor: left.right, leftRemainder: left.left, rightRemainder: right.left, position: 'right' };
    }
    if (leftLeft === rightRight) {
      return { factor: left.left, leftRemainder: left.right, rightRemainder: right.left, position: 'right' };
    }
    if (leftRight === rightLeft) {
      return { factor: left.right, leftRemainder: left.left, rightRemainder: right.right, position: 'right' };
    }

    return null;
  }

  private removeNeutralElement(operator: MathStepsNode & { op: string; args: MathStepsNode[] }, value: number): MathStepsNode | null {
    const [left, right] = operator.args;
    if (this.isConstantNode(left, value)) {
      return this.cloneMathjsNode(right);
    }
    if (this.isConstantNode(right, value)) {
      return this.cloneMathjsNode(left);
    }
    return null;
  }

  private isConstantNode(node: MathStepsNode, value: number): boolean {
    return node.type === 'ConstantNode' && Number(node.value) === value;
  }

  private isAddNode(node: MathStepsNode): node is MathStepsNode & { op: string; args: MathStepsNode[] } {
    return node.type === 'OperatorNode' && node.op === '+' && Array.isArray(node.args);
  }

  private isParenthesisNode(node: MathStepsNode): node is MathStepsNode & { content: MathStepsNode } {
    return node.type === 'ParenthesisNode';
  }

  private getAddNode(node: MathStepsNode): (MathStepsNode & { op: string; args: MathStepsNode[] }) | null {
    if (this.isAddNode(node)) {
      return node;
    }
    if (this.isParenthesisNode(node) && node.content && this.isAddNode(node.content)) {
      return node.content;
    }
    return null;
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

function getLegacyApplicableRules(node: ASTNode): TransformationRule[] {
  const rules: TransformationRule[] = [];

  // === ПРИОРИТЕТ 1: ВЫЧИСЛЕНИЯ ===
  if (node.type === 'operator' && node.value === '*') {
    for (let i = 0; i < node.children.length - 1; i++) {
      if (node.children[i].type === 'constant' && node.children[i + 1].type === 'constant') {
        const left = node.children[i] as ConstantNode;
        const right = node.children[i + 1] as ConstantNode;
        rules.push({
          id: `eval_mul_${i}`,
          name: '→ Вычислить',
          category: '1. Вычисления',
          preview: `${left.value}*${right.value} → ${left.value * right.value}`,
          apply: (n: ASTNode) => evaluatePairAt(n as OperatorNode, i, '*')
        });
      }
    }
  }

  if (node.type === 'operator' && node.value === '/') {
    if (node.children[0].type === 'constant' && node.children[1].type === 'constant') {
      const left = node.children[0] as ConstantNode;
      const right = node.children[1] as ConstantNode;
      rules.push({
        id: 'eval_div',
        name: '→ Вычислить',
        category: '1. Вычисления',
        preview: `${left.value}/${right.value} → ${left.value / right.value}`,
        apply: evaluateDivision
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    for (let i = 0; i < node.children.length - 1; i++) {
      const left = node.children[i];
      const right = node.children[i + 1];
      const leftValue = getConstantValue(left);
      const rightValue = getConstantValue(right);

      if (leftValue !== null && rightValue !== null) {
        rules.push({
          id: `eval_add_${i}`,
          name: '→ Вычислить',
          category: '1. Вычисления',
          preview: `${leftValue}+${rightValue} → ${leftValue + rightValue}`,
          apply: (n: ASTNode) => evaluatePairAt(n as OperatorNode, i, '+')
        });
      }
    }
  }

  // === ПРИОРИТЕТ 2: УПРОЩЕНИЯ ===
  if (node.type === 'operator' && node.value === '*') {
    const hasOne = node.children.some(child => child.type === 'constant' && child.value === 1);
    if (hasOne) {
      rules.push({
        id: 'remove_mult_one',
        name: '→ Убрать *1',
        category: '2. Упрощения',
        preview: 'a*1*b → a*b или 1*a → a',
        apply: removeMultiplicationByOne
      });
    }
  }

  if (node.type === 'operator' && node.value === '*') {
    const hasZero = node.children.some(child => child.type === 'constant' && child.value === 0);
    if (hasZero) {
      rules.push({
        id: 'simplify_mult_zero',
        name: '→ Упростить до 0',
        category: '2. Упрощения',
        preview: 'a*0*b → 0',
        apply: simplifyMultiplicationByZero
      });
    }
  }

  if (node.type === 'operator' && node.value === '/') {
    if (node.children[1].type === 'constant' && node.children[1].value === 1) {
      rules.push({
        id: 'remove_div_one',
        name: '→ Убрать /1',
        category: '2. Упрощения',
        preview: 'a/1 → a',
        apply: removeDivisionByOne
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    const hasZero = node.children.some(child => {
      if (child.type === 'constant' && child.value === 0) {
        return true;
      }
      if (child.type === 'unary' && child.value === '-') {
        const innerChild = child.children[0];
        if (innerChild.type === 'constant' && (innerChild as ConstantNode).value === 0) {
          return true;
        }
      }
      return false;
    });

    if (hasZero) {
      rules.push({
        id: 'remove_add_zero',
        name: '→ Убрать +0',
        category: '2. Упрощения',
        preview: 'a+0+b → a+b или 0+a → a',
        apply: removeAdditionOfZero
      });
    }
  }

  if (node.type === 'unary' && node.children[0].type === 'unary') {
    rules.push({
      id: 'double_negation',
      name: '→ Убрать двойное отрицание',
      category: '2. Упрощения',
      preview: '--a → a',
      apply: removeDoubleNegation
    });
  }

  if (node.type === 'group' && node.children[0].type !== 'operator') {
    rules.push({
      id: 'remove_parens',
      name: '→ Убрать скобки',
      category: '2. Упрощения',
      preview: '(a) → a',
      apply: removeParentheses
    });
  }

  if (node.type === 'group' && node.children[0].type === 'group') {
    rules.push({
      id: 'remove_double_parens',
      name: '→ Убрать двойные скобки',
      category: '2. Упрощения',
      preview: '((a)) → (a)',
      apply: removeDoubleParentheses
    });
  }

  if (node.type === 'unary' && node.children[0].type === 'group') {
    const groupChild = node.children[0] as GroupNode;
    if (groupChild.children[0].type !== 'operator') {
      rules.push({
        id: 'remove_unary_parens',
        name: '→ Убрать скобки после минуса',
        category: '2. Упрощения',
        preview: '-(a) → -a',
        apply: removeUnaryParentheses
      });
    }
  }

  // === ПРИОРИТЕТ 3: ПРЕОБРАЗОВАНИЯ ===
  if (node.type === 'operator' && node.value === '+') {
    if (node.children.some(child => child.type === 'operator' && child.value === '+')) {
      rules.push({
        id: 'assoc_flatten_add',
        name: '→ Снять ассоциативные скобки',
        category: '3. Преобразования',
        preview: '(a+b)+c → a+b+c',
        apply: flattenAddition
      });
    }
  }

  if (node.type === 'operator' && node.value === '*') {
    if (node.children.some(child => child.type === 'operator' && child.value === '*')) {
      rules.push({
        id: 'assoc_flatten_mul',
        name: '→ Снять ассоциативные скобки',
        category: '3. Преобразования',
        preview: '(a*b)*c → a*b*c',
        apply: flattenMultiplication
      });
    }
  }

  if (node.type === 'operator' && node.value === '*' && node.children.length === 2) {
    const rightSum = getAdditionNode(node.children[1]);
    if (rightSum) {
      rules.push({
        id: 'distributive_forward',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: 'a*(b+c+...) → a*b + a*c + ...',
        apply: applyDistributiveForward
      });
    }

    const leftSum = getAdditionNode(node.children[0]);
    if (leftSum) {
      rules.push({
        id: 'distributive_forward_left',
        name: '→ Раскрыть (Распределительное)',
        category: '3. Преобразования',
        preview: '(a+b+...)*c → a*c + b*c + ...',
        apply: applyDistributiveForwardLeft
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    const leftCommon = findCommonFactorAcrossSum(node, 'left');
    if (leftCommon) {
      rules.push({
        id: 'factor_common_left_all',
        name: '→ Вынести общий множитель',
        category: '3. Преобразования',
        preview: 'a*b + a*c + ... → a*(b+c+...)',
        apply: (n: ASTNode) => factorCommonAcrossSum(n as OperatorNode, leftCommon)
      });
    }

    const rightCommon = findCommonFactorAcrossSum(node, 'right');
    if (rightCommon) {
      rules.push({
        id: 'factor_common_right_all',
        name: '→ Вынести общий множитель',
        category: '3. Преобразования',
        preview: 'b*a + c*a + ... → (b+c+...)*a',
        apply: (n: ASTNode) => factorCommonAcrossSum(n as OperatorNode, rightCommon)
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    node.children.forEach((child, index) => {
      const explicitNegative = getExplicitNegativeChild(child);
      if (explicitNegative) {
        rules.push({
          id: `sum_to_sub_${index}`,
          name: '→ Превратить +(-b) в вычитание',
          category: '3. Преобразования',
          preview: 'a + (-b) → a - b',
          apply: (n: ASTNode) => convertExplicitNegativeToSubtraction(n as OperatorNode, index)
        });
      }

      if (isImplicitNegativeChild(child)) {
        rules.push({
          id: `sub_to_sum_${index}`,
          name: '→ Превратить вычитание в +(-b)',
          category: '3. Преобразования',
          preview: 'a - b → a + (-b)',
          apply: (n: ASTNode) => convertSubtractionToExplicitNegative(n as OperatorNode, index)
        });
      }
    });
  }

  if (node.type === 'unary') {
    const target = getUnaryTarget(node);
    if (target && target.type === 'operator' && target.value === '+') {
      rules.push({
        id: 'distribute_unary_minus',
        name: '→ Распределить минус по сумме',
        category: '3. Преобразования',
        preview: '-(a+b) → -a + -b',
        apply: distributeUnaryMinusOverSum
      });
    }
  }

  if (node.type === 'operator' && node.value === '+') {
    if (node.children.length >= 2 && node.children.every(isUnaryMinusNode)) {
      rules.push({
        id: 'factor_unary_minus',
        name: '→ Вынести минус из суммы',
        category: '3. Преобразования',
        preview: '-a + -b → -(a+b)',
        apply: factorUnaryMinusFromSum
      });
    }
  }

  if (node.type === 'operator' && node.value === '*') {
    const unaryIndices = node.children
      .map((child, index) => (isUnaryMinusNode(child) ? index : -1))
      .filter(index => index !== -1);
    for (const index of unaryIndices) {
      rules.push({
        id: `pull_unary_minus_mul_${index}`,
        name: '→ Вынести минус из произведения',
        category: '3. Преобразования',
        preview: '-a*b → -(a*b)',
        apply: (n: ASTNode) => pullUnaryMinusFromMultiplication(n as OperatorNode, index)
      });
    }
  }

  if (node.type === 'operator' && node.value === '/') {
    const leftUnary = getUnaryNode(node.children[0]);
    const rightUnary = getUnaryNode(node.children[1]);
    if (leftUnary && rightUnary) {
      rules.push({
        id: 'remove_double_neg_div',
        name: '→ Убрать двойной минус в дроби',
        category: '3. Преобразования',
        preview: '(-a)/(-b) → a/b',
        apply: removeDoubleNegationInDivision
      });
    }
    if (leftUnary) {
      rules.push({
        id: 'pull_unary_minus_div_left',
        name: '→ Вынести минус из числителя',
        category: '3. Преобразования',
        preview: '(-a)/b → -(a/b)',
        apply: pullUnaryMinusFromDivisionLeft
      });
    }
    if (rightUnary) {
      rules.push({
        id: 'pull_unary_minus_div_right',
        name: '→ Вынести минус из знаменателя',
        category: '3. Преобразования',
        preview: 'a/(-b) → -(a/b)',
        apply: pullUnaryMinusFromDivisionRight
      });
    }
    rules.push({
      id: 'div_to_mul_inverse',
      name: '→ Заменить деление на умножение',
      category: '3. Преобразования',
      preview: 'a/b → a*(1/b)',
      apply: convertDivisionToMultiplication
    });
  }

  // === ПРИОРИТЕТ 4: ПЕРЕСТАНОВКА ===
  if (node.type === 'operator' && node.value === '*' && node.children.length === 2) {
    rules.push({
      id: 'commutative_mul',
      name: 'Поменять местами операнды',
      category: '4. Перестановка',
      preview: 'a*b → b*a',
      apply: applyCommutative
    });
  }

  if (node.type === 'operator' && node.value === '+' && node.children.length === 2) {
    rules.push({
      id: 'commutative_add',
      name: 'Поменять местами операнды',
      category: '4. Перестановка',
      preview: 'a+b → b+a',
      apply: applyCommutative
    });
  }

  // === НОТАЦИЯ: Неявное/Явное умножение ===
  if (node.type === 'implicit_mul') {
    rules.push({
      id: 'expand_implicit_mul',
      name: '→ Раскрыть неявное *',
      category: '6. Нотация',
      preview: '2a → 2*a',
      apply: expandImplicitMultiplication
    });
  }

  if (node.type === 'operator' && node.value === '*') {
    const canCollapse = node.children.length >= 2 && node.children.every((child, i) => {
      if (i === node.children.length - 1) return true;
      const left = child;
      const right = node.children[i + 1];
      return (
        (left.type === 'constant' && right.type === 'variable') ||
        (left.type === 'variable' && right.type === 'variable') ||
        (left.type === 'variable' && right.type === 'group') ||
        (left.type === 'constant' && right.type === 'group') ||
        (left.type === 'group' && right.type === 'variable') ||
        (left.type === 'group' && right.type === 'constant') ||
        (left.type === 'group' && right.type === 'group')
      );
    });

    if (canCollapse) {
      rules.push({
        id: 'collapse_to_implicit_mul',
        name: '→ Свернуть в неявное *',
        category: '6. Нотация',
        preview: '2*a → 2a',
        apply: collapseToImplicitMultiplication
      });
    }
  }

  // === ПРИОРИТЕТ 5: ОБЕРТЫВАНИЕ ===
  if (node.type !== 'group') {
    rules.push({
      id: 'add_parens',
      name: '+ Добавить скобки',
      category: '5. Обертывание',
      preview: 'a → (a)',
      apply: addParentheses
    });
  }

  rules.push({
    id: 'add_double_neg',
    name: '+ Добавить двойное отрицание',
    category: '5. Обертывание',
    preview: 'a → --a',
    apply: applyDoubleNegation
  });



  rules.push({
    id: 'divide_by_one',
    name: '+ Разделить на 1',
    category: '5. Обертывание',
    preview: 'a → a/1',
    apply: divideByOne
  });

  rules.push({
    id: 'add_zero',
    name: '+ Прибавить ноль',
    category: '5. Обертывание',
    preview: 'a → a+0',
    apply: addZero
  });

  return rules;
}

function getConstantValue(node: ASTNode): number | null {
  if (node.type === 'constant') {
    return node.value;
  }
  if (node.type === 'unary' && node.value === '-' && node.children[0].type === 'constant') {
    return -(node.children[0] as ConstantNode).value;
  }
  return null;
}

function evaluatePairAt(node: OperatorNode, index: number, operator: string): ASTNode {
  const left = node.children[index];
  const right = node.children[index + 1];

  let result: number;

  if (operator === '*') {
    const leftVal = (left as ConstantNode).value;
    const rightVal = (right as ConstantNode).value;
    result = leftVal * rightVal;
  } else if (operator === '+') {
    const leftVal = getConstantValue(left)!;
    const rightVal = getConstantValue(right)!;
    result = leftVal + rightVal;
  } else {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  const newChildren = [
    ...node.children.slice(0, index),
    { id: generateId(), type: 'constant' as const, value: result },
    ...node.children.slice(index + 2)
  ];

  if (newChildren.length === 1) {
    return newChildren[0];
  }

  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function evaluateDivision(node: ASTNode): ConstantNode {
  const n = node as OperatorNode;
  const left = n.children[0] as ConstantNode;
  const right = n.children[1] as ConstantNode;
  return {
    id: generateId(),
    type: 'constant',
    value: left.value / right.value
  };
}

function removeMultiplicationByOne(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const newChildren = n.children.filter(
    child => !(child.type === 'constant' && (child as ConstantNode).value === 1)
  );

  if (newChildren.length === 1) {
    return newChildren[0];
  }

  if (newChildren.length === 0) {
    return { id: generateId(), type: 'constant', value: 1 };
  }

  return {
    ...n,
    id: generateId(),
    children: newChildren
  };
}

function simplifyMultiplicationByZero(): ConstantNode {
  return {
    id: generateId(),
    type: 'constant',
    value: 0
  };
}

function removeDivisionByOne(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  return n.children[0];
}

function removeAdditionOfZero(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const newChildren = n.children.filter(child => {
    if (child.type === 'constant' && (child as ConstantNode).value === 0) {
      return false;
    }
    if (child.type === 'unary' && child.value === '-') {
      const innerChild = child.children[0];
      if (innerChild.type === 'constant' && (innerChild as ConstantNode).value === 0) {
        return false;
      }
    }
    return true;
  });

  if (newChildren.length === 1) {
    return newChildren[0];
  }

  if (newChildren.length === 0) {
    return { id: generateId(), type: 'constant', value: 0 };
  }

  return {
    ...n,
    id: generateId(),
    children: newChildren
  };
}

function removeDoubleNegation(node: ASTNode): ASTNode {
  const n = node as UnaryNode;
  const inner = n.children[0] as UnaryNode;
  return inner.children[0];
}

function removeParentheses(node: ASTNode): ASTNode {
  const n = node as GroupNode;
  return n.children[0];
}

function removeDoubleParentheses(node: ASTNode): GroupNode {
  const n = node as GroupNode;
  return n.children[0] as GroupNode;
}

function removeUnaryParentheses(node: ASTNode): UnaryNode {
  const n = node as UnaryNode;
  const group = n.children[0] as GroupNode;
  return {
    ...n,
    id: generateId(),
    children: [group.children[0]]
  };
}

function applyCommutative(node: ASTNode): OperatorNode {
  const n = node as OperatorNode;
  return {
    ...n,
    id: generateId(),
    children: [n.children[1], n.children[0]]
  };
}

function applyDistributiveForward(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const multiplier = n.children[0];
  const sumNode = getAdditionNode(n.children[1]);
  if (!sumNode) {
    return node;
  }

  const products = sumNode.children.map(child => createMultiplicationNode([multiplier, child]));
  return createAdditionNode(products);
}

function applyDistributiveForwardLeft(node: ASTNode): ASTNode {
  const n = node as OperatorNode;
  const sumNode = getAdditionNode(n.children[0]);
  const multiplier = n.children[1];
  if (!sumNode) {
    return node;
  }

  const products = sumNode.children.map(child => createMultiplicationNode([child, multiplier]));
  return createAdditionNode(products);
}

function flattenAddition(node: ASTNode): ASTNode {
  return flattenAssociative(node as OperatorNode, '+');
}

function flattenMultiplication(node: ASTNode): ASTNode {
  return flattenAssociative(node as OperatorNode, '*');
}

function flattenAssociative(node: OperatorNode, operator: '+' | '*'): ASTNode {
  const newChildren: ASTNode[] = [];
  for (const child of node.children) {
    if (child.type === 'operator' && child.value === operator) {
      newChildren.push(...child.children);
    } else {
      newChildren.push(child);
    }
  }
  if (newChildren.length === 1) {
    return newChildren[0];
  }
  return {
    ...node,
    id: generateId(),
    value: operator,
    children: newChildren
  };
}

function factorCommonAcrossSum(node: OperatorNode, match: CommonFactorAcross): ASTNode {
  void node;
  const sumNode = createAdditionNode(match.remainders);
  const groupedSum = wrapInGroupLocal(sumNode);
  const children = match.side === 'right'
    ? [groupedSum, match.factor]
    : [match.factor, groupedSum];
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children
  };
}

function distributeUnaryMinusOverSum(node: ASTNode): ASTNode {
  const unaryNode = node as UnaryNode;
  const target = getUnaryTarget(unaryNode);
  if (!target || target.type !== 'operator' || target.value !== '+') {
    return node;
  }

  const newChildren = target.children.map(child => createUnaryMinus(child));
  return wrapInGroupLocal(createAdditionNode(newChildren));
}

function factorUnaryMinusFromSum(node: ASTNode): ASTNode {
  const sumNode = node as OperatorNode;
  const innerChildren = sumNode.children.map(child => (child as UnaryNode).children[0]);
  const newSum = createAdditionNode(innerChildren);
  return createUnaryMinus(newSum);
}

function convertExplicitNegativeToSubtraction(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index];
  const explicitUnary = getExplicitNegativeChild(target);
  if (!explicitUnary) {
    return node;
  }

  let operand = explicitUnary.children[0];
  if (operand.type === 'operator') {
    operand = wrapInGroupLocal(operand);
  }

  const implicitUnary: UnaryNode = {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [operand],
    implicit: true
  };

  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return implicitUnary;
    }
    return child;
  });

  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function convertSubtractionToExplicitNegative(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index];
  if (!isImplicitNegativeChild(target)) {
    return node;
  }

  const explicitUnary: UnaryNode = {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [target.children[0]]
  };

  const grouped = wrapInGroupLocal(explicitUnary);

  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return grouped;
    }
    return child;
  });

  return {
    ...node,
    id: generateId(),
    children: newChildren
  };
}

function pullUnaryMinusFromMultiplication(node: OperatorNode, index: number): ASTNode {
  const target = node.children[index] as UnaryNode;
  const newChildren = node.children.map((child, childIndex) => {
    if (childIndex === index) {
      return target.children[0];
    }
    return child;
  });
  const product = createMultiplicationNode(newChildren);
  return createUnaryMinus(product);
}

function removeDoubleNegationInDivision(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = unwrapUnaryNode(divNode.children[0]).inner;
  const right = unwrapUnaryNode(divNode.children[1]).inner;
  return createDivisionNode(left, right);
}

function pullUnaryMinusFromDivisionLeft(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = unwrapUnaryNode(divNode.children[0]).inner;
  const right = divNode.children[1];
  return createUnaryMinus(createDivisionNode(left, right));
}

function pullUnaryMinusFromDivisionRight(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = divNode.children[0];
  const right = unwrapUnaryNode(divNode.children[1]).inner;
  return createUnaryMinus(createDivisionNode(left, right));
}

function convertDivisionToMultiplication(node: ASTNode): ASTNode {
  const divNode = node as OperatorNode;
  const left = divNode.children[0];
  const right = divNode.children[1];
  const reciprocal = wrapInGroupLocal(createDivisionNode(createConstantNode(1), right));
  return createMultiplicationNode([left, reciprocal]);
}

function addParentheses(node: ASTNode): GroupNode {
  return {
    id: generateId(),
    type: 'group',
    value: 'group',
    children: [node]
  };
}

function applyDoubleNegation(node: ASTNode): UnaryNode {
  return {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [{
      id: generateId(),
      type: 'unary',
      value: '-',
      children: [node]
    }]
  };
}



function divideByOne(node: ASTNode): OperatorNode {
  // Оборачиваем в скобки если это оператор с низким приоритетом (+ или -)
  // чтобы избежать неправильного приоритета: "1 + 0" → "(1 + 0)/1", а не "1 + 0/1"
  const needsParens = node.type === 'operator' && (node.value === '+' || node.value === '-');
  const wrappedNode = needsParens ? wrapInGroupLocal(node) : node;
  return {
    id: generateId(),
    type: 'operator',
    value: '/',
    children: [
      wrappedNode,
      { id: generateId(), type: 'constant', value: 1 }
    ]
  };
}

function addZero(node: ASTNode): ASTNode {
  const sum: OperatorNode = {
    id: generateId(),
    type: 'operator',
    value: '+',
    children: [
      node,
      { id: generateId(), type: 'constant', value: 0 }
    ]
  };
  return wrapInGroupLocal(sum);
}

function expandImplicitMultiplication(node: ASTNode): OperatorNode {
  const n = node as ImplicitMulNode;
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children: [...n.children]
  };
}

function collapseToImplicitMultiplication(node: ASTNode): ImplicitMulNode {
  const n = node as OperatorNode;
  return {
    id: generateId(),
    type: 'implicit_mul',
    value: '*',
    children: [...n.children]
  };
}

function getUnaryTarget(node: UnaryNode): ASTNode | null {
  const child = node.children[0];
  if (child.type === 'group') {
    return child.children[0];
  }
  return child;
}

function getAdditionNode(node: ASTNode): OperatorNode | null {
  if (node.type === 'operator' && node.value === '+' && node.children.length >= 2) {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'operator') {
    const inner = node.children[0] as OperatorNode;
    if (inner.value === '+' && inner.children.length >= 2) {
      return inner;
    }
  }
  return null;
}

function unwrapGroupNode(node: ASTNode): ASTNode {
  if (node.type === 'group') {
    return node.children[0];
  }
  return node;
}

function getExplicitNegativeChild(node: ASTNode): UnaryNode | null {
  if (node.type === 'unary' && node.value === '-' && !node.implicit) {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'unary') {
    const inner = node.children[0] as UnaryNode;
    if (inner.value === '-') {
      return inner;
    }
  }
  return null;
}

function isImplicitNegativeChild(node: ASTNode): node is UnaryNode {
  return node.type === 'unary' && node.value === '-' && Boolean(node.implicit);
}

function isUnaryMinusNode(node: ASTNode): node is UnaryNode {
  return node.type === 'unary' && node.value === '-';
}

function getUnaryNode(node: ASTNode): UnaryNode | null {
  if (node.type === 'unary' && node.value === '-') {
    return node;
  }
  if (node.type === 'group' && node.children[0].type === 'unary') {
    return node.children[0];
  }
  return null;
}

function unwrapUnaryNode(node: ASTNode): { unary: UnaryNode; inner: ASTNode } {
  const unaryNode = getUnaryNode(node);
  if (!unaryNode) {
    return { unary: node as UnaryNode, inner: node };
  }
  return { unary: unaryNode, inner: unaryNode.children[0] };
}

function createUnaryMinus(node: ASTNode): UnaryNode {
  return {
    id: generateId(),
    type: 'unary',
    value: '-',
    children: [node]
  };
}

function createAdditionNode(children: ASTNode[]): ASTNode {
  if (children.length === 1) {
    return children[0];
  }
  return {
    id: generateId(),
    type: 'operator',
    value: '+',
    children
  };
}

function createMultiplicationNode(children: ASTNode[]): ASTNode {
  if (children.length === 1) {
    return children[0];
  }
  return {
    id: generateId(),
    type: 'operator',
    value: '*',
    children
  };
}

function createDivisionNode(left: ASTNode, right: ASTNode): OperatorNode {
  return {
    id: generateId(),
    type: 'operator',
    value: '/',
    children: [left, right]
  };
}

function createConstantNode(value: number): ConstantNode {
  return {
    id: generateId(),
    type: 'constant',
    value
  };
}

function wrapInGroupLocal(node: ASTNode): GroupNode {
  return {
    id: generateId(),
    type: 'group',
    value: 'group',
    children: [node]
  };
}

type CommonFactorAcross = {
  factor: ASTNode;
  side: 'left' | 'right';
  remainders: ASTNode[];
};

function findCommonFactorAcrossSum(node: OperatorNode, side: 'left' | 'right'): CommonFactorAcross | null {
  if (node.children.length < 2) {
    return null;
  }

  const firstTerm = unwrapGroupNode(node.children[0]);
  const candidate = getFactorCandidate(firstTerm, side);
  if (!candidate) {
    return null;
  }

  const remainders: ASTNode[] = [];
  for (const term of node.children) {
    const remainder = extractRemainderForFactor(term, candidate, side);
    if (!remainder) {
      return null;
    }
    remainders.push(remainder);
  }

  return {
    factor: candidate,
    side,
    remainders
  };
}

function getFactorCandidate(term: ASTNode, side: 'left' | 'right'): ASTNode | null {
  if (term.type === 'operator' && term.value === '*') {
    if (side === 'left') {
      return term.children[0] ?? null;
    }
    return term.children[term.children.length - 1] ?? null;
  }
  return term;
}

function extractRemainderForFactor(term: ASTNode, factor: ASTNode, side: 'left' | 'right'): ASTNode | null {
  const unwrapped = unwrapGroupNode(term);
  if (nodesEqual(unwrapped, factor)) {
    return createConstantNode(1);
  }

  if (unwrapped.type !== 'operator' || unwrapped.value !== '*') {
    return null;
  }

  const children = [...unwrapped.children];
  if (side === 'left') {
    if (!children[0] || !nodesEqual(children[0], factor)) {
      return null;
    }
    children.shift();
  } else {
    if (!children[children.length - 1] || !nodesEqual(children[children.length - 1], factor)) {
      return null;
    }
    children.pop();
  }

  if (children.length === 0) {
    return createConstantNode(1);
  }
  if (children.length === 1) {
    return children[0];
  }
  return createMultiplicationNode(children);
}
