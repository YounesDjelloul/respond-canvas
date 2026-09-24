import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { Position } from '@vue-flow/core'
import type {
  WorkflowGraph,
  WorkflowInsertionPoint,
  WorkflowNode,
} from '../domain'
import { canQuickDeleteWorkflowNode, updateWorkflowNodePosition } from '../domain'
import {
  workflowAccentPresentationFor,
  workflowNodePresentationFor,
} from '../presentation/workflow-node-presentation'
import type { WorkflowCanvasEdge, WorkflowCanvasNode } from '../types'

interface WorkflowCanvasDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  selectedNode: MaybeRefOrGetter<WorkflowNode | null>
  isChoosingInsertion: MaybeRefOrGetter<boolean>
  openNode: (nodeId: string) => void
  openCreation: (point: WorkflowInsertionPoint) => void
  openCreationAfter: (nodeId: string) => void
  applyGraph: (graph: WorkflowGraph) => void
}

export function useWorkflowCanvas({
  graph,
  selectedNode,
  isChoosingInsertion,
  openNode,
  openCreation,
  openCreationAfter,
  applyGraph,
}: WorkflowCanvasDependencies) {
  const nodes = computed<WorkflowCanvasNode[]>(() => {
    const currentGraph = toValue(graph)

    if (!currentGraph) {
      return []
    }

    const parentIds = new Set(
      currentGraph.nodes.flatMap((node) =>
        node.parentId === null ? [] : [node.parentId],
      ),
    )

    return currentGraph.nodes.map((node) => {
      const kindPresentation = workflowNodePresentationFor(node.kind)
      const accentPresentation = workflowAccentPresentationFor(node.accent)

      return {
        id: node.id,
        type: 'workflow',
        position: node.position,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        draggable: true,
        selectable: true,
        selected: toValue(selectedNode)?.id === node.id,
        connectable: false,
        focusable: false,
        deletable: false,
        ariaLabel: node.editable
          ? `${node.title}. ${node.description}. Press Enter to edit.`
          : `${node.title}. ${node.description}. View only.`,
        data: {
          title: node.title,
          description: node.description,
          kind: node.kind,
          accent: node.accent,
          editable: node.editable,
          hasParent: node.parentId !== null,
          hasChildren: parentIds.has(node.id),
          canInsertAfter: !parentIds.has(node.id),
          isInsertionMode: toValue(isChoosingInsertion),
          insertionLabel: `Insert a step after ${node.title}`,
          showsDeleteControl:
            canQuickDeleteWorkflowNode(node) && !toValue(isChoosingInsertion),
          deleteLabel: `Delete ${node.title}`,
          icon: kindPresentation.icon,
          accentClass: accentPresentation.accentClass,
          iconClass: accentPresentation.iconClass,
        },
      }
    })
  })

  const edges = computed<WorkflowCanvasEdge[]>(() => {
    const currentGraph = toValue(graph)

    if (!currentGraph) {
      return []
    }

    return currentGraph.edges.map((edge) => {
      const source = currentGraph.nodes.find((node) => node.id === edge.source)
      const target = currentGraph.nodes.find((node) => node.id === edge.target)
      const isGeneratedBranch =
        source?.kind === 'business-hours' && target?.kind === 'branch'

      return {
        ...edge,
        type: isGeneratedBranch ? 'smoothstep' : 'workflow-insertion',
        selectable: false,
        focusable: false,
        data: {
          insertionPoint: { sourceId: edge.source, targetId: edge.target },
          insertionLabel: `Insert a step between ${source?.title ?? 'source'} and ${target?.title ?? 'target'}`,
          isInsertionMode: toValue(isChoosingInsertion),
        },
      }
    })
  })

  function updateNodePosition(node: Pick<WorkflowCanvasNode, 'id' | 'position'>) {
    const currentGraph = toValue(graph)

    if (!currentGraph) {
      return
    }

    const result = updateWorkflowNodePosition(currentGraph, node.id, node.position)

    if (result.ok) {
      applyGraph(result.value)
    }
  }

  return {
    nodes,
    edges,
    openNode,
    openCreation,
    openCreationAfter,
    updateNodePosition,
    isChoosingInsertion,
  }
}
