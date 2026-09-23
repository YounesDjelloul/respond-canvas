import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import {
  deleteWorkflowNode,
  updateWorkflowNode,
  type UpdateWorkflowNodeInput,
  type WorkflowGraph,
  type WorkflowMutationError,
  type WorkflowNode,
} from '../domain'
import { workflowNodePresentationFor } from '../presentation/workflow-node-presentation'
import { useBusinessHoursDraft } from './use-business-hours-draft'
import { useSendMessageDraft } from './use-send-message-draft'

interface WorkflowNodeDetailsDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  selectedNode: MaybeRefOrGetter<WorkflowNode | null>
  applyGraph: (graph: WorkflowGraph) => void
  closeNode: (focusNodeId?: string | null) => Promise<void>
  setVisibility: (visible: boolean) => void
}

export function useWorkflowNodeDetails({
  graph,
  selectedNode,
  applyGraph,
  closeNode,
  setVisibility,
}: WorkflowNodeDetailsDependencies) {
  const title = ref('')
  const description = ref('')
  const comment = ref('')
  const operationErrors = ref<readonly WorkflowMutationError[]>([])
  const isDeleteConfirming = ref(false)
  const sendMessageDraft = useSendMessageDraft(clearContentErrors)
  const businessHoursDraft = useBusinessHoursDraft(clearContentErrors)
  const currentNode = computed(() => toValue(selectedNode))
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateWorkflowNodeInput) =>
      updateWorkflowNode(requireGraph(toValue(graph)), input),
    onSuccess: applyMutationResult,
  })
  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) =>
      deleteWorkflowNode(requireGraph(toValue(graph)), nodeId),
    onSuccess: applyMutationResult,
  })
  const titleError = computed(
    () =>
      operationErrors.value.find((error) => error.path?.[0] === 'title')?.message ??
      null,
  )
  const descriptionError = computed(
    () =>
      operationErrors.value.find((error) => error.path?.[0] === 'description')
        ?.message ?? null,
  )
  const errorMessage = computed(
    () =>
      operationErrors.value.find(
        (error) => error.path?.[0] !== 'title' && error.path?.[0] !== 'description',
      )?.message ?? null,
  )
  const contentErrorMessages = computed(() =>
    operationErrors.value
      .filter((error) => error.path?.[0] === 'config')
      .map((error) => error.message),
  )
  const isDirty = computed(() => {
    const node = currentNode.value

    return (
      node !== null &&
      (title.value !== node.title ||
        description.value !== node.description ||
        commentHasChanges(node, comment.value) ||
        sendMessageDraft.hasChanges(node) ||
        businessHoursDraft.hasChanges(node))
    )
  })
  const heading = computed(() => currentNode.value?.title ?? 'Node details')
  const typeLabel = computed(() =>
    currentNode.value
      ? workflowNodePresentationFor(currentNode.value.kind).label
      : '',
  )

  watch(
    currentNode,
    (node) => {
      title.value = node?.title ?? ''
      description.value = node?.description ?? ''
      comment.value = node?.kind === 'add-comment' ? node.config.comment : ''
      sendMessageDraft.reset(node)
      businessHoursDraft.reset(node)
      operationErrors.value = []
      isDeleteConfirming.value = false
    },
    { immediate: true },
  )

  function updateTitle(value: string) {
    title.value = value
    clearFieldError('title')
  }

  function updateDescription(value: string) {
    description.value = value
    clearFieldError('description')
  }

  function updateComment(value: string) {
    comment.value = value
    clearContentErrors()
  }

  function clearComment() {
    comment.value = ''
    clearContentErrors()
  }

  function save() {
    if (!currentNode.value) {
      return
    }

    operationErrors.value = []
    updateMutation.mutate(
      createUpdateInput(currentNode.value, {
        title: title.value,
        description: description.value,
        messageParts: sendMessageDraft.parts.value,
        comment: comment.value,
        businessHours: businessHoursDraft.hours.value,
        timezone: businessHoursDraft.timezone.value,
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
    if (!currentNode.value) {
      return
    }

    const parentId = currentNode.value.parentId
    const nodeId = currentNode.value.id

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
      applyGraph(result.value)
      operationErrors.value = []
      isDeleteConfirming.value = false
      return
    }

    operationErrors.value = result.errors
  }

  function clearFieldError(field: 'title' | 'description') {
    operationErrors.value = operationErrors.value.filter(
      (error) => error.path?.[0] !== field,
    )
  }

  function clearContentErrors() {
    operationErrors.value = operationErrors.value.filter(
      (error) => error.path?.[0] !== 'config',
    )
  }

  return {
    selectedNode: currentNode,
    isOpen: computed(() => currentNode.value !== null),
    heading,
    typeLabel,
    title,
    description,
    titleError,
    descriptionError,
    errorMessage,
    contentErrorMessages,
    isDirty,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDeleteConfirming,
    close: closeNode,
    setVisibility,
    updateTitle,
    updateDescription,
    sendMessage: {
      isVisible: computed(() => currentNode.value?.kind === 'send-message'),
      items: sendMessageDraft.items,
      attachmentError: sendMessageDraft.attachmentError,
      addText: sendMessageDraft.addText,
      updateText: sendMessageDraft.updateText,
      removePart: sendMessageDraft.removePart,
      addAttachments: sendMessageDraft.addAttachments,
    },
    addComment: {
      isVisible: computed(() => currentNode.value?.kind === 'add-comment'),
      value: comment,
      update: updateComment,
      clear: clearComment,
    },
    businessHours: {
      isVisible: computed(() => currentNode.value?.kind === 'business-hours'),
      hours: businessHoursDraft.hours,
      timezone: businessHoursDraft.timezone,
      timezoneOptions: businessHoursDraft.timezoneOptions,
      updateHour: businessHoursDraft.updateHour,
      updateTimezone: businessHoursDraft.updateTimezone,
    },
    save,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}

interface NodeDraft {
  title: string
  description: string
  messageParts: Extract<
    UpdateWorkflowNodeInput,
    { kind: 'send-message' }
  >['parts']
  comment: string
  businessHours: Extract<
    UpdateWorkflowNodeInput,
    { kind: 'business-hours' }
  >['hours']
  timezone: string
}

function createUpdateInput(
  node: WorkflowNode,
  draft: NodeDraft,
): UpdateWorkflowNodeInput {
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

  return {
    ...base,
    kind: 'trigger',
  }
}

function commentHasChanges(node: WorkflowNode, comment: string): boolean {
  return node.kind === 'add-comment' && node.config.comment !== comment
}

function requireGraph(graph: WorkflowGraph | null): WorkflowGraph {
  if (!graph) {
    throw new Error('The workflow is not available')
  }

  return graph
}
