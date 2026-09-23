import type { DomainResult } from '@/features/shared/domain'
import type {
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowPosition,
} from './types'

export function updateWorkflowNodePosition(
  graph: WorkflowGraph,
  nodeId: string,
  position: WorkflowPosition,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  if (!graph.nodes.some((node) => node.id === nodeId)) {
    return {
      ok: false,
      errors: [
        {
          code: 'node-not-found',
          message: 'The moved node no longer exists',
          path: ['nodes', nodeId],
        },
      ],
    }
  }

  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid-node-position',
          message: 'The node position must contain finite coordinates',
          path: ['nodes', nodeId, 'position'],
        },
      ],
    }
  }

  return {
    ok: true,
    value: {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: { ...position },
            }
          : node,
      ),
    },
  }
}
