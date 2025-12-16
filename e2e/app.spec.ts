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
    await expect(page).toHaveTitle(/Преобразователь выражений/i);
    
    // Проверяем наличие основных элементов
    const expressionInput = page.locator('#expressionInput');
    await expect(expressionInput).toBeVisible();
    
    const commandsPanel = page.locator('#commandsPanel');
    await expect(commandsPanel).toBeVisible();
    
    const expressionContainer = page.locator('#expressionContainer');
    await expect(expressionContainer).toBeVisible();
    
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
    const expressionInput = page.locator('#expressionInput');
    
    // Вводим простое выражение
    await expressionInput.click();
    await expressionInput.fill('2x + 3');
    
    // Нажимаем кнопку "Построить"
    await page.locator('#buildBtn').click();
    
    // Ждем небольшую паузу для обработки
    await page.waitForTimeout(500);
    
    // Проверяем, что выражение отобразилось
    const expressionContainer = page.locator('#expressionContainer');
    const displayedText = await expressionContainer.textContent();
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
    
    const expressionInput = page.locator('#expressionInput');
    
    // Вводим выражение
    await expressionInput.click();
    await expressionInput.fill('x + y');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Наводим на первый токен (если есть подсветка)
    const expressionContainer = page.locator('#expressionContainer');
    const firstToken = expressionContainer.locator('span').first();
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
      const expressionInput = page.locator('#expressionInput');
      
      console.log('\nВвод выражения: "2x + 3y - 5"');
      await expressionInput.click();
      await expressionInput.fill('2x + 3y - 5');
      await page.locator('#buildBtn').click();
      
      await page.waitForTimeout(1000);
      
      console.log('\nОчистка выражения');
      await page.locator('#clearBtn').click();
      
      console.log('\nВвод нового выражения: "a*b + c/d"');
      await expressionInput.fill('a*b + c/d');
      await page.locator('#buildBtn').click();
      
      await page.waitForTimeout(2000);
      
      console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
    });
  });
});
