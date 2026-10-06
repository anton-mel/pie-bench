#!/usr/bin/env bash
# Launch ONE ephemeral RunPod GPU runner. It registers, takes a single job, then
# terminates itself (and a watchdog kills it after MAX_LIFETIME_S no matter what),
# so a pod never idles on the clock. Dispatch a job right after it connects.
#
#   RUNPOD_API_KEY=... ./infra/runpod/run-gpu.sh            # RTX 4090, secure
#   RUNPOD_API_KEY=... GPU="NVIDIA L40S" GPU_ID=l40s-48gb ./infra/runpod/run-gpu.sh
#
# Requires: gh (authenticated to the pie-bench repo) and curl.
set -euo pipefail

: "${RUNPOD_API_KEY:?set RUNPOD_API_KEY to the RunPod account key}"
REPO="${REPO:-anton-mel/pie-bench}"
GPU="${GPU:-NVIDIA GeForce RTX 4090}"
GPU_ID="${GPU_ID:-rtx4090-24gb}"
IMAGE="${IMAGE:-runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404}"
DISK="${DISK:-40}"
MAX_LIFETIME_S="${MAX_LIFETIME_S:-1800}"

SHA="$(git rev-parse HEAD)"
TOKEN="$(gh api -X POST "repos/$REPO/actions/runners/registration-token" --jq .token)"
START="export GPU_ID=$GPU_ID MAX_LIFETIME_S=$MAX_LIFETIME_S; curl -fsSL https://raw.githubusercontent.com/$REPO/$SHA/infra/linux/setup-runner.sh | bash -s $TOKEN"

BODY="$(python3 - "$GPU" "$IMAGE" "$DISK" "$START" "$RUNPOD_API_KEY" <<'PY'
import json, sys
gpu, image, disk, start, key = sys.argv[1:6]
print(json.dumps({
    "name": "pie-bench-" + gpu.split()[-1].lower(),
    "imageName": image,
    "gpuTypeIds": [gpu],
    "gpuCount": 1,
    "cloudType": "SECURE",
    "containerDiskInGb": int(disk),
    "gpuTypePriority": "availability",
    "dockerEntrypoint": ["/bin/bash", "-lc"],
    "dockerStartCmd": [start],
    "env": {"RUNPOD_API_KEY": key},
}))
PY
)"

RESP="$(curl -s -X POST https://rest.runpod.io/v1/pods \
  -H "Authorization: Bearer $RUNPOD_API_KEY" -H "Content-Type: application/json" --data "$BODY")"
echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('pod', d.get('id'), d.get('desiredStatus'), '$'+str(d.get('costPerHr'))+'/hr')" \
  || { echo "$RESP"; exit 1; }
