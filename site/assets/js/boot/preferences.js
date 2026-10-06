(() => {
  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;

  root.dataset.theme = read("theme") || (prefersDark ? "dark" : "light");
  root.dataset.sidebar = read("sidebar") || "shown";
})();
