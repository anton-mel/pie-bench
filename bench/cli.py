from __future__ import annotations

import argparse
import sys

from . import config, runner
from .record import write


def _list(args: argparse.Namespace) -> int:
    for engine, model, workload in config.jobs(args.mac, args.engine):
        print(f"{engine.id:10} {model.id:20} {workload.id}")
    return 0


def _run(args: argparse.Namespace) -> int:
    mac = config.macs()[args.mac]
    jobs = config.jobs(args.mac, args.engine)
    if args.model:
        jobs = [job for job in jobs if job[1].id == args.model]
    if args.workload:
        jobs = [job for job in jobs if job[2].id == args.workload]

    failures = 0
    for engine, model, workload in jobs:
        print(f"→ {engine.id} · {model.id} · {workload.id}", flush=True)
        result = runner.run_job(mac, engine, model, workload)
        path = write(result)
        note = result.error if result.status != "ok" else f"{result.output_tok_s} tok/s"
        print(f"  {result.status}: {note}\n  {path.relative_to(config.ROOT)}", flush=True)
        failures += result.status == "fail"
    return 1 if failures else 0


def _export(args: argparse.Namespace) -> int:
    from tools.export import export

    export(args.out)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pie-bench")
    sub = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--mac", required=True, choices=list(config.macs()))
    common.add_argument("--engine", choices=list(config.engines()))

    listing = sub.add_parser("list", parents=[common], help="print the jobs for a Mac")
    listing.set_defaults(func=_list)

    running = sub.add_parser("run", parents=[common], help="run the jobs and write results")
    running.add_argument("--model", choices=list(config.models()))
    running.add_argument("--workload", choices=list(config.workloads()))
    running.set_defaults(func=_run)

    exporting = sub.add_parser("export", help="build the site data from the store")
    exporting.add_argument("--out", default=str(config.ROOT / "site" / "data" / "db.js"))
    exporting.set_defaults(func=_export)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
