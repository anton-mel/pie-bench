window.Pie = window.Pie || {};

(() => {
  const element = document.getElementById("popover");
  const RELEASE = "release";
  let owner = null;
  let onPick = () => {};

  const check = (selected) => `<span class="popover-check">${selected ? "✓" : ""}</span>`;

  const option = (value, selected, label) => `
    <button class="popover-option" type="button" role="menuitemradio" aria-checked="${selected}" data-value="${Pie.format.escape(value)}">
      ${check(selected)}${label}
    </button>`;

  const releaseMenu = (state) =>
    `<div class="popover-heading">pie release</div>` +
    Pie.query.releaseOptions()
      .map((release) => option(release.id, release.id === state.release, Pie.format.escape(release.title)))
      .join("");

  const filterMenu = (state, key) => {
    const column = Pie.schema[state.table].columns.find((entry) => entry.key === key);
    const current = state.filters[key];
    const all = option("", !current, `All ${column.label.toLowerCase()}`);
    const values = Pie.query.filterValues(state.table, key)
      .map((entry) => option(entry.value, current === entry.value, Pie.format.option(column, entry.value)))
      .join("");
    return `${all}<div class="popover-separator"></div>${values}`;
  };

  const place = (anchor) => {
    const box = anchor.getBoundingClientRect();
    element.hidden = false;
    element.style.left = `${Math.min(box.left, window.innerWidth - element.offsetWidth - 8)}px`;
    element.style.top = `${box.bottom + 6}px`;
  };

  Pie.popover = {
    RELEASE,

    isOpenFor(key) {
      return owner === key && !element.hidden;
    },

    open(anchor, key, state) {
      if (this.isOpenFor(key)) {
        this.close();
        return;
      }
      owner = key;
      element.innerHTML = key === RELEASE ? releaseMenu(state) : filterMenu(state, key);
      place(anchor);
    },

    close() {
      element.hidden = true;
      owner = null;
    },

    onPick(handler) {
      onPick = handler;
    },

    bind() {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        const target = event.target.closest("[data-value]");
        if (!target) return;
        const key = owner;
        this.close();
        onPick(key, target.dataset.value);
      });
    },
  };
})();
