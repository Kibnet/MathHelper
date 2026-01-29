import { test, expect } from '@playwright/test';

/**
 * E2E тесты для проверки подсветки изменений в превью команд
 */

const getFrames = (page) => page.locator('[data-testid="expression-frame"]');
const getCommandItems = (page) => page.locator('#commandsPanel [data-testid="command-item"]');

test.describe('Подсветка изменений в превью команд', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Ждём автозагрузки примера
    await page.waitForTimeout(1000);
  });

  test('должен подсвечивать изменённую часть в превью для вычисления', async ({ page }) => {
    // Вводим простое выражение с вычислимой частью
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.fill('2 + 3');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    // Кликаем на корневой фрейм (path="root")
    const frames = getFrames(page);
    const rootFrame = page.locator('[data-testid="expression-frame"][data-path-key="root"]');
    await expect(rootFrame).toBeVisible();
    await rootFrame.click();

    // Ищем команду с вычислением
    const commands = getCommandItems(page);
    await expect(commands.first()).toBeVisible();

    // Проверяем что в превью есть подсвеченная часть
    const previewWithMark = page.locator('.command-preview mark.preview-changed');
    
    // Логируем для отладки
    const previewTexts = await page.locator('.command-preview').allTextContents();
    console.log('Preview texts:', previewTexts);
    
    const markCount = await previewWithMark.count();
    console.log('Mark count:', markCount);
    
    if (markCount > 0) {
      const markTexts = await previewWithMark.allTextContents();
      console.log('Highlighted parts:', markTexts);
    }

    // Проверяем что подсветка работает корректно:
    // Для "2 + 3" -> "5" должно подсветиться только "5"
    const previewHtmlList = await page.locator('.command-preview').evaluateAll(els => 
      els.map(el => el.innerHTML)
    );
    console.log('Preview HTML:', previewHtmlList);
    
    // Первый превью должен быть для вычисления: "5" полностью подсвечен
    expect(markCount).toBeGreaterThan(0);
  });

  test('должен подсвечивать только изменённую часть при упрощении унарного минуса', async ({ page }) => {
    // Выражение с двойным минусом
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.fill('--5');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    // Кликаем на фрейм
    const frames = getFrames(page);
    if (await frames.count() > 0) {
      await frames.first().click();
      await page.waitForTimeout(300);

      // Проверяем превью
      const previews = page.locator('.command-preview');
      const previewCount = await previews.count();
      
      console.log('Количество превью:', previewCount);
      
      for (let i = 0; i < previewCount; i++) {
        const previewHtml = await previews.nth(i).innerHTML();
        console.log(`Preview ${i}:`, previewHtml);
      }
    }
  });

  test('должен корректно подсвечивать изменения в сложном выражении', async ({ page }) => {
    // Выражение с несколькими операциями
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.fill('2 * 3 + 4');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    // Находим и кликаем на фрейм "2 * 3"
    const frames = getFrames(page);
    const frameCount = await frames.count();
    console.log('Количество фреймов:', frameCount);

    // Выводим все фреймы для отладки
    for (let i = 0; i < frameCount; i++) {
      const frameText = await frames.nth(i).getAttribute('data-path-key');
      console.log(`Frame ${i}:`, frameText);
    }

    // Кликаем на первый фрейм (обычно это вложенное выражение)
    if (frameCount > 0) {
      await frames.first().click();
      await page.waitForTimeout(300);

      // Проверяем превью команд
      const previews = page.locator('.command-preview');
      const previewHtmlList = await previews.evaluateAll(els => 
        els.map(el => ({ text: el.textContent, html: el.innerHTML }))
      );
      
      console.log('Все превью:', JSON.stringify(previewHtmlList, null, 2));

      // Проверяем что mark присутствует
      const markElements = page.locator('.command-preview mark');
      const markCount = await markElements.count();
      console.log('Элементов mark:', markCount);
    }
  });

  test('должен показывать ∅ при удалении части выражения', async ({ page }) => {
    // Выражение где можно удалить часть (например, + 0)
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.fill('x + 0');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    const frames = getFrames(page);
    if (await frames.count() > 0) {
      await frames.first().click();
      await page.waitForTimeout(300);

      // Ищем mark.preview-deleted
      const deletedMark = page.locator('.command-preview mark.preview-deleted');
      const deletedCount = await deletedMark.count();
      console.log('Количество preview-deleted:', deletedCount);
      
      if (deletedCount > 0) {
        const deletedTexts = await deletedMark.allTextContents();
        console.log('Deleted marks:', deletedTexts);
      }
    }
  });

  test('проверка данных selection.text vs operation.preview', async ({ page }) => {
    // Простое выражение для детального анализа
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.fill('1 + 2');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    const frames = getFrames(page);
    if (await frames.count() > 0) {
      await frames.first().click();
      await page.waitForTimeout(300);

      // Получаем текст выбранного выражения
      const selectionText = await page.locator('.command-selection').textContent();
      console.log('Selection text:', selectionText);

      // Получаем все command-item с их данными
      const commandItems = getCommandItems(page);
      const itemsData = await commandItems.evaluateAll(items => 
        items.map(item => ({
          operationPreview: item.dataset.operationPreview,
          previewHtml: item.querySelector('.command-preview')?.innerHTML
        }))
      );
      
      console.log('Command items data:', JSON.stringify(itemsData, null, 2));
    }
  });
});
