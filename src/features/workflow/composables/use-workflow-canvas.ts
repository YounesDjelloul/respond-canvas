import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Position } from '@vue-flow/core'
import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import { createWorkflowGraph } from '../domain'
import type { WorkflowNodeAccent, WorkflowNodeKind } from '../domain'
import type { WorkflowCanvasEdge, WorkflowCanvasNode } from '../types'

export function useWorkflowCanvas(repository: WorkflowRepository = workflowRepository) {
  const workflowQuery = useQuery({
    queryKey: ['workflow'],
    queryFn: () => repository.getWorkflow(),
    select: createWorkflowGraph,
  })

  const nodes = computed<WorkflowCanvasNode[]>(() => {
    const result = workflowQuery.data.value

    if (!result?.ok) {
      return []
    }

    const parentIds = new Set(
      result.value.nodes.flatMap((node) => (node.parentId === null ? [] : [node.parentId])),
    )

    return result.value.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      draggable: true,
      selectable: true,
      connectable: false,
      focusable: true,
      deletable: false,
      ariaLabel: `${node.title}. ${node.description}`,
      data: {
        title: node.title,
        description: node.description,
        kind: node.kind,
        accent: node.accent,
        editable: node.editable,
        hasParent: node.parentId !== null,
        hasChildren: parentIds.has(node.id),
        icon: iconFor(node.kind),
        accentClass: accentClassFor(node.accent),
        iconClass: iconClassFor(node.accent),
      },
    }))
  })

  const edges = computed<WorkflowCanvasEdge[]>(() => {
    const result = workflowQuery.data.value

    if (!result?.ok) {
      return []
    }

    return result.value.edges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      selectable: false,
      focusable: false,
    }))
  })

  const errorMessage = computed(() => {
    if (workflowQuery.error.value instanceof Error) {
      return workflowQuery.error.value.message
    }

    const result = workflowQuery.data.value

    if (result && !result.ok) {
      return result.errors[0]?.message ?? 'The workflow payload is invalid'
    }

    return null
  })

  const isEmpty = computed(
    () => !workflowQuery.isPending.value && !errorMessage.value && nodes.value.length === 0,
  )

  return {
    nodes,
    edges,
    errorMessage,
    isEmpty,
    isLoading: workflowQuery.isPending,
  }
}

function iconFor(kind: WorkflowNodeKind): string {
  const icons: Record<WorkflowNodeKind, string> = {
    trigger: '↗',
    'send-message': '➤',
    'business-hours': '◷',
    branch: '◇',
    'add-comment': '≡',
  }

  return icons[kind]
}

function accentClassFor(accent: WorkflowNodeAccent): string {
  const classes: Record<WorkflowNodeAccent, string> = {
    neutral: 'border-l-slate-300',
    violet: 'border-l-violet-400',
    orange: 'border-l-orange-400',
    green: 'border-l-emerald-400',
    blue: 'border-l-sky-400',
  }

  return classes[accent]
}

function iconClassFor(accent: WorkflowNodeAccent): string {
  const classes: Record<WorkflowNodeAccent, string> = {
    neutral: 'bg-slate-100 text-slate-500',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-sky-50 text-sky-600',
  }

  return classes[accent]
}
