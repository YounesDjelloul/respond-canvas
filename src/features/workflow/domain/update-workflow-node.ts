import type { DomainResult } from '@/features/shared/domain'
import type {
  UpdateWorkflowNodeInput,
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowNode,
} from './types'
import {
  sanitizeWorkflowComment,
  validateWorkflowBusinessHoursFields,
  validateWorkflowMessageFields,
  validateWorkflowNodeFields,
} from './validate-workflow-fields'

export function updateWorkflowNode(
  graph: WorkflowGraph,
  input: UpdateWorkflowNodeInput,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === input.id)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', [
      'nodes',
      input.id,
    ])
  }

  if (!node.editable) {
    return failure('node-read-only', 'This node is read-only', ['nodes', input.id])
  }

  if (node.kind !== input.kind) {
    return failure(
      'node-kind-mismatch',
      'The submitted details do not match the selected node type',
      ['nodes', input.id, 'kind'],
    )
  }

  const inputResult = validateAndNormalizeUpdateInput(input)

  if (!inputResult.ok) {
    return inputResult
  }

  const updatedNode = updateNodeContent(node, inputResult.value)

  return {
    ok: true,
    value: {
      ...graph,
      nodes: graph.nodes.map((candidate) =>
        candidate.id === input.id ? updatedNode : candidate,
      ),
    },
  }
}

function validateAndNormalizeUpdateInput(
  input: UpdateWorkflowNodeInput,
): DomainResult<UpdateWorkflowNodeInput, WorkflowMutationError> {
  const detailsResult = validateWorkflowNodeFields(input)
  const detailErrors = detailsResult.ok ? [] : detailsResult.errors

  if (input.kind === 'send-message') {
    const messageResult = validateWorkflowMessageFields(input.parts)
    const errors = [
      ...detailErrors,
      ...(messageResult.ok ? [] : messageResult.errors),
    ]

    if (!detailsResult.ok || !messageResult.ok) {
      return { ok: false, errors }
    }

    return {
      ok: true,
      value: {
        ...input,
        ...detailsResult.value,
        parts: messageResult.value,
      },
    }
  }

  if (input.kind === 'business-hours') {
    const fieldResult = validateWorkflowBusinessHoursFields(input)
    const businessRuleErrors = validateBusinessHourRules(input)
    const errors = [
      ...detailErrors,
      ...(fieldResult.ok ? [] : fieldResult.errors),
      ...businessRuleErrors,
    ]

    if (!detailsResult.ok || !fieldResult.ok || businessRuleErrors.length > 0) {
      return { ok: false, errors }
    }

    return {
      ok: true,
      value: {
        ...input,
        ...detailsResult.value,
        ...fieldResult.value,
      },
    }
  }

  if (!detailsResult.ok) {
    return detailsResult
  }

  return {
    ok: true,
    value:
      input.kind === 'add-comment'
        ? {
            ...input,
            ...detailsResult.value,
            comment: sanitizeWorkflowComment(input.comment),
          }
        : {
            ...input,
            ...detailsResult.value,
          },
  }
}

function validateBusinessHourRules(
  input: Extract<UpdateWorkflowNodeInput, { kind: 'business-hours' }>,
): WorkflowMutationError[] {
  const errors: WorkflowMutationError[] = []

  const seenDays = new Set<string>()

  input.hours.forEach((hours, index) => {
    if (seenDays.has(hours.day)) {
      errors.push({
        code: 'business-day-duplicate',
        message: `${hours.day} is configured more than once`,
        path: ['config', 'hours', index, 'day'],
      })
    }

    seenDays.add(hours.day)

    if (
      isComparableTime(hours.startTime) &&
      isComparableTime(hours.endTime) &&
      hours.startTime >= hours.endTime
    ) {
      errors.push({
        code: 'business-time-range-invalid',
        message: 'Opening time must be before closing time',
        path: ['config', 'hours', index],
      })
    }
  })

  return errors
}

function updateNodeContent(
  node: WorkflowNode,
  input: UpdateWorkflowNodeInput,
): WorkflowNode {
  if (node.kind === 'send-message' && input.kind === 'send-message') {
    return {
      ...node,
      title: input.title,
      description: input.description,
      config: {
        parts: input.parts.map((part) => ({ ...part })),
      },
    }
  }

  if (node.kind === 'business-hours' && input.kind === 'business-hours') {
    return {
      ...node,
      title: input.title,
      description: input.description,
      config: {
        ...node.config,
        hours: input.hours.map((hours) => ({ ...hours })),
        timezone: input.timezone,
      },
    }
  }

  if (node.kind === 'add-comment' && input.kind === 'add-comment') {
    return {
      ...node,
      title: input.title,
      description: input.description,
      config: {
        comment: input.comment,
      },
    }
  }

  return {
    ...node,
    title: input.title,
    description: input.description,
  }
}

function isComparableTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function failure(
  code: WorkflowMutationError['code'],
  message: string,
  path: readonly (string | number)[],
): DomainResult<never, WorkflowMutationError> {
  return {
    ok: false,
    errors: [{ code, message, path }],
  }
}
