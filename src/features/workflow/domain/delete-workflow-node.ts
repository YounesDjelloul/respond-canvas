import type { DomainResult } from '@/features/shared/domain'
import { collectWorkflowSubtreeIds, indexWorkflowGraph } from './index-workflow-graph'
import type {
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowNode,
} from './types'

export function deleteWorkflowNode(
  graph: WorkflowGraph,
  nodeId: string,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', [
      'nodes',
      nodeId,
    ])
  }

  if (!node.editable) {
    return failure('node-read-only', 'This node is read-only', ['nodes', nodeId])
  }

  const deletedIds = collectWorkflowSubtreeIds(indexWorkflowGraph(graph), nodeId)

  return {
    ok: true,
    value: {
      nodes: graph.nodes.filter((candidate) => !deletedIds.has(candidate.id)),
      edges: graph.edges.filter(
        (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
      ),
    },
  }
}

export function countWorkflowNodeDescendants(
  graph: WorkflowGraph,
  nodeId: string,
): number {
  if (!graph.nodes.some((node) => node.id === nodeId)) {
    return 0
  }

  return collectWorkflowSubtreeIds(indexWorkflowGraph(graph), nodeId).size - 1
}

export function canQuickDeleteWorkflowNode(node: WorkflowNode): boolean {
  return node.editable && node.kind !== 'trigger'
}

function failure(
  code: WorkflowMutationError['code'],
  message: string,
  path: readonly (string | number)[],
): DomainResult<never, WorkflowMutationError> {
  return {
    ok: false,
    errors: [{ code, message, path }],
  }
}
