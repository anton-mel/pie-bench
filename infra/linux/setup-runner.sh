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
  ./config.sh --unattended --url "https://github.com/$REPO" --token "$TOKEN" \
    --name "$NAME" --labels "self-hosted,linux,cuda,$GPU_ID" --work _work --replace
fi

echo "pie-bench runner $NAME starting (labels: self-hosted,linux,cuda,$GPU_ID)"
exec ./run.sh
