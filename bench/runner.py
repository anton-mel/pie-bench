from __future__ import annotations

import os
from pathlib import Path

from . import engines, measure, record
from .config import Engine, Mac, Model, Workload

SCHEME = {"mlx": "mlx4", "gguf": "gguf_q4_k_m", "ollama": "ollama_q4", "splash": "splash"}


def run_job(mac: Mac, engine: Engine, model: Model, workload: Workload) -> record.Result:
    result = record.Result(
        mac=mac.id,
        engine=engine.id,
        engine_version=engine.pin,
        model=model.id,
        workload=workload.id,
        scheme=SCHEME.get(engine.format, engine.format),
        prompt_tokens=workload.prompt_tokens,
        output_tokens=workload.output_tokens,
    )
    if engine.id == "pie":
        pie_root = os.environ.get("PIE_ROOT", str(Path.home() / "pie"))
        result.pie_commit = record.pie_commit(Path(pie_root))
        result.engine_version = result.pie_commit or "main"

    try:
        with engines.launch(engine, model) as server:
            if server.version:
                result.engine_version = server.version if engine.id != "pie" else result.engine_version
            metrics = measure.run(server.base_url, server.model, workload)
        for key, value in metrics.items():
            setattr(result, key, round(value, 2) if isinstance(value, float) else value)
    except NotImplementedError as error:
        result.status = "skipped"
        result.error = str(error)
    except Exception as error:  # noqa: BLE001 - any engine or network failure is a failed run, not a crash
        result.status = "fail"
        result.error = f"{type(error).__name__}: {error}"

    return result
