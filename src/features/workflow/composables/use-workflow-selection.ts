import { computed, nextTick, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorkflowGraphIndex } from '../domain'

export function useWorkflowSelection(
  index: MaybeRefOrGetter<WorkflowGraphIndex | null>,
  isLoading: MaybeRefOrGetter<boolean>,
  revealNode: (nodeId: string) => Promise<void>,
) {
  const route = useRoute()
  const router = useRouter()
  const lastFocusedNodeId = ref<string | null>(null)
  const routeNodeId = computed(() => {
    const nodeId = route.params.nodeId
    return typeof nodeId === 'string' ? nodeId : null
  })
  const routeNode = computed(() => {
    const nodeId = routeNodeId.value
    return nodeId ? (toValue(index)?.nodesById.get(nodeId) ?? null) : null
  })
  const selectedNode = computed(() => {
    const node = routeNode.value
    return node?.editable ? node : null
  })

  watch(
    [() => toValue(isLoading), routeNodeId, routeNode],
    ([loading, nodeId, node]) => {
      if (!loading && nodeId && (!node || !node.editable)) {
        void router.replace({ name: 'workflow' })
      }
    },
    { immediate: true },
  )

  function openNode(nodeId: string) {
    const node = toValue(index)?.nodesById.get(nodeId)

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
      await focusNode(focusNodeId)
    }
  }

  async function focusNode(nodeId: string) {
    const renderedNode = findRenderedNode(nodeId)

    if (renderedNode) {
      renderedNode.focus()
      return
    }

    await revealNode(nodeId)
    findRenderedNode(nodeId)?.focus()
  }

  function setDetailsVisibility(visible: boolean) {
    if (!visible) {
      void closeNode()
    }
  }

  return {
    selectedNode,
    openNode,
    closeNode,
    setDetailsVisibility,
  }
}

function findRenderedNode(nodeId: string): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-workflow-node-id]'),
  ).find((element) => element.dataset.workflowNodeId === nodeId)
}
