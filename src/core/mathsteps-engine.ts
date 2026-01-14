/**
 * Адаптер для работы с mathsteps (Kibnet)
 */
import type { MathStepsNode, MathStepsOperation, MathStepsPath, MathStepsTransform, MathStepsTransformPreview } from '../types/index.js';

import mathsteps from 'mathsteps';
import * as mathjs from 'mathjs';

export class MathStepsEngine {
  /**
   * Нормализует выражение в формат mathsteps
   */
  normalizeExpression(expression: string): string {
    return mathsteps.applicableTransforms.normalizeExpressionString(expression);
  }

  /**
   * Парсит выражение в mathjs AST
   */
  parse(expression: string): MathStepsNode {
    const normalized = this.normalizeExpression(expression);
    return mathjs.parse(normalized) as MathStepsNode;
  }

  /**
   * Преобразует mathjs AST в строку для отображения
   */
  stringify(node: MathStepsNode): string {
    return node.toString();
  }

  /**
   * Получает список доступных преобразований для подвыражения
   */
  listOps(expression: string, selectionPath: MathStepsPath): MathStepsOperation[] {
    const transforms = mathsteps.applicableTransforms.listApplicableTransforms(expression, selectionPath) as MathStepsTransform[];
    return transforms.map((transform) => ({
      id: transform.id,
      name: transform.title || transform.changeType,
      preview: this.stringify(transform.preview.newNode),
      group: transform.searcher,
      selectionPath: transform.path,
      transform
    }));
  }

  /**
   * Применяет преобразование по ID и возвращает результат
   */
  apply(expression: string, selectionPath: MathStepsPath, operationId: string): MathStepsTransformPreview {
    return mathsteps.applicableTransforms.applyTransform(expression, selectionPath, operationId) as MathStepsTransformPreview;
  }
}
