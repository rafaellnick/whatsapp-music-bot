#!/bin/sh
set -eu

mkdir -p /run/dbus /var/lib/dbus /tmp/.chromium

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

if [ -S /run/dbus/system_bus_socket ]; then
  echo "DBus system bus ready at /run/dbus/system_bus_socket"
fi

exec "$@"
