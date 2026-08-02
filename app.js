import {
  createTask,
  findTask,
  updateTask,
  addChildTask,
  removeTask,
  moveTask,
  flattenTasks
} from './treeLogic.js';

const state = {
  timelineStart: new Date(2026, 7, 1),
  days: 14,
  tasks: [
    createTask({ id: 'root', name: 'Progetto', start: 0, duration: 4, children: [
      createTask({ id: 'task-1', name: 'Concept', start: 0, duration: 3, color: '#38bdf8' }),
      createTask({ id: 'task-2', name: 'Produzione', start: 3, duration: 4, color: '#818cf8' })
    ] }),
    createTask({ id: 'task-3', name: 'Post', start: 8, duration: 3, color: '#34d399' })
  ]
};

let nextId = 4;
let dragTargetId = null;

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDateInput(value) {
  const pickedDate = new Date(`${value}T12:00:00`);
  const diffDays = Math.round((pickedDate - state.timelineStart) / 86400000);
  return clamp(diffDays, 0, state.days - 1);
}

function renderTimeline() {
  const container = document.getElementById('timelineHeader');
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${state.days}, minmax(0, 1fr))`;

  for (let index = 0; index < state.days; index += 1) {
    const day = addDays(state.timelineStart, index);
    const cell = document.createElement('div');
    cell.className = 'timeline-cell';
    cell.innerHTML = `<span>${day.toLocaleDateString('it-IT', { weekday: 'short' })}</span><strong>${day.getDate()}</strong>`;
    container.appendChild(cell);
  }
}

function renderTree() {
  const container = document.getElementById('treeView');
  container.innerHTML = '';

  function renderNode(node, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';
    wrapper.dataset.taskId = node.id;
    wrapper.draggable = true;
    wrapper.title = 'Trascina per spostare questo task';
    wrapper.innerHTML = `
      <div class="tree-node-header">
        <span style="width:${depth * 16}px"></span>
        <input class="tree-node-name" data-task-id="${node.id}" value="${escapeHtml(node.name)}" />
        <div class="tree-node-actions">
          <button data-add-child="${node.id}" aria-label="Aggiungi sotto-task">＋</button>
          <button data-remove-task="${node.id}" aria-label="Rimuovi task">×</button>
        </div>
      </div>
      <div class="tree-node-fields">
        <label>
          Inizio
          <input type="date" class="tree-start" data-task-id="${node.id}" value="${formatDate(addDays(state.timelineStart, node.start))}" />
        </label>
        <label>
          Durata (gg)
          <input type="number" class="tree-duration" data-task-id="${node.id}" min="1" max="${state.days}" value="${node.duration}" />
        </label>
      </div>
    `;

    if (node.children.length) {
      const childrenWrapper = document.createElement('div');
      childrenWrapper.className = 'tree-node-children';
      node.children.forEach((child) => childrenWrapper.appendChild(renderNode(child, depth + 1)));
      wrapper.appendChild(childrenWrapper);
    }

    return wrapper;
  }

  state.tasks.forEach((task) => container.appendChild(renderNode(task)));
}

function renderGantt() {
  const container = document.getElementById('ganttRows');
  container.innerHTML = '';

  const allTasks = flattenTasks(state.tasks);
  allTasks.forEach((task) => {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    row.innerHTML = `
      <div class="gantt-label">${escapeHtml(task.name)}</div>
      <div class="gantt-track">
        <div class="gantt-bar" data-task-id="${task.id}" style="left: ${(task.start / state.days) * 100}%; width: ${(task.duration / state.days) * 100}%; background: linear-gradient(135deg, ${task.color}, #34d399);">
          <div class="bar-handle"></div>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderSummary() {
  const label = document.getElementById('summaryLabel');
  const allTasks = flattenTasks(state.tasks);
  label.textContent = `${allTasks.length} task • ${allTasks.reduce((total, task) => total + task.duration, 0)} giorni totali`;
}

function renderZoom() {
  const label = document.getElementById('zoomLabel');
  label.textContent = `${state.days} giorni`;
}

function render() {
  renderTimeline();
  renderTree();
  renderGantt();
  renderSummary();
  renderZoom();
}

function addTask() {
  state.tasks.push(createTask({ id: `task-${nextId}`, name: `Task ${nextId}`, start: 0, duration: 2, color: '#38bdf8' }));
  nextId += 1;
  render();
}

