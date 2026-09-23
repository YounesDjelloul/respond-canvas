import { defineStore } from 'pinia'
import type { WorkflowInsertionPoint } from '../domain'

type WorkflowEditorMode = 'idle' | 'choosing-insertion' | 'creating'

interface WorkflowEditorState {
  mode: WorkflowEditorMode
  insertionPoint: WorkflowInsertionPoint | null
}

export const useWorkflowEditorStore = defineStore('workflow-editor', {
  state: (): WorkflowEditorState => ({
    mode: 'idle',
    insertionPoint: null,
  }),
  actions: {
    beginInsertion() {
      this.mode = 'choosing-insertion'
      this.insertionPoint = null
    },
    selectInsertionPoint(insertionPoint: WorkflowInsertionPoint) {
      this.mode = 'creating'
      this.insertionPoint = { ...insertionPoint }
    },
    cancelInsertion() {
      this.mode = 'idle'
      this.insertionPoint = null
    },
  },
})
