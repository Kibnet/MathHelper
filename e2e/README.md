# E2E Тестирование с Playwright

## Доступные команды

### Основные команды запуска тестов

```bash
# Запуск всех E2E тестов (headless режим)
npm run test:e2e

# Запуск тестов с видимым браузером (headed режим)
npm run test:e2e:headed

# Запуск тестов в UI режиме (интерактивная отладка)
npm run test:e2e:ui

# Запуск тестов в режиме отладки (пошаговое выполнение)
npm run test:e2e:debug

# Просмотр HTML отчета о последнем запуске
npm run test:e2e:report
```

### Запуск конкретных тестов

```bash
# Запуск только одного файла
npx playwright test app.spec.ts

# Запуск тестов по названию
npx playwright test --grep "должен загрузить приложение"

# Запуск с фильтром
npx playwright test --grep "консоль"
```

## Перед запуском тестов

**КРИТИЧЕСКИ ВАЖНО:** Dev сервер должен быть запущен!

### Вариант 1: Запуск сервера вручную (РЕКОМЕНДУЕТСЯ)

```bash
# В первом терминале запустите сервер:
npm run dev

# Дождитесь сообщения:
# ✓ VITE ready in XXX ms
# ➜ Local: http://localhost:8000/

# Во втором терминале запускайте тесты:
npm run test:e2e
```

**Преимущества:**
- Сервер остается запущенным между запусками тестов
- Быстрее повторные запуски
- Проще отлаживать - видно логи сервера

### Вариант 2: Автоматический запуск сервера

В `playwright.config.ts` есть закомментированная секция `webServer`. 
Раскомментируйте её если хотите автоматический запуск.

**Недостатки:**
- Может не работать в некоторых средах (PowerShell)
- Увеличивает время запуска тестов
- Сложнее отлаживать проблемы с сервером

### Проверка доступности сервера

Перед запуском тестов убедитесь что сервер отвечает:

```bash
# Windows PowerShell:
curl http://localhost:8000/expression-editor-modular.html

# Должно вернуть HTML страницы
```

## Основные возможности

### 1. Просмотр консольных логов браузера

Все тесты автоматически перехватывают консольные логи:
- `console.log()` 
- `console.info()`
- `console.warn()`
- `console.error()`
- JavaScript ошибки страницы

**ВАЖНО для PowerShell:** Стандартный вывод может обрываться. Используйте:

```bash
# Для корректного вывода в PowerShell:
$env:FORCE_COLOR=1; npx playwright test --reporter=list

# Или используйте вспомогательный скрипт:
.\run-e2e-tests.ps1
```

Логи сохраняются в `test-output.log` при использовании скрипта.

### 2. Визуальная отладка

**Headed режим** - браузер открывается и вы видите выполнение теста:
```bash
npm run test:e2e:headed
```

**UI режим** - интерактивный интерфейс для запуска и отладки тестов:
```bash
npm run test:e2e:ui
```

**Debug режим** - пошаговая отладка с Playwright Inspector:
```bash
npm run test:e2e:debug
```

### 3. Скриншоты и видео

При падении теста автоматически создаются:
- Скриншот момента ошибки
- Видео выполнения теста
- Trace файл для детального анализа

Все артефакты сохраняются в папке `test-results/`.

### 4. Автооткрытие DevTools

Раскомментируйте в `playwright.config.ts`:
```typescript
launchOptions: {
  args: ['--auto-open-devtools-for-tabs'],
}
```

Теперь при запуске в headed режиме DevTools откроются автоматически.

## Структура тестов

```
e2e/
├── app.spec.ts                    # Основные тесты приложения
├── console-debugging.spec.ts      # Примеры работы с консолью
├── demo.spec.ts                   # Демонстрационные тесты
└── README.md                       # Это руководство
```

## Отладка проблем с тестами

### Проблема: Тесты падают с "ERR_CONNECTION_REFUSED"

**Причина:** Dev сервер не запущен или недоступен.

