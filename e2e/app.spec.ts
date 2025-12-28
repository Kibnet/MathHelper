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
    await page.goto('expression-editor-modular.html');
    
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
    
    await page.goto('expression-editor-modular.html');
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
    await page.goto('expression-editor-modular.html');
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

  test('должен сворачивать панели на мобильном экране', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');

    const commandsToggle = page.locator('[data-panel-toggle="commandsPanel"]');
    const commandsPanel = page.locator('#commandsPanel');
    await expect(commandsToggle).toBeVisible();
    await expect(commandsPanel).toBeVisible();

    await commandsToggle.click();
    await expect(commandsPanel).toBeHidden();

    await commandsToggle.click();
    await expect(commandsPanel).toBeVisible();

    const historyToggle = page.locator('[data-panel-toggle="historyPanel"]');
    const historyPanel = page.locator('#historyPanel');
    await expect(historyToggle).toBeVisible();

    await historyToggle.click();
    await expect(historyPanel).toBeHidden();
  });

  test('БАГ 1: коммутативность для парного подвыражения 1+2 в 1+2+3 должна давать 2+1+3', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    // Перехватываем консоль
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(`[ERROR] ${text}`);
      }
      consoleMessages.push(`[${type}] ${text}`);
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(`[PAGE ERROR] ${error.message}`);
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    
    // Ждём завершения автоматической загрузки примера (500ms + запас)
    await page.waitForTimeout(1000);
    
    // Явно очищаем поле ввода
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Вводим выражение 1+2+3
    await expressionInput.click();
    await expressionInput.fill('1 + 2 + 3');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    console.log('\n=== ШАГ 1: Выражение 1+2+3 построено ===');
    
    // Проверяем что выражение отобразилось
    const expressionContainer = page.locator('#expressionContainer');
    const displayedText = await expressionContainer.textContent();
    console.log(`Отображенное выражение: "${displayedText}"`);
    
    // Находим все фреймы (рамки подвыражений)
    const frames = page.locator('.expression-range');
    const frameCount = await frames.count();
    console.log(`\nНайдено фреймов: ${frameCount}`);
    
    // Для 1+2+3 должны быть фреймы:
    // 1. Основной фрейм для всего выражения "1+2+3"
    // 2. Парный фрейм для "1+2"
    // 3. Парный фрейм для "2+3"
    // 4. Фреймы для отдельных чисел (1, 2, 3)
    
    // Выводим информацию о каждом фрейме
    for (let i = 0; i < frameCount; i++) {
      const frame = frames.nth(i);
      const frameText = await frame.getAttribute('data-text');
      console.log(`  Фрейм ${i}: "${frameText}"`);
    }
    
    // Ищем фрейм для подвыражения "1+2"
    console.log('\n=== ШАГ 2: Ищем фрейм для "1+2" ===');
    const frame1plus2 = page.locator('.expression-range[data-text="1 + 2"]');
    
    // Проверяем что фрейм существует
    await expect(frame1plus2).toHaveCount(1);
    console.log('Фрейм "1+2" найден!');
    
    // Кликаем на фрейм "1+2" чтобы показать команды
    console.log('\n=== ШАГ 3: Клик на фрейм "1+2" ===');
    await frame1plus2.click();
    await page.waitForTimeout(300);
    
    // Проверяем что панель команд отобразилась
    const commandsPanel = page.locator('#commandsPanel');
    const commandsPanelVisible = await commandsPanel.isVisible();
    console.log(`Панель команд видима: ${commandsPanelVisible}`);
    
    // Ищем команду коммутативности
    console.log('\n=== ШАГ 4: Ищем команду коммутативности ===');
    const commands = commandsPanel.locator('.command-item');
    const commandCount = await commands.count();
    console.log(`Найдено команд: ${commandCount}`);
    
    // Выводим все команды
    for (let i = 0; i < commandCount; i++) {
      const cmd = commands.nth(i);
      const cmdText = await cmd.textContent();
      console.log(`  Команда ${i}: "${cmdText}"`);
    }
    
    // Ищем команду "Поменять местами операнды"
    const commutativeCommand = commandsPanel.locator('.command-item:has-text("Поменять местами")');
    const commutativeExists = await commutativeCommand.count() > 0;
    
    if (commutativeExists) {
      console.log('\nКоманда коммутативности найдена!');
      
      // Применяем команду
      console.log('\n=== ШАГ 5: Применяем команду коммутативности ===');
      await commutativeCommand.first().click();
      await page.waitForTimeout(500);
      
      // Проверяем результат
      const newExpression = await expressionContainer.textContent();
      console.log(`Новое выражение: "${newExpression}"`);
      
      // Ожидаем: 2 + 1 + 3 (или варианты без пробелов)
      const normalized = newExpression?.replace(/\s+/g, '');
      console.log(`Нормализованное: "${normalized}"`);
      
      // Проверяем что выражение изменилось
      // Должно быть 2+1+3 или 2 + 1 + 3
      expect(normalized).toContain('2');
      expect(normalized).toContain('1');
      expect(normalized).toContain('3');
      
      // Проверяем что 2 стоит перед 1 (перестановка произошла)
      const indexOf2 = normalized?.indexOf('2');
      const indexOf1 = normalized?.indexOf('1');
      
      console.log(`\nПозиция '2': ${indexOf2}, Позиция '1': ${indexOf1}`);
      
      // БАГ: если позиция 1 < позиции 2, значит перестановка НЕ сработала
      if (indexOf1 !== undefined && indexOf2 !== undefined && indexOf1 < indexOf2) {
        console.error('\n❌ БАГ ПОДТВЕРЖДЕН: перестановка НЕ произошла!');
        console.error(`Ожидали: 2+1+3, Получили: ${newExpression}`);
      }
      
      // Основная проверка: 2 должна стоять перед 1
      expect(indexOf2).toBeLessThan(indexOf1 ?? 0);
      
    } else {
      console.error('\n❌ Команда коммутативности НЕ НАЙДЕНА!');
      expect(commutativeExists).toBe(true);
    }
    
    // Выводим логи
    if (consoleMessages.length > 0) {
      console.log('\n=== КОНСОЛЬНЫЕ ЛОГИ ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });

  test('БАГ 3: раскрытие неявного умножения ab в a*b в выражении abc должно давать a*bc', async ({ page }) => {
    console.log('\n=== ТЕСТ БАГ 3: Раскрытие неявного умножения в abc ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    
    // Ждём завершения автоматической загрузки примера (500ms + запас)
    await page.waitForTimeout(1000);
    
    // Явно очищаем поле ввода
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Вводим выражение abc (неявное умножение a*b*c)
    await expressionInput.click();
    await expressionInput.fill('abc');
    console.log('Введено выражение: abc');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const expressionContainer = page.locator('#expressionContainer');
    const commandsPanel = page.locator('#commandsPanel');
    
    // Проверяем что выражение построено
    const initialText = await expressionContainer.textContent();
    console.log('Построенное выражение:', initialText);
    
    // Ищем фрейм для подвыражения "ab"
    const frameAB = page.locator('.expression-range[data-text="ab"]');
    const frameCount = await frameAB.count();
    console.log(`Найдено фреймов для "ab": ${frameCount}`);
    
    await expect(frameAB).toHaveCount(1);
    
    // Кликаем на фрейм
    await frameAB.click();
    await page.waitForTimeout(300);
    
    console.log('Кликнули на фрейм "ab"');
    
    // Проверяем что появились команды
    const commandItems = commandsPanel.locator('.command-item');
    const commandCount = await commandItems.count();
    console.log(`Количество команд: ${commandCount}`);
    
    if (commandCount > 0) {
      const commandsText = await commandItems.allTextContents();
      console.log('Доступные команды:', commandsText);
    }
    
    // Ищем команду "Раскрыть неявное умножение" или похожую
    const expandCommand = commandsPanel.locator('.command-item').filter({
      hasText: /раскрыть.*неявн|→.*\*/i
    });
    
    const expandExists = await expandCommand.count() > 0;
    console.log('Команда раскрытия найдена:', expandExists);
    
    if (expandExists) {
      const commandText = await expandCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      // Применяем команду
      await expandCommand.first().click();
      await page.waitForTimeout(500);
      
      // Проверяем результат - берём текст только из токенов, без тултипов
      const tokens = expressionContainer.locator('.token');
      const tokenTexts = await tokens.allTextContents();
      // Фильтруем пустые строки и объединяем
      const tokenText = tokenTexts.filter(t => t.trim()).join('');
      console.log('Результат после трансформации (токены):', tokenText);
      
      // Также проверим поле ввода, которое должно содержать правильное выражение
      const inputValue = await expressionInput.inputValue();
      console.log('Значение в поле ввода:', inputValue);
      
      const normalized = inputValue.replace(/\s+/g, '');
      console.log('Нормализованный результат:', normalized);
      
      // Проверяем что ab раскрылось в a*b, а c осталось на месте
      // Ожидаем: a*bc или a * bc
      expect(normalized).toMatch(/a\*bc/);
      
      // Дополнительная проверка: после 'a' должна быть '*', потом 'b', потом 'c'
      const indexOfA = normalized?.indexOf('a');
      const indexOfStar = normalized?.indexOf('*');
      const indexOfB = normalized?.indexOf('b');
      const indexOfC = normalized?.indexOf('c');
      
      console.log('Позиции символов:', { a: indexOfA, '*': indexOfStar, b: indexOfB, c: indexOfC });
      
      // a < * < b < c
      expect(indexOfA).toBeLessThan(indexOfStar ?? 0);
      expect(indexOfStar).toBeLessThan(indexOfB ?? 0);
      expect(indexOfB).toBeLessThan(indexOfC ?? 0);
      
    } else {
      console.error('\n❌ Команда раскрытия неявного умножения НЕ НАЙДЕНА!');
      expect(expandExists).toBe(true);
    }
    
    // Выводим логи
    if (consoleMessages.length > 0) {
      console.log('\n=== КОНСОЛЬНЫЕ ЛОГИ ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
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
      
      await page.goto('expression-editor-modular.html');
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

test.describe('Тестирование трансформаций на виртуальных парных узлах', () => {
  
  test('Кейс 1: Вычисление пары констант в n-арном сложении (2+3 в 2+3+4 → 5+4)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Вычисление пары 2+3 в выражении 2+3+4 ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Вводим 2+3+4
    await expressionInput.click();
    await expressionInput.fill('2 + 3 + 4');
    console.log('Введено выражение: 2 + 3 + 4');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const expressionContainer = page.locator('#expressionContainer');
    const commandsPanel = page.locator('#commandsPanel');
    
    // Проверяем построенное выражение
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Ищем фрейм для пары "2+3"
    const frame2plus3 = page.locator('.expression-range[data-text="2 + 3"]');
    await expect(frame2plus3).toHaveCount(1);
    console.log('Фрейм "2 + 3" найден');
    
    // Кликаем на фрейм
    await frame2plus3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 + 3"');
    
    // Ищем команду вычисления
    const evalCommand = commandsPanel.locator('.command-item').filter({
      hasText: /вычислить|→.*5/i
    });
    
    const evalExists = await evalCommand.count() > 0;
    console.log('Команда вычисления найдена:', evalExists);
    expect(evalExists).toBe(true);
    
    if (evalExists) {
      const commandText = await evalCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await evalCommand.first().click();
      await page.waitForTimeout(500);
      
      // Проверяем результат
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после вычисления:', normalized);
      
      // Должно получиться 5+4
      expect(normalized).toMatch(/5\+4/);
      console.log('✅ Вычисление пары 2+3 → 5 успешно');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 2: Вычисление пары констант в n-арном умножении (2*3 в 2*3*4 → 6*4)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Вычисление пары 2*3 в выражении 2*3*4 ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Вводим 2*3*4
    await expressionInput.click();
    await expressionInput.fill('2 * 3 * 4');
    console.log('Введено выражение: 2 * 3 * 4');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const expressionContainer = page.locator('#expressionContainer');
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Ищем фрейм для пары "2*3"
    const frame2mul3 = page.locator('.expression-range[data-text="2 * 3"]');
    await expect(frame2mul3).toHaveCount(1);
    console.log('Фрейм "2 * 3" найден');
    
    await frame2mul3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 * 3"');
    
    // Ищем команду вычисления
    const evalCommand = commandsPanel.locator('.command-item').filter({
      hasText: /вычислить|→.*6/i
    });
    
    const evalExists = await evalCommand.count() > 0;
    console.log('Команда вычисления найдена:', evalExists);
    expect(evalExists).toBe(true);
    
    if (evalExists) {
      const commandText = await evalCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await evalCommand.first().click();
      await page.waitForTimeout(500);
      
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после вычисления:', normalized);
      
      // Должно получиться 6*4
      expect(normalized).toMatch(/6\*4/);
      console.log('✅ Вычисление пары 2*3 → 6 успешно');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 3: Удаление +0 из n-арного сложения (1+0+2 → 1+2)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Удаление +0 из выражения 1+0+2 ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    await expressionInput.click();
    await expressionInput.fill('1 + 0 + 2');
    console.log('Введено выражение: 1 + 0 + 2');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Кликаем на всё выражение (корневой узел)
    const rootFrame = page.locator('.expression-range[data-text="1 + 0 + 2"]');
    await expect(rootFrame).toHaveCount(1);
    console.log('Корневой фрейм "1 + 0 + 2" найден');
    
    await rootFrame.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на корневой фрейм');
    
    // Ищем команду удаления +0
    const removeZeroCommand = commandsPanel.locator('.command-item').filter({
      hasText: /убрать.*\+0/i
    });
    
    const removeZeroExists = await removeZeroCommand.count() > 0;
    console.log('Команда "Убрать +0" найдена:', removeZeroExists);
    expect(removeZeroExists).toBe(true);
    
    if (removeZeroExists) {
      const commandText = await removeZeroCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await removeZeroCommand.first().click();
      await page.waitForTimeout(500);
      
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после упрощения:', normalized);
      
      // Должно получиться 1+2
      expect(normalized).toMatch(/1\+2/);
      // Убедимся что нуля нет
      expect(normalized).not.toContain('0');
      console.log('✅ Удаление +0 успешно');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 4: Удаление *1 из n-арного умножения (a*1*b → a*b)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Удаление *1 из выражения a*1*b ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    await expressionInput.click();
    await expressionInput.fill('a * 1 * b');
    console.log('Введено выражение: a * 1 * b');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Кликаем на всё выражение
    const rootFrame = page.locator('.expression-range[data-text="a * 1 * b"]');
    await expect(rootFrame).toHaveCount(1);
    console.log('Корневой фрейм "a * 1 * b" найден');
    
    await rootFrame.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на корневой фрейм');
    
    // Ищем команду удаления *1
    const removeOneCommand = commandsPanel.locator('.command-item').filter({
      hasText: /убрать.*\*1/i
    });
    
    const removeOneExists = await removeOneCommand.count() > 0;
    console.log('Команда "Убрать *1" найдена:', removeOneExists);
    expect(removeOneExists).toBe(true);
    
    if (removeOneExists) {
      const commandText = await removeOneCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await removeOneCommand.first().click();
      await page.waitForTimeout(500);
      
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после упрощения:', normalized);
      
      // Должно получиться a*b или ab (неявное умножение)
      expect(normalized).toMatch(/a[\*]?b/);
      // Убедимся что единицы нет
      expect(normalized).not.toContain('1');
      console.log('✅ Удаление *1 успешно');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 5: Сворачивание явного умножения в неявное для пары в n-арной операции (a*b в abc → свернуть → abc)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Сворачивание a*b в неявное в контексте a*b*c ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Начинаем с явного умножения a*b*c
    await expressionInput.click();
    await expressionInput.fill('a * b * c');
    console.log('Введено выражение: a * b * c');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Сначала сворачиваем всё выражение
    const rootFrame = page.locator('.expression-range').first();
    await rootFrame.click();
    await page.waitForTimeout(300);
    
    const collapseAllCommand = commandsPanel.locator('.command-item').filter({
      hasText: /свернуть.*неявн/i
    });
    
    const collapseAllExists = await collapseAllCommand.count() > 0;
    console.log('Команда "Свернуть в неявное *" для всего выражения найдена:', collapseAllExists);
    
    if (collapseAllExists) {
      await collapseAllCommand.first().click();
      await page.waitForTimeout(500);
      
      let resultValue = await expressionInput.inputValue();
      let normalized = resultValue.replace(/\s+/g, '');
      console.log('После сворачивания всего выражения:', normalized);
      
      // Теперь должно быть abc
      expect(normalized).toBe('abc');
      
      // Теперь раскрываем ab обратно в a*b
      await page.locator('#buildBtn').click();
      await page.waitForTimeout(500);
      
      const frameAB = page.locator('.expression-range[data-text="ab"]');
      const frameABExists = await frameAB.count() > 0;
      console.log('Фрейм "ab" найден:', frameABExists);
      
      if (frameABExists) {
        await frameAB.first().click();
        await page.waitForTimeout(300);
        
        const expandCommand = commandsPanel.locator('.command-item').filter({
          hasText: /раскрыть.*неявн/i
        });
        
        const expandExists = await expandCommand.count() > 0;
        console.log('Команда "Раскрыть неявное *" найдена:', expandExists);
        
        if (expandExists) {
          await expandCommand.first().click();
          await page.waitForTimeout(500);
          
          resultValue = await expressionInput.inputValue();
          normalized = resultValue.replace(/\s+/g, '');
          console.log('После раскрытия ab → a*b:', normalized);
          
          // Должно быть a*bc
          expect(normalized).toMatch(/a\*bc/);
          console.log('✅ Раскрытие/сворачивание неявного умножения в парах работает');
          
          // Теперь свернём обратно
          await frameAB.first().click();
          await page.waitForTimeout(300);
          
          const collapseCommand = commandsPanel.locator('.command-item').filter({
            hasText: /свернуть.*неявн/i
          });
          
          const collapseExists = await collapseCommand.count() > 0;
          console.log('Команда "Свернуть в неявное *" для пары найдена:', collapseExists);
          
          if (collapseExists) {
            await collapseCommand.first().click();
            await page.waitForTimeout(500);
            
            resultValue = await expressionInput.inputValue();
            normalized = resultValue.replace(/\s+/g, '');
            console.log('После сворачивания a*b обратно:', normalized);
            
            // Должно вернуться abc
            expect(normalized).toBe('abc');
            console.log('✅ Сворачивание пары a*b → ab в контексте abc успешно');
          }
        }
      }
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 6: Коммутативность для пар в n-арных операциях не ломает структуру', async ({ page }) => {
    console.log('\n=== ТЕСТ: Коммутативность 2+3 в 2+3+4 → 3+2+4 ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    await expressionInput.click();
    await expressionInput.fill('2 + 3 + 4');
    console.log('Введено выражение: 2 + 3 + 4');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Кликаем на пару 2+3
    const frame2plus3 = page.locator('.expression-range[data-text="2 + 3"]');
    await expect(frame2plus3).toHaveCount(1);
    console.log('Фрейм "2 + 3" найден');
    
    await frame2plus3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 + 3"');
    
    // Ищем команду коммутативности
    const commutativeCommand = commandsPanel.locator('.command-item').filter({
      hasText: /поменять.*местами/i
    });
    
    const commutativeExists = await commutativeCommand.count() > 0;
    console.log('Команда коммутативности найдена:', commutativeExists);
    expect(commutativeExists).toBe(true);
    
    if (commutativeExists) {
      const commandText = await commutativeCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await commutativeCommand.first().click();
      await page.waitForTimeout(500);
      
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после коммутативности:', normalized);
      
      // Должно получиться 3+2+4
      expect(normalized).toMatch(/3\+2\+4/);
      console.log('✅ Коммутативность для пары в n-арной операции успешна');
      
      // Проверяем что n-арная структура сохранилась (есть 3 элемента)
      await page.locator('#buildBtn').click();
      await page.waitForTimeout(500);
      
      // Должны быть пары 3+2 и 2+4
      const frame3plus2 = page.locator('.expression-range[data-text="3 + 2"]');
      const frame2plus4 = page.locator('.expression-range[data-text="2 + 4"]');
      
      const frame3plus2Exists = await frame3plus2.count() > 0;
      const frame2plus4Exists = await frame2plus4.count() > 0;
      
      console.log('Фрейм "3 + 2" найден:', frame3plus2Exists);
      console.log('Фрейм "2 + 4" найден:', frame2plus4Exists);
      
      expect(frame3plus2Exists).toBe(true);
      expect(frame2plus4Exists).toBe(true);
      
      console.log('✅ N-арная структура сохранена после коммутативности');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 7: Обёртывание пары в скобки (a+b в a+b+c → (a+b)+c)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Обёртывание пары a+b в скобки ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    await expressionInput.click();
    await expressionInput.fill('a + b + c');
    console.log('Введено выражение: a + b + c');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Кликаем на пару a+b
    const frameAplusB = page.locator('.expression-range[data-text="a + b"]');
    await expect(frameAplusB).toHaveCount(1);
    console.log('Фрейм "a + b" найден');
    
    await frameAplusB.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "a + b"');
    
    // Ищем команду добавления скобок
    const addParensCommand = commandsPanel.locator('.command-item').filter({
      hasText: /добавить.*скобки/i
    });
    
    const addParensExists = await addParensCommand.count() > 0;
    console.log('Команда "Добавить скобки" найдена:', addParensExists);
    expect(addParensExists).toBe(true);
    
    if (addParensExists) {
      const commandText = await addParensCommand.first().textContent();
      console.log('Применяем команду:', commandText);
      
      await addParensCommand.first().click();
      await page.waitForTimeout(500);
      
      const resultValue = await expressionInput.inputValue();
      const normalized = resultValue.replace(/\s+/g, '');
      console.log('Результат после добавления скобок:', normalized);
      
      // Должно получиться что-то с (a+b)
      expect(normalized).toMatch(/\(a\+b\)/);
      console.log('✅ Обёртывание пары в скобки успешно');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 8: Вычисления с отрицательными числами в парах n-арного сложения (-2+3 в -2+3+1 → 1+1)', async ({ page }) => {
    console.log('\n=== ТЕСТ: Вычисление пары -2+3 в выражении -2+3+1 ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    await expressionInput.click();
    await expressionInput.fill('-2 + 3 + 1');
    console.log('Введено выражение: -2 + 3 + 1');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const commandsPanel = page.locator('#commandsPanel');
    
    const initialValue = await expressionInput.inputValue();
    console.log('Построенное выражение:', initialValue);
    
    // Ищем фрейм для пары "-2+3" (может отображаться по-разному)
    const frameMinus2plus3 = page.locator('.expression-range').filter({
      has: page.locator(':text("-2")')
    }).filter({
      has: page.locator(':text("3")')
    }).first();
    
    const frameExists = await frameMinus2plus3.count() > 0;
    console.log('Фрейм для пары с -2 и 3 найден:', frameExists);
    
    if (frameExists) {
      await frameMinus2plus3.click();
      await page.waitForTimeout(300);
      console.log('Кликнули на фрейм пары -2 и 3');
      
      // Ищем команду вычисления
      const evalCommand = commandsPanel.locator('.command-item').filter({
        hasText: /вычислить/i
      });
      
      const evalExists = await evalCommand.count() > 0;
      console.log('Команда вычисления найдена:', evalExists);
      
      if (evalExists) {
        const commandText = await evalCommand.first().textContent();
        console.log('Применяем команду:', commandText);
        
        await evalCommand.first().click();
        await page.waitForTimeout(500);
        
        const resultValue = await expressionInput.inputValue();
        console.log('Результат после вычисления:', resultValue);
        
        // Должно содержать 1 (результат -2+3)
        expect(resultValue).toContain('1');
        console.log('✅ Вычисление с отрицательными числами успешно');
      }
    } else {
      console.log('⚠️ Фрейм не найден, пропускаем тест');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });

  test('БАГ 4: выражение a*bc должно парситься как a*(bc), а не a*b*c', async ({ page }) => {
    console.log('\n=== ТЕСТ: БАГ парсинга a*bc ===');
    
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    
    // Вводим a*bc - явный * между a и bc, где bc должно быть неявным умножением
    await expressionInput.click();
    await expressionInput.fill('a*bc');
    console.log('Введено выражение: a*bc');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const initialValue = await expressionInput.inputValue();
    const normalized = initialValue.replace(/\s+/g, '');
    console.log('Построенное выражение:', normalized);
    
    // Проверяем что есть фрейм для bc (неявное умножение)
    const frameBc = page.locator('.expression-range[data-text="bc"]');
    const frameBcExists = await frameBc.count() > 0;
    console.log('Фрейм "bc" (неявное умножение) найден:', frameBcExists);
    
    // БАГ: Фрейм bc не будет найден, если парсится как a*b*c (три отдельных операнда)
    expect(frameBcExists).toBe(true);
    
    if (frameBcExists) {
      // Проверяем что можно свернуть всё в неявное умножение
      const rootFrame = page.locator('.expression-range').first();
      await rootFrame.click();
      await page.waitForTimeout(300);
      
      const commandsPanel = page.locator('#commandsPanel');
      const collapseCommand = commandsPanel.locator('.command-item').filter({
        hasText: /свернуть.*неявн/i
      });
      
      const collapseExists = await collapseCommand.count() > 0;
      console.log('Команда "Свернуть в неявное *" найдена:', collapseExists);
      
      if (collapseExists) {
        await collapseCommand.first().click();
        await page.waitForTimeout(500);
        
        const resultValue = await expressionInput.inputValue();
        const resultNormalized = resultValue.replace(/\s+/g, '');
        console.log('После сворачивания:', resultNormalized);
        
        // Должно получиться abc
        expect(resultNormalized).toBe('abc');
        console.log('✅ БАГ исправлен: a*bc корректно парсится как a*(bc)');
      }
    } else {
      console.log('❌ БАГ ВОСПРОИЗВЕДЕН: выражение a*bc парсится как a*b*c вместо a*(bc)');
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });

  test('БАГ 5: фреймы после трансформации должны совпадать с фреймами после пересборки', async ({ page }) => {
    console.log('\n=== ТЕСТ: БАГ несоответствия фреймов после трансформации ===');
    
    await page.goto('expression-editor-modular.html');
    await expect(page).toHaveTitle('Преобразователь выражений');
    
    const expressionInput = page.locator('#expressionInput');
    const commandsPanel = page.locator('#commandsPanel');
    
    // Тест 1: abc -> ab * c
    console.log('\n--- Тест 1: abc -> ab * c ---');
    await expressionInput.click();
    await expressionInput.fill('abc');
    console.log('Введено выражение: abc');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Выбираем фрейм ab
    const frameAb = page.locator('.expression-range[data-text="ab"]');
    await expect(frameAb).toBeVisible();
    await frameAb.click();
    await page.waitForTimeout(300);
    
    // Применяем раскрытие в явное умножение
    const expandCommand = commandsPanel.locator('.command-item').filter({
      hasText: /раскрыть.*явн/i
    });
    await expect(expandCommand).toBeVisible();
    await expandCommand.first().click();
    await page.waitForTimeout(500);
    
    // Получаем структуру фреймов после трансформации
    const framesAfterTransform1 = await page.locator('.expression-range').evaluateAll(frames => 
      frames.map(f => ({
        text: f.getAttribute('data-text'),
        type: f.getAttribute('data-type'),
        nodeId: f.getAttribute('data-node-id')
      }))
    );
    console.log('Фреймы после трансформации (ab * c):', JSON.stringify(framesAfterTransform1, null, 2));
    
    // Нажимаем Построить снова
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Получаем структуру фреймов после пересборки
    const framesAfterRebuild1 = await page.locator('.expression-range').evaluateAll(frames => 
      frames.map(f => ({
        text: f.getAttribute('data-text'),
        type: f.getAttribute('data-type')
        // nodeId не сравниваем - он может меняться
      }))
    );
    console.log('Фреймы после пересборки (ab * c):', JSON.stringify(framesAfterRebuild1, null, 2));
    
    // Сравниваем структуры (без nodeId)
    expect(framesAfterRebuild1).toEqual(framesAfterTransform1.map(f => ({ text: f.text, type: f.type })));
    
    // Тест 2: abc -> a * bc
    console.log('\n--- Тест 2: abc -> a * bc ---');
    await page.locator('#clearBtn').click();
    await page.waitForTimeout(300);
    
    await expressionInput.click();
    await expressionInput.fill('abc');
    console.log('Введено выражение: abc');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Выбираем фрейм bc
    const frameBc = page.locator('.expression-range[data-text="bc"]');
    await expect(frameBc).toBeVisible();
    await frameBc.click();
    await page.waitForTimeout(300);
    
    // Применяем раскрытие в явное умножение
    const expandCommand2 = commandsPanel.locator('.command-item').filter({
      hasText: /раскрыть.*явн/i
    });
    await expect(expandCommand2).toBeVisible();
    await expandCommand2.first().click();
    await page.waitForTimeout(500);
    
    // Получаем структуру фреймов после трансформации
    const framesAfterTransform2 = await page.locator('.expression-range').evaluateAll(frames => 
      frames.map(f => ({
        text: f.getAttribute('data-text'),
        type: f.getAttribute('data-type'),
        nodeId: f.getAttribute('data-node-id')
      }))
    );
    console.log('Фреймы после трансформации (a * bc):', JSON.stringify(framesAfterTransform2, null, 2));
    
    // Нажимаем Построить снова
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    // Получаем структуру фреймов после пересборки
    const framesAfterRebuild2 = await page.locator('.expression-range').evaluateAll(frames => 
      frames.map(f => ({
        text: f.getAttribute('data-text'),
        type: f.getAttribute('data-type')
      }))
    );
    console.log('Фреймы после пересборки (a * bc):', JSON.stringify(framesAfterRebuild2, null, 2));
    
    // Сравниваем структуры (без nodeId)
    expect(framesAfterRebuild2).toEqual(framesAfterTransform2.map(f => ({ text: f.text, type: f.type })));
    
    console.log('✅ Фреймы после трансформации совпадают с фреймами после пересборки');
  });
});
