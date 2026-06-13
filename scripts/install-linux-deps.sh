#!/usr/bin/env sh
set -eu

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This helper only supports Debian/Ubuntu systems with apt-get." >&2
  exit 1
fi

install_one_of() {
  for package_name in "$@"
  do
    if apt-cache show "$package_name" >/dev/null 2>&1; then
      sudo apt-get install -y --no-install-recommends "$package_name"
      return 0
    fi
  done

  echo "None of these packages are available: $*" >&2
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

install_one_of libasound2 libasound2t64
install_one_of libatk-bridge2.0-0 libatk-bridge2.0-0t64
install_one_of libatk1.0-0 libatk1.0-0t64
install_one_of libcups2 libcups2t64
install_one_of libdbus-1-3 libdbus-1-3t64
install_one_of libglib2.0-0 libglib2.0-0t64
install_one_of libgtk-3-0 libgtk-3-0t64
install_one_of libpango-1.0-0 libpango-1.0-0t64
install_one_of libpangocairo-1.0-0 libpangocairo-1.0-0t64

sudo ldconfig

if ! ldconfig -p | grep -q 'libatk-1.0.so.0'; then
  echo "libatk-1.0.so.0 is still missing after installation." >&2
  exit 1
fi
