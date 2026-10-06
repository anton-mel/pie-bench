window.Pie = window.Pie || {};

Pie.engines = {
  primary: "pie",

  colors: {
    pie: "var(--color-engine-pie)",
    llamacpp: "var(--color-engine-llamacpp)",
    mlxlm: "var(--color-engine-mlxlm)",
    ollama: "var(--color-engine-ollama)",
    splash: "var(--color-engine-splash)",
    vllm: "var(--color-engine-vllm)",
    sglang: "var(--color-engine-sglang)",
  },

  colorOf(id) {
    return this.colors[id] || "var(--color-engine-default)";
  },

  isPrimary(id) {
    return id === this.primary;
  },
};
