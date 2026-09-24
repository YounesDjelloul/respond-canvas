import { computed, toValue, useId, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { Position, useVueFlow } from '@vue-flow/core'
import type { VueFlowStore } from '@vue-flow/core'
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowGraphIndex,
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
  index: MaybeRefOrGetter<WorkflowGraphIndex | null>
  issueCounts: MaybeRefOrGetter<ReadonlyMap<string, number>>
  selectedNode: MaybeRefOrGetter<WorkflowNode | null>
  isChoosingInsertion: MaybeRefOrGetter<boolean>
  openNode: (nodeId: string) => void
  openCreation: (point: WorkflowInsertionPoint) => void
  openCreationAfter: (nodeId: string) => void
  applyGraph: (graph: WorkflowGraph) => void
}

interface CachedCanvasNode {
  node: WorkflowNode
  hasChildren: boolean
  issueCount: number
  selected: boolean
  view: WorkflowCanvasNode
}

interface CachedCanvasEdge {
  edge: WorkflowEdge
  source: WorkflowNode | undefined
  target: WorkflowNode | undefined
  view: WorkflowCanvasEdge
}

export function useWorkflowCanvas({
  graph,
  index,
  issueCounts,
  selectedNode,
  isChoosingInsertion,
  openNode,
  openCreation,
  openCreationAfter,
  applyGraph,
}: WorkflowCanvasDependencies) {
  let nodeCache = new Map<string, CachedCanvasNode>()
  let edgeCache = new Map<string, CachedCanvasEdge>()

  const nodes = computed<WorkflowCanvasNode[]>(() => {
    const currentGraph = toValue(graph)
    const currentIndex = toValue(index)

    if (!currentGraph || !currentIndex) {
      nodeCache = new Map()
      return []
    }

    const counts = toValue(issueCounts)
    const selectedId = toValue(selectedNode)?.id ?? null
    const nextCache = new Map<string, CachedCanvasNode>()
    const views = currentGraph.nodes.map((node) => {
      const inputs = {
        node,
        hasChildren: currentIndex.childrenByParent.has(node.id),
        issueCount: counts.get(node.id) ?? 0,
        selected: node.id === selectedId,
      }
      const cached = nodeCache.get(node.id)
      const entry =
        cached && hasSameNodeInputs(cached, inputs)
          ? cached
          : { ...inputs, view: createCanvasNode(inputs) }

      nextCache.set(node.id, entry)
      return entry.view
    })

    nodeCache = nextCache
    return views
  })

  const edges = computed<WorkflowCanvasEdge[]>(() => {
    const currentGraph = toValue(graph)
    const currentIndex = toValue(index)

    if (!currentGraph || !currentIndex) {
      edgeCache = new Map()
      return []
    }

    const nextCache = new Map<string, CachedCanvasEdge>()
    const views = currentGraph.edges.map((edge) => {
      const inputs = {
        edge,
        source: currentIndex.nodesById.get(edge.source),
        target: currentIndex.nodesById.get(edge.target),
      }
      const cached = edgeCache.get(edge.id)
      const entry =
        cached &&
        cached.edge === inputs.edge &&
        cached.source === inputs.source &&
        cached.target === inputs.target
          ? cached
          : { ...inputs, view: createCanvasEdge(inputs) }

      nextCache.set(edge.id, entry)
      return entry.view
    })

    edgeCache = nextCache
    return views
  })

  const flowId = `workflow-canvas-${useId()}`
  const flow = useVueFlow(flowId)
  let syncedNodes = new Map<string, WorkflowCanvasNode>()
  let syncedEdges = new Map<string, WorkflowCanvasEdge>()

  watch(
    [nodes, edges],
    ([nextNodes, nextEdges]) => {
      const nodeChanges = diffViews(syncedNodes, nextNodes)
      const edgeChanges = diffViews(syncedEdges, nextEdges)

      applyFlowChanges(flow, nodeChanges, edgeChanges, syncedNodes.size === 0)
      syncedNodes = new Map(nextNodes.map((view) => [view.id, view]))
      syncedEdges = new Map(nextEdges.map((view) => [view.id, view]))
    },
    { immediate: true },
  )

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
    flowId,
    nodes,
    edges,
    openNode,
    openCreation,
    openCreationAfter,
    updateNodePosition,
    isChoosingInsertion,
  }
}

