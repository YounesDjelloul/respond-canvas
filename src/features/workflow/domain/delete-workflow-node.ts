import type { DomainResult } from '@/features/shared/domain'
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

  const deletedIds = collectDescendantIds(graph, nodeId)

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

  return collectDescendantIds(graph, nodeId).size - 1
}

export function canQuickDeleteWorkflowNode(node: WorkflowNode): boolean {
  return node.editable && node.kind !== 'trigger'
}

function collectDescendantIds(graph: WorkflowGraph, nodeId: string): Set<string> {
  const collectedIds = new Set([nodeId])
  let foundDescendant = true

  while (foundDescendant) {
    foundDescendant = false

    for (const node of graph.nodes) {
      if (
        node.parentId !== null &&
        collectedIds.has(node.parentId) &&
        !collectedIds.has(node.id)
      ) {
        collectedIds.add(node.id)
        foundDescendant = true
      }
    }
  }

  return collectedIds
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
