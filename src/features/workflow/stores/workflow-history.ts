import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  createWorkflowHistory,
  recordWorkflowChange,
  redoWorkflowChange,
  undoWorkflowChange,
  type WorkflowGraph,
  type WorkflowHistory,
} from '../domain'

export const useWorkflowHistoryStore = defineStore('workflow-history', () => {
  const history = shallowRef<WorkflowHistory>(createWorkflowHistory())

  function record(previousGraph: WorkflowGraph, label: string) {
    history.value = recordWorkflowChange(history.value, previousGraph, label)
  }

  function undo(currentGraph: WorkflowGraph) {
    const result = undoWorkflowChange(history.value, currentGraph)

    if (result) {
      history.value = result.history
    }

    return result
  }

  function redo(currentGraph: WorkflowGraph) {
    const result = redoWorkflowChange(history.value, currentGraph)

    if (result) {
      history.value = result.history
    }

    return result
  }

  return { history, record, undo, redo }
})
