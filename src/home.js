// src/home.js
import { store } from './store.js';
import { polygonArea } from './geometry.js';

export function renderHome(onOpen) {
  const list = document.getElementById('project-list');
  const projects = store.list();

  if (!projects.length) {
    list.innerHTML = '<p style="color:#888;padding:16px">No saved projects. Click + New Project to start.</p>';
    return;
  }

  list.innerHTML = '';
  projects.forEach(p => {
    const area = p.polygon.vertices.length >= 3
      ? Math.round(polygonArea(p.polygon.vertices) / 144) + ' sq ft'
      : '—';
    const date = new Date(p.updatedAt).toLocaleDateString();

    const card = document.createElement('div');
    card.className = 'project-card';

    const info = document.createElement('div');
    info.className = 'project-card-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'project-card-name';
    nameEl.textContent = p.name;
    const metaEl = document.createElement('div');
    metaEl.className = 'project-card-meta';
    metaEl.textContent = `${area} · ${date}`;
    info.append(nameEl, metaEl);

    const actions = document.createElement('div');
    actions.className = 'project-card-actions';
    const dupBtn = document.createElement('button');
    dupBtn.className = 'btn-ghost btn-dup';
    dupBtn.dataset.id = p.id;
    dupBtn.textContent = 'Duplicate';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-ghost btn-del';
    delBtn.dataset.id = p.id;
    delBtn.style.cssText = 'color:#e74c3c;border-color:#e74c3c';
    delBtn.textContent = 'Delete';
    actions.append(dupBtn, delBtn);

    card.append(info, actions);
    card.addEventListener('click', e => {
      if (!e.target.closest('.project-card-actions')) onOpen(p.id);
    });
    dupBtn.addEventListener('click', e => {
      e.stopPropagation();
      store.duplicate(p.id);
      renderHome(onOpen);
    });
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete "${p.name}"?`)) { store.delete(p.id); renderHome(onOpen); }
    });
    list.appendChild(card);
  });

  // Import via file picker — only add once
  if (!document.getElementById('import-btn')) {
    const importBtn = document.createElement('button');
    importBtn.id = 'import-btn';
    importBtn.className = 'btn-ghost';
    importBtn.textContent = '⬆ Import JSON';
    importBtn.style.marginTop = '8px';
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async e => {
        await store.importJSON(e.target.files[0]);
        renderHome(onOpen);
      };
      input.click();
    });
    list.appendChild(importBtn);
  }
}
