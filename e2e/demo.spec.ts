import { test } from '@playwright/test';

/**
 * Демонстрационный тест для быстрой проверки работы Playwright
 * 
 * Запустите в headed режиме чтобы увидеть браузер:
 * npm run test:e2e:headed -- demo.spec.ts
 * 
 * Или с автооткрытием DevTools (раскомментируйте args в playwright.config.ts)
 */

test('🎬 Демо: взаимодействие с приложением', async ({ page }) => {
  console.log('\n🚀 Запуск демонстрации...\n');
  
  // Перехват всех консольных логов
  page.on('console', msg => {
    const type = msg.type();
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`${emoji} [Браузер ${type}]: ${msg.text()}`);
  });
  
  // Перехват ошибок
  page.on('pageerror', error => {
    console.error(`🔥 [JavaScript Error]: ${error.message}`);
  });
  
  console.log('📄 Шаг 1: Загрузка страницы...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  console.log('✅ Страница загружена\n');
  
  console.log('🖱️  Шаг 2: Поиск поля ввода выражения...');
  const expressionInput = page.locator('#expressionInput');
  console.log('✅ Поле найдено\n');
  
  console.log('👆 Шаг 3: Клик по полю ввода...');
  await expressionInput.click();
  await page.waitForTimeout(300);
  console.log('✅ Фокус установлен\n');
  
  // Примеры выражений для демонстрации
  const expressions = [
    '2x + 3',
    'a*b + c',
    'x^2 + 2x + 1',
  ];
  
  for (const expr of expressions) {
    console.log(`⌨️  Ввод выражения: "${expr}"`);
    
    // Очищаем поле
    await page.locator('#clearBtn').click();
    
    // Вводим новое выражение
    await expressionInput.fill(expr);
    await page.locator('#buildBtn').click();
    
    // Ждем обработки
    await page.waitForTimeout(800);
    
    // Получаем отображенный текст
    const expressionContainer = page.locator('#expressionContainer');
    const displayedText = await expressionContainer.textContent();
    console.log(`   Отображено: "${displayedText}"`);
    console.log('');
  }
  
  console.log('🎉 Демонстрация завершена!\n');
  
  // Задержка перед закрытием в headed режиме
  await page.waitForTimeout(1500);
});

test('🔍 Демо: инспекция DOM и выполнение JavaScript', async ({ page }) => {
  console.log('\n🔬 Инспекция приложения...\n');
  
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // Выполняем JavaScript в контексте страницы
  const pageInfo = await page.evaluate(() => {
    // Этот код выполняется в браузере
    console.log('🔧 Скрипт выполнен в контексте страницы');
    
    return {
      title: document.title,
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      elements: {
        hasExpressionInput: !!document.getElementById('expressionInput'),
        hasCommandsPanel: !!document.getElementById('commandsPanel'),
        hasHistoryPanel: !!document.getElementById('historyPanel'),
        hasDescriptionPanel: !!document.getElementById('descriptionPanel'),
      },
      cookies: document.cookie || 'нет cookies',
    };
  });
  
  console.log('📊 Информация о странице:');
  console.log(`   Заголовок: ${pageInfo.title}`);
  console.log(`   URL: ${pageInfo.url}`);
  console.log(`   User Agent: ${pageInfo.userAgent}`);
  console.log(`   Размер экрана: ${pageInfo.screenSize}`);
  console.log(`   Cookies: ${pageInfo.cookies}`);
  console.log('\n🧩 Найденные элементы:');
  Object.entries(pageInfo.elements).forEach(([key, found]) => {
    const status = found ? '✅' : '❌';
    console.log(`   ${status} ${key}`);
  });
  console.log('');
});
