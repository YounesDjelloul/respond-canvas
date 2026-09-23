import type { DomainResult } from '@/features/shared/domain'
import type {
  UpdateWorkflowNodeInput,
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowNode,
} from './types'

export function updateWorkflowNode(
  graph: WorkflowGraph,
  input: UpdateWorkflowNodeInput,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === input.id)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', ['nodes', input.id])
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

  const title = input.title.trim()
  const description = input.description.trim()
  const errors: WorkflowMutationError[] = []

  if (!title) {
    errors.push({
      code: 'title-required',
      message: 'Title is required',
      path: ['title'],
    })
  }

  if (!description) {
    errors.push({
      code: 'description-required',
      message: 'Description is required',
      path: ['description'],
    })
  }

  errors.push(...validateNodeContent(input))

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const updatedNode = updateNodeContent(node, input, title, description)

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

export function deleteWorkflowNode(
  graph: WorkflowGraph,
  nodeId: string,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId)

  if (!node) {
    return failure('node-not-found', 'The selected node no longer exists', ['nodes', nodeId])
  }

  if (!node.editable) {
    return failure('node-read-only', 'This node is read-only', ['nodes', nodeId])
  }

  const deletedIds = collectDescendantIds(graph, nodeId)

  return {
    ok: true,
    value: {
      nodes: graph.nodes.filter((candidate) => !deletedIds.has(candidate.id)),
      edges: graph.edges.filter(
        (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
      ),
    },
  }
}

function collectDescendantIds(graph: WorkflowGraph, nodeId: string): Set<string> {
  const collectedIds = new Set([nodeId])
  let foundDescendant = true

  while (foundDescendant) {
    foundDescendant = false

    for (const node of graph.nodes) {
      if (
        node.parentId !== null &&
        collectedIds.has(node.parentId) &&
        !collectedIds.has(node.id)
      ) {
        collectedIds.add(node.id)
        foundDescendant = true
      }
    }
  }

  return collectedIds
}

function validateNodeContent(input: UpdateWorkflowNodeInput): WorkflowMutationError[] {
  if (input.kind === 'send-message') {
    if (input.parts.length === 0) {
      return [
        {
          code: 'message-content-required',
          message: 'Add at least one message or attachment',
          path: ['config', 'parts'],
        },
      ]
    }

    return input.parts.flatMap((part, index) => {
      if (part.value.trim()) {
        return []
      }

      return [
        {
          code: part.type === 'text' ? 'message-text-required' : 'attachment-required',
          message: part.type === 'text' ? 'Message text cannot be empty' : 'Attachment is required',
          path: ['config', 'parts', index, 'value'],
        },
      ]
    })
  }

  if (input.kind === 'business-hours') {
    const errors: WorkflowMutationError[] = []

    if (input.hours.length === 0) {
      errors.push({
        code: 'business-hours-required',
        message: 'Configure at least one business day',
        path: ['config', 'hours'],
      })
    }

    if (!input.timezone.trim()) {
      errors.push({
        code: 'timezone-required',
        message: 'Timezone is required',
        path: ['config', 'timezone'],
      })
    }

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

      if (!isTime(hours.startTime) || !isTime(hours.endTime)) {
        errors.push({
          code: 'business-time-invalid',
          message: 'Use a valid 24-hour time',
          path: ['config', 'hours', index],
        })
      } else if (hours.startTime >= hours.endTime) {
        errors.push({
          code: 'business-time-range-invalid',
          message: 'Opening time must be before closing time',
          path: ['config', 'hours', index],
        })
      }
    })

    return errors
  }

  return []
}

function updateNodeContent(
  node: WorkflowNode,
  input: UpdateWorkflowNodeInput,
  title: string,
  description: string,
): WorkflowNode {
  if (node.kind === 'send-message' && input.kind === 'send-message') {
    return {
      ...node,
      title,
      description,
      config: {
        parts: input.parts.map((part) => ({
          ...part,
          value: part.value.trim(),
        })),
      },
    }
  }

  if (node.kind === 'business-hours' && input.kind === 'business-hours') {
    return {
      ...node,
      title,
      description,
      config: {
        ...node.config,
        hours: input.hours.map((hours) => ({ ...hours })),
        timezone: input.timezone.trim(),
      },
    }
  }

  if (node.kind === 'add-comment' && input.kind === 'add-comment') {
    return {
      ...node,
      title,
      description,
      config: {
        comment: input.comment.trim(),
      },
    }
  }

  return {
    ...node,
    title,
    description,
  }
}

function isTime(value: string): boolean {
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
