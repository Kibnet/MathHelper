# Скрипт для запуска E2E тестов с корректным выводом
$ErrorActionPreference = "Continue"

Write-Host "Запуск E2E тестов Playwright..." -ForegroundColor Cyan

# Запускаем тесты и сохраняем вывод
npx playwright test 2>&1 | Tee-Object -FilePath "test-output.log"

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`nВсе тесты прошли успешно!" -ForegroundColor Green
} else {
    Write-Host "`nНекоторые тесты упали. Код выхода: $exitCode" -ForegroundColor Yellow
}

Write-Host "`nРезультаты также сохранены в test-output.log" -ForegroundColor Gray

exit $exitCode
