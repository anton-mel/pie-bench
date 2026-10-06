window.Pie = window.Pie || {};

(() => {
  const list = document.getElementById("filter-list");
  const hideEmpty = document.getElementById("hide-empty");

  const filter = (column, value) => {
    const chevron = '<svg class="popup-chevron" viewBox="0 0 10 14" aria-hidden="true"><path d="M2 5l3-3 3 3M2 9l3 3 3-3"/></svg>';
    const label = value ? Pie.format.option(column, value) : `${column.label}${chevron}`;
    return `
      <span class="filter${value ? " is-set" : ""}">
        <button class="filter-button" type="button" data-filter="${column.key}" aria-haspopup="menu">${label}</button>
      </span>`;
  };

  Pie.filters = {
    hideEmpty,

    render(state) {
      const schema = Pie.schema[state.table];
      list.innerHTML = schema.filters
        .map((key) => filter(schema.columns.find((column) => column.key === key), state.filters[key]))
        .join("");
      hideEmpty.classList.toggle("is-active", state.hideEmpty);
    },

    onOpen(handler) {
      list.addEventListener("click", (event) => {
        event.stopPropagation();
        const button = event.target.closest("[data-filter]");
        if (button) handler(button, button.dataset.filter);
      });
    },
  };
})();
