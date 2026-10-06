window.Pie = window.Pie || {};

Pie.icons = {
  results: '<path d="M4 5h16M4 12h16M4 19h16"/>',
  quality: '<path d="m5 12 4 4 10-10"/>',
  hardware: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  engines: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
  models: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 16 9 5 9-5"/>',
  workloads: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
};

Pie.icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${Pie.icons[name] || ""}</svg>`;
