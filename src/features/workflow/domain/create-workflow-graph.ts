import { z } from 'zod'
import type { DomainResult } from '@/features/shared/domain'
import type {
  WorkflowGraph,
  WorkflowGraphError,
  WorkflowNode,
} from './types'
import { assembleWorkflowGraph } from './assemble-workflow-graph'

const sourceIdSchema = z.union([z.string().min(1), z.number().finite()])

const sourceNodeSchema = z.object({
  id: sourceIdSchema,
  parentId: sourceIdSchema,
  type: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
})

const sourcePayloadSchema = z.array(sourceNodeSchema)

const triggerDataSchema = z.object({
  type: z.string().min(1),
  oncePerContact: z.boolean(),
})

const messagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('attachment'),
    attachment: z.string().min(1),
  }),
])

const sendMessageDataSchema = z.object({
  payload: z.array(messagePartSchema),
})

const businessHoursDataSchema = z.object({
  times: z.array(
    z.object({
      day: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
    }),
  ),
  connectors: z.array(sourceIdSchema),
  timezone: z.string().min(1),
  action: z.literal('businessHours').optional(),
})

const branchDataSchema = z.object({
  connectorType: z.enum(['success', 'failure']),
})

const commentDataSchema = z.object({
  comment: z.string(),
})

type SourceNode = z.infer<typeof sourceNodeSchema>
type NodeNormalizationResult =
  | { ok: true; node: WorkflowNode }
  | { ok: false; errors: WorkflowGraphError[] }

export function createWorkflowGraph(
  payload: unknown,
): DomainResult<WorkflowGraph, WorkflowGraphError> {
  const payloadResult = sourcePayloadSchema.safeParse(payload)

  if (!payloadResult.success) {
    return {
      ok: false,
      errors: payloadResult.error.issues.map((issue) => ({
        code: 'invalid-payload',
        path: normalizePath(issue.path),
        message: issue.message,
      })),
    }
  }

  const normalizationResults = payloadResult.data.map(normalizeNode)
  const errors = normalizationResults.flatMap((result) => (result.ok ? [] : result.errors))

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const nodes = normalizationResults.flatMap((result) => (result.ok ? [result.node] : []))
  const relationshipErrors = validateRelationships(nodes)

  if (relationshipErrors.length > 0) {
    return { ok: false, errors: relationshipErrors }
  }

  return {
    ok: true,
    value: assembleWorkflowGraph(nodes),
  }
}

function normalizeNode(sourceNode: SourceNode): NodeNormalizationResult {
  const id = String(sourceNode.id)
  const parentId = sourceNode.parentId === -1 ? null : String(sourceNode.parentId)

  if (sourceNode.type === 'trigger') {
    return normalizeTriggerNode(sourceNode, id, parentId)
  }

  if (sourceNode.type === 'sendMessage') {
    return normalizeSendMessageNode(sourceNode, id, parentId)
  }

  if (sourceNode.type === 'dateTime' || sourceNode.type === 'businessHours') {
    return normalizeBusinessHoursNode(sourceNode, id, parentId)
  }

  if (sourceNode.type === 'dateTimeConnector') {
    return normalizeBranchNode(sourceNode, id, parentId)
  }

  if (sourceNode.type === 'addComment') {
    return normalizeAddCommentNode(sourceNode, id, parentId)
  }

  return {
    ok: false,
    errors: [
      {
        code: 'unsupported-node-type',
        path: ['nodes', id, 'type'],
        message: `Unsupported node type: ${sourceNode.type}`,
      },
    ],
  }
}

function normalizeTriggerNode(
  sourceNode: SourceNode,
  id: string,
  parentId: string | null,
): NodeNormalizationResult {
  const dataResult = triggerDataSchema.safeParse(sourceNode.data)

  if (!dataResult.success) {
    return invalidNodeData(id, dataResult.error)
  }

  const title = sourceNode.name ?? humanize(dataResult.data.type)

  return {
    ok: true,
    node: {
      id,
      parentId,
      kind: 'trigger',
      title,
      description: sourceNode.description ?? title,
      editable: true,
      accent: 'violet',
      position: { x: 0, y: 0 },
      config: {
        eventType: dataResult.data.type,
        oncePerContact: dataResult.data.oncePerContact,
      },
    },
  }
}

function normalizeSendMessageNode(
  sourceNode: SourceNode,
  id: string,
  parentId: string | null,
): NodeNormalizationResult {
  const dataResult = sendMessageDataSchema.safeParse(sourceNode.data)

  if (!dataResult.success) {
    return invalidNodeData(id, dataResult.error)
  }

  const parts = dataResult.data.payload.map((part) => ({
    type: part.type,
    value: part.type === 'text' ? part.text : part.attachment,
  }))
  const firstText = parts.find((part) => part.type === 'text')?.value

  return {
    ok: true,
    node: {
      id,
      parentId,
      kind: 'send-message',
      title: sourceNode.name ?? 'Send message',
      description: sourceNode.description ?? firstText ?? 'Attachment',
      editable: true,
      accent: 'green',
      position: { x: 0, y: 0 },
      config: { parts },
    },
  }
}

