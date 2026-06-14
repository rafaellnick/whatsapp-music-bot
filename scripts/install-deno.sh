#!/usr/bin/env sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
install_dir=${DENO_INSTALL:-"$root_dir/bin/deno-install"}
output_path=${DENO_PATH:-"$root_dir/bin/deno"}

mkdir -p "$install_dir" "$(dirname -- "$output_path")"

echo "Installing Deno into $install_dir"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL https://deno.land/install.sh | DENO_INSTALL="$install_dir" sh -s -- -y
elif command -v wget >/dev/null 2>&1; then
  wget -qO- https://deno.land/install.sh | DENO_INSTALL="$install_dir" sh -s -- -y
else
  echo "curl or wget is required to install Deno." >&2
  exit 1
fi

installed_deno="$install_dir/bin/deno"

if [ ! -x "$installed_deno" ]; then
  echo "Deno installer finished, but $installed_deno was not found." >&2
  exit 1
fi

cp "$installed_deno" "$output_path"
chmod +x "$output_path"

echo "Deno installed at $output_path"
"$output_path" --version
