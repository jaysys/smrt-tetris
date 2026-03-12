#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.one-shot-runtime"
PID_DIR="${RUNTIME_DIR}/pids"
LOG_DIR="${RUNTIME_DIR}/logs"
WEB_PID_FILE="${PID_DIR}/web.pid"
API_PID_FILE="${PID_DIR}/api.pid"
STATUS_FILE="${RUNTIME_DIR}/status.env"
HOST="${HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-6004}"
API_PORT="${API_PORT:-60040}"
WEB_URL="http://${HOST}:${WEB_PORT}"
API_HEALTH_URL="http://${HOST}:${API_PORT}/v1/health"
API_BASE_URL="http://${HOST}:${API_PORT}/v1"

mkdir -p "${PID_DIR}" "${LOG_DIR}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

print_install_hint() {
  local install_command="pnpm install --no-frozen-lockfile"

  if [ -f "${ROOT_DIR}/pnpm-lock.yaml" ]; then
    install_command="pnpm install --frozen-lockfile"
  fi

  echo "Install workspace dependencies first:" >&2
  echo "  ${install_command}" >&2
  echo "If you installed with production-only dependencies, reinstall without NODE_ENV=production." >&2
}

require_pnpm_exec() {
  local executable="$1"

  if pnpm exec "${executable}" --version >/dev/null 2>&1; then
    return 0
  fi

  echo "Missing required local executable: ${executable}" >&2
  print_install_hint
  exit 1
}

pid_is_running() {
  local pid="$1"
  kill -0 "${pid}" >/dev/null 2>&1
}

cleanup_pid_file() {
  local pid_file="$1"

  if [ ! -f "${pid_file}" ]; then
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if ! pid_is_running "${pid}"; then
    rm -f "${pid_file}"
  fi
}

ensure_not_running() {
  local name="$1"
  local pid_file="$2"

  cleanup_pid_file "${pid_file}"
  if [ -f "${pid_file}" ]; then
    echo "${name} already appears to be running. Stop it first with ./one-shot-stop.sh" >&2
    exit 1
  fi
}

stop_pid_file() {
  local pid_file="$1"

  if [ ! -f "${pid_file}" ]; then
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"

  if pid_is_running "${pid}"; then
    kill "${pid}" >/dev/null 2>&1 || true
    for _ in $(seq 1 20); do
      if ! pid_is_running "${pid}"; then
        break
      fi
      sleep 1
    done
  fi

  if pid_is_running "${pid}"; then
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi

  rm -f "${pid_file}"
}

tail_log() {
  local log_file="$1"

  if [ -f "${log_file}" ]; then
    echo "---- ${log_file} ----" >&2
    tail -n 40 "${log_file}" >&2 || true
  fi
}

wait_for_ready() {
  local name="$1"
  local pid_file="$2"
  local url="$3"
  local log_file="$4"

  local pid
  pid="$(cat "${pid_file}")"

  for _ in $(seq 1 60); do
    if ! pid_is_running "${pid}"; then
      echo "${name} exited before becoming ready." >&2
      tail_log "${log_file}"
      return 1
    fi

    if curl --silent --fail --max-time 2 "${url}" >/dev/null; then
      return 0
    fi

    sleep 1
  done

  echo "${name} did not become ready at ${url}" >&2
  tail_log "${log_file}"
  return 1
}

cleanup_on_error() {
  local exit_code="$?"
  trap - EXIT
  stop_pid_file "${WEB_PID_FILE}"
  stop_pid_file "${API_PID_FILE}"
  exit "${exit_code}"
}

trap cleanup_on_error EXIT

require_command pnpm
require_command curl
require_pnpm_exec turbo

ensure_not_running "Web server" "${WEB_PID_FILE}"
ensure_not_running "API server" "${API_PID_FILE}"

echo "Building production artifacts for web and api..."
if ! NEXT_PUBLIC_API_BASE_URL="${API_BASE_URL}" \
  pnpm exec turbo run build --concurrency=1 --filter=@tetris/web --filter=@tetris/api \
  >"${LOG_DIR}/build.log" 2>&1; then
  echo "Build failed." >&2
  if grep -Fq 'Command "turbo" not found' "${LOG_DIR}/build.log"; then
    echo "The local turbo binary is missing." >&2
    print_install_hint
  fi
  tail_log "${LOG_DIR}/build.log"
  exit 1
fi

if [ ! -f "${ROOT_DIR}/apps/web/.next/BUILD_ID" ]; then
  echo "Missing Next.js production build output." >&2
  tail_log "${LOG_DIR}/build.log"
  exit 1
fi

if [ ! -f "${ROOT_DIR}/apps/api/dist/apps/api/src/main.js" ]; then
  echo "Missing API production build output." >&2
  tail_log "${LOG_DIR}/build.log"
  exit 1
fi

echo "Starting API on ${API_HEALTH_URL} ..."
(
  cd "${ROOT_DIR}/apps/api"
  nohup env HOST="${HOST}" PORT="${API_PORT}" NODE_ENV=production \
    pnpm start >"${LOG_DIR}/api.log" 2>&1 < /dev/null &
  echo "$!" >"${API_PID_FILE}"
)
wait_for_ready "API server" "${API_PID_FILE}" "${API_HEALTH_URL}" "${LOG_DIR}/api.log"

echo "Starting web on ${WEB_URL} ..."
(
  cd "${ROOT_DIR}/apps/web"
  nohup env HOST="${HOST}" NODE_ENV=production NEXT_PUBLIC_API_BASE_URL="${API_BASE_URL}" \
    pnpm exec next start --port "${WEB_PORT}" --hostname "${HOST}" \
    >"${LOG_DIR}/web.log" 2>&1 < /dev/null &
  echo "$!" >"${WEB_PID_FILE}"
)
wait_for_ready "Web server" "${WEB_PID_FILE}" "${WEB_URL}" "${LOG_DIR}/web.log"

cat >"${STATUS_FILE}" <<EOF
HOST=${HOST}
WEB_PORT=${WEB_PORT}
API_PORT=${API_PORT}
WEB_URL=${WEB_URL}
API_BASE_URL=${API_BASE_URL}
STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

trap - EXIT

echo "Ready."
echo "Web: ${WEB_URL}"
echo "API: ${API_HEALTH_URL}"
echo "Logs: ${LOG_DIR}"
echo "Stop: ./one-shot-stop.sh"