function normalizeBusinessHoursNode(
  sourceNode: SourceNode,
  id: string,
  parentId: string | null,
): NodeNormalizationResult {
  const dataResult = businessHoursDataSchema.safeParse(sourceNode.data)

  if (!dataResult.success) {
    return invalidNodeData(id, dataResult.error)
  }

  const firstHours = dataResult.data.times[0]
  const schedule = firstHours
    ? `${firstHours.startTime}–${firstHours.endTime} · ${dataResult.data.timezone}`
    : dataResult.data.timezone

  return {
    ok: true,
    node: {
      id,
      parentId,
      kind: 'business-hours',
      title: sourceNode.name ?? 'Business hours',
      description: sourceNode.description ?? schedule,
      editable: true,
      accent: 'orange',
      position: { x: 0, y: 0 },
      config: {
        hours: dataResult.data.times,
        timezone: dataResult.data.timezone,
        connectorIds: dataResult.data.connectors.map(String),
      },
    },
  }
}

function normalizeBranchNode(
  sourceNode: SourceNode,
  id: string,
  parentId: string | null,
): NodeNormalizationResult {
  const dataResult = branchDataSchema.safeParse(sourceNode.data)

  if (!dataResult.success) {
    return invalidNodeData(id, dataResult.error)
  }

  const isSuccess = dataResult.data.connectorType === 'success'

  return {
    ok: true,
    node: {
      id,
      parentId,
      kind: 'branch',
      title: sourceNode.name ?? humanize(dataResult.data.connectorType),
      description:
        sourceNode.description ??
        (isSuccess ? 'Conditions matched' : 'Conditions did not match'),
      editable: false,
      accent: isSuccess ? 'green' : 'neutral',
      position: { x: 0, y: 0 },
      config: {
        outcome: dataResult.data.connectorType,
      },
    },
  }
}

function normalizeAddCommentNode(
  sourceNode: SourceNode,
  id: string,
  parentId: string | null,
): NodeNormalizationResult {
  const dataResult = commentDataSchema.safeParse(sourceNode.data)

  if (!dataResult.success) {
    return invalidNodeData(id, dataResult.error)
  }

  return {
    ok: true,
    node: {
      id,
      parentId,
      kind: 'add-comment',
      title: sourceNode.name ?? 'Add comment',
      description: sourceNode.description ?? dataResult.data.comment,
      editable: true,
      accent: 'blue',
      position: { x: 0, y: 0 },
      config: {
        comment: dataResult.data.comment,
      },
    },
  }
}

function invalidNodeData(
  id: string,
  error: z.ZodError,
): { ok: false; errors: WorkflowGraphError[] } {
  return {
    ok: false,
    errors: error.issues.map((issue) => ({
      code: 'invalid-node-data',
      path: ['nodes', id, 'data', ...normalizePath(issue.path)],
      message: issue.message,
    })),
  }
}

function validateRelationships(nodes: WorkflowNode[]): WorkflowGraphError[] {
  const nodeIds = new Set(nodes.map((node) => node.id))

  return [
    ...findDuplicateIdErrors(nodes),
    ...findMissingParentErrors(nodes, nodeIds),
    ...findMissingRootErrors(nodes),
    ...findCycleErrors(nodes),
  ]
}

function findDuplicateIdErrors(nodes: WorkflowNode[]): WorkflowGraphError[] {
  const errors: WorkflowGraphError[] = []
  const seenIds = new Set<string>()

  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      errors.push({
        code: 'duplicate-node-id',
        path: ['nodes', node.id, 'id'],
        message: 'Node IDs must be unique',
      })
    }

    seenIds.add(node.id)
  }

  return errors
}

function findMissingParentErrors(
  nodes: WorkflowNode[],
  nodeIds: Set<string>,
): WorkflowGraphError[] {
  const errors: WorkflowGraphError[] = []

  for (const node of nodes) {
    if (node.parentId !== null && !nodeIds.has(node.parentId)) {
      errors.push({
        code: 'missing-parent',
        path: ['nodes', node.id, 'parentId'],
        message: `Parent node ${node.parentId} does not exist`,
      })
    }
  }

  return errors
}

function findMissingRootErrors(nodes: WorkflowNode[]): WorkflowGraphError[] {
  return nodes.some((node) => node.parentId === null)
    ? []
    : [
        {
          code: 'missing-root',
          path: ['nodes'],
          message: 'The workflow must contain a root node',
        },
      ]
}

function findCycleErrors(nodes: WorkflowNode[]): WorkflowGraphError[] {
  const errors: WorkflowGraphError[] = []
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  for (const node of nodes) {
    const visited = new Set<string>([node.id])
    let parentId = node.parentId

    while (parentId !== null) {
      if (visited.has(parentId)) {
        errors.push({
          code: 'cyclic-relationship',
          path: ['nodes', node.id],
          message: 'Workflow relationships must be acyclic',
        })
        break
      }

      visited.add(parentId)
      parentId = nodesById.get(parentId)?.parentId ?? null
    }
  }

  return errors
}

function humanize(value: string): string {
  const words = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function normalizePath(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((segment) =>
    typeof segment === 'symbol' ? segment.description ?? segment.toString() : segment,
  )
}
