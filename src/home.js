// src/home.js
import { store } from './store.js';
import { formatIn } from './imperial.js';
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
    card.innerHTML = `
      <div class="project-card-info">
        <div class="project-card-name">${p.name}</div>
        <div class="project-card-meta">${area} · ${date}</div>
      </div>
      <div class="project-card-actions">
        <button class="btn-ghost btn-dup" data-id="${p.id}">Duplicate</button>
        <button class="btn-ghost btn-del" data-id="${p.id}" style="color:#e74c3c;border-color:#e74c3c">Delete</button>
      </div>
    `;
    card.addEventListener('click', e => {
      if (!e.target.closest('.project-card-actions')) onOpen(p.id);
    });
    card.querySelector('.btn-dup').addEventListener('click', e => {
      e.stopPropagation();
      store.duplicate(p.id);
      renderHome(onOpen);
    });
    card.querySelector('.btn-del').addEventListener('click', e => {
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
