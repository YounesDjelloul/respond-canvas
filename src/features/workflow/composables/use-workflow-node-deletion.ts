import { computed, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import {
  canQuickDeleteWorkflowNode,
  countWorkflowNodeDescendants,
  deleteWorkflowNode,
  type WorkflowGraph,
} from '../domain'

interface WorkflowNodeDeletionDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  applyGraph: (graph: WorkflowGraph) => void
  closeNode: (focusNodeId?: string | null) => Promise<void>
}

export function useWorkflowNodeDeletion({
  graph,
  applyGraph,
  closeNode,
}: WorkflowNodeDeletionDependencies) {
  const pendingNodeId = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)
  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) =>
      deleteWorkflowNode(requireGraph(toValue(graph)), nodeId),
  })
  const pendingNode = computed(
    () =>
      toValue(graph)?.nodes.find((node) => node.id === pendingNodeId.value) ?? null,
  )
  const followingStepCount = computed(() => {
    const currentGraph = toValue(graph)
    const node = pendingNode.value

    return currentGraph && node ? countWorkflowNodeDescendants(currentGraph, node.id) : 0
  })
  const message = computed(() => {
    const count = followingStepCount.value

    if (count === 0) {
      return 'This step will be removed from the workflow.'
    }

    return `This step and the ${count} ${count === 1 ? 'step' : 'steps'} after it will be removed.`
  })

  function request(nodeId: string) {
    const node = toValue(graph)?.nodes.find((candidate) => candidate.id === nodeId)

    if (!node || !canQuickDeleteWorkflowNode(node)) {
      return
    }

    errorMessage.value = null
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

        applyGraph(result.value)
        pendingNodeId.value = null
        errorMessage.value = null
        void closeNode(node.parentId)
      },
    })
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
    cancel,
    confirm,
    setVisibility,
  }
}

function requireGraph(graph: WorkflowGraph | null): WorkflowGraph {
  if (!graph) {
    throw new Error('The workflow is not available')
  }

  return graph
}
