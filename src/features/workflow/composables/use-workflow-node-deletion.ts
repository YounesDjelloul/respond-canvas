import { computed, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import {
  canQuickDeleteWorkflowNode,
  collectWorkflowSubtreeIds,
  deleteWorkflowNode,
  type WorkflowGraph,
  type WorkflowGraphIndex,
  type WorkflowNode,
} from '../domain'

interface WorkflowNodeDeletionDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  index: MaybeRefOrGetter<WorkflowGraphIndex | null>
  applyGraph: (graph: WorkflowGraph, label: string) => void
  closeNode: (focusNodeId?: string | null) => Promise<void>
}

export function useWorkflowNodeDeletion({
  graph,
  index,
  applyGraph,
  closeNode,
}: WorkflowNodeDeletionDependencies) {
  const pendingNodeId = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)
  const hasDeletedPendingNode = ref(false)
  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) =>
      deleteWorkflowNode(requireGraph(toValue(graph)), nodeId),
  })
  const pendingNode = computed(() => {
    const nodeId = pendingNodeId.value
    return nodeId ? (toValue(index)?.nodesById.get(nodeId) ?? null) : null
  })
  const followingStepCount = computed(() => {
    const currentIndex = toValue(index)
    const node = pendingNode.value

    return currentIndex && node ? collectWorkflowSubtreeIds(currentIndex, node.id).size - 1 : 0
  })
  const message = computed(() => {
    const count = followingStepCount.value

    if (pendingNode.value?.parentId === null) {
      return 'This removes the trigger and the entire workflow.'
    }

    if (count === 0) {
      return 'This step will be removed from the workflow.'
    }

    return `This step and the ${count} ${count === 1 ? 'step' : 'steps'} after it will be removed.`
  })

  function request(nodeId: string) {
    openConfirmation(nodeId, canQuickDeleteWorkflowNode)
  }

  function requestFromDetails(nodeId: string) {
    openConfirmation(nodeId, (node) => node.editable)
  }

  function openConfirmation(
    nodeId: string,
    isAllowed: (node: WorkflowNode) => boolean,
  ) {
    const node = toValue(index)?.nodesById.get(nodeId)

    if (!node || !isAllowed(node)) {
      return
    }

    errorMessage.value = null
    hasDeletedPendingNode.value = false
    pendingNodeId.value = nodeId
  }

  function cancel() {
    if (deleteMutation.isPending.value) {
      return
    }

    pendingNodeId.value = null
    errorMessage.value = null
  }

  function setVisibility(visible: boolean) {
    if (!visible) {
      cancel()
    }
  }

  function confirm() {
    const node = pendingNode.value

    if (!node || deleteMutation.isPending.value) {
      return
    }

    deleteMutation.mutate(node.id, {
      onSuccess: (result) => {
        if (!result.ok) {
          errorMessage.value =
            result.errors[0]?.message ?? 'This step could not be deleted'
          return
        }

        applyGraph(result.value, `Delete ${node.title}`)
        hasDeletedPendingNode.value = true
        pendingNodeId.value = null
        errorMessage.value = null
        void closeNode(node.parentId)
      },
    })
  }

  function handleCloseAutoFocus(event: Event) {
    if (hasDeletedPendingNode.value) {
      event.preventDefault()
    }
  }

  return {
    isOpen: computed(() => pendingNode.value !== null),
    title: computed(() =>
      pendingNode.value ? `Delete “${pendingNode.value.title}”?` : '',
    ),
    message,
    errorMessage,
    isDeleting: deleteMutation.isPending,
    confirmLabel: computed(() =>
      deleteMutation.isPending.value ? 'Deleting…' : 'Delete',
    ),
    request,
    requestFromDetails,
    cancel,
    confirm,
    setVisibility,
    handleCloseAutoFocus,
  }
}

function requireGraph(graph: WorkflowGraph | null): WorkflowGraph {
  if (!graph) {
    throw new Error('The workflow is not available')
  }

  return graph
}
