#!/usr/bin/env sh
set -eu

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This helper only supports Debian/Ubuntu systems with apt-get." >&2
  exit 1
fi

install_one_of() {
  for package_name in "$@"
  do
    echo "Trying to install $package_name"
    if sudo apt-get install -y --no-install-recommends "$package_name"; then
      return 0
    fi
  done

  echo "Could not install any of these packages: $*" >&2
  return 1
}

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-liberation \
  libcairo2 \
  libdrm2 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libnspr4 \
  libnss3 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcb-dri3-0 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxkbcommon0 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  xdg-utils

install_one_of libasound2t64 libasound2
install_one_of libatk-bridge2.0-0t64 libatk-bridge2.0-0
install_one_of libatk1.0-0t64 libatk1.0-0
install_one_of libcups2t64 libcups2
install_one_of libdbus-1-3t64 libdbus-1-3
install_one_of libglib2.0-0t64 libglib2.0-0
install_one_of libgtk-3-0t64 libgtk-3-0
install_one_of libpango-1.0-0t64 libpango-1.0-0
install_one_of libpangocairo-1.0-0t64 libpangocairo-1.0-0

sudo ldconfig

if ! ldconfig -p | grep -q 'libatk-1.0.so.0'; then
  echo "libatk-1.0.so.0 is still missing after installation." >&2
  exit 1
fi
