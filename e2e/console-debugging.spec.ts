import { test, expect, ConsoleMessage } from '@playwright/test';

/**
 * Примеры расширенной работы с консолью браузера и отладкой
 */

test.describe('Консоль браузера и отладка', () => {
  
  test('детальный перехват всех типов консольных сообщений', async ({ page }) => {
    // Структура для классификации логов
    const consoleLogs = {
      log: [] as string[],
      info: [] as string[],
      warn: [] as string[],
      error: [] as string[],
      debug: [] as string[],
    };
    
    // Перехватываем все консольные сообщения
    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      const logEntry = `[${location.url}:${location.lineNumber}] ${text}`;
      
      switch (type) {
        case 'log':
          consoleLogs.log.push(logEntry);
          break;
        case 'info':
          consoleLogs.info.push(logEntry);
          break;
        case 'warning':
          consoleLogs.warn.push(logEntry);
          break;
        case 'error':
          consoleLogs.error.push(logEntry);
          break;
        case 'debug':
          consoleLogs.debug.push(logEntry);
          break;
      }
    });
    
    // Перехват JavaScript ошибок
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(`${error.name}: ${error.message}\n${error.stack}`);
    });
    
    // Перехват сетевых запросов (опционально)
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    await page.goto('/expression-editor-modular.html');
    await page.waitForLoadState('networkidle');
    
    // Взаимодействие с приложением
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.click();
    await expressionInput.fill('2x + 3');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(1000);
    
    // Вывод детальной информации о логах
    console.log('\n========================================');
    console.log('ОТЧЕТ О КОНСОЛЬНЫХ ЛОГАХ БРАУЗЕРА');
    console.log('========================================\n');
    
    if (consoleLogs.log.length > 0) {
      console.log('📋 LOG сообщения:');
      consoleLogs.log.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }
    
    if (consoleLogs.info.length > 0) {
      console.log('ℹ️  INFO сообщения:');
      consoleLogs.info.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }
    
    if (consoleLogs.warn.length > 0) {
      console.log('⚠️  WARNING сообщения:');
      consoleLogs.warn.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }
    
    if (consoleLogs.error.length > 0) {
      console.log('❌ ERROR сообщения:');
      consoleLogs.error.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }
    
    if (pageErrors.length > 0) {
      console.log('🔥 JavaScript ошибки страницы:');
      pageErrors.forEach(err => console.log(`  ${err}`));
      console.log('');
    }
    
    if (failedRequests.length > 0) {
      console.log('🌐 Неудачные сетевые запросы:');
      failedRequests.forEach(req => console.log(`  ${req}`));
      console.log('');
    }
    
    console.log('========================================\n');
    
    // Проверки (опционально можно включить строгую проверку)
    // expect(consoleLogs.error.length).toBe(0);
    // expect(pageErrors.length).toBe(0);
  });

  test('инъекция скриптов и выполнение JavaScript в браузере', async ({ page }) => {
    await page.goto('/expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    
    // Инъекция console.log для отладки
    await page.evaluate(() => {
      console.log('🔧 Тестовый скрипт выполнен в контексте страницы');
      console.log('User Agent:', navigator.userAgent);
      console.log('URL:', window.location.href);
    });
    
    // Получение данных из браузера
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasExpressionInput: !!document.getElementById('expressionInput'),
        hasCommandsPanel: !!document.getElementById('commandsPanel'),
        hasExpressionContainer: !!document.getElementById('expressionContainer'),
      };
    });
    
    console.log('\n=== ИНФОРМАЦИЯ О СТРАНИЦЕ ===');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    expect(pageInfo.hasExpressionInput).toBe(true);
    expect(pageInfo.hasCommandsPanel).toBe(true);
    expect(pageInfo.hasExpressionContainer).toBe(true);
  });

  test('отладка с паузой и step-by-step выполнением', async ({ page }) => {
    // Этот тест полезен запускать в --debug режиме
    // Команда: npm run test:e2e:debug
    
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    console.log('Шаг 1: Загрузка страницы');
    await page.goto('/expression-editor-modular.html');
    
    console.log('Шаг 2: Ожидание загрузки DOM');
    await page.waitForLoadState('domcontentloaded');
    
    console.log('Шаг 3: Поиск элемента ввода');
    const expressionInput = page.locator('#expressionInput');
    
    console.log('Шаг 4: Клик по полю ввода');
    await expressionInput.click();
    
    console.log('Шаг 5: Ввод выражения "x^2 + 2x + 1"');
    await expressionInput.fill('x^2 + 2x + 1');
    await page.locator('#buildBtn').click();
    
    console.log('Шаг 6: Ожидание обработки');
    await page.waitForTimeout(500);
    
    console.log('Шаг 7: Получение результата');
    const expressionContainer = page.locator('#expressionContainer');
    const text = await expressionContainer.textContent();
    
    console.log(`\nРезультат: "${text}"`);
    console.log(`Всего консольных логов: ${logs.length}`);
    
    // Можно добавить точку останова для отладки
    // await page.pause(); // Откроет Playwright Inspector
  });

  test('скриншоты для визуальной отладки', async ({ page }) => {
    await page.goto('/expression-editor-modular.html');
    await page.waitForLoadState('networkidle');
    
    // Скриншот всей страницы
    await page.screenshot({ 
      path: 'playwright-report/screenshots/app-initial.png',
      fullPage: true 
    });
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.click();
    await expressionInput.fill('2x^2 + 3x - 5');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Скриншот после ввода
    await page.screenshot({ 
      path: 'playwright-report/screenshots/app-with-expression.png',
      fullPage: true 
    });
    
    // Скриншот конкретного элемента
    const expressionContainer = page.locator('#expressionContainer');
    await expressionContainer.screenshot({ 
      path: 'playwright-report/screenshots/expression-display.png' 
    });
    
    console.log('\n📸 Скриншоты сохранены в playwright-report/screenshots/');
  });
});