function addSubtaskFor(nodeId) {
  const task = findTask(state.tasks, nodeId);
  if (!task) {
    return;
  }

  addChildTask(state.tasks, nodeId);
  render();
}

function removeTaskFromTree(taskId) {
  state.tasks = removeTask(state.tasks, taskId);
  render();
}

function updateTaskInTree(taskId, field, value) {
  const task = findTask(state.tasks, taskId);
  if (!task) {
    return;
  }

  if (field === 'name') {
    task.name = value;
  }

  if (field === 'start') {
    task.start = parseDateInput(value);
  }

  if (field === 'duration') {
    task.duration = clamp(Number(value), 1, state.days - task.start);
  }

  render();
}

function resetExample() {
  state.tasks = [
    createTask({ id: 'root', name: 'Progetto', start: 0, duration: 4, children: [
      createTask({ id: 'task-1', name: 'Concept', start: 0, duration: 3, color: '#38bdf8' }),
      createTask({ id: 'task-2', name: 'Produzione', start: 3, duration: 4, color: '#818cf8' })
    ] }),
    createTask({ id: 'task-3', name: 'Post', start: 8, duration: 3, color: '#34d399' })
  ];
  nextId = 4;
  render();
}

function zoomBy(delta) {
  state.days = clamp(state.days + delta, 7, 30);
  render();
}

function attachEvents() {
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('addSubtaskBtn').addEventListener('click', () => {
    const firstTask = state.tasks[0];
    if (firstTask) {
      addChildTask(state.tasks, firstTask.id);
      render();
    }
  });
  document.getElementById('resetBtn').addEventListener('click', resetExample);
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoomBy(-1));
  document.getElementById('zoomInBtn').addEventListener('click', () => zoomBy(1));

  document.getElementById('treeView').addEventListener('input', (event) => {
    const target = event.target;
    if (target.classList.contains('tree-node-name')) {
      updateTaskInTree(target.dataset.taskId, 'name', target.value);
      return;
    }

    if (target.classList.contains('tree-start')) {
      updateTaskInTree(target.dataset.taskId, 'start', target.value);
      return;
    }

    if (target.classList.contains('tree-duration')) {
      updateTaskInTree(target.dataset.taskId, 'duration', target.value);
    }
  });

  document.getElementById('treeView').addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-child]');
    if (addButton) {
      addSubtaskFor(addButton.dataset.addChild);
      return;
    }

    const removeButton = event.target.closest('[data-remove-task]');
    if (removeButton) {
      removeTaskFromTree(removeButton.dataset.removeTask);
    }
  });

  document.getElementById('treeView').addEventListener('dragstart', (event) => {
    const node = event.target.closest('.tree-node');
    if (!node) {
      return;
    }
    dragTargetId = node.dataset.taskId;
    event.dataTransfer.effectAllowed = 'move';
  });

  document.getElementById('treeView').addEventListener('dragover', (event) => {
    if (event.target.closest('.tree-node')) {
      event.preventDefault();
    }
  });

  document.getElementById('treeView').addEventListener('drop', (event) => {
    const targetNode = event.target.closest('.tree-node');
    if (!targetNode || !dragTargetId) {
      return;
    }

    event.preventDefault();
    state.tasks = moveTask(state.tasks, dragTargetId, targetNode.dataset.taskId);
    dragTargetId = null;
    render();
  });

  document.getElementById('ganttRows').addEventListener('pointerdown', (event) => {
    const bar = event.target.closest('.gantt-bar');
    if (!bar) {
      return;
    }

    const taskId = bar.dataset.taskId;
    const task = findTask(state.tasks, taskId);
    if (!task) {
      return;
    }

    const track = bar.parentElement;
    const trackWidth = track.getBoundingClientRect().width;
    const pxPerDay = trackWidth / state.days;
    const startX = event.clientX;
    const originalStart = task.start;
    const originalDuration = task.duration;
    const isResize = event.target.classList.contains('bar-handle');
    bar.classList.add('dragging');

    const onMove = (moveEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaDays = Math.round(deltaPx / pxPerDay);

      if (isResize) {
        task.duration = clamp(originalDuration + deltaDays, 1, state.days - task.start);
      } else {
        task.start = clamp(originalStart + deltaDays, 0, state.days - originalDuration);
      }

      render();
    };

    const onUp = () => {
      bar.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

attachEvents();
render();
