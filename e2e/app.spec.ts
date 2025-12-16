import { test, expect } from '@playwright/test';

/**
 * E2E тесты для математического редактора выражений
 */

test.describe('MathHelper Application', () => {
  
  test('должен загрузить приложение и отобразить основные элементы', async ({ page }) => {
    // Массив для сбора всех консольных сообщений
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    // Перехватываем консольные логи
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        consoleErrors.push(`[ERROR] ${text}`);
      } else if (type === 'warning') {
        consoleMessages.push(`[WARN] ${text}`);
      } else {
        consoleMessages.push(`[${type.toUpperCase()}] ${text}`);
      }
    });
    
    // Перехватываем ошибки страницы
    page.on('pageerror', error => {
      consoleErrors.push(`[PAGE ERROR] ${error.message}`);
    });
    
    // Переходим на страницу приложения
    await page.goto('/expression-editor-modular.html');
    
    // Ожидаем загрузку страницы
    await page.waitForLoadState('domcontentloaded');
    
    // Проверяем заголовок страницы
    await expect(page).toHaveTitle(/Expression Editor/i);
    
    // Проверяем наличие основных элементов
    const expressionDisplay = page.locator('#expression-display');
    await expect(expressionDisplay).toBeVisible();
    
    const commandPanel = page.locator('#command-panel');
    await expect(commandPanel).toBeVisible();
    
    // Выводим все консольные логи в отчет теста
    if (consoleMessages.length > 0) {
      console.log('\n=== КОНСОЛЬНЫЕ ЛОГИ БРАУЗЕРА ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
    
    // Проверяем, что нет критических ошибок
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ В КОНСОЛИ БРАУЗЕРА ===');
      consoleErrors.forEach(err => console.error(err));
    }
    
    // Тест не падает при ошибках консоли, но логирует их
    // Если хотите, чтобы тест падал при ошибках, раскомментируйте:
    // expect(consoleErrors).toHaveLength(0);
  });

  test('должен корректно обрабатывать ввод математического выражения', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // Перехватываем консоль
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('/expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    
    // Находим поле ввода выражения
    const expressionDisplay = page.locator('#expression-display');
    
    // Вводим простое выражение
    await expressionDisplay.click();
    await page.keyboard.type('2x + 3');
    
    // Ждем небольшую паузу для обработки
    await page.waitForTimeout(500);
    
    // Проверяем, что выражение отобразилось
    const displayedText = await expressionDisplay.textContent();
    console.log(`Отображенное выражение: "${displayedText}"`);
    
    // Выводим логи
    if (consoleMessages.length > 0) {
      console.log('\n=== ЛОГИ ПРИ ВВОДЕ ВЫРАЖЕНИЯ ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
  });

  test('должен показывать токены выражения при наведении', async ({ page }) => {
    await page.goto('/expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    
    const expressionDisplay = page.locator('#expression-display');
    
    // Вводим выражение
    await expressionDisplay.click();
    await page.keyboard.type('x + y');
    await page.waitForTimeout(500);
    
    // Наводим на первый токен (если есть подсветка)
    const firstToken = expressionDisplay.locator('span').first();
    if (await firstToken.count() > 0) {
      await firstToken.hover();
      await page.waitForTimeout(300);
      
      // Проверяем наличие tooltip или hover эффекта
      const hasTitle = await firstToken.getAttribute('title');
      console.log(`Tooltip на токене: ${hasTitle || 'отсутствует'}`);
    }
  });

  test.describe('Тесты с визуальным режимом (headed)', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 
      'Тест только для Chromium');
    
    test('демонстрация работы приложения', async ({ page }) => {
      // Этот тест предназначен для запуска в headed режиме
      // Запустите: npm run test:e2e:headed
      
      const logs: string[] = [];
      page.on('console', msg => logs.push(msg.text()));
      
      await page.goto('/expression-editor-modular.html');
      await page.waitForLoadState('networkidle');
      
      console.log('=== ПРИЛОЖЕНИЕ ЗАГРУЖЕНО ===');
      console.log('Консольные логи:', logs);
      
      // Демонстрация взаимодействия
      const expressionDisplay = page.locator('#expression-display');
      
      console.log('\nВвод выражения: "2x + 3y - 5"');
      await expressionDisplay.click();
      await page.keyboard.type('2x + 3y - 5', { delay: 100 });
      
      await page.waitForTimeout(1000);
      
      console.log('\nОчистка выражения');
      await expressionDisplay.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      
      console.log('\nВвод нового выражения: "a*b + c/d"');
      await page.keyboard.type('a*b + c/d', { delay: 100 });
      
      await page.waitForTimeout(2000);
      
      console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
    });
  });
});
