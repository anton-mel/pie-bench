window.Pie = window.Pie || {};

(() => {
  const tables = DB;

  const resultKeys = {
    hardware: "hardware",
    engines: "engine",
    models: "model",
    workloads: "workload",
  };

  const countResults = () => {
    for (const [table, key] of Object.entries(resultKeys)) {
      const counts = {};
      for (const row of tables.results) {
        counts[row[key]] = (counts[row[key]] || 0) + 1;
      }
      for (const row of tables[table]) {
        row._results = counts[row.id] || 0;
      }
    }
  };

  const indexById = (table) => Object.fromEntries(tables[table].map((row) => [row.id, row]));

  countResults();

  const index = {
    hardware: indexById("hardware"),
    engines: indexById("engines"),
    models: indexById("models"),
    workloads: indexById("workloads"),
  };

  const names = {
    engine: (id) => index.engines[id]?.name || id,
    model: (id) => index.models[id]?.name || id,
    workload: (id) => index.workloads[id]?.label || id,
    of(table, id) {
      if (table === "engines") return this.engine(id);
      if (table === "models") return this.model(id);
      if (table === "workloads") return this.workload(id);
      return id;
    },
  };

  Pie.store = {
    tables,
    index,
    names,
    resultKeys,

    rows(table) {
      return tables[table];
    },

    coverage(table, column) {
      const rows = tables[table];
      if (!rows.length) return 0;
      return rows.filter((row) => !Pie.format.isEmpty(row[column.key])).length / rows.length;
    },
  };
})();
