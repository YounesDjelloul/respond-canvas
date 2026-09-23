import { computed, nextTick, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Position } from '@vue-flow/core'
import { useRoute, useRouter } from 'vue-router'
import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import {
  createWorkflowGraph,
  deleteWorkflowNode,
  updateWorkflowNode,
} from '../domain'
import type {
  UpdateWorkflowNodeInput,
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowNodeAccent,
  WorkflowNodeKind,
} from '../domain'
import type { WorkflowCanvasEdge, WorkflowCanvasNode } from '../types'

const workflowQueryKey = ['workflow'] as const

export function useWorkflowEditor(repository: WorkflowRepository = workflowRepository) {
  const route = useRoute()
  const router = useRouter()
  const queryClient = useQueryClient()
  const title = ref('')
  const description = ref('')
  const operationErrors = ref<readonly WorkflowMutationError[]>([])
  const isDeleteConfirming = ref(false)
  const lastFocusedNodeId = ref<string | null>(null)

  const workflowQuery = useQuery({
    queryKey: workflowQueryKey,
    queryFn: async () => createWorkflowGraph(await repository.getWorkflow()),
  })

  const graph = computed(() => {
    const result = workflowQuery.data.value
    return result?.ok ? result.value : null
  })

  const routeNodeId = computed(() => {
    const nodeId = route.params.nodeId
    return typeof nodeId === 'string' ? nodeId : null
  })

  const routeNode = computed(
    () => graph.value?.nodes.find((node) => node.id === routeNodeId.value) ?? null,
  )

  const selectedNode = computed(() => {
    const node = routeNode.value
    return node?.editable ? node : null
  })

  const nodes = computed<WorkflowCanvasNode[]>(() => {
    if (!graph.value) {
      return []
    }

    const parentIds = new Set(
      graph.value.nodes.flatMap((node) => (node.parentId === null ? [] : [node.parentId])),
    )

    return graph.value.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      draggable: true,
      selectable: true,
      selected: selectedNode.value?.id === node.id,
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
        icon: iconFor(node.kind),
        accentClass: accentClassFor(node.accent),
        iconClass: iconClassFor(node.accent),
      },
    }))
  })

  const edges = computed<WorkflowCanvasEdge[]>(() => {
    if (!graph.value) {
      return []
    }

    return graph.value.edges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      selectable: false,
      focusable: false,
    }))
  })

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateWorkflowNodeInput) =>
      updateWorkflowNode(requireGraph(graph.value), input),
    onSuccess: applyMutationResult,
  })

  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) => deleteWorkflowNode(requireGraph(graph.value), nodeId),
    onSuccess: applyMutationResult,
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

  const detailsErrorMessage = computed(
    () =>
      operationErrors.value.find(
        (error) => error.path?.[0] !== 'title' && error.path?.[0] !== 'description',
      )?.message ?? null,
  )
  const titleError = computed(
    () => operationErrors.value.find((error) => error.path?.[0] === 'title')?.message ?? null,
  )
  const descriptionError = computed(
    () =>
      operationErrors.value.find((error) => error.path?.[0] === 'description')?.message ?? null,
  )
  const isDirty = computed(
    () =>
      selectedNode.value !== null &&
      (title.value !== selectedNode.value.title ||
        description.value !== selectedNode.value.description),
  )
  const isEmpty = computed(
    () => !workflowQuery.isPending.value && !errorMessage.value && nodes.value.length === 0,
  )
  const detailsHeading = computed(() => selectedNode.value?.title ?? 'Node details')
  const detailsTypeLabel = computed(() =>
    selectedNode.value ? labelFor(selectedNode.value.kind) : '',
  )

  watch(
    selectedNode,
    (node) => {
      title.value = node?.title ?? ''
      description.value = node?.description ?? ''
      operationErrors.value = []
      isDeleteConfirming.value = false
    },
    { immediate: true },
  )

  watch(
    [workflowQuery.isPending, routeNodeId, routeNode],
    ([isPending, nodeId, node]) => {
      if (!isPending && nodeId && (!node || !node.editable)) {
        void router.replace({ name: 'workflow' })
      }
    },
    { immediate: true },
  )

  function openNode(nodeId: string) {
    const node = graph.value?.nodes.find((candidate) => candidate.id === nodeId)

    if (!node?.editable) {
      return
    }

    lastFocusedNodeId.value = nodeId
    void router.push({ name: 'workflow-node', params: { nodeId } })
  }

  async function closeNode(focusNodeId: string | null = lastFocusedNodeId.value) {
    await router.push({ name: 'workflow' })
    await nextTick()

    if (focusNodeId) {
      focusNode(focusNodeId)
    }
  }

  function setDetailsVisibility(visible: boolean) {
    if (!visible) {
      void closeNode()
    }
  }

  function updateTitle(value: string) {
    title.value = value
    clearFieldError('title')
  }

  function updateDescription(value: string) {
    description.value = value
    clearFieldError('description')
  }

  function saveNode() {
    if (!selectedNode.value) {
      return
    }

    operationErrors.value = []
    updateMutation.mutate({
      id: selectedNode.value.id,
      title: title.value,
      description: description.value,
    })
  }

  function requestDelete() {
    isDeleteConfirming.value = true
  }

  function cancelDelete() {
    isDeleteConfirming.value = false
  }

  function confirmDelete() {
    if (!selectedNode.value) {
      return
    }

    const parentId = selectedNode.value.parentId
    const nodeId = selectedNode.value.id

    deleteMutation.mutate(nodeId, {
      onSuccess: (result) => {
        if (result.ok) {
          void closeNode(parentId)
        }
      },
    })
  }

  function applyMutationResult(
    result: ReturnType<typeof updateWorkflowNode> | ReturnType<typeof deleteWorkflowNode>,
  ) {
    if (result.ok) {
      queryClient.setQueryData(workflowQueryKey, { ok: true, value: result.value })
      operationErrors.value = []
      isDeleteConfirming.value = false
      return
    }

    operationErrors.value = result.errors
  }

  function clearFieldError(field: 'title' | 'description') {
    operationErrors.value = operationErrors.value.filter((error) => error.path?.[0] !== field)
  }

  return {
    status: {
      errorMessage,
      isEmpty,
      isLoading: workflowQuery.isPending,
    },
    canvas: {
      nodes,
      edges,
      openNode,
    },
    details: {
      selectedNode,
      isOpen: computed(() => selectedNode.value !== null),
      heading: detailsHeading,
      typeLabel: detailsTypeLabel,
      title,
      description,
      titleError,
      descriptionError,
      errorMessage: detailsErrorMessage,
      isDirty,
      isSaving: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isDeleteConfirming,
      close: closeNode,
      setVisibility: setDetailsVisibility,
      updateTitle,
      updateDescription,
      save: saveNode,
      requestDelete,
      cancelDelete,
      confirmDelete,
    },
  }
}

export type WorkflowEditorController = ReturnType<typeof useWorkflowEditor>

function requireGraph(graph: WorkflowGraph | null): WorkflowGraph {
  if (!graph) {
    throw new Error('The workflow is not available')
  }

  return graph
}

function focusNode(nodeId: string) {
  const node = Array.from(
    document.querySelectorAll<HTMLElement>('[data-workflow-node-id]'),
  ).find((element) => element.dataset.workflowNodeId === nodeId)

  node?.focus()
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

function labelFor(kind: WorkflowNodeKind): string {
  const labels: Record<WorkflowNodeKind, string> = {
    trigger: 'Trigger',
    'send-message': 'Send message',
    'business-hours': 'Business hours',
    branch: 'Branch',
    'add-comment': 'Add comment',
  }

  return labels[kind]
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
