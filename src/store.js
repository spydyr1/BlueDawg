// src/store.js
const KEY = 'bluedawg-projects';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function saveAll(projects) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

function newProject() {
  return {
    id: crypto.randomUUID(),
    name: 'New Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    unit: 'imperial',
    polygon: { vertices: [], fillets: {} },
    pattern: 'random',
    layout: null,
  };
}

export const store = {
  list() {
    const all = loadAll();
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  create() {
    const p = newProject();
    const all = loadAll();
    all[p.id] = p;
    saveAll(all);
    return p;
  },

  load(id) {
    return loadAll()[id] || null;
  },

  save(project) {
    project.updatedAt = Date.now();
    const all = loadAll();
    all[project.id] = project;
    saveAll(all);
  },

  delete(id) {
    const all = loadAll();
    delete all[id];
    saveAll(all);
  },

  duplicate(id) {
    const src = loadAll()[id];
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = crypto.randomUUID();
    copy.name = src.name + ' (copy)';
    copy.createdAt = copy.updatedAt = Date.now();
    const all = loadAll();
    all[copy.id] = copy;
    saveAll(all);
    return copy;
  },

  exportJSON(project) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/\s+/g, '-')}.bluedawg.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const project = JSON.parse(e.target.result);
          project.id = crypto.randomUUID();
          project.name = project.name + ' (imported)';
          project.updatedAt = Date.now();
          const all = loadAll();
          all[project.id] = project;
          saveAll(all);
          resolve(project);
        } catch { reject(new Error('Invalid file')); }
      };
      reader.readAsText(file);
    });
  },
};
