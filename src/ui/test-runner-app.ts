/**
 * Скрипт для управления тест-раннером
 */
// @ts-expect-error Модуль загружается в браузере вместе с тестовым раннером
import { runner } from '../test/framework.js';

type TestResult = {
  name: string;
  duration: number;
  passed: boolean;
  error?: string;
};

type SuiteResult = {
  name: string;
  duration: number;
  passed: number;
  failed: number;
  tests: TestResult[];
};

// Импортируем все тесты
import '../test/parser.test.js';
import '../test/helpers.test.js';
import '../test/analyzer.test.js';
import '../test/rules.test.js';

// Делаем функции глобально доступными
declare global {
  interface Window {
    runner: typeof runner;
    renderResults: typeof renderResults;
    runTests: typeof runTests;
    expandAll: typeof expandAll;
    collapseAll: typeof collapseAll;
    filterTests: typeof filterTests;
    toggleSuite: typeof toggleSuite;
  }
}

window.runner = runner;
window.renderResults = renderResults;
window.runTests = runTests;
window.expandAll = expandAll;
window.collapseAll = collapseAll;
window.filterTests = filterTests;
window.toggleSuite = toggleSuite;

// Автозапуск тестов при загрузке
setTimeout(runTests, 100);

// Объявление функций
function runTests() {
  const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
  if (!runBtn) return;
  
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running...';

  setTimeout(() => {
    renderResults();
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run All Tests';
  }, 100);
}

function renderResults() {
  const suites = runner.getSuites() as SuiteResult[];
  const stats = runner.getTotalStats();
  
  // Обновляем статистику
  const statsHtml = `
    <div class="stat">
      <div class="stat-label">Test Suites</div>
      <div class="stat-value">${stats.suites}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Tests</div>
      <div class="stat-value">${stats.total}</div>
    </div>
    <div class="stat success">
      <div class="stat-label">Passed</div>
      <div class="stat-value">✓ ${stats.passed}</div>
    </div>
    <div class="stat error">
      <div class="stat-label">Failed</div>
      <div class="stat-value">✗ ${stats.failed}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Duration</div>
      <div class="stat-value">${stats.duration.toFixed(2)}ms</div>
    </div>
  `;
  const statsEl = document.getElementById('stats');
  if (statsEl) statsEl.innerHTML = statsHtml;

  // Обновляем прогресс
  const progress = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
  const progressEl = document.getElementById('progress') as HTMLElement;
  if (progressEl) progressEl.style.setProperty('--progress-width', `${progress}%`);
  
  // Рендерим наборы тестов
  const resultsHtml = suites.map((suite: SuiteResult) => {
    const allPassed = suite.failed === 0;
    const badgeClass = allPassed ? 'success' : 'error';
    const badgeText = `${suite.passed}/${suite.tests.length}`;
    
    return `
      <div class="suite" data-status="${allPassed ? 'passed' : 'failed'}">
        <div class="suite-header" onclick="toggleSuite(this)">
          <span class="suite-title">${suite.name}</span>
          <div>
            <span class="suite-badge ${badgeClass}">${badgeText}</span>
            <span class="test-duration">${suite.duration.toFixed(2)}ms</span>
          </div>
        </div>
        <div class="suite-body">
          ${suite.tests.map((test: TestResult) => `
            <div class="test ${test.passed ? 'passed' : 'failed'}">
              <div class="test-name">
                <span class="test-status ${test.passed ? 'passed' : 'failed'}">
                  ${test.passed ? '✓' : '✗'}
                </span>
                ${test.name}
                ${test.error ? `<div class="test-error">${escapeHtml(test.error)}</div>` : ''}
              </div>
              <span class="test-duration">${test.duration.toFixed(2)}ms</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  const resultsEl = document.getElementById('results');
  if (resultsEl) resultsEl.innerHTML = resultsHtml;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleSuite(header: HTMLElement) {
  const suite = header.parentElement;
  if (suite) {
    suite.classList.toggle('expanded');
  }
}

function expandAll() {
  document.querySelectorAll('.suite').forEach(suite => {
    suite.classList.add('expanded');
  });
}

function collapseAll() {
  document.querySelectorAll('.suite').forEach(suite => {
    suite.classList.remove('expanded');
  });
}

function filterTests(filter: string) {
  // Обновляем состояние кнопок
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  (event?.target as HTMLElement)?.classList.add('active');

  // Фильтруем наборы тестов
  document.querySelectorAll('.suite').forEach(suite => {
    const status = (suite as HTMLElement).dataset.status;
    if (filter === 'all') {
      suite.classList.remove('suite-hidden');
    } else if (filter === 'passed' && status === 'passed') {
      suite.classList.remove('suite-hidden');
    } else if (filter === 'failed' && status === 'failed') {
      suite.classList.remove('suite-hidden');
    } else {
      suite.classList.add('suite-hidden');
    }
  });
}
