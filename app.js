import {
  createTask,
  findTask,
  addChildTask,
  removeTask,
  moveTask,
  flattenTasks
} from './treeLogic.js';

const state = {
  timelineStart: new Date(2026, 7, 1),
  visibleDays: 14,
  consoleMessages: [],
  tasks: [
    createTask({
      id: 'root',
      name: 'Progetto',
      start: 0,
      duration: 4,
      children: [
        createTask({ id: 'task-1', name: 'Concept', start: 0, duration: 3, color: '#38bdf8' }),
        createTask({ id: 'task-2', name: 'Produzione', start: 3, duration: 4, color: '#818cf8' })
      ]
    }),
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

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
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
  return Math.round((pickedDate - state.timelineStart) / 86400000);
}

function getTimelineScale(visibleDays) {
  if (visibleDays <= 60) {
    return { name: 'day', label: 'giorni' };
  }

  if (visibleDays <= 780) {
    return { name: 'week', label: 'settimane' };
  }

  if (visibleDays <= 3650) {
    return { name: 'month', label: 'mesi' };
  }

  return { name: 'year', label: 'anni' };
}

function formatShortDate(date) {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function getTimelineBuckets() {
  const scale = getTimelineScale(state.visibleDays);
  const buckets = [];
  const end = addDays(state.timelineStart, state.visibleDays);
  let cursor = new Date(state.timelineStart);

  while (cursor < end) {
    let next;

    if (scale.name === 'day') {
      next = addDays(cursor, 1);
    } else if (scale.name === 'week') {
      next = addDays(cursor, 7);
    } else if (scale.name === 'month') {
      next = addMonths(cursor, 1);
    } else {
      next = addYears(cursor, 1);
    }

    if (next > end) {
      next = end;
    }

    buckets.push({ start: new Date(cursor), end: new Date(next) });
    cursor = next;
  }

  return { scale, buckets };
}

function formatBucketLabel(scale, start, end) {
  if (scale.name === 'day') {
    return {
      primary: start.getDate().toString(),
      secondary: start.toLocaleDateString('it-IT', { month: 'short' })
    };
  }

  if (scale.name === 'week') {
    return {
      primary: `W${Math.ceil((start.getDate() + 6) / 7)}`,
      secondary: `${formatShortDate(start)} · ${formatShortDate(end)}`
    };
  }

  if (scale.name === 'month') {
    return {
      primary: start.toLocaleDateString('it-IT', { month: 'short' }),
      secondary: start.getFullYear().toString()
    };
  }

  return {
    primary: start.getFullYear().toString(),
    secondary: ''
  };
}

function renderTimeline() {
  const container = document.getElementById('timelineHeader');
  if (!container) {
    return;
  }

  const { scale, buckets } = getTimelineBuckets();
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${buckets.length}, minmax(0, 1fr))`;

  buckets.forEach((bucket) => {
    const cell = document.createElement('div');
    cell.className = 'timeline-cell';
    const label = formatBucketLabel(scale, bucket.start, bucket.end);
    cell.innerHTML = `<span>${escapeHtml(label.secondary)}</span><strong>${escapeHtml(label.primary)}</strong>`;
    container.appendChild(cell);
  });
}

function getTaskVisualBounds(task) {
  const visibleStart = 0;
  const visibleEnd = state.visibleDays;
  const taskStart = task.start;
  const taskEnd = task.start + task.duration;
  const clampedStart = Math.max(taskStart, visibleStart);
  const clampedEnd = Math.min(taskEnd, visibleEnd);

  if (clampedEnd <= clampedStart) {
    return { left: 0, width: 0 };
  }

  return {
    left: (clampedStart / visibleEnd) * 100,
    width: ((clampedEnd - clampedStart) / visibleEnd) * 100
  };
}

function renderGantt() {
  const container = document.getElementById('ganttRows');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const allTasks = flattenTasks(state.tasks);
  allTasks.forEach((task) => {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    const bounds = getTaskVisualBounds(task);
    row.innerHTML = `
      <div class="gantt-label">${escapeHtml(task.name)}</div>
      <div class="gantt-track">
        <div class="gantt-bar" data-task-id="${task.id}" style="left: ${bounds.left}%; width: ${Math.max(bounds.width, 3)}%; background: linear-gradient(135deg, ${task.color}, #34d399);">
          <div class="bar-handle"></div>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function formatRangeLabel() {
  const start = state.timelineStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const end = addDays(state.timelineStart, state.visibleDays).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

function describeZoom() {
  const scale = getTimelineScale(state.visibleDays);
  if (scale.name === 'day') {
    return `${state.visibleDays} giorni`;
  }

  if (scale.name === 'week') {
    return `${Math.round(state.visibleDays / 7)} settimane`;
  }

  if (scale.name === 'month') {
    return `${Math.round(state.visibleDays / 30)} mesi`;
  }

  return `${Math.round(state.visibleDays / 365)} anni`;
}

function renderZoom() {
  const label = document.getElementById('zoomLabel');
  const rangeLabel = document.getElementById('timelineRangeLabel');
  if (label) {
    label.textContent = describeZoom();
  }

  if (rangeLabel) {
    rangeLabel.textContent = formatRangeLabel();
  }
}

function renderConsole() {
  const output = document.getElementById('consoleOutput');
  if (!output) {
    return;
  }

  output.innerHTML = '';

  if (!state.consoleMessages.length) {
    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = '<strong>&gt;</strong> help per vedere i comandi disponibili';
    output.appendChild(line);
    return;
  }

  state.consoleMessages.forEach((message) => {
    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = message;
    output.appendChild(line);
  });

  output.scrollTop = output.scrollHeight;
}

function render() {
  renderTimeline();
  renderGantt();
  renderZoom();
  renderConsole();
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

function resetExample() {
  state.tasks = [
    createTask({
      id: 'root',
      name: 'Progetto',
      start: 0,
      duration: 4,
      children: [
        createTask({ id: 'task-1', name: 'Concept', start: 0, duration: 3, color: '#38bdf8' }),
        createTask({ id: 'task-2', name: 'Produzione', start: 3, duration: 4, color: '#818cf8' })
      ]
    }),
    createTask({ id: 'task-3', name: 'Post', start: 8, duration: 3, color: '#34d399' })
  ];
  nextId = 4;
  render();
}

function zoomBy(delta) {
  if (delta < 0) {
    state.visibleDays = Math.min(3650, Math.round(state.visibleDays * 1.5));
  } else {
    state.visibleDays = Math.max(3, Math.round(state.visibleDays / 1.5));
  }
  render();
}

function findTaskByRef(nodes, ref) {
  const normalized = String(ref).trim().toLowerCase();
  for (const node of nodes) {
    if (node.id.toLowerCase() === normalized || node.name.toLowerCase() === normalized) {
      return node;
    }

    const child = findTaskByRef(node.children, ref);
    if (child) {
      return child;
    }
  }

  return null;
}

function formatTaskLine(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const children = node.children?.length ? ` [${node.children.length} figli]` : '';
  return `${indent}${node.name} (${node.start}-${node.start + node.duration - 1})${children}`;
}

function listTasks(nodes, depth = 0) {
  return nodes.flatMap((node) => [formatTaskLine(node, depth), ...listTasks(node.children, depth + 1)]);
}

function appendConsole(message) {
  state.consoleMessages.push(message);
  if (state.consoleMessages.length > 40) {
    state.consoleMessages = state.consoleMessages.slice(-40);
  }
  renderConsole();
}

function executeCommand(rawCommand) {
  const command = rawCommand.trim();
  if (!command) {
    return;
  }

  const parts = command.split(/\s+/);
  const action = parts[0].toLowerCase();

  try {
    if (action === 'help') {
      appendConsole('<strong>&gt;</strong> Comandi disponibili: help, list, show <nome>, add <nome>, addsub <genitore> <nome>, rename <nome> <nuovo>, start <nome> <yyyy-mm-dd>, dur <nome> <giorni>, remove <nome>, move <nome> <target>, zoom <giorni>, clear');
      return;
    }

    if (action === 'list') {
      const lines = listTasks(state.tasks);
      appendConsole('<strong>&gt;</strong> Struttura attuale:');
      lines.forEach((line) => appendConsole(`&nbsp;&nbsp;${escapeHtml(line)}`));
      return;
    }

    if (action === 'show') {
      const ref = parts.slice(1).join(' ');
      const task = findTaskByRef(state.tasks, ref);
      if (!task) {
        appendConsole(`<strong>&gt;</strong> Task non trovato: ${escapeHtml(ref)}`);
        return;
      }

      appendConsole(`<strong>&gt;</strong> ${escapeHtml(task.name)} | inizio ${task.start} | durata ${task.duration} | figli ${task.children.length}`);
      return;
    }

    if (action === 'add') {
      const name = parts.slice(1).join(' ');
      if (!name) {
        appendConsole('<strong>&gt;</strong> Uso: add <nome>');
        return;
      }
      state.tasks.push(createTask({ id: `task-${nextId}`, name, start: 0, duration: 2, color: '#38bdf8' }));
      nextId += 1;
      render();
      appendConsole(`<strong>&gt;</strong> Aggiunto task: ${escapeHtml(name)}`);
      return;
    }

    if (action === 'addsub') {
      const ref = parts[1];
      const name = parts.slice(2).join(' ');
      if (!ref || !name) {
        appendConsole('<strong>&gt;</strong> Uso: addsub <genitore> <nome>');
        return;
      }
      const parent = findTaskByRef(state.tasks, ref);
      if (!parent) {
        appendConsole(`<strong>&gt;</strong> Genitore non trovato: ${escapeHtml(ref)}`);
        return;
      }
      parent.children.push(createTask({ id: `task-${nextId}`, name, start: parent.start, duration: Math.max(1, Math.min(parent.duration, 2)), color: '#818cf8' }));
      nextId += 1;
      render();
      appendConsole(`<strong>&gt;</strong> Aggiunto sotto-task: ${escapeHtml(name)} sotto ${escapeHtml(parent.name)}`);
      return;
    }

    if (action === 'rename') {
      const ref = parts[1];
      const name = parts.slice(2).join(' ');
      if (!ref || !name) {
        appendConsole('<strong>&gt;</strong> Uso: rename <nome> <nuovo nome>');
        return;
      }
      const task = findTaskByRef(state.tasks, ref);
      if (!task) {
        appendConsole(`<strong>&gt;</strong> Task non trovato: ${escapeHtml(ref)}`);
        return;
      }
      task.name = name;
      render();
      appendConsole(`<strong>&gt;</strong> Rinominato in: ${escapeHtml(name)}`);
      return;
    }

    if (action === 'start') {
      const ref = parts[1];
      const value = parts[2];
      if (!ref || !value) {
        appendConsole('<strong>&gt;</strong> Uso: start <nome> <yyyy-mm-dd>');
        return;
      }
      const task = findTaskByRef(state.tasks, ref);
      if (!task) {
        appendConsole(`<strong>&gt;</strong> Task non trovato: ${escapeHtml(ref)}`);
        return;
      }
      task.start = clamp(parseDateInput(value), 0, 5000);
      render();
      appendConsole(`<strong>&gt;</strong> Inizio aggiornato per ${escapeHtml(task.name)}`);
      return;
    }

    if (action === 'dur') {
      const ref = parts[1];
      const value = Number(parts[2]);
      if (!ref || Number.isNaN(value)) {
        appendConsole('<strong>&gt;</strong> Uso: dur <nome> <giorni>');
        return;
      }
      const task = findTaskByRef(state.tasks, ref);
      if (!task) {
        appendConsole(`<strong>&gt;</strong> Task non trovato: ${escapeHtml(ref)}`);
        return;
      }
      task.duration = clamp(value, 1, state.visibleDays - task.start);
      render();
      appendConsole(`<strong>&gt;</strong> Durata aggiornata per ${escapeHtml(task.name)}`);
      return;
    }

    if (action === 'remove') {
      const ref = parts.slice(1).join(' ');
      if (!ref) {
        appendConsole('<strong>&gt;</strong> Uso: remove <nome>');
        return;
      }
      const task = findTaskByRef(state.tasks, ref);
      if (!task) {
        appendConsole(`<strong>&gt;</strong> Task non trovato: ${escapeHtml(ref)}`);
        return;
      }
      state.tasks = removeTask(state.tasks, task.id);
      render();
      appendConsole(`<strong>&gt;</strong> Rimosso task: ${escapeHtml(task.name)}`);
      return;
    }

    if (action === 'move') {
      const sourceRef = parts[1];
      const targetRef = parts[2];
      if (!sourceRef || !targetRef) {
        appendConsole('<strong>&gt;</strong> Uso: move <nome sorgente> <nome destinazione>');
        return;
      }
      const source = findTaskByRef(state.tasks, sourceRef);
      const target = findTaskByRef(state.tasks, targetRef);
      if (!source || !target || source.id === target.id) {
        appendConsole('<strong>&gt;</strong> Movimento non valido');
        return;
      }
      state.tasks = moveTask(state.tasks, source.id, target.id);
      render();
      appendConsole(`<strong>&gt;</strong> Spostato ${escapeHtml(source.name)} sotto ${escapeHtml(target.name)}`);
      return;
    }

    if (action === 'zoom') {
      const value = Number(parts[1]);
      if (Number.isNaN(value)) {
        appendConsole('<strong>&gt;</strong> Uso: zoom <giorni>');
        return;
      }
      state.visibleDays = clamp(value, 3, 3650);
      render();
      appendConsole(`<strong>&gt;</strong> Zoom impostato a ${state.visibleDays} giorni`);
      return;
    }

    if (action === 'clear') {
      state.consoleMessages = [];
      renderConsole();
      appendConsole('<strong>&gt;</strong> Console pulita');
      return;
    }

    appendConsole(`<strong>&gt;</strong> Comando sconosciuto: ${escapeHtml(command)}`);
  } catch (error) {
    appendConsole(`<strong>&gt;</strong> Errore: ${escapeHtml(error.message)}`);
  }
}

function attachEvents() {
  const addTaskButton = document.getElementById('addTaskBtn');
  const addSubtaskButton = document.getElementById('addSubtaskBtn');
  const resetButton = document.getElementById('resetBtn');
  const zoomOutButton = document.getElementById('zoomOutBtn');
  const zoomInButton = document.getElementById('zoomInBtn');
  const form = document.getElementById('consoleForm');
  const rows = document.getElementById('ganttRows');

  if (addTaskButton) {
    addTaskButton.addEventListener('click', addTask);
  }

  if (addSubtaskButton) {
    addSubtaskButton.addEventListener('click', () => {
      const firstTask = state.tasks[0];
      if (firstTask) {
        addChildTask(state.tasks, firstTask.id);
        render();
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetExample);
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener('click', () => zoomBy(-1));
  }

  if (zoomInButton) {
    zoomInButton.addEventListener('click', () => zoomBy(1));
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('consoleInput');
      if (!input) {
        return;
      }
      executeCommand(input.value);
      input.value = '';
    });
  }

  if (rows) {
    rows.addEventListener('pointerdown', (event) => {
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
      const pxPerDay = trackWidth / state.visibleDays;
      const startX = event.clientX;
      const originalStart = task.start;
      const originalDuration = task.duration;
      const isResize = event.target.classList.contains('bar-handle');
      bar.classList.add('dragging');

      const onMove = (moveEvent) => {
        const deltaPx = moveEvent.clientX - startX;
        const deltaDays = Math.round(deltaPx / pxPerDay);

        if (isResize) {
          task.duration = clamp(originalDuration + deltaDays, 1, Math.max(1, state.visibleDays - task.start));
        } else {
          task.start = clamp(originalStart + deltaDays, 0, Math.max(0, state.visibleDays - originalDuration));
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
}

attachEvents();
render();
