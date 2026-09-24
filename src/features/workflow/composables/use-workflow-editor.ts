import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import { useWorkflowCanvas } from './use-workflow-canvas'
import { useWorkflowGraph } from './use-workflow-graph'
import { useWorkflowHistory } from './use-workflow-history'
import { useWorkflowNodeCreation } from './use-workflow-node-creation'
import { useWorkflowNodeDeletion } from './use-workflow-node-deletion'
import { useWorkflowNodeDetails } from './use-workflow-node-details'
import { useWorkflowReadiness } from './use-workflow-readiness'
import { useWorkflowSelection } from './use-workflow-selection'

export function useWorkflowEditor(
  repository: WorkflowRepository = workflowRepository,
) {
  const workflow = useWorkflowGraph(repository)
  const history = useWorkflowHistory({
    graph: workflow.graph,
    applyGraph: workflow.applyGraph,
    isBlocked: () =>
      details.isOpen.value || creation.controller.isOpen.value || deletion.isOpen.value,
  })
  const selection = useWorkflowSelection(
    workflow.index,
    workflow.status.isLoading,
    (nodeId) => canvas.revealNode(nodeId),
  )
  const creation = useWorkflowNodeCreation({
    graph: workflow.graph,
    index: workflow.index,
    applyGraph: history.commit,
    openNode: selection.openNode,
  })
  const readiness = useWorkflowReadiness({
    graph: workflow.graph,
    index: workflow.index,
    openNode: selection.openNode,
    openCreationAfter: creation.openAfter,
  })
  const canvas = useWorkflowCanvas({
    graph: workflow.graph,
    index: workflow.index,
    issueCounts: readiness.issueCounts,
    selectedNode: selection.selectedNode,
    isChoosingInsertion: creation.isChoosingInsertion,
    openNode: selection.openNode,
    openCreation: creation.open,
    openCreationAfter: creation.openAfter,
    applyGraph: history.commit,
  })
  const deletion = useWorkflowNodeDeletion({
    graph: workflow.graph,
    index: workflow.index,
    applyGraph: history.commit,
    closeNode: selection.closeNode,
  })
  const details = useWorkflowNodeDetails({
    graph: workflow.graph,
    selectedNode: selection.selectedNode,
    applyGraph: history.commit,
    closeNode: selection.closeNode,
    setVisibility: selection.setDetailsVisibility,
    requestDeletion: deletion.requestFromDetails,
    readinessErrorsFor: readiness.fieldErrorsFor,
  })

  return {
    status: workflow.status,
    canvas,
    creation: creation.controller,
    details,
    deletion,
    readiness,
    history: {
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      undoLabel: history.undoLabel,
      redoLabel: history.redoLabel,
      announcement: history.announcement,
      undo: history.undo,
      redo: history.redo,
    },
  }
}

export type WorkflowEditorController = ReturnType<typeof useWorkflowEditor>
