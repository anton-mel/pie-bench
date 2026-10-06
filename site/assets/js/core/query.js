window.Pie = window.Pie || {};

(() => {
  const { store, format, engines } = Pie;
  const EARLIEST = "0000";
  const LATEST = "9999";

  const releaseOf = (row) => row.released || EARLIEST;

  const releaseOptions = () => {
    const counts = {};
    for (const row of store.tables.results) {
      if (engines.isPrimary(row.engine)) {
        counts[row.group] = (counts[row.group] || 0) + 1;
      }
    }

    const latestMain = store.tables.results
      .filter((row) => engines.isPrimary(row.engine) && row.group === "main")
      .map((row) => row.release)
      .sort((a, b) => Number(a.split("+")[1]) - Number(b.split("+")[1]))
      .at(-1);

    const main = {
      id: "main",
      label: "Latest",
      title: latestMain ? `Latest (${latestMain})` : "Latest",
      runs: counts.main || 0,
    };
    const tagged = store.tables.releases.map((release) => ({
      id: release.id,
      label: release.id,
      title: `${release.id} — ${format.date(release.date)}`,
      runs: counts[release.id] || 0,
    }));

    return [main, ...tagged].filter((option) => option.runs > 0);
  };

  const comparableResults = (release) => {
    const cutoff = store.tables.releases.find((tag) => tag.id === release)?.date || LATEST;
    const newest = {};

    for (const row of store.tables.results) {
      if (engines.isPrimary(row.engine) || releaseOf(row) > cutoff) continue;
      const key = [row.hardware, row.engine, row.model, row.workload].join("|");
      if (!newest[key] || releaseOf(row) > releaseOf(newest[key])) {
        newest[key] = row;
      }
    }

    const competitors = new Set(Object.values(newest));
    return store.tables.results.filter((row) =>
      engines.isPrimary(row.engine) ? row.group === release : competitors.has(row));
  };

  const matchesSearch = (row, columns, query) => {
    if (!query) return true;
    return columns.some((column) => {
      const value = row[column.key];
      if (format.isEmpty(value)) return false;
      const text = column.type === "reference" ? store.names.of(column.table, value) : value;
      return String(text).toLowerCase().includes(query);
    });
  };

  const matchesFilters = (row, filters) =>
    Object.entries(filters).every(([key, value]) => !value || String(row[key]) === value);

  const compare = (key, direction) => (a, b) => {
    const emptyOrder = format.isEmpty(a[key]) - format.isEmpty(b[key]);
    if (emptyOrder) return emptyOrder;
    if (a[key] < b[key]) return -direction;
    if (a[key] > b[key]) return direction;
    return 0;
  };

  const visibleRows = (state) => {
    const schema = Pie.schema[state.table];
    const source = state.table === "results" ? comparableResults(state.release) : store.rows(state.table);
    const query = state.query.trim().toLowerCase();

    const rows = source.filter((row) => matchesFilters(row, state.filters) && matchesSearch(row, schema.columns, query));
    return state.sort ? [...rows].sort(compare(state.sort.key, state.sort.direction)) : rows;
  };

  const filterValues = (table, key) => {
    const counts = {};
    for (const row of store.rows(table)) {
      if (!format.isEmpty(row[key])) {
        counts[row[key]] = (counts[row[key]] || 0) + 1;
      }
    }

    const order = (a, b) => {
      if (key === "engine") return (a !== engines.primary) - (b !== engines.primary) || a.localeCompare(b);
      if (key === "workload") return store.index.workloads[a].concurrency - store.index.workloads[b].concurrency;
      return a.localeCompare(b);
    };

    return Object.keys(counts).sort(order).map((value) => ({ value, count: counts[value] }));
  };

  Pie.query = {
    releaseOptions,
    comparableResults,
    visibleRows,
    filterValues,
  };
})();
