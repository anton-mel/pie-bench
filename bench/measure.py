from __future__ import annotations

import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from .config import Workload

PROMPT_WORD = "benchmark "


@dataclass
class Turn:
    ttft_ms: float
    decode_ms: float
    output_tokens: int
    wall_ms: float


def _prompt(tokens: int) -> str:
    # One word is roughly one token for this filler; close enough to shape the prompt.
    return "Continue this text. " + PROMPT_WORD * max(tokens - 4, 1)


def _stream_once(base_url: str, model: str, prompt: str, max_tokens: int, timeout: float) -> Turn:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.0,
        "stream": True,
        "stream_options": {"include_usage": True},
    }).encode()
    request = urllib.request.Request(f"{base_url}/v1/chat/completions", data=body, headers={"Content-Type": "application/json"})

    start = time.perf_counter()
    first = None
    tokens = 0
    usage_out = None

    with urllib.request.urlopen(request, timeout=timeout) as response:
        for raw in response:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            chunk = json.loads(payload)
            usage = chunk.get("usage")
            if usage:
                usage_out = usage.get("completion_tokens")
            choices = chunk.get("choices") or []
            if choices and (choices[0].get("delta") or {}).get("content"):
                if first is None:
                    first = time.perf_counter()
                tokens += 1

    end = time.perf_counter()
    if first is None:
        raise RuntimeError("no tokens streamed")
    output_tokens = usage_out or tokens
    return Turn(
        ttft_ms=(first - start) * 1000,
        decode_ms=(end - first) * 1000,
        output_tokens=output_tokens,
        wall_ms=(end - start) * 1000,
    )


def _percentile(values: list[float], p: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round((p / 100) * (len(ordered) - 1))))
    return ordered[index]


def single(base_url: str, model: str, workload: Workload, timeout: float = 600) -> dict:
    prompt = _prompt(workload.prompt_tokens)
    for _ in range(workload.warmup):
        _stream_once(base_url, model, prompt, workload.output_tokens, timeout)

    turns = [_stream_once(base_url, model, prompt, workload.output_tokens, timeout) for _ in range(workload.requests)]
    decode_rates = [t.output_tokens / (t.decode_ms / 1000) for t in turns if t.decode_ms > 0]
    ttfts = [t.ttft_ms for t in turns]
    itls = [t.decode_ms / max(t.output_tokens - 1, 1) for t in turns]

    return {
        "decode_tok_s": statistics.median(decode_rates),
        "prefill_tok_s": workload.prompt_tokens / (statistics.median(ttfts) / 1000),
        "output_tok_s": statistics.median([t.output_tokens / (t.wall_ms / 1000) for t in turns]),
        "ttft_ms_p50": _percentile(ttfts, 50),
        "ttft_ms_p99": _percentile(ttfts, 99),
        "itl_ms_p50": _percentile(itls, 50),
        "latency_ms_p50": _percentile([t.wall_ms for t in turns], 50),
        "requests": workload.requests,
        "concurrency": 1,
    }


def throughput(base_url: str, model: str, workload: Workload, timeout: float = 600) -> dict:
    prompt = _prompt(workload.prompt_tokens)
    for _ in range(workload.warmup):
        _stream_once(base_url, model, prompt, workload.output_tokens, timeout)

    def task(_: int) -> Turn:
        return _stream_once(base_url, model, prompt, workload.output_tokens, timeout)

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workload.concurrency) as pool:
        turns = list(pool.map(task, range(workload.requests)))
    elapsed = time.perf_counter() - start

    total_output = sum(t.output_tokens for t in turns)
    ttfts = [t.ttft_ms for t in turns]
    return {
        "output_tok_s": total_output / elapsed,
        "decode_tok_s": total_output / elapsed,
        "prefill_tok_s": (workload.prompt_tokens * workload.requests) / elapsed,
        "ttft_ms_p50": _percentile(ttfts, 50),
        "ttft_ms_p99": _percentile(ttfts, 99),
        "latency_ms_p50": _percentile([t.wall_ms for t in turns], 50),
        "requests": workload.requests,
        "concurrency": workload.concurrency,
    }


def run(base_url: str, model: str, workload: Workload) -> dict:
    return (throughput if workload.concurrency > 1 else single)(base_url, model, workload)


def wait_until_ready(base_url: str, timeout: float = 300) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{base_url}/v1/models", timeout=5) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, OSError):
            time.sleep(2)
    raise TimeoutError(f"server at {base_url} did not become ready in {timeout:.0f}s")
