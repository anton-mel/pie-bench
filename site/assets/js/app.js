(() => {
  const { state, store, query, sidebar, toolbar, popover, filters, table, preferences } = Pie;

  const ensureRelease = () => {
    const options = query.releaseOptions();
    if (!options.some((option) => option.id === state.release)) {
      state.release = options[0]?.id || "main";
    }
  };

  const render = () => {
    ensureRelease();
    const rows = query.visibleRows(state);
    sidebar.render(state);
    toolbar.render(state, rows.length, store.rows(state.table).length);
    filters.render(state);
    table.render(state, rows);
  };

  const navigate = (tableName, initialFilters = {}) => {
    state.reset(tableName, initialFilters);
    toolbar.clearSearch();
    popover.close();
    render();
  };

  const bindToolbar = () => {
    const { elements } = toolbar;

    elements.sidebarToggle.addEventListener("click", () => preferences.toggleSidebar());
    elements.themeToggle.addEventListener("click", () => preferences.toggleTheme());

    elements.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    elements.releasePicker.addEventListener("click", (event) => {
      event.stopPropagation();
      popover.open(elements.releasePicker, popover.RELEASE, state);
    });
  };

  const bindFilters = () => {
    filters.onOpen((anchor, key) => popover.open(anchor, key, state));


    filters.hideEmpty.addEventListener("click", () => {
      state.hideEmpty = !state.hideEmpty;
      render();
    });

    popover.bind();
    popover.onPick((key, value) => {
      if (key === popover.RELEASE) {
        state.release = value;
      } else {
        state.setFilter(key, value);
      }
      render();
    });
  };

  const bindTable = () => {
    table.onSort((key) => {
      state.cycleSort(key);
      render();
    });
    table.onShowResults((key, value) => navigate("results", { [key]: value }));
    table.container.addEventListener("scroll", () => popover.close());
  };

  const bindGlobal = () => {
    sidebar.onSelect((tableName) => navigate(tableName));
    sidebar.bindLogo();

    document.addEventListener("click", () => popover.close());
    window.addEventListener("resize", () => popover.close());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") popover.close();
      if (event.ctrlKey && event.metaKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        preferences.toggleSidebar();
      }
      if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
        event.preventDefault();
        toolbar.focusSearch();
      }
    });
  };

  bindToolbar();
  bindFilters();
  bindTable();
  bindGlobal();
  render();
})();
