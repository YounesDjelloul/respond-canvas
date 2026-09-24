import { computed, nextTick, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import {
  errorMessageAt,
  errorMessageOutside,
  errorMessagesAt,
  withoutErrorsUnder,
} from '@/features/shared/domain'
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
  const editingField = ref<'title' | 'description' | null>(null)
  const fieldValueBeforeEditing = ref('')
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
  const titleError = computed(() => errorMessageAt(operationErrors.value, ['title']))
  const descriptionError = computed(() =>
    errorMessageAt(operationErrors.value, ['description']),
  )
  const errorMessage = computed(() =>
    errorMessageOutside(operationErrors.value, ['title', 'description', 'config']),
  )
  const messageItems = computed(() =>
    sendMessageDraft.items.value.map((item) => ({
      ...item,
      error: errorMessageAt(operationErrors.value, ['config', 'parts', item.index]),
    })),
  )
  const textItems = computed(() =>
    messageItems.value.filter((item) => item.type === 'text'),
  )
  const attachmentItems = computed(() =>
    messageItems.value.filter((item) => item.type === 'attachment'),
  )
  const messageContentError = computed(() =>
    errorMessageAt(operationErrors.value, ['config', 'parts']),
  )
  const businessHoursError = computed(() =>
    errorMessageAt(operationErrors.value, ['config', 'hours']),
  )
  const businessHourErrorMessages = computed(() =>
    businessHoursDraft.hours.value.map((_, index) =>
      errorMessagesAt(operationErrors.value, ['config', 'hours', index]),
    ),
  )
  const timezoneError = computed(() =>
    errorMessageAt(operationErrors.value, ['config', 'timezone']),
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
  const typeLabel = computed(() =>
    currentNode.value
      ? workflowNodePresentationFor(currentNode.value.kind).label
      : '',
  )
  const deleteButtonLabel = computed(() => {
    if (deleteMutation.isPending.value) {
      return 'Deleting…'
    }

    return isDeleteConfirming.value ? 'Confirm delete' : 'Delete'
  })

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
      editingField.value = null
      fieldValueBeforeEditing.value = ''
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

  async function startEditing(field: 'title' | 'description') {
    fieldValueBeforeEditing.value =
      field === 'title' ? title.value : description.value
    editingField.value = field
    await nextTick()

    const input = document.getElementById(
      field === 'title' ? 'node-title' : 'node-description',
    )

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }

  function finishEditing(field: 'title' | 'description') {
    if (editingField.value === field) {
      editingField.value = null
    }
  }

  function cancelEditing(field: 'title' | 'description') {
    if (editingField.value !== field) {
      return
    }

    if (field === 'title') {
      updateTitle(fieldValueBeforeEditing.value)
    } else {
      updateDescription(fieldValueBeforeEditing.value)
    }

    editingField.value = null
  }

  function handleDescriptionKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelEditing('description')
      return
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      finishEditing('description')
    }
  }

  function focusDetailsPanel(event: Event) {
    event.preventDefault()

    if (event.target instanceof HTMLElement) {
      event.target.focus()
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

  function handleDeleteAction() {
    if (isDeleteConfirming.value) {
      confirmDelete()
      return
    }

    requestDelete()
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
    operationErrors.value = withoutErrorsUnder(operationErrors.value, [field])
  }

  function clearContentErrors() {
    operationErrors.value = withoutErrorsUnder(operationErrors.value, ['config'])
  }

  return {
    selectedNode: currentNode,
    isOpen: computed(() => currentNode.value !== null),
    typeLabel,
    title,
    description,
    titleError,
    descriptionError,
    errorMessage,
    isEditingTitle: computed(() => editingField.value === 'title'),
    isEditingDescription: computed(() => editingField.value === 'description'),
    isDirty,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDeleteConfirming,
    deleteButtonLabel,
    close: closeNode,
    setVisibility,
    focusDetailsPanel,
    updateTitle,
    updateDescription,
    startEditing,
    finishEditing,
    cancelEditing,
    handleDescriptionKeydown,
    sendMessage: {
      isVisible: computed(() => currentNode.value?.kind === 'send-message'),
      textItems,
      attachmentItems,
      hasContent: computed(() => messageItems.value.length > 0),
      contentError: messageContentError,
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
      hoursError: businessHoursError,
      hourErrorMessages: businessHourErrorMessages,
      timezone: businessHoursDraft.timezone,
      timezoneError,
      timezoneOptions: businessHoursDraft.timezoneOptions,
      updateHour: businessHoursDraft.updateHour,
      updateTimezone: businessHoursDraft.updateTimezone,
    },
    save,
    requestDelete,
    cancelDelete,
    confirmDelete,
    handleDeleteAction,
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
