#!/usr/bin/env bash
# Скрипт: надежный запуск E2E с автоматическим dev-сервером (bash)

set -euo pipefail

PORT="${E2E_PORT:-8000}"
HOST="${E2E_HOST:-0.0.0.0}"
BASE_URL="${E2E_BASE_URL:-http://localhost:${PORT}/MathHelper/}"
TIMEOUT_SECONDS="${E2E_STARTUP_TIMEOUT_SECONDS:-60}"

if [[ "$BASE_URL" == *.html ]]; then
  HEALTH_URL="$BASE_URL"
else
  HEALTH_URL="${BASE_URL%/}/expression-editor-modular.html"
fi

stop_processes_on_port() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -lptn "sport = :$port" 2>/dev/null | awk -F'pid=' '/pid=/{print $2}' | awk -F',' '{print $1}' || true)"
  elif command -v netstat >/dev/null 2>&1; then
    pids="$(netstat -anp 2>/dev/null | grep ":$port" | grep LISTEN | awk '{print $7}' | cut -d'/' -f1 | tr -d ' ' | sort -u || true)"
  fi

  if [[ -n "$pids" ]]; then
    echo "Освобождаем порт $port (PID: $pids)..."
    for pid in $pids; do
      kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 1
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
      fi
    done
  fi
}

wait_for_server() {
  local url="$1"
  local timeout="$2"
  local start
  start="$(date +%s)"

  while true; do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        return 0
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q --spider "$url"; then
        return 0
      fi
    else
      echo "Не найден curl или wget для проверки готовности сервера."
      return 1
    fi

    local now
    now="$(date +%s)"
    if (( now - start >= timeout )); then
      return 1
    fi
    sleep 1
  done
}

echo "Параметры: порт=$PORT, host=$HOST, baseURL=$BASE_URL"
stop_processes_on_port "$PORT"

echo "Запуск dev-сервера..."
DEV_LOG="$(mktemp -t mathhelper-dev-server.XXXXXX.log)"
npm run dev -- --host "$HOST" --port "$PORT" >"$DEV_LOG" 2>&1 &
DEV_PID=$!

cleanup() {
  echo "Остановка dev-сервера..."
  if kill -0 "$DEV_PID" 2>/dev/null; then
    kill -TERM "$DEV_PID" 2>/dev/null || true
  fi
  stop_processes_on_port "$PORT"
  rm -f "$DEV_LOG"
}

trap cleanup EXIT

echo "Ожидание готовности: $HEALTH_URL"
if ! wait_for_server "$HEALTH_URL" "$TIMEOUT_SECONDS"; then
  echo "Dev-сервер не поднялся за ${TIMEOUT_SECONDS} секунд. Лог: $DEV_LOG"
  exit 1
fi

E2E_BASE_URL="$BASE_URL" FORCE_COLOR=1 npm run test:e2e
