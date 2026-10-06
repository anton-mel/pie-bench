#!/usr/bin/env bash
# Register a Linux GPU box (e.g. a RunPod pod) as a pie-bench GitHub Actions
# runner and keep it in the foreground so the container stays alive.
#   GPU_ID=rtx4090-24gb ./setup-runner.sh <registration-token>
set -euo pipefail
TOKEN="${1:?usage: setup-runner.sh <registration-token>}"
REPO="${REPO:-anton-mel/pie-bench}"
RUNNER_VERSION="${RUNNER_VERSION:-2.337.0}"
GPU_ID="${GPU_ID:-cuda}"
DIR="${RUNNER_DIR:-/opt/actions-runner}"
export RUNNER_ALLOW_RUNASROOT=1
export DEBIAN_FRONTEND=noninteractive

need() { command -v "$1" >/dev/null || { apt-get update -qq && apt-get install -y -qq "$2"; }; }
need curl curl
need git git
need tar tar
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

mkdir -p "$DIR" && cd "$DIR"
if [ ! -f run.sh ]; then
  curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" | tar xz
fi

NAME="runpod-$(hostname)-$GPU_ID"
if [ ! -f .runner ]; then
  # --ephemeral: take exactly one job, then exit. The pod never lingers idle on the clock.
  ./config.sh --unattended --url "https://github.com/$REPO" --token "$TOKEN" \
    --name "$NAME" --labels "self-hosted,linux,cuda,$GPU_ID" --work _work --replace --ephemeral
fi

# Terminate this pod via the RunPod API. Needs RUNPOD_API_KEY passed at create;
# RUNPOD_POD_ID is injected by RunPod.
terminate() {
  [ -n "${RUNPOD_API_KEY:-}" ] && [ -n "${RUNPOD_POD_ID:-}" ] || { echo "no RUNPOD_API_KEY/POD_ID; cannot self-terminate"; return; }
  echo "terminating pod $RUNPOD_POD_ID"
  curl -s -X DELETE "https://rest.runpod.io/v1/pods/$RUNPOD_POD_ID" -H "Authorization: Bearer $RUNPOD_API_KEY" >/dev/null || true
}

# Safety net: never bill longer than MAX_LIFETIME_S even if no job ever arrives.
( sleep "${MAX_LIFETIME_S:-1800}"; echo "watchdog: lifetime cap reached"; terminate ) &
WATCHDOG=$!

echo "pie-bench runner $NAME starting (ephemeral; labels: self-hosted,linux,cuda,$GPU_ID)"
./run.sh || true

kill "$WATCHDOG" 2>/dev/null || true
terminate