**Решение:**
```bash
# 1. Убедитесь что сервер запущен:
npm run dev

# 2. Проверьте что он доступен:
curl http://localhost:8000/expression-editor-modular.html

# 3. Запустите тесты:
npm run test:e2e
```

### Проблема: Тесты падают с ошибками "toHaveTitle"

**Причина:** Проверяется неправильный заголовок страницы.

**Решение:** Заголовок должен быть "Преобразователь выражений" (не "Expression Editor").

### Проблема: Не видно вывода тестов в PowerShell

**Причина:** Проблема с кодировкой и буферизацией вывода.

**Решение:**
```bash
# Используйте явное указание репортера:
$env:FORCE_COLOR=1; npx playwright test --reporter=list

# Или скрипт с сохранением в файл:
.\run-e2e-tests.ps1
type test-output.log
```

### Проблема: Тесты не находят элементы (#expression-display)

**Причина:** Устаревшие селекторы в тестах.

**Правильные селекторы:**
- `#expressionInput` - поле ввода выражения
- `#expressionContainer` - контейнер отображения выражения
- `#commandsPanel` - панель команд
- `#buildBtn` - кнопка "Построить"
- `#clearBtn` - кнопка "Очистить"

## Примеры использования

### Базовый тест с логами
```typescript
test('мой тест', async ({ page }) => {
  const logs: string[] = [];
  
  // Перехватываем консоль
  page.on('console', msg => {
    logs.push(msg.text());
  });
  
  await page.goto('/expression-editor-modular.html');
  
  // Ваши действия...
  
  console.log('Логи браузера:', logs);
});
```

### Выполнение JavaScript в браузере
```typescript
const result = await page.evaluate(() => {
  console.log('Этот лог появится в консоли браузера');
  return document.title;
});
```

### Добавление точки останова
```typescript
await page.pause(); // Откроет Playwright Inspector
```

## Полезные ссылки

- [Документация Playwright](https://playwright.dev/docs/intro)
- [Playwright Inspector](https://playwright.dev/docs/debug#playwright-inspector)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Selectors Guide](https://playwright.dev/docs/selectors)

## Советы по отладке

1. **Используйте UI режим** для интерактивной работы с тестами
2. **Включайте headed режим** чтобы видеть что происходит в браузере
3. **Добавляйте `page.pause()`** для остановки выполнения в нужном месте
4. **Смотрите trace файлы** после падения теста для детального анализа
5. **Включайте DevTools** для просмотра консоли в реальном времени
6. **Используйте скриншоты** - они автоматически создаются при ошибках в `test-results/`
7. **Проверяйте логи в файле** `test-output.log` если вывод в консоли обрывается

## Быстрый старт для AI-ассистента

### Шаг 1: Убедиться что сервер запущен
```bash
npm run dev
# Должно вывести: ✓ VITE ready... ➜ Local: http://localhost:8000/
```

### Шаг 2: Запустить тесты с правильным выводом
```bash
# PowerShell:
$env:FORCE_COLOR=1; npx playwright test --reporter=list

# Или:
.\run-e2e-tests.ps1
```

### Шаг 3: Анализировать результаты
```bash
# Если тесты упали - смотрим детали:
type test-output.log

# Или открываем HTML отчет:
npm run test:e2e:report

# Смотрим скриншоты и видео:
dir test-results
```

### Типичные ошибки и их решения:

| Ошибка | Причина | Решение |
|--------|---------|----------|
| ERR_CONNECTION_REFUSED | Сервер не запущен | `npm run dev` |
| toHaveTitle failed | Неправильный заголовок | Использовать "Преобразователь выражений" |
| Элемент не найден | Неправильный селектор | Использовать правильные ID из HTML |
| Нет вывода в консоли | Проблема PowerShell | Использовать `$env:FORCE_COLOR=1` |
| Timeout waiting for locator | Элемент не появился | Проверить что страница загрузилась, увеличить timeout |
