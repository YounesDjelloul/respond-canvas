import type { WorkflowGraph, WorkflowGraphIndex, WorkflowNode } from './types'

export function indexWorkflowGraph(graph: WorkflowGraph): WorkflowGraphIndex {
  const nodesById = new Map<string, WorkflowNode>()
  const childrenByParent = new Map<string | null, WorkflowNode[]>()

  for (const node of graph.nodes) {
    nodesById.set(node.id, node)
    const siblings = childrenByParent.get(node.parentId)

    if (siblings) {
      siblings.push(node)
    } else {
      childrenByParent.set(node.parentId, [node])
    }
  }

  return { nodesById, childrenByParent }
}

export function collectWorkflowSubtreeIds(
  index: WorkflowGraphIndex,
  rootId: string,
): Set<string> {
  const collectedIds = new Set<string>()
  const pendingIds = [rootId]

  while (pendingIds.length > 0) {
    const nodeId = pendingIds.pop()!

    if (collectedIds.has(nodeId)) {
      continue
    }

    collectedIds.add(nodeId)

    for (const child of index.childrenByParent.get(nodeId) ?? []) {
      pendingIds.push(child.id)
    }
  }

  return collectedIds
}
