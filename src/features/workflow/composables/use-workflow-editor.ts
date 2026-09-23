import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import { useWorkflowCanvas } from './use-workflow-canvas'
import { useWorkflowGraph } from './use-workflow-graph'
import { useWorkflowNodeCreation } from './use-workflow-node-creation'
import { useWorkflowNodeDetails } from './use-workflow-node-details'
import { useWorkflowSelection } from './use-workflow-selection'

export function useWorkflowEditor(
  repository: WorkflowRepository = workflowRepository,
) {
  const workflow = useWorkflowGraph(repository)
  const selection = useWorkflowSelection(
    workflow.graph,
    workflow.status.isLoading,
  )
  const creation = useWorkflowNodeCreation({
    graph: workflow.graph,
    applyGraph: workflow.applyGraph,
    openNode: selection.openNode,
  })
  const canvas = useWorkflowCanvas({
    graph: workflow.graph,
    selectedNode: selection.selectedNode,
    isChoosingInsertion: creation.isChoosingInsertion,
    openNode: selection.openNode,
    openCreation: creation.open,
    openCreationAfter: creation.openAfter,
    applyGraph: workflow.applyGraph,
  })
  const details = useWorkflowNodeDetails({
    graph: workflow.graph,
    selectedNode: selection.selectedNode,
    applyGraph: workflow.applyGraph,
    closeNode: selection.closeNode,
    setVisibility: selection.setDetailsVisibility,
  })

  return {
    status: workflow.status,
    canvas,
    creation: creation.controller,
    details,
  }
}

export type WorkflowEditorController = ReturnType<typeof useWorkflowEditor>
