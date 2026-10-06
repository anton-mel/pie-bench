# pie-bench

Mac-only inference benchmarks for [pie](https://github.com/pie-project/pie) against
other local engines (MLX, llama.cpp, Ollama, Splash), with a static site to read
the results.

## How it works

```
matrix/*.yaml ──► bench (runs on each Mac) ──► store/*.parquet ──► tools/export.py ──► site/
```

- **matrix/** declares what exists: the Macs, engines, models and workloads.
- **bench/** runs one engine on one model for one workload and writes a single
  parquet file per run. Every engine loads its own copy of the same model and is
  driven through its OpenAI-compatible server by `bench/measure.py`.
- **store/** is the database: one parquet file per run, committed. Runs only add
  files, so machines never clash and every number is versioned in git.
- **tools/export.py** reads the store with DuckDB, keeps the newest run per
  Mac/engine/model/workload/version, and writes `site/data/db.js`.
- **site/** is a static page; open `site/index.html` or deploy it with Pages.

## Workloads

- **Single request** — one request at a time; per-request speed and latency.
- **Throughput** — 32 requests in parallel to saturate the machine; total output
  tokens per second.

## Running locally

```sh
uv venv && uv pip install -e .
.venv/bin/pie-bench list --mac m5-max-64gb
.venv/bin/pie-bench run  --mac m5-max-64gb --engine mlxlm
.venv/bin/pie-bench export
```

`PIE_ROOT` points at a pie checkout (default `~/pie`). `MLX_PY` and
`LLAMA_SERVER_BIN` override the mlx-lm interpreter and the llama.cpp server binary.

## CI

- **eval.yml** fans out to the self-hosted Mac runners, runs the benchmarks,
  gathers the parquet files, rebuilds `site/data/db.js`, and commits. Runs nightly
  or on demand (pick Macs and an engine when dispatching).
- **pages.yml** publishes `site/` to GitHub Pages.

## Adding a Mac runner

On the Mac (Apple Silicon, on AC power):

```sh
curl -fsSL https://raw.githubusercontent.com/anton-mel/pie-bench/main/infra/mac/setup-runner.sh -o setup-runner.sh
bash setup-runner.sh <registration-token>
```

Mint the token at **Settings → Actions → Runners → New self-hosted runner**. The
script labels the runner by chip and memory (e.g. `m5-max-64gb`) to match
`matrix/macs.yaml`. Remove it later with `infra/mac/remove-runner.sh`.

## Cost control (GPU pods)

GPU runs use **ephemeral** RunPod pods that take one job and terminate themselves; a
watchdog also kills the pod after `MAX_LIFETIME_S` (default 30 min) even if no job
arrives, so a pod never idles on the clock. Launch one with:

```sh
RUNPOD_API_KEY=... ./infra/runpod/run-gpu.sh      # RTX 4090 by default
```

A pod is billed for the whole time it is RUNNING, not just while a job runs, so never
leave one up idle. Stop compute with `POST /v1/pods/<id>/stop` or remove it entirely
with `DELETE /v1/pods/<id>`.

## Engine adapter status

`bench/engines.py` drives each engine's server. The MLX, llama.cpp and Ollama
adapters are implemented against their OpenAI-compatible APIs. The **pie** and
**Splash** adapters raise until validated on a Mac runner once — they must not
emit numbers before their launch flags are confirmed, so no result is ever faked.
