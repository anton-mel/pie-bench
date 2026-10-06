#!/bin/bash
# Register this Apple Silicon Mac as a GitHub Actions runner for pie-bench.
# Mint a token at https://github.com/anton-mel/pie-bench/settings/actions/runners/new
# then run:  ./setup-runner.sh <registration-token>
set -euo pipefail
TOKEN="${1:?usage: setup-runner.sh <registration-token>}"
REPO="${REPO:-anton-mel/pie-bench}"
RUNNER_VERSION="${RUNNER_VERSION:-2.321.0}"
DIR="${RUNNER_DIR:-$HOME/actions-runner-pie-bench}"

step() { printf '\n\033[1m[%s/5] %s\033[0m\n' "$1" "$2"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo "Apple Silicon Macs only."; exit 1; }

step 1 "Identifying this Mac"
CHIP=$(sysctl -n machdep.cpu.brand_string)
GIB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
BASE=$(echo "$CHIP" | sed -E 's/^Apple //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
MAC_ID="${MAC_ID:-$BASE-${GIB}gb}"
ok "$CHIP, ${GIB} GB -> label $MAC_ID"
if ! curl -fsSL "https://raw.githubusercontent.com/$REPO/main/matrix/macs.yaml" | grep -q "id: $MAC_ID$"; then
  warn "$MAC_ID is not in matrix/macs.yaml yet; add it so jobs target this Mac (set MAC_ID to override)"
fi

step 2 "Checking tools"
for t in git uv ollama; do command -v "$t" >/dev/null && ok "$t" || warn "$t not found (install before the first run)"; done
pmset -g batt | grep -q "AC Power" && ok "on AC power" || warn "on battery: results are less stable"

step 3 "Fetching pie and the runner"
if [ -d "$HOME/pie/.git" ]; then ok "pie checkout at ~/pie"
elif command -v git >/dev/null && git clone -q https://github.com/pie-project/pie "$HOME/pie" 2>/dev/null; then ok "cloned pie to ~/pie"
else warn "could not clone pie (needs git / Xcode command line tools); the runner still connects, pie jobs are skipped until pie is present"; fi
mkdir -p "$DIR" && cd "$DIR"
[ -f run.sh ] && ok "runner already in $DIR" || { curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz" | tar xz; ok "runner $RUNNER_VERSION in $DIR"; }

step 4 "Registering with github.com/$REPO"
NAME="$(scutil --get ComputerName | tr ' ' '-')-$MAC_ID"
./config.sh --unattended --url "https://github.com/$REPO" --token "$TOKEN" --name "$NAME" \
  --labels "self-hosted,macos,$MAC_ID" --work _work --replace >/dev/null
ok "registered as $NAME with label $MAC_ID"

step 5 "Starting the runner service"
./svc.sh install >/dev/null 2>&1 || true
./svc.sh start >/dev/null
ok "service running; it restarts at login"
printf '\n\033[32mDone.\033[0m This Mac now picks up pie-bench jobs.\n'
