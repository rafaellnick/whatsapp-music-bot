#!/bin/sh
set -eu

find_browser() {
  for browser in \
    /usr/bin/google-chrome-stable \
    /usr/bin/google-chrome \
    /usr/bin/chromium \
    /usr/bin/chromium-browser
  do
    if [ -x "$browser" ]; then
      printf '%s\n' "$browser"
      return 0
    fi
  done

  for browser_name in google-chrome-stable google-chrome chromium chromium-browser
  do
    if command -v "$browser_name" >/dev/null 2>&1; then
      command -v "$browser_name"
      return 0
    fi
  done

  return 1
}

cleanup_chromium_profile_locks() {
  for profile_root in /app/.wwebjs_auth /app/.wwebjs_cache /tmp/.chromium
  do
    if [ -d "$profile_root" ]; then
      find "$profile_root" \
        -name 'Singleton*' \
        -exec sh -c 'for lock do echo "Removing stale Chromium profile lock: $lock"; rm -f "$lock"; done' sh {} + \
        2>/dev/null || true
    fi
  done
}

mkdir -p /run/dbus /var/lib/dbus /tmp/.chromium
cleanup_chromium_profile_locks

dbus-uuidgen --ensure=/etc/machine-id
dbus-uuidgen --ensure=/var/lib/dbus/machine-id

if [ ! -S /run/dbus/system_bus_socket ]; then
  dbus-daemon --system --fork --nopidfile
fi

if command -v dbus-launch >/dev/null 2>&1; then
  eval "$(dbus-launch --sh-syntax)"
  export DBUS_SESSION_BUS_ADDRESS
  export DBUS_SESSION_BUS_PID
fi

if [ -n "${PUPPETEER_EXECUTABLE_PATH:-}" ] && [ ! -x "$PUPPETEER_EXECUTABLE_PATH" ]; then
  echo "Ignoring missing browser path: $PUPPETEER_EXECUTABLE_PATH"
  unset PUPPETEER_EXECUTABLE_PATH
fi

if [ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
  if browser_path="$(find_browser)"; then
    export PUPPETEER_EXECUTABLE_PATH="$browser_path"
  fi
fi

if [ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
  echo "No Chrome/Chromium executable found in the container." >&2
  ls -la /usr/bin/google-chrome* /usr/bin/chromium* 2>/dev/null || true
  exit 1
fi

if [ -S /run/dbus/system_bus_socket ]; then
  echo "DBus system bus ready at /run/dbus/system_bus_socket"
fi

echo "Using browser executable: $PUPPETEER_EXECUTABLE_PATH"
"$PUPPETEER_EXECUTABLE_PATH" --version || true

exec "$@"
