#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.one-shot-runtime"
PID_DIR="${RUNTIME_DIR}/pids"
STATUS_FILE="${RUNTIME_DIR}/status.env"

pid_is_running() {
  local pid="$1"
  kill -0 "${pid}" >/dev/null 2>&1
}

stop_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [ ! -f "${pid_file}" ]; then
    echo "${name}: not running"
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"

  if ! pid_is_running "${pid}"; then
    rm -f "${pid_file}"
    echo "${name}: removed stale pid ${pid}"
    return 0
  fi

  kill "${pid}" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    if ! pid_is_running "${pid}"; then
      break
    fi
    sleep 1
  done

  if pid_is_running "${pid}"; then
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi

  rm -f "${pid_file}"
  echo "${name}: stopped ${pid}"
}

stop_pid_file "web" "${PID_DIR}/web.pid"
stop_pid_file "api" "${PID_DIR}/api.pid"
rm -f "${STATUS_FILE}"
