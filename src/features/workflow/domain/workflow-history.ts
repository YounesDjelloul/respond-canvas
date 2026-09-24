import type { WorkflowGraph, WorkflowHistory } from './types'

export const WORKFLOW_HISTORY_LIMIT = 50

export function createWorkflowHistory(): WorkflowHistory {
  return { past: [], future: [] }
}

export function recordWorkflowChange(
  history: WorkflowHistory,
  previousGraph: WorkflowGraph,
  label: string,
  limit: number = WORKFLOW_HISTORY_LIMIT,
): WorkflowHistory {
  return {
    past: [...history.past, { graph: previousGraph, label }].slice(-limit),
    future: [],
  }
}

export function undoWorkflowChange(
  history: WorkflowHistory,
  currentGraph: WorkflowGraph,
): { history: WorkflowHistory; graph: WorkflowGraph; label: string } | null {
  const entry = history.past.at(-1)

  if (!entry) {
    return null
  }

  return {
    graph: entry.graph,
    label: entry.label,
    history: {
      past: history.past.slice(0, -1),
      future: [{ graph: currentGraph, label: entry.label }, ...history.future],
    },
  }
}

export function redoWorkflowChange(
  history: WorkflowHistory,
  currentGraph: WorkflowGraph,
): { history: WorkflowHistory; graph: WorkflowGraph; label: string } | null {
  const entry = history.future[0]

  if (!entry) {
    return null
  }

  return {
    graph: entry.graph,
    label: entry.label,
    history: {
      past: [...history.past, { graph: currentGraph, label: entry.label }],
      future: history.future.slice(1),
    },
  }
}
