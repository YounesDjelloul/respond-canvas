import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import type { WorkflowRepository } from '../data/types'
import {
  useWorkflowEditor,
  type WorkflowEditorController,
} from './use-workflow-editor'

const workflowEditorKey: InjectionKey<WorkflowEditorController> = Symbol('workflow-editor')

export function provideWorkflowEditor(
  repository?: WorkflowRepository,
): WorkflowEditorController {
  const editor = useWorkflowEditor(repository)
  provide(workflowEditorKey, editor)
  return editor
}

export function useWorkflowEditorContext(): WorkflowEditorController {
  const editor = inject(workflowEditorKey)

  if (!editor) {
    throw new Error('Workflow editor context is missing')
  }

  return editor
}
