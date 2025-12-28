import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для E2E тестирования
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Директория с E2E тестами
  testDir: './e2e',
  
  // Максимальное время выполнения одного теста
  timeout: 30 * 1000,
  
  // Количество повторных попыток при падении теста
  retries: 0,
  
  // Количество параллельных workers
  workers: 1,
  
  // Репортеры для вывода результатов
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  use: {
    // Базовый URL для тестов (сервер должен быть запущен)
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000/MathHelper/',
    
    // Скриншот только при падении теста
    screenshot: 'only-on-failure',
    
    // Видео только при падении теста
    video: 'retain-on-failure',
    
    // Трейс для отладки при падении
    trace: 'retain-on-failure',
  },

  // Конфигурация для разных браузеров
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Включаем DevTools для просмотра консоли
        launchOptions: {
          // args: ['--auto-open-devtools-for-tabs'], // Раскомментировать для автооткрытия DevTools
        }
      },
    },
  ],

  // Автоматический запуск dev сервера перед тестами
  // ВАЖНО: Запустите сервер вручную перед тестами: npm run dev
  // Автозапуск может не работать в некоторых средах
  /*
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  */
});
