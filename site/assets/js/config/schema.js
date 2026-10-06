window.Pie = window.Pie || {};

(() => {
  const text = (key, label, group, options = {}) => ({ key, label, group, type: "text", ...options });
  const number = (key, label, group, unit = "", decimals = 1, options = {}) => ({ key, label, group, type: "number", unit, decimals, ...options });
  const reference = (key, label, group, table, options = {}) => ({ key, label, group, type: "reference", table, ...options });

  Pie.sections = [
    { id: "measurements", label: "Measurements" },
    { id: "catalog", label: "Catalog" },
  ];

  Pie.schema = {
    results: {
      label: "Results",
      section: "measurements",
      filters: ["hardware", "engine", "model", "workload"],
      columns: [
        reference("engine", "Engine", "Setup", "engines"),
        reference("model", "Model", "Setup", "models"),
        reference("hardware", "Hardware", "Setup", "hardware"),
        reference("workload", "Workload", "Setup", "workloads"),
        text("release", "Release", "Setup", { code: true }),
        text("released", "Released", "Setup", { code: true }),
        text("scheme", "Quantization", "Setup", { code: true }),
        number("decode_tok_s", "Decode", "Speed", "tok/s", 1),
        number("prefill_tok_s", "Prefill", "Speed", "tok/s", 0),
        number("output_tok_s", "Output", "Speed", "tok/s", 1),
        number("ttft_ms_p50", "TTFT p50", "Latency", "ms", 0),
        number("ttft_ms_p99", "TTFT p99", "Latency", "ms", 0),
        number("itl_ms_p50", "ITL p50", "Latency", "ms", 2),
        number("itl_ms_p99", "ITL p99", "Latency", "ms", 2),
        number("latency_ms_p50", "E2E p50", "Latency", "ms", 0),
        number("latency_ms_p99", "E2E p99", "Latency", "ms", 0),
        number("resident_gib", "Memory", "Resources", "GiB", 1),
        number("load_s", "Load time", "Resources", "s", 1),
        number("accuracy", "Accuracy", "Quality", "", 3, { planned: true }),
        text("status", "Status", "Run", { status: true }),
        text("commit", "pie commit", "Run", { code: true }),
        text("os", "OS", "Run"),
        text("measured", "Measured", "Run", { code: true }),
      ],
    },

    quality: {
      label: "Quality",
      section: "measurements",
      filters: ["model", "engine", "task"],
      columns: [
        reference("engine", "Engine", "Setup", "engines"),
        reference("model", "Model", "Setup", "models"),
        text("task", "Task", "Setup"),
        text("version", "Version", "Setup", { code: true }),
        text("artifact", "Weights", "Setup", { code: true }),
        number("score", "Score", "Result", "", 3),
        number("ci_low", "95% low", "Result", "", 3),
        number("ci_high", "95% high", "Result", "", 3),
        number("n", "Questions", "Result", "", 0),
        number("minutes", "Minutes", "Run", "", 1),
        text("date", "Date", "Run", { code: true }),
      ],
    },

    hardware: {
      label: "Hardware",
      section: "catalog",
      filters: ["location", "class", "backend"],
      columns: [
        text("name", "Name", "Identity"),
        text("id", "ID", "Identity", { code: true }),
        text("class", "Class", "Identity"),
        text("location", "Location", "Identity"),
        text("vendor", "Vendor", "Identity"),
        text("backend", "Backend", "Identity"),
        text("arch", "Arch", "Specs", { code: true }),
        number("count", "Devices", "Specs", "", 0),
        number("memory_gib", "Memory", "Specs", "GiB", 0),
        number("bandwidth_gbs", "Bandwidth", "Specs", "GB/s", 0),
        number("gpu_cores", "GPU cores", "Specs", "", 0),
        text("interconnect", "Interconnect", "Specs"),
        number("power_w", "TDP", "Specs", "W", 0, { planned: true }),
        number("price_usd", "Price", "Cost", "$", 0, { planned: true }),
        number("price_hr", "Cloud price", "Cost", "$/hr", 2, { planned: true }),
        number("_results", "Results", "Coverage", "", 0),
      ],
    },

    engines: {
      label: "Engines",
      section: "catalog",
      filters: [],
      columns: [
        reference("id", "Engine", "Identity", "engines"),
        text("version", "Version", "Identity", { code: true }),
        text("license", "License", "Identity"),
        text("repo", "Repo", "Identity", { code: true }),
        text("os", "OS", "Support"),
        text("formats", "Formats", "Support"),
        text("continuous_batching", "Batching", "Features", { planned: true }),
        text("prefix_cache", "Prefix cache", "Features", { planned: true }),
        text("speculative", "Speculative", "Features", { planned: true }),
        text("structured_output", "Structured output", "Features", { planned: true }),
        number("_results", "Results", "Coverage", "", 0),
      ],
    },

    models: {
      label: "Models",
      section: "catalog",
      filters: ["family", "architecture"],
      columns: [
        text("name", "Name", "Identity"),
        text("family", "Family", "Identity", { code: true }),
        text("architecture", "Architecture", "Shape"),
        number("params_b", "Params", "Shape", "B", 1),
        number("active_b", "Active", "Shape", "B", 1),
        number("size_gib", "4-bit size", "Shape", "GiB", 1),
        number("context", "Context", "Shape", "tok", 0, { planned: true }),
        text("license", "License", "Identity", { planned: true }),
        text("schemes", "Quantizations", "Weights", { code: true }),
        number("artifacts", "Weight files", "Weights", "", 0),
        text("base_model", "Source", "Identity", { code: true }),
        number("_results", "Results", "Coverage", "", 0),
      ],
    },

    workloads: {
      label: "Workloads",
      section: "catalog",
      filters: [],
      columns: [
        text("label", "Workload", "Identity"),
        number("concurrency", "Parallel requests", "Shape", "", 0),
        number("prompt_tokens", "Prompt", "Shape", "tok", 0),
        number("output_tokens", "Output", "Shape", "tok", 0),
        text("benchmark", "Benchmark", "Identity", { code: true }),
        number("_results", "Results", "Coverage", "", 0),
      ],
    },
  };
})();
