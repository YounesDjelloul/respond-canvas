import type { DomainResult } from '@/features/shared/domain'
import type {
  UpdateWorkflowNodeInput,
  WorkflowGraph,
  WorkflowMutationError,
} from './types'

export function updateWorkflowNode(
  graph: WorkflowGraph,
  input: UpdateWorkflowNodeInput,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === input.id)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', ['nodes', input.id])
  }

  if (!node.editable) {
    return failure('node-read-only', 'This node is read-only', ['nodes', input.id])
  }

  const title = input.title.trim()
  const description = input.description.trim()
  const errors: WorkflowMutationError[] = []

  if (!title) {
    errors.push({
      code: 'title-required',
      message: 'Title is required',
      path: ['title'],
    })
  }

  if (!description) {
    errors.push({
      code: 'description-required',
      message: 'Description is required',
      path: ['description'],
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      ...graph,
      nodes: graph.nodes.map((candidate) =>
        candidate.id === input.id
          ? {
              ...candidate,
              title,
              description,
            }
          : candidate,
      ),
    },
  }
}

export function deleteWorkflowNode(
  graph: WorkflowGraph,
  nodeId: string,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', ['nodes', nodeId])
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
