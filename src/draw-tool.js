// src/draw-tool.js
import { Renderer } from './renderer.js';
import { parseIn, formatIn } from './imperial.js';
import { dist, polygonArea, polygonPerimeter } from './geometry.js';
import { store } from './store.js';
import { goHome } from './main.js';
import { generateLayout } from './layout-engine.js';
import { renderMaterialList } from './material-list.js';

const SNAP_DIST_PX = 12; // pixels for snap-to-first-point

let renderer, project, tool = 'draw';
let drawing = false;
let rubberPt = null;
let dragAnchor = null, panStart = null;
let hoveredVertex = -1;

const canvas = document.getElementById('main-canvas');
const dimOverlay = document.getElementById('dim-input-overlay');
const dimInput = document.getElementById('dim-input');
const dimHint = document.getElementById('dim-input-hint');
const filletOverlay = document.getElementById('fillet-overlay');
const filletInput = document.getElementById('fillet-input');
const statusArea = document.getElementById('status-area');
const statusPerim = document.getElementById('status-perim');
const statusHint = document.getElementById('status-hint');
const resultsPanel = document.getElementById('results-panel');

// Canvas and fillet listeners are attached once at module load (canvas never changes)
let _listenersAttached = false;

export function initEditor(proj) {
  project = proj;
  if (!renderer) renderer = new Renderer(canvas);
  tool = 'draw';
  drawing = false;
  rubberPt = null;

  document.getElementById('project-name').value = project.name;
  document.getElementById('project-name').oninput = e => {
    project.name = e.target.value;
    store.save(project);
  };

  // Unit toggle
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === project.unit);
    btn.onclick = () => {
      project.unit = btn.dataset.unit;
      document.querySelectorAll('.unit-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.unit === project.unit));
      store.save(project);
      render();
    };
  });

  // Tool buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.onclick = () => setTool(btn.dataset.tool);
  });
  document.getElementById('btn-undo').onclick = undo;

  // Pattern buttons
  document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pattern === project.pattern);
    btn.onclick = () => {
      project.pattern = btn.dataset.pattern;
      document.querySelectorAll('.pattern-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.pattern === project.pattern));
    };
  });

  document.getElementById('btn-generate').onclick = runGenerate;
  document.getElementById('btn-regenerate').onclick = runGenerate;
  document.getElementById('btn-save').onclick = () => store.save(project);
  document.getElementById('btn-export-json').onclick = () => store.exportJSON(project);
  document.getElementById('btn-print').onclick = () =>
    import('./print.js').then(m => m.printLayout(project, renderer));

  if (!_listenersAttached) {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    document.getElementById('fillet-confirm').onclick = applyFillet;
    document.getElementById('fillet-remove').onclick = removeFillet;
    filletInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyFillet(); });
    _listenersAttached = true;
  }

  if (project.layout) {
    showResults();
  } else {
    resultsPanel.classList.add('hidden');
  }

  render();
}

function setTool(t) {
  tool = t;
  canvas.style.cursor = t === 'draw' ? 'crosshair' : 'grab';
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === t));
}

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function snapToFirst(canvasPt) {
  const verts = project.polygon.vertices;
  if (verts.length < 3) return null;
  const firstC = renderer.toCanvas(verts[0].x, verts[0].y);
  if (dist(canvasPt, firstC) < SNAP_DIST_PX) return verts[0];
  return null;
}

function findNearestVertex(canvasPt) {
  const verts = project.polygon.vertices;
  for (let i = 0; i < verts.length; i++) {
    const cp = renderer.toCanvas(verts[i].x, verts[i].y);
    if (dist(canvasPt, cp) < SNAP_DIST_PX) return i;
  }
  return -1;
}

function onMouseDown(e) {
  const cp = getCanvasPoint(e);
  if (tool === 'pan') { dragAnchor = cp; panStart = { ...renderer.pan }; return; }
  if (tool !== 'draw') return;

  const poly = project.polygon;

  // If polygon is closed, clicking a vertex opens fillet UI
  if (!drawing && poly.vertices.length >= 3) {
    const idx = findNearestVertex(cp);
    if (idx >= 0) { openFilletUI(idx); return; }
  }

  const snapped = snapToFirst(cp);
  if (snapped) {
    drawing = false;
    dimOverlay.classList.add('hidden');
    render();
    updateStatus();
    return;
  }

  if (!drawing) drawing = true;

  if (poly.vertices.length > 0) {
    const prev = poly.vertices[poly.vertices.length - 1];
    const world = renderer.toWorld(cp.x, cp.y);
    const angle = Math.atan2(world.y - prev.y, world.x - prev.x);
    showDimInput(prev, angle);
  } else {
    poly.vertices.push(renderer.toWorld(cp.x, cp.y));
    render();
    updateStatus();
  }
}

