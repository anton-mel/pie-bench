#!/bin/bash
# Remove this Mac's pie-bench runner. Mint a remove token on the same runners page.
#   ./remove-runner.sh <remove-token>
set -euo pipefail
TOKEN="${1:?usage: remove-runner.sh <remove-token>}"
DIR="${RUNNER_DIR:-$HOME/actions-runner-pie-bench}"

[ -f "$DIR/config.sh" ] || { echo "No pie-bench runner in $DIR."; exit 1; }
cd "$DIR"
./svc.sh stop >/dev/null 2>&1 || true
./svc.sh uninstall >/dev/null 2>&1 || true
./config.sh remove --token "$TOKEN" >/dev/null
cd "$HOME" && rm -rf "$DIR"
printf '\033[32mDone.\033[0m This Mac is no longer a pie-bench runner.\n'
