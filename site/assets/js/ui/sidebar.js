window.Pie = window.Pie || {};

(() => {
  const nav = document.getElementById("sidebar-nav");
  const logo = document.querySelector(".sidebar-logo");

  const item = (id, schema, selected) => `
    <button class="sidebar-item${selected ? " is-selected" : ""}" type="button" data-table="${id}" aria-current="${selected}">
      ${Pie.icon(id)}
      <span>${schema.label}</span>
      <span class="sidebar-count">${Pie.store.rows(id).length}</span>
    </button>`;

  const section = (section, current) => {
    const items = Object.entries(Pie.schema)
      .filter(([, schema]) => schema.section === section.id)
      .map(([id, schema]) => item(id, schema, id === current))
      .join("");
    return `<div class="sidebar-heading">${section.label}</div>${items}`;
  };

  Pie.sidebar = {
    render(state) {
      nav.innerHTML = Pie.sections.map((entry) => section(entry, state.table)).join("");
    },

    spinLogo() {
      logo.classList.remove("is-spinning");
      void logo.getBoundingClientRect();
      logo.classList.add("is-spinning");
    },

    bindLogo() {
      logo.addEventListener("animationend", () => logo.classList.remove("is-spinning"));
      logo.addEventListener("mouseenter", () => {
        if (!logo.classList.contains("is-spinning")) logo.classList.add("is-spinning");
      });
      this.spinLogo();
    },

    onSelect(handler) {
      nav.addEventListener("click", (event) => {
        const target = event.target.closest("[data-table]");
        if (target) handler(target.dataset.table);
      });
    },
  };
})();
