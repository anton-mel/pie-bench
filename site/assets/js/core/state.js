window.Pie = window.Pie || {};

Pie.state = {
  table: "results",
  release: "main",
  query: "",
  filters: {},
  sort: null,
  hideEmpty: false,

  reset(table, filters = {}) {
    this.table = table;
    this.filters = { ...filters };
    this.sort = null;
    this.query = "";
  },

  setFilter(key, value) {
    if (value) {
      this.filters[key] = value;
    } else {
      delete this.filters[key];
    }
  },

  cycleSort(key) {
    if (this.sort?.key !== key) {
      this.sort = { key, direction: 1 };
    } else if (this.sort.direction > 0) {
      this.sort = { key, direction: -1 };
    } else {
      this.sort = null;
    }
  },
};
