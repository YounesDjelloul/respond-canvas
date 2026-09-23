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
  BusinessHour,
  UpdateWorkflowNodeInput,
  WorkflowAttachmentPart,
  WorkflowGraph,
  WorkflowMessagePart,
  WorkflowMutationError,
  WorkflowNode,
  WorkflowNodeAccent,
  WorkflowNodeKind,
} from '../domain'
import type {
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowMessageDraftItem,
} from '../types'

const workflowQueryKey = ['workflow'] as const
const maximumAttachmentSize = 5 * 1024 * 1024
const commonTimezones = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function useWorkflowEditor(repository: WorkflowRepository = workflowRepository) {
  const route = useRoute()
  const router = useRouter()
  const queryClient = useQueryClient()
  const title = ref('')
  const description = ref('')
  const messageParts = ref<WorkflowMessagePart[]>([])
  const comment = ref('')
  const businessHours = ref<BusinessHour[]>([])
  const timezone = ref('')
  const attachmentError = ref<string | null>(null)
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
  const contentErrorMessages = computed(() =>
    operationErrors.value
      .filter((error) => error.path?.[0] === 'config')
      .map((error) => error.message),
  )
  const messageItems = computed<WorkflowMessageDraftItem[]>(() =>
    messageParts.value.map((part, index) => ({
      index,
      type: part.type,
      value: part.value,
      name: part.type === 'attachment' ? part.name ?? attachmentName(part.value) : '',
      isImage:
        part.type === 'attachment' &&
        (part.mimeType?.startsWith('image/') === true || isImageUrl(part.value)),
    })),
  )
  const isDirty = computed(
    () =>
      selectedNode.value !== null &&
      (title.value !== selectedNode.value.title ||
        description.value !== selectedNode.value.description ||
        hasContentChanges(selectedNode.value, {
          messageParts: messageParts.value,
          comment: comment.value,
          businessHours: businessHours.value,
          timezone: timezone.value,
        })),
  )
  const isEmpty = computed(
    () => !workflowQuery.isPending.value && !errorMessage.value && nodes.value.length === 0,
  )
  const detailsHeading = computed(() => selectedNode.value?.title ?? 'Node details')
  const detailsTypeLabel = computed(() =>
    selectedNode.value ? labelFor(selectedNode.value.kind) : '',
  )
  const timezoneOptions = computed(() =>
    Array.from(new Set([timezone.value, ...commonTimezones])).filter(Boolean),
  )

  watch(
    selectedNode,
    (node) => {
      title.value = node?.title ?? ''
      description.value = node?.description ?? ''
      messageParts.value =
        node?.kind === 'send-message' ? node.config.parts.map((part) => ({ ...part })) : []
      comment.value = node?.kind === 'add-comment' ? node.config.comment : ''
      businessHours.value =
        node?.kind === 'business-hours'
          ? node.config.hours.map((hours) => ({ ...hours }))
          : []
      timezone.value = node?.kind === 'business-hours' ? node.config.timezone : ''
      operationErrors.value = []
      attachmentError.value = null
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

  function addMessageText() {
    messageParts.value = [...messageParts.value, { type: 'text', value: '' }]
    clearContentErrors()
  }

  function updateMessageText(index: number, value: string) {
    messageParts.value = messageParts.value.map((part, partIndex) =>
      partIndex === index && part.type === 'text' ? { ...part, value } : part,
    )
    clearContentErrors()
  }

  function removeMessagePart(index: number) {
    messageParts.value = messageParts.value.filter((_, partIndex) => partIndex !== index)
    clearContentErrors()
  }

  async function addAttachments(files: FileList | null) {
    if (!files?.length) {
      return
    }

    attachmentError.value = null
    const acceptedFiles = Array.from(files).filter((file) => {
      if (file.size <= maximumAttachmentSize) {
        return true
      }

      attachmentError.value = `${file.name} exceeds the 5 MB limit`
      return false
    })

    try {
      const attachments = await Promise.all(
        acceptedFiles.map(async (file): Promise<WorkflowAttachmentPart> => ({
          type: 'attachment',
          value: await readFileAsDataUrl(file),
          name: file.name,
          mimeType: file.type,
        })),
      )

      messageParts.value = [...messageParts.value, ...attachments]
      clearContentErrors()
    } catch (error) {
      attachmentError.value =
        error instanceof Error ? error.message : 'The attachment could not be read'
    }
  }

  function updateComment(value: string) {
    comment.value = value
    clearContentErrors()
  }

  function clearComment() {
    comment.value = ''
    clearContentErrors()
  }

  function updateBusinessHour(
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) {
    businessHours.value = businessHours.value.map((hours, hoursIndex) =>
      hoursIndex === index ? { ...hours, [field]: value } : hours,
    )
    clearContentErrors()
  }

  function updateTimezone(value: string) {
    timezone.value = value
    clearContentErrors()
  }

  function saveNode() {
    if (!selectedNode.value) {
      return
    }

    operationErrors.value = []
    updateMutation.mutate(
      createUpdateInput(selectedNode.value, {
        title: title.value,
        description: description.value,
        messageParts: messageParts.value,
        comment: comment.value,
        businessHours: businessHours.value,
        timezone: timezone.value,
      }),
    )
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

  function clearContentErrors() {
    operationErrors.value = operationErrors.value.filter((error) => error.path?.[0] !== 'config')
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
      contentErrorMessages,
      isDirty,
      isSaving: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isDeleteConfirming,
      close: closeNode,
      setVisibility: setDetailsVisibility,
      updateTitle,
      updateDescription,
      sendMessage: {
        isVisible: computed(() => selectedNode.value?.kind === 'send-message'),
        items: messageItems,
        attachmentError,
        addText: addMessageText,
        updateText: updateMessageText,
        removePart: removeMessagePart,
        addAttachments,
      },
      addComment: {
        isVisible: computed(() => selectedNode.value?.kind === 'add-comment'),
        value: comment,
        update: updateComment,
        clear: clearComment,
      },
      businessHours: {
        isVisible: computed(() => selectedNode.value?.kind === 'business-hours'),
        hours: businessHours,
        timezone,
        timezoneOptions,
        updateHour: updateBusinessHour,
        updateTimezone,
      },
      save: saveNode,
      requestDelete,
      cancelDelete,
      confirmDelete,
    },
  }
}

export type WorkflowEditorController = ReturnType<typeof useWorkflowEditor>

interface NodeDraft {
  title: string
  description: string
  messageParts: WorkflowMessagePart[]
  comment: string
  businessHours: BusinessHour[]
  timezone: string
}

function createUpdateInput(node: WorkflowNode, draft: NodeDraft): UpdateWorkflowNodeInput {
  const base = {
    id: node.id,
    title: draft.title,
    description: draft.description,
  }

  if (node.kind === 'send-message') {
    return {
      ...base,
      kind: 'send-message',
      parts: draft.messageParts,
    }
  }

  if (node.kind === 'business-hours') {
    return {
      ...base,
      kind: 'business-hours',
      hours: draft.businessHours,
      timezone: draft.timezone,
    }
  }

  if (node.kind === 'add-comment') {
    return {
      ...base,
      kind: 'add-comment',
      comment: draft.comment,
    }
  }

  if (node.kind === 'trigger') {
    return {
      ...base,
      kind: 'trigger',
    }
  }

  throw new Error('Display-only nodes cannot be edited')
}

function hasContentChanges(
  node: WorkflowNode,
  draft: Omit<NodeDraft, 'title' | 'description'>,
): boolean {
  if (node.kind === 'send-message') {
    return JSON.stringify(node.config.parts) !== JSON.stringify(draft.messageParts)
  }

  if (node.kind === 'add-comment') {
    return node.config.comment !== draft.comment
  }

  if (node.kind === 'business-hours') {
    return (
      JSON.stringify(node.config.hours) !== JSON.stringify(draft.businessHours) ||
      node.config.timezone !== draft.timezone
    )
  }

  return false
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(new Error(`${file.name} could not be read`)))
    reader.readAsDataURL(file)
  })
}

function isImageUrl(value: string): boolean {
  return (
    value.startsWith('data:image/') ||
    /\.(avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(value)
  )
}

function attachmentName(value: string): string {
  try {
    const pathname = new URL(value).pathname
    return pathname.split('/').filter(Boolean).at(-1) ?? 'Attachment'
  } catch {
    return 'Attachment'
  }
}

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
