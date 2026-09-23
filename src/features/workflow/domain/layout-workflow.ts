import type { WorkflowNode, WorkflowPosition } from './types'

const horizontalGap = 320
const verticalGap = 180

export function createWorkflowLayout(
  nodes: WorkflowNode[],
): Map<string, WorkflowPosition> {
  const childrenByParent = new Map<string | null, WorkflowNode[]>()

  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    childrenByParent.set(node.parentId, [...siblings, node])
  }

  const positions = new Map<string, WorkflowPosition>()
  let leafIndex = 0

  function placeNode(node: WorkflowNode, depth: number): number {
    const children = childrenByParent.get(node.id) ?? []

    if (children.length === 0) {
      const x = leafIndex * horizontalGap
      leafIndex += 1
      positions.set(node.id, { x, y: depth * verticalGap })
      return x
    }

    const childPositions = children.map((child) => placeNode(child, depth + 1))
    const x = childPositions.reduce((total, childX) => total + childX, 0) / childPositions.length
    positions.set(node.id, { x, y: depth * verticalGap })
    return x
  }

  for (const rootNode of childrenByParent.get(null) ?? []) {
    placeNode(rootNode, 0)
  }

  return positions
}
