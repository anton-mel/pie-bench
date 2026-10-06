from __future__ import annotations

import platform
import socket
import subprocess
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from .config import STORE


@dataclass
class Result:
    mac: str
    engine: str
    engine_version: str
    model: str
    workload: str
    scheme: str

    status: str = "ok"
    error: str = ""

    decode_tok_s: float | None = None
    prefill_tok_s: float | None = None
    output_tok_s: float | None = None
    ttft_ms_p50: float | None = None
    ttft_ms_p99: float | None = None
    itl_ms_p50: float | None = None
    latency_ms_p50: float | None = None
    resident_gib: float | None = None
    load_s: float | None = None

    prompt_tokens: int | None = None
    output_tokens: int | None = None
    requests: int | None = None
    concurrency: int | None = None

    pie_commit: str = ""
    os_version: str = field(default_factory=lambda: platform.mac_ver()[0])
    host: str = field(default_factory=socket.gethostname)
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))


def pie_commit(pie_root: Path) -> str:
    try:
        out = subprocess.run(["git", "-C", str(pie_root), "rev-parse", "HEAD"], capture_output=True, text=True, check=True)
        return out.stdout.strip()[:9]
    except (OSError, subprocess.CalledProcessError):
        return ""


def write(result: Result) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    month = stamp[:6]
    directory = STORE / "records" / result.mac / f"{month[:4]}-{month[4:]}"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{result.mac}-{result.engine}-{result.model}-{result.workload}-{stamp}.parquet"
    pq.write_table(pa.Table.from_pylist([asdict(result)]), path)
    return path
