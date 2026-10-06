from __future__ import annotations

from dataclasses import dataclass
from functools import cache
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "matrix"
STORE = ROOT / "store"


@dataclass(frozen=True)
class Mac:
    id: str
    name: str
    chip: str
    memory_gib: int
    host: str


@dataclass(frozen=True)
class Engine:
    id: str
    name: str
    format: str
    pin: str
    source: str


@dataclass(frozen=True)
class Model:
    id: str
    name: str
    family: str
    params_b: float
    active_b: float
    fits_gib: float
    weights: dict[str, str]

    def weight(self, fmt: str) -> str | None:
        return self.weights.get(fmt)


@dataclass(frozen=True)
class Workload:
    id: str
    name: str
    concurrency: int
    requests: int
    prompt_tokens: int
    output_tokens: int
    warmup: int


def _load(name: str) -> list[dict]:
    data = yaml.safe_load((MATRIX / f"{name}.yaml").read_text())
    return next(iter(data.values()))


@cache
def macs() -> dict[str, Mac]:
    return {row["id"]: Mac(**row) for row in _load("macs")}


@cache
def engines() -> dict[str, Engine]:
    return {row["id"]: Engine(**row) for row in _load("engines")}


@cache
def models() -> dict[str, Model]:
    return {row["id"]: Model(**row) for row in _load("models")}


@cache
def workloads() -> dict[str, Workload]:
    return {row["id"]: Workload(**row) for row in _load("workloads")}


def jobs(mac: str, engine: str | None = None) -> list[tuple[Engine, Model, Workload]]:
    """Every engine, model and workload this Mac can run, skipping models whose
    weights do not fit in its memory or that an engine has no weights for."""
    machine = macs()[mac]
    chosen = [engines()[engine]] if engine else list(engines().values())
    out = []
    for eng in chosen:
        for model in models().values():
            if model.weight(eng.format) is None:
                continue
            if model.fits_gib > machine.memory_gib * 0.75:
                continue
            for workload in workloads().values():
                out.append((eng, model, workload))
    return out
