import { computed, nextTick, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorkflowGraph } from '../domain'

export function useWorkflowSelection(
  graph: MaybeRefOrGetter<WorkflowGraph | null>,
  isLoading: MaybeRefOrGetter<boolean>,
) {
  const route = useRoute()
  const router = useRouter()
  const lastFocusedNodeId = ref<string | null>(null)
  const routeNodeId = computed(() => {
    const nodeId = route.params.nodeId
    return typeof nodeId === 'string' ? nodeId : null
  })
  const routeNode = computed(
    () =>
      toValue(graph)?.nodes.find((node) => node.id === routeNodeId.value) ?? null,
  )
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
    const node = toValue(graph)?.nodes.find((candidate) => candidate.id === nodeId)

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

  return {
    selectedNode,
    openNode,
    closeNode,
    setDetailsVisibility,
  }
}

function focusNode(nodeId: string) {
  const node = Array.from(
    document.querySelectorAll<HTMLElement>('[data-workflow-node-id]'),
  ).find((element) => element.dataset.workflowNodeId === nodeId)

  node?.focus()
}
