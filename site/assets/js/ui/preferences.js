window.Pie = window.Pie || {};

(() => {
  const root = document.documentElement;

  const save = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      return;
    }
  };

  const toggle = (attribute, storageKey, on, off) => {
    const next = root.dataset[attribute] === on ? off : on;
    root.dataset[attribute] = next;
    save(storageKey, next);
  };

  Pie.preferences = {
    toggleTheme() {
      toggle("theme", "theme", "dark", "light");
    },

    toggleSidebar() {
      toggle("sidebar", "sidebar", "hidden", "shown");
      if (root.dataset.sidebar === "shown") Pie.sidebar.spinLogo();
    },
  };
})();
