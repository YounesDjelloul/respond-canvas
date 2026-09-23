import { createWorkflowLayout } from './layout-workflow'
import type { WorkflowGraph, WorkflowNode } from './types'

export function assembleWorkflowGraph(nodes: WorkflowNode[]): WorkflowGraph {
  const positions = createWorkflowLayout(nodes)
  const positionedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))

  return {
    nodes: positionedNodes,
    edges: positionedNodes.flatMap((node) =>
      node.parentId === null
        ? []
        : [
            {
              id: `${node.parentId}:${node.id}`,
              source: node.parentId,
              target: node.id,
            },
          ],
    ),
  }
}
