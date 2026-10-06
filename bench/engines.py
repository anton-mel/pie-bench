from __future__ import annotations

import contextlib
import os
import signal
import socket
import subprocess
import sys
from collections.abc import Iterator
from dataclasses import dataclass

from .config import Engine, Model
from .measure import wait_until_ready


@dataclass
class Server:
    base_url: str
    model: str
    version: str


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@contextlib.contextmanager
def _process(cmd: list[str], base_url: str, env: dict | None = None) -> Iterator[None]:
    proc = subprocess.Popen(cmd, env={**os.environ, **(env or {})}, preexec_fn=os.setsid)
    try:
        wait_until_ready(base_url)
        yield
    finally:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        with contextlib.suppress(subprocess.TimeoutExpired):
            proc.wait(timeout=30)


@contextlib.contextmanager
def mlxlm(engine: Engine, model: Model) -> Iterator[Server]:
    python = os.environ.get("MLX_PY", sys.executable)
    weight = model.weight("mlx")
    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"
    cmd = [python, "-m", "mlx_lm", "server", "--model", weight, "--host", "127.0.0.1", "--port", str(port), "--log-level", "ERROR"]
    with _process(cmd, base_url):
        yield Server(base_url, weight, engine.pin)


@contextlib.contextmanager
def llamacpp(engine: Engine, model: Model) -> Iterator[Server]:
    binary = os.environ.get("LLAMA_SERVER_BIN", "llama-server")
    weight = model.weight("gguf")
    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"
    cmd = [binary, "-hf", weight, "--host", "127.0.0.1", "--port", str(port), "-ngl", "999"]
    with _process(cmd, base_url):
        yield Server(base_url, weight, engine.pin)


@contextlib.contextmanager
def ollama(engine: Engine, model: Model) -> Iterator[Server]:
    tag = model.weight("ollama")
    subprocess.run(["ollama", "pull", tag], check=True)
    base_url = "http://127.0.0.1:11434"
    subprocess.run(["ollama", "ps"], check=False)
    wait_until_ready(base_url)
    try:
        yield Server(base_url, tag, engine.pin)
    finally:
        subprocess.run(["ollama", "stop", tag], check=False)


@contextlib.contextmanager
def pie(engine: Engine, model: Model) -> Iterator[Server]:
    raise NotImplementedError(
        "The pie launch adapter needs one validation run on a Mac runner before it emits numbers. "
        "Wire bench/engines.py:pie to pie's OpenAI-compatible server (see the pie repo's serving docs) "
        "and confirm the first run against bench/measure.py."
    )
    yield  # pragma: no cover


@contextlib.contextmanager
def splash(engine: Engine, model: Model) -> Iterator[Server]:
    raise NotImplementedError(
        "The Splash launch adapter needs one validation run on a Mac runner before it emits numbers."
    )
    yield  # pragma: no cover


LAUNCHERS = {
    "pie": pie,
    "mlxlm": mlxlm,
    "llamacpp": llamacpp,
    "ollama": ollama,
    "splash": splash,
}


def launch(engine: Engine, model: Model):
    return LAUNCHERS[engine.id](engine, model)
