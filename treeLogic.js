export function createTask(overrides = {}) {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? 'Nuovo task',
    start: overrides.start ?? 0,
    duration: overrides.duration ?? 2,
    color: overrides.color ?? '#38bdf8',
    children: (overrides.children ?? []).map((child) => createTask(child))
  };
}

export function findTask(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findTask(node.children, id);
    if (child) {
      return child;
    }
  }

  return null;
}

export function updateTask(nodes, id, patch) {
  const task = findTask(nodes, id);
  if (task) {
    Object.assign(task, patch);
  }
  return nodes;
}

export function addChildTask(nodes, parentId) {
  const parent = findTask(nodes, parentId);
  if (parent) {
    parent.children.push(createTask({
      name: 'Nuovo sotto-task',
      start: parent.start,
      duration: Math.max(1, Math.min(parent.duration, 2))
    }));
  }
  return nodes;
}

export function removeTask(nodes, id) {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeTask(node.children, id)
    }));
}

export function moveTask(nodes, draggedId, targetId) {
  let draggedNode = null;
  let draggedParent = null;
  let draggedIndex = -1;

  const removeFromList = (items) => {
    for (let index = 0; index < items.length; index += 1) {
      const current = items[index];
      if (current.id === draggedId) {
        draggedNode = current;
        draggedParent = items;
        draggedIndex = index;
        items.splice(index, 1);
        return true;
      }

      if (removeFromList(current.children)) {
        return true;
      }
    }

    return false;
  };

  removeFromList(nodes);
  if (!draggedNode) {
    return nodes;
  }

  const insertAfterTarget = (items) => {
    for (let index = 0; index < items.length; index += 1) {
      const current = items[index];
      if (current.id === targetId) {
        items.splice(index + 1, 0, draggedNode);
        return true;
      }

      if (insertAfterTarget(current.children)) {
        return true;
      }
    }

    return false;
  };

  if (!insertAfterTarget(nodes)) {
    nodes.push(draggedNode);
  }

  return nodes;
}

export function flattenTasks(nodes) {
  return nodes.flatMap((node) => [node, ...flattenTasks(node.children)]);
}
