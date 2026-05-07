import { renderHome } from './home.js';
import { initEditor } from './draw-tool.js';
import { store } from './store.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const screens = {
  home: document.getElementById('screen-home'),
  editor: document.getElementById('screen-editor'),
};

export function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

export function openEditor(projectId) {
  const project = store.load(projectId);
  initEditor(project);
  showScreen('editor');
}

export function goHome() {
  showScreen('home');
  renderHome(openEditor);
}

document.getElementById('btn-new-project').addEventListener('click', () => {
  const project = store.create();
  openEditor(project.id);
});

document.getElementById('btn-back').addEventListener('click', goHome);

goHome();
