import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { workflowRepository } from '../data/workflow-repository'
import type { WorkflowRepository } from '../data/types'
import { createWorkflowGraph, validateWorkflowReadiness } from '../domain'
import type { WorkflowGraph } from '../domain'

const workflowQueryKey = ['workflow'] as const

export function useWorkflowGraph(
  repository: WorkflowRepository = workflowRepository,
) {
  const queryClient = useQueryClient()
  const workflowQuery = useQuery({
    queryKey: workflowQueryKey,
    queryFn: async () => createWorkflowGraph(await repository.getWorkflow()),
  })
  const graph = computed(() => {
    const result = workflowQuery.data.value
    return result?.ok ? result.value : null
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
    () =>
      !workflowQuery.isPending.value &&
      !errorMessage.value &&
      graph.value?.nodes.length === 0,
  )
  const readinessResult = computed(() =>
    graph.value ? validateWorkflowReadiness(graph.value) : null,
  )
  const readinessLabel = computed(() => {
    const result = readinessResult.value

    if (!result) {
      return 'Checking workflow'
    }

    if (result.ok) {
      return 'Workflow ready'
    }

    const issueCount = result.errors.length
    return `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`
  })
  const readinessTitle = computed(() => {
    const result = readinessResult.value
    return result && !result.ok
      ? result.errors.map((error) => error.message).join('\n')
      : 'All workflow checks passed'
  })
  const readinessSeverity = computed<'success' | 'warn'>(() =>
    readinessResult.value?.ok ? 'success' : 'warn',
  )

  function applyGraph(updatedGraph: WorkflowGraph) {
    queryClient.setQueryData(workflowQueryKey, {
      ok: true,
      value: updatedGraph,
    })
  }

  return {
    graph,
    status: {
      errorMessage,
      isEmpty,
      isLoading: workflowQuery.isPending,
      readinessLabel,
      readinessTitle,
      readinessSeverity,
    },
    applyGraph,
  }
}
