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

**ВАЖНО:** Убедитесь, что dev сервер запущен!

```bash
# В одном терминале запустите сервер:
npm run dev

# В другом терминале запускайте тесты:
npm run test:e2e:headed
```

## Основные возможности

### 1. Просмотр консольных логов браузера

Все тесты автоматически перехватывают консольные логи:
- `console.log()` 
- `console.info()`
- `console.warn()`
- `console.error()`
- JavaScript ошибки страницы

Логи выводятся в терминал при выполнении тестов.

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
└── README.md                       # Это руководство
```

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
