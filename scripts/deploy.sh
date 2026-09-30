#!/usr/bin/env bash
set -euo pipefail

environment="${1:-test}"
case "$environment" in
  test|prod) ;;
  *)
    echo "Usage: scripts/deploy.sh [test|prod]" >&2
    exit 2
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
config_file="${IOT_DEPLOY_CONFIG:-$project_dir/.deploy.local}"

if [[ ! -f "$config_file" ]]; then
  echo "Deployment config not found: $config_file" >&2
  echo "Copy .deploy.example to .deploy.local and configure SSH key access." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$config_file"

prefix="IOT_DEPLOY_${environment^^}_"
read_config() {
  local name="${prefix}$1"
  printf '%s' "${!name:-}"
}

remote_host="$(read_config HOST)"
remote_user="$(read_config USER)"
remote_dir="$(read_config DIR)"
remote_port="$(read_config PORT)"
identity_file="$(read_config IDENTITY_FILE)"
api_base="$(read_config API_BASE)"
upload_base="$(read_config UPLOAD_BASE)"

remote_port="${remote_port:-22}"
api_base="${api_base:-auto}"
upload_base="${upload_base:-auto}"

if [[ -z "$remote_host" || -z "$remote_user" || -z "$remote_dir" ]]; then
  echo "HOST, USER and DIR must be configured for $environment." >&2
  exit 1
fi

case "$remote_dir" in
  /|/home|/var|/usr|/opt|/etc|/tmp)
    echo "Refusing unsafe deployment directory: $remote_dir" >&2
    exit 1
    ;;
  /*) ;;
  *)
    echo "Deployment directory must be an absolute path: $remote_dir" >&2
    exit 1
    ;;
esac

ssh_args=(-p "$remote_port")
rsync_ssh="ssh -p $remote_port"
if [[ -n "$identity_file" ]]; then
  ssh_args+=(-i "$identity_file")
  rsync_ssh+=" -i $identity_file"
fi

cd "$project_dir"
npm run build

IOT_RUNTIME_API_BASE="$api_base" IOT_RUNTIME_UPLOAD_BASE="$upload_base" node - <<'NODE'
const fs = require('fs')

const config = {
  appMode: 'backend',
  apiBase: process.env.IOT_RUNTIME_API_BASE || 'auto',
  uploadBaseUrl: process.env.IOT_RUNTIME_UPLOAD_BASE || 'auto'
}

fs.writeFileSync('dist/config.json', `${JSON.stringify(config, null, 2)}\n`)
NODE

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for deployment." >&2
  exit 1
fi

ssh "${ssh_args[@]}" "$remote_user@$remote_host" "mkdir -p -- '$remote_dir'"
rsync -az --delete -e "$rsync_ssh" dist/ "$remote_user@$remote_host:$remote_dir/"

echo "Deployment completed: $environment"
