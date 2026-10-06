"""Build the site's data file from the parquet store with DuckDB.

    python -m tools.export

The store is the database: one parquet file per run under store/records/. DuckDB
reads them in place; this script keeps the newest run per Mac, engine, model,
workload and version, and writes site/data/db.js for the static site.
"""
from __future__ import annotations

import json
from pathlib import Path

import duckdb

from bench import config

# Memory bandwidth (GB/s) and GPU core count per chip, where known.
CHIP_SPECS = {
    "Apple M3": (100, 10),
    "Apple M4 Pro": (273, 20),
    "Apple M5": (153, 10),
    "Apple M5 Max": (546, 40),
}
ENGINE_META = {
    "pie": ("Apache-2.0", "pie-project/pie"),
    "mlxlm": ("MIT", "ml-explore/mlx-lm"),
    "llamacpp": ("MIT", "ggml-org/llama.cpp"),
    "ollama": ("MIT", "ollama/ollama"),
    "splash": (None, "incoai/splash"),
}
FORMAT_LABEL = {"mlx": "mlx", "gguf": "gguf", "ollama": "ollama", "splash": "splash"}

LATEST_RESULTS = """
WITH ranked AS (
  SELECT *,
    row_number() OVER (
      PARTITION BY mac, engine, model, workload, engine_version
      ORDER BY started_at DESC
    ) AS recency
  FROM read_parquet(?, union_by_name = true)
  WHERE status = 'ok'
)
SELECT mac, engine, engine_version, model, workload, scheme,
       decode_tok_s, prefill_tok_s, output_tok_s,
       ttft_ms_p50, ttft_ms_p99, itl_ms_p50, latency_ms_p50,
       resident_gib, load_s, pie_commit, os_version, started_at
FROM ranked WHERE recency = 1
ORDER BY mac, model, workload, engine != 'pie', engine
"""


def hardware() -> list[dict]:
    rows = []
    for mac in config.macs().values():
        bandwidth, cores = CHIP_SPECS.get(mac.chip, (None, None))
        rows.append({
            "id": mac.id, "name": mac.name, "class": "mac", "location": "local",
            "vendor": "Apple", "backend": "metal", "arch": mac.chip.replace("Apple ", ""),
            "count": 1, "memory_gib": mac.memory_gib, "bandwidth_gbs": bandwidth, "gpu_cores": cores,
            "interconnect": "uma", "power_w": None, "price_usd": None, "price_hr": None,
        })
    return rows


def engines() -> list[dict]:
    rows = []
    for engine in config.engines().values():
        license_, repo = ENGINE_META.get(engine.id, (None, None))
        rows.append({
            "id": engine.id, "name": engine.name, "version": engine.pin, "license": license_,
            "repo": repo, "os": "macos", "formats": FORMAT_LABEL.get(engine.format, engine.format),
            "continuous_batching": None, "prefix_cache": None, "speculative": None, "structured_output": None,
        })
    return rows


def models() -> list[dict]:
    rows = []
    for model in config.models().values():
        rows.append({
            "id": model.id, "name": model.name, "family": model.family, "base_model": next(iter(model.weights.values())),
            "architecture": "MoE" if model.active_b < model.params_b else "dense",
            "params_b": model.params_b, "active_b": model.active_b, "size_gib": model.fits_gib,
            "context": None, "license": None,
            "schemes": ", ".join(sorted(set(FORMAT_LABEL.get(f, f) for f in model.weights))),
            "artifacts": len(model.weights),
        })
    return rows


def workloads() -> list[dict]:
    return [{
        "id": w.id, "label": w.name, "concurrency": w.concurrency,
        "prompt_tokens": w.prompt_tokens, "output_tokens": w.output_tokens,
        "benchmark": w.id,
    } for w in config.workloads().values()]


def results() -> list[dict]:
    pattern = str(config.STORE / "records" / "**" / "*.parquet")
    if not list((config.STORE / "records").glob("**/*.parquet")):
        return []
    rows = duckdb.execute(LATEST_RESULTS, [pattern]).fetchall()
    columns = [c[0] for c in duckdb.execute(LATEST_RESULTS, [pattern]).description]
    out = []
    for row in rows:
        record = dict(zip(columns, row))
        is_pie = record["engine"] == "pie"
        out.append({
            "hardware": record["mac"], "engine": record["engine"],
            "release": record["engine_version"], "group": "main" if is_pie else record["engine_version"],
            "released": None, "model": record["model"], "scheme": record["scheme"], "workload": record["workload"],
            "decode_tok_s": record["decode_tok_s"], "prefill_tok_s": record["prefill_tok_s"], "output_tok_s": record["output_tok_s"],
            "ttft_ms_p50": record["ttft_ms_p50"], "ttft_ms_p99": record["ttft_ms_p99"], "itl_ms_p50": record["itl_ms_p50"],
            "itl_ms_p99": None, "latency_ms_p50": record["latency_ms_p50"], "latency_ms_p99": None,
            "resident_gib": record["resident_gib"], "load_s": record["load_s"], "accuracy": None,
            "status": "pass", "commit": record["pie_commit"], "os": record["os_version"],
            "measured": str(record["started_at"])[:16],
        })
    return out


def export(out: str | Path | None = None) -> Path:
    database = {
        "releases": [],
        "hardware": hardware(),
        "engines": engines(),
        "models": models(),
        "workloads": workloads(),
        "results": results(),
        "quality": [],
    }
    destination = Path(out) if out else config.ROOT / "site" / "data" / "db.js"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("const DB = " + json.dumps(database, indent=2, default=str) + ";\n")
    print({table: len(rows) for table, rows in database.items()})
    return destination


if __name__ == "__main__":
    export()
