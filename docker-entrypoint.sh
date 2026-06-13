#!/bin/sh
set -eu

mkdir -p /run/dbus /tmp/.chromium

if [ ! -S /run/dbus/system_bus_socket ]; then
  dbus-daemon --system --fork --nopidfile || true
fi

session_bus_address="$(dbus-daemon --session --fork --print-address=1 --print-pid=1 | head -n 1 || true)"
if [ -n "$session_bus_address" ]; then
  export DBUS_SESSION_BUS_ADDRESS="$session_bus_address"
else
  unset DBUS_SESSION_BUS_ADDRESS
fi

exec "$@"