function onMouseMove(e) {
  const cp = getCanvasPoint(e);
  if (tool === 'pan' && dragAnchor) {
    renderer.pan.x = panStart.x + (cp.x - dragAnchor.x);
    renderer.pan.y = panStart.y + (cp.y - dragAnchor.y);
    render();
    return;
  }
  rubberPt = renderer.toWorld(cp.x, cp.y);
  hoveredVertex = findNearestVertex(cp);
  render();
}

function onMouseUp() { dragAnchor = null; }

function onDblClick() {
  if (drawing && project.polygon.vertices.length >= 3) {
    drawing = false;
    dimOverlay.classList.add('hidden');
    render();
    updateStatus();
  }
}

let _pendingAngle = 0, _pendingPrev = null;

function showDimInput(prev, angle) {
  _pendingPrev = prev;
  _pendingAngle = angle;
  dimOverlay.classList.remove('hidden');
  dimInput.value = '';
  dimInput.focus();
  dimHint.textContent = 'e.g. 12\' 6 3/4"  then Enter';

  dimInput.onkeydown = e => {
    if (e.key === 'Enter') {
      try {
        const len = parseIn(dimInput.value);
        if (len <= 0) return;
        const newPt = {
          x: _pendingPrev.x + Math.cos(_pendingAngle) * len,
          y: _pendingPrev.y + Math.sin(_pendingAngle) * len,
        };
        project.polygon.vertices.push(newPt);
        dimOverlay.classList.add('hidden');
        render();
        updateStatus();
      } catch {
        dimInput.style.outline = '2px solid #e74c3c';
        setTimeout(() => dimInput.style.outline = '', 600);
      }
    }
    if (e.key === 'Escape') {
      dimOverlay.classList.add('hidden');
      drawing = false;
      render();
    }
  };
}

function undo() {
  const poly = project.polygon;
  if (poly.vertices.length > 0) {
    poly.vertices.pop();
    if (poly.vertices.length === 0) drawing = false;
  }
  render();
  updateStatus();
}

let _filletTargetIdx = -1;

function openFilletUI(idx) {
  _filletTargetIdx = idx;
  filletInput.value = project.polygon.fillets[idx]
    ? formatIn(project.polygon.fillets[idx]) : '';
  filletOverlay.classList.remove('hidden');
  filletInput.focus();
}

function applyFillet() {
  try {
    const r = parseIn(filletInput.value);
    if (r > 0) {
      project.polygon.fillets[_filletTargetIdx] = r;
    }
    filletOverlay.classList.add('hidden');
    render();
  } catch {
    filletInput.style.outline = '2px solid #e74c3c';
    setTimeout(() => filletInput.style.outline = '', 600);
  }
}

function removeFillet() {
  delete project.polygon.fillets[_filletTargetIdx];
  filletOverlay.classList.add('hidden');
  render();
}

function render() {
  renderer.clear();
  renderer.drawPolygon(project.polygon, drawing ? rubberPt : null);
  if (project.layout && renderer.drawLayout) {
    renderer.drawLayout(project.layout, project.polygon);
  }
  if (hoveredVertex >= 0 && project.polygon.vertices[hoveredVertex]) {
    renderer.highlightVertex(project.polygon.vertices[hoveredVertex]);
  }
}

function updateStatus() {
  const verts = project.polygon.vertices;
  if (verts.length >= 3) {
    const areaSqIn = polygonArea(verts);
    const areaSqFt = (areaSqIn / 144).toFixed(1);
    const perim = formatIn(polygonPerimeter(verts));
    statusArea.textContent = `Area: ${areaSqFt} sq ft`;
    statusPerim.textContent = `Perimeter: ${perim}`;
    statusHint.textContent = `${verts.length} corners · click a corner to fillet`;
  } else {
    statusArea.textContent = 'Area: —';
    statusPerim.textContent = 'Perimeter: —';
    statusHint.textContent = verts.length === 0
      ? 'Click to place first corner'
      : 'Click and type dimension, Enter to confirm';
  }
}

async function runGenerate() {
  if (project.polygon.vertices.length < 3) {
    alert('Draw the patio outline first.');
    return;
  }
  project.layout = generateLayout(project.polygon, project.pattern);
  store.save(project);
  showResults();
  render();
}

function showResults() {
  resultsPanel.classList.remove('hidden');
  renderMaterialList(project.layout,
    document.getElementById('material-table-container'),
    document.getElementById('cut-notes-container'));
}
