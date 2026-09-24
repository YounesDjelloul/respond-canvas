import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import { createWorkflowGraph, indexWorkflowGraph } from '../domain'
import type { WorkflowGraph } from '../domain'

const workflowQueryKey = ['workflow'] as const

export function useWorkflowGraph(
  repository: WorkflowRepository = workflowRepository,
) {
  const queryClient = useQueryClient()
  const workflowQuery = useQuery({
    queryKey: workflowQueryKey,
    queryFn: async () => createWorkflowGraph(await repository.getWorkflow()),
    structuralSharing: false,
  })
  const graph = computed(() => {
    const result = workflowQuery.data.value
    return result?.ok ? result.value : null
  })
  const index = computed(() => (graph.value ? indexWorkflowGraph(graph.value) : null))
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
    () =>
      !workflowQuery.isPending.value &&
      !errorMessage.value &&
      graph.value?.nodes.length === 0,
  )
  function applyGraph(updatedGraph: WorkflowGraph) {
    queryClient.setQueryData(workflowQueryKey, {
      ok: true,
      value: updatedGraph,
    })
  }

  return {
    graph,
    index,
    status: {
      errorMessage,
      isEmpty,
      isLoading: workflowQuery.isPending,
    },
    applyGraph,
  }
}