function hasSameNodeInputs(
  cached: CachedCanvasNode,
  inputs: Omit<CachedCanvasNode, 'view'>,
): boolean {
  return (
    cached.node === inputs.node &&
    cached.hasChildren === inputs.hasChildren &&
    cached.issueCount === inputs.issueCount &&
    cached.selected === inputs.selected
  )
}

function createCanvasNode({
  node,
  hasChildren,
  issueCount,
  selected,
}: Omit<CachedCanvasNode, 'view'>): WorkflowCanvasNode {
  const kindPresentation = workflowNodePresentationFor(node.kind)
  const accentPresentation = workflowAccentPresentationFor(node.accent)
  const issueLabel =
    issueCount > 0 ? `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}` : null

  return {
    id: node.id,
    type: 'workflow',
    position: node.position,
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
    draggable: true,
    selectable: true,
    selected,
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
      hasChildren,
      canInsertAfter: !hasChildren,
      insertionLabel: `Insert a step after ${node.title}`,
      showsDeleteControl: canQuickDeleteWorkflowNode(node),
      deleteLabel: `Delete ${node.title}`,
      issueLabel,
      accessibleLabel: [node.title, node.description, issueLabel]
        .filter(Boolean)
        .join('. '),
      icon: kindPresentation.icon,
      accentClass: accentPresentation.accentClass,
      iconClass: accentPresentation.iconClass,
    },
  }
}

function createCanvasEdge({
  edge,
  source,
  target,
}: Omit<CachedCanvasEdge, 'view'>): WorkflowCanvasEdge {
  const isGeneratedBranch = source?.kind === 'business-hours' && target?.kind === 'branch'

  return {
    ...edge,
    type: isGeneratedBranch ? 'smoothstep' : 'workflow-insertion',
    selectable: false,
    focusable: false,
    data: {
      insertionPoint: { sourceId: edge.source, targetId: edge.target },
      insertionLabel: `Insert a step between ${source?.title ?? 'source'} and ${target?.title ?? 'target'}`,
    },
  }
}

interface ViewChanges<View extends { id: string }> {
  added: View[]
  changed: View[]
  removedIds: string[]
}

function diffViews<View extends { id: string }>(
  previous: ReadonlyMap<string, View>,
  next: readonly View[],
): ViewChanges<View> {
  const nextIds = new Set(next.map((view) => view.id))

  return {
    added: next.filter((view) => !previous.has(view.id)),
    changed: next.filter(
      (view) => previous.has(view.id) && previous.get(view.id) !== view,
    ),
    removedIds: [...previous.keys()].filter((id) => !nextIds.has(id)),
  }
}

function applyFlowChanges(
  flow: VueFlowStore,
  nodeChanges: ViewChanges<WorkflowCanvasNode>,
  edgeChanges: ViewChanges<WorkflowCanvasEdge>,
  isInitialSync: boolean,
) {
  if (isInitialSync) {
    flow.setNodes(nodeChanges.added)
    flow.setEdges(edgeChanges.added)
    return
  }

  if (edgeChanges.removedIds.length > 0) {
    flow.applyEdgeChanges(
      edgeChanges.removedIds.map((id) => {
        const edge = flow.findEdge(id)

        return {
          type: 'remove' as const,
          id,
          source: edge?.source ?? '',
          target: edge?.target ?? '',
          sourceHandle: edge?.sourceHandle ?? null,
          targetHandle: edge?.targetHandle ?? null,
        }
      }),
    )
  }

  if (nodeChanges.removedIds.length > 0) {
    flow.applyNodeChanges(
      nodeChanges.removedIds.map((id) => ({ type: 'remove' as const, id })),
    )
  }

  if (nodeChanges.added.length > 0) {
    flow.addNodes(nodeChanges.added)
  }

  for (const view of nodeChanges.changed) {
    flow.updateNode(view.id, view)
  }

  if (edgeChanges.added.length > 0) {
    flow.addEdges(edgeChanges.added)
  }

  for (const view of edgeChanges.changed) {
    if (view.data) {
      flow.updateEdgeData(view.id, view.data, { replace: true })
    }
  }
}
