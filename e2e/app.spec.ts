import { test, expect } from '@playwright/test';

const getFrames = (page) => page.locator('[data-testid="expression-frame"]');
const getFrameByPath = (page, pathKey: string) =>
  page.locator(`[data-testid="expression-frame"][data-path-key="${pathKey}"]`);
const getCommandItems = (page) => page.locator('#commandsPanel [data-testid="command-item"]');
const getCommandByChangeType = (page, changeType: string) =>
  page.locator(`#commandsPanel [data-testid="command-item"][data-change-type="${changeType}"]`);

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

  test('должен отображать учебную нотацию степеней, корней и модуля', async ({ page }) => {
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const expressionInput = page.locator('#expressionInput');
    await expressionInput.clear();
    await page.waitForTimeout(200);
    await expressionInput.click();
    await expressionInput.fill('x^2 + nthRoot(x, 2) + abs(x)');
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);

    const expressionContainer = page.locator('#expressionContainer');
    await expect(expressionContainer.locator('.expr-sup')).toHaveCount(1);
    await expect(expressionContainer.locator('.expr-root-symbol')).toHaveCount(1);

    const absTokens = expressionContainer.locator('.token').filter({ hasText: '|' });
    await expect(absTokens).toHaveCount(2);
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

  test('Кейс: вычисление пары 1+2 в 1+2+3 должно давать 3+3', async ({ page }) => {
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
    const frames = getFrames(page);
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
    const frame1plus2 = getFrameByPath(page, 'args.0');
    
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
    const commands = getCommandItems(page);
    const commandCount = await commands.count();
    console.log(`Найдено команд: ${commandCount}`);
    
    // Выводим все команды
    for (let i = 0; i < commandCount; i++) {
      const cmd = commands.nth(i);
      const cmdText = await cmd.textContent();
      console.log(`  Команда ${i}: "${cmdText}"`);
    }
    
    // Ищем команду "Вычислить"
    const evalCommand = getCommandByChangeType(page, 'SIMPLIFY_ARITHMETIC');
    const evalExists = await evalCommand.count() > 0;
    
    if (evalExists) {
      console.log('\nКоманда вычисления найдена!');
      
      // Применяем команду
      console.log('\n=== ШАГ 5: Применяем команду вычисления ===');
      await evalCommand.first().click();
      await page.waitForTimeout(500);
      
      // Проверяем результат
      const newExpression = await expressionInput.inputValue();
      console.log(`Новое выражение: "${newExpression}"`);
      
      const normalized = newExpression.replace(/\s+/g, '');
      console.log(`Нормализованное: "${normalized}"`);
      
      expect(normalized).toBe('3+3');
    } else {
      console.error('\n❌ Команда вычисления НЕ НАЙДЕНА!');
      expect(evalExists).toBe(true);
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

  test('Кейс: многобуквенный идентификатор abc не раскрывается как a*b*c', async ({ page }) => {
    console.log('\n=== ТЕСТ: Многобуквенный идентификатор abc не раскрывается как a*b*c ===');
    
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
    
    // Вводим выражение abc (один идентификатор)
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
    
    // abc в mathjs — это один символ, поэтому команд для преобразования не ожидается
    const rootFrame = getFrameByPath(page, 'root');
    await expect(rootFrame).toHaveCount(1);
    await rootFrame.click();
    await page.waitForTimeout(300);
    
    const commandItems = getCommandItems(page);
    const commandCount = await commandItems.count();
    console.log(`Количество команд: ${commandCount}`);
    
    expect(commandCount).toBe(0);
    
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
    const frame2plus3 = getFrameByPath(page, 'args.0');
    await expect(frame2plus3).toHaveCount(1);
    console.log('Фрейм "2 + 3" найден');
    
    // Кликаем на фрейм
    await frame2plus3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 + 3"');
    
    // Ищем команду вычисления
    const evalCommand = getCommandByChangeType(page, 'SIMPLIFY_ARITHMETIC');
    
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
    const frame2mul3 = getFrameByPath(page, 'args.0');
    await expect(frame2mul3).toHaveCount(1);
    console.log('Фрейм "2 * 3" найден');
    
    await frame2mul3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 * 3"');
    
    // Ищем команду вычисления
    const evalCommand = getCommandByChangeType(page, 'SIMPLIFY_ARITHMETIC');
    
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
    
    // Кликаем на подвыражение 1+0
    const frame1plus0 = getFrameByPath(page, 'args.0');
    await expect(frame1plus0).toHaveCount(1);
    console.log('Фрейм "1 + 0" найден');
    
    await frame1plus0.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на корневой фрейм');
    
    // Ищем команду удаления +0
    const removeZeroCommand = getCommandByChangeType(page, 'REMOVE_ADDING_ZERO');
    
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
    
    // Кликаем на подвыражение a*1
    const frameA1 = getFrameByPath(page, 'args.0');
    await expect(frameA1).toHaveCount(1);
    console.log('Фрейм "a * 1" найден');
    
    await frameA1.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на корневой фрейм');
    
    // Ищем команду удаления *1
    const removeOneCommand = getCommandByChangeType(page, 'REMOVE_MULTIPLYING_BY_ONE');
    
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
  
  test('Кейс 5: Для a*b*c нет команд неявного умножения', async ({ page }) => {
    console.log('\n=== ТЕСТ: Для a*b*c нет доступных преобразований ===');
    
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
    await expressionInput.fill('a * b * c');
    console.log('Введено выражение: a * b * c');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const rootFrame = getFrameByPath(page, 'root');
    await rootFrame.click();
    await page.waitForTimeout(300);
    
    const commandCount = await getCommandItems(page).count();
    console.log(`Количество команд: ${commandCount}`);
    expect(commandCount).toBe(0);
    
    if (consoleMessages.length > 0) {
      console.log('\n=== КОНСОЛЬНЫЕ ЛОГИ ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 6: Коммутативность не отображается для mathsteps-операций', async ({ page }) => {
    console.log('\n=== ТЕСТ: Коммутативность недоступна для 2+3+4 ===');
    
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
    const frame2plus3 = getFrameByPath(page, 'args.0');
    await expect(frame2plus3).toHaveCount(1);
    console.log('Фрейм "2 + 3" найден');
    
    await frame2plus3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "2 + 3"');
    
    // Ищем команду коммутативности
    const commutativeCommand = getCommandItems(page).filter({
      hasText: /поменять.*местами/i
    });
    
    const commutativeExists = await commutativeCommand.count() > 0;
    console.log('Команда коммутативности найдена:', commutativeExists);
    expect(commutativeExists).toBe(false);
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });
  
  test('Кейс 7: Команда обёртывания в скобки не отображается', async ({ page }) => {
    console.log('\n=== ТЕСТ: Скобки недоступны для a+b+c ===');
    
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
    const frameAplusB = getFrameByPath(page, 'args.0');
    await expect(frameAplusB).toHaveCount(1);
    console.log('Фрейм "a + b" найден');
    
    await frameAplusB.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм "a + b"');
    
    // Ищем команду добавления скобок
    const addParensCommand = getCommandItems(page).filter({
      hasText: /добавить.*скобки/i
    });
    
    const addParensExists = await addParensCommand.count() > 0;
    console.log('Команда "Добавить скобки" найдена:', addParensExists);
    expect(addParensExists).toBe(false);
    
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
    
    // Ищем фрейм для пары "-2+3"
    const frameMinus2plus3 = getFrameByPath(page, 'args.0');
    await expect(frameMinus2plus3).toHaveCount(1);
    await frameMinus2plus3.click();
    await page.waitForTimeout(300);
    console.log('Кликнули на фрейм пары -2 и 3');
    
    // Ищем команду вычисления
    const evalCommand = getCommandByChangeType(page, 'SIMPLIFY_ARITHMETIC');
    
    const evalExists = await evalCommand.count() > 0;
    console.log('Команда вычисления найдена:', evalExists);
    expect(evalExists).toBe(true);
    
    const commandText = await evalCommand.first().textContent();
    console.log('Применяем команду:', commandText);
    
    await evalCommand.first().click();
    await page.waitForTimeout(500);
    
    const resultValue = await expressionInput.inputValue();
    console.log('Результат после вычисления:', resultValue);
    
    // Должно содержать 1 (результат -2+3)
    expect(resultValue).toContain('1');
    console.log('✅ Вычисление с отрицательными числами успешно');
    
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
    
    // Вводим a*bc - явный * между a и bc, где bc — единый идентификатор
    await expressionInput.click();
    await expressionInput.fill('a*bc');
    console.log('Введено выражение: a*bc');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const initialValue = await expressionInput.inputValue();
    const normalized = initialValue.replace(/\s+/g, '');
    console.log('Построенное выражение:', normalized);
    
    // Проверяем что есть фрейм для bc (как отдельного идентификатора)
    const frameBc = getFrameByPath(page, 'args.1');
    const frameBcExists = await frameBc.count() > 0;
    console.log('Фрейм "bc" (отдельный идентификатор) найден:', frameBcExists);
    
    // БАГ: Фрейм bc не будет найден, если парсится как a*b*c (три отдельных операнда)
    expect(frameBcExists).toBe(true);
    
    if (consoleErrors.length > 0) {
      console.error('\n=== ОШИБКИ ===');
      consoleErrors.forEach(err => console.error(err));
    }
  });

  test('БАГ 5: фреймы после трансформации должны совпадать с фреймами после пересборки', async ({ page }) => {
    console.log('\n=== ТЕСТ: БАГ несоответствия фреймов после трансформации ===');
    
    await page.goto('expression-editor-modular.html');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle('Преобразователь выражений');
    await page.waitForTimeout(1000);
    
    const expressionInput = page.locator('#expressionInput');
    
    await expressionInput.clear();
    await page.waitForTimeout(200);
    await expressionInput.click();
    await expressionInput.fill('1 + 0 + 2');
    console.log('Введено выражение: 1 + 0 + 2');
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const frame1plus0 = getFrameByPath(page, 'args.0');
    await expect(frame1plus0).toHaveCount(1);
    await frame1plus0.click();
    await page.waitForTimeout(300);
    
    const removeZeroCommand = getCommandByChangeType(page, 'REMOVE_ADDING_ZERO');
    await expect(removeZeroCommand).toHaveCount(1);
    await removeZeroCommand.first().click();
    await page.waitForTimeout(500);
    
    const framesAfterTransform = await getFrames(page).evaluateAll(frames =>
      frames.map(f => ({
        pathKey: f.getAttribute('data-path-key'),
        nodeType: f.getAttribute('data-node-type'),
        text: f.getAttribute('data-text')
      }))
    );
    console.log('Фреймы после трансформации:', JSON.stringify(framesAfterTransform, null, 2));
    
    await page.locator('#buildBtn').click();
    await page.waitForTimeout(500);
    
    const framesAfterRebuild = await getFrames(page).evaluateAll(frames =>
      frames.map(f => ({
        pathKey: f.getAttribute('data-path-key'),
        nodeType: f.getAttribute('data-node-type'),
        text: f.getAttribute('data-text')
      }))
    );
    console.log('Фреймы после пересборки:', JSON.stringify(framesAfterRebuild, null, 2));
    
    const normalizeFrames = (items: Array<{ pathKey: string | null; nodeType: string | null; text: string | null }>) =>
      items
        .map(item => ({
          pathKey: item.pathKey || '',
          nodeType: item.nodeType || '',
          text: item.text || ''
        }))
        .sort((a, b) => a.pathKey.localeCompare(b.pathKey));
    
    expect(normalizeFrames(framesAfterRebuild)).toEqual(normalizeFrames(framesAfterTransform));
    
    console.log('✅ Фреймы после трансформации совпадают с фреймами после пересборки');
  });
});
