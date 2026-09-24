import { computed, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import {
  groupWorkflowReadinessIssues,
  validateWorkflowReadiness,
  type WorkflowGraph,
  type WorkflowReadinessError,
} from '../domain'
import {
  workflowAccentPresentationFor,
  workflowNodePresentationFor,
} from '../presentation/workflow-node-presentation'
import type { WorkflowReadinessGroupView } from '../types'

interface WorkflowReadinessDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  openNode: (nodeId: string) => void
  openCreationAfter: (nodeId: string) => void
}

export function useWorkflowReadiness({
  graph,
  openNode,
  openCreationAfter,
}: WorkflowReadinessDependencies) {
  const isOpen = ref(false)
  const result = computed(() => {
    const currentGraph = toValue(graph)
    return currentGraph ? validateWorkflowReadiness(currentGraph) : null
  })
  const issueGroups = computed(() => {
    const currentGraph = toValue(graph)
    const currentResult = result.value

    return currentGraph && currentResult && !currentResult.ok
      ? groupWorkflowReadinessIssues(currentGraph, currentResult.errors)
      : []
  })
  const issueCount = computed(() =>
    issueGroups.value.reduce((count, group) => count + group.issues.length, 0),
  )
  const groups = computed<WorkflowReadinessGroupView[]>(() =>
    issueGroups.value.map((group) => {
      const title = group.node?.title ?? 'Workflow'

      return {
        key: group.node?.id ?? 'workflow',
        title,
        icon: group.node ? workflowNodePresentationFor(group.node.kind).icon : null,
        iconClass: group.node
          ? workflowAccentPresentationFor(group.node.accent).iconClass
          : 'bg-amber-50 text-amber-600',
        messages: group.issues.map((issue) => issue.message),
        fixLabel: fixLabels[group.fix],
        fixAriaLabel:
          group.fix === 'open-node'
            ? `Open ${title}`
            : group.fix === 'add-step'
              ? `Add a step after ${title}`
              : null,
      }
    }),
  )
  const issueCounts = computed(
    () =>
      new Map(
        issueGroups.value.flatMap((group) =>
          group.node ? [[group.node.id, group.issues.length] as const] : [],
        ),
      ),
  )

  function setOpen(open: boolean) {
    isOpen.value = open && issueCount.value > 0
  }

  function applyFix(key: string) {
    const group = issueGroups.value.find((candidate) => candidate.node?.id === key)

    if (!group?.node || group.fix === 'none') {
      return
    }

    isOpen.value = false

    if (group.fix === 'open-node') {
      openNode(group.node.id)
      return
    }

    openCreationAfter(group.node.id)
  }

  function fieldErrorsFor(nodeId: string): WorkflowReadinessError[] {
    const group = issueGroups.value.find((candidate) => candidate.node?.id === nodeId)

    return (group?.issues ?? []).flatMap((issue) =>
      issue.fieldPath.length > 0
        ? [{ code: issue.code, message: issue.message, path: issue.fieldPath }]
        : [],
    )
  }

  return {
    isReady: computed(() => result.value?.ok === true),
    hasIssues: computed(() => issueCount.value > 0),
    label: computed(() => {
      if (!result.value) {
        return 'Checking workflow'
      }

      if (result.value.ok) {
        return 'Workflow ready'
      }

      return `${issueCount.value} ${issueCount.value === 1 ? 'issue' : 'issues'}`
    }),
    summary: computed(
      () =>
        `${issueCount.value} ${issueCount.value === 1 ? 'issue' : 'issues'} to fix before this workflow is ready`,
    ),
    isOpen,
    groups,
    issueCounts,
    setOpen,
    applyFix,
    fieldErrorsFor,
  }
}

const fixLabels = {
  'open-node': 'Open step',
  'add-step': 'Add step',
  none: null,
} as const
