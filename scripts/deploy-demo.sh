#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
config_file="${IOT_DEPLOY_CONFIG:-$project_dir/.deploy.local}"

if [[ ! -f "$config_file" ]]; then
  echo "Deployment config not found: $config_file" >&2
  echo "Copy .deploy.example to .deploy.local and configure the Demo target." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$config_file"

remote_host="${IOT_DEPLOY_DEMO_HOST:-}"
remote_user="${IOT_DEPLOY_DEMO_USER:-}"
remote_dir="${IOT_DEPLOY_DEMO_DIR:-}"
remote_port="${IOT_DEPLOY_DEMO_PORT:-22}"
identity_file="${IOT_DEPLOY_DEMO_IDENTITY_FILE:-}"
public_url="${IOT_DEPLOY_DEMO_PUBLIC_URL:-}"

if [[ -z "$remote_host" || -z "$remote_user" || -z "$remote_dir" || -z "$public_url" ]]; then
  echo "DEMO HOST, USER, DIR and PUBLIC_URL must be configured." >&2
  exit 1
fi
if [[ ! "$remote_host" =~ ^[A-Za-z0-9.-]+$ ]] || [[ "$remote_host" == -* ]]; then
  echo "Invalid Demo deployment host: $remote_host" >&2
  exit 1
fi
if [[ ! "$remote_user" =~ ^[A-Za-z0-9._-]+$ ]] || [[ "$remote_user" == -* ]]; then
  echo "Invalid Demo deployment user: $remote_user" >&2
  exit 1
fi
if [[ ! "$remote_port" =~ ^[0-9]+$ ]] || (( remote_port < 1 || remote_port > 65535 )); then
  echo "Invalid Demo deployment port: $remote_port" >&2
  exit 1
fi
if [[ ! "$remote_dir" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "$remote_dir" =~ ^/(home|var|usr|opt|etc|tmp)?/?$ ]] || [[ "$remote_dir" == *//* ]] || [[ "$remote_dir" == */../* ]] || [[ "$remote_dir" == */.. ]]; then
  echo "Refusing unsafe Demo deployment directory: $remote_dir" >&2
  exit 1
fi
if [[ ! "$public_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "Demo PUBLIC_URL must be an HTTPS origin without a path." >&2
  exit 1
fi

ssh_args=(-o BatchMode=yes -p "$remote_port")
rsync_ssh="ssh -o BatchMode=yes -p $remote_port"
if [[ -n "$identity_file" ]]; then
  if [[ "$identity_file" =~ [[:space:]] ]] || [[ ! -f "$identity_file" ]]; then
    echo "Demo identity file must exist and its path must not contain whitespace: $identity_file" >&2
    exit 1
  fi
  ssh_args+=(-i "$identity_file")
  rsync_ssh+=" -i $identity_file"
fi

cd "$project_dir"
commit="$(git rev-parse HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Demo deployment requires a clean checkout." >&2
  exit 1
fi

npm run verify:demo-contracts
npm run audit:demo-data
npm run build:demo
node scripts/verify-demo-artifact.mjs dist-demo "$commit"

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for deployment." >&2
  exit 1
fi

release_id="$(date -u +%Y%m%dT%H%M%SZ)-${commit:0:12}"
release_dir="$remote_dir/releases/$release_id"
current_link="$remote_dir/current"
previous_release="$(ssh "${ssh_args[@]}" "$remote_user@$remote_host" "if [ -L '$current_link' ]; then readlink -f '$current_link'; fi")"
case "$previous_release" in
  ""|"$remote_dir/releases/"*) ;;
  *) echo "Refusing unexpected current release target: $previous_release" >&2; exit 1 ;;
esac

ssh "${ssh_args[@]}" "$remote_user@$remote_host" "mkdir -p -- '$release_dir'"
rsync -az --delete -e "$rsync_ssh" dist-demo/ "$remote_user@$remote_host:$release_dir/"
ssh "${ssh_args[@]}" "$remote_user@$remote_host" "test -f '$release_dir/index.html' && test -f '$release_dir/config.json' && test -f '$release_dir/build-info.json' && test -f '$release_dir/mockServiceWorker.js'"

next_link="$remote_dir/.current-$release_id"
ssh "${ssh_args[@]}" "$remote_user@$remote_host" "ln -s '$release_dir' '$next_link' && mv -Tf '$next_link' '$current_link'"

if ! node scripts/smoke-demo-release.mjs "$public_url" "$commit"; then
  echo "Online smoke failed; rolling back Demo release." >&2
  if [[ -n "$previous_release" ]]; then
    rollback_link="$remote_dir/.rollback-$release_id"
    ssh "${ssh_args[@]}" "$remote_user@$remote_host" "ln -s '$previous_release' '$rollback_link' && mv -Tf '$rollback_link' '$current_link'"
    node scripts/smoke-demo-release.mjs "$public_url" || true
  else
    ssh "${ssh_args[@]}" "$remote_user@$remote_host" "if [ -L '$current_link' ]; then rm -- '$current_link'; fi"
  fi
  exit 1
fi

echo "Demo deployment completed: $release_id"
