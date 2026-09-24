import type { DomainResult } from '@/features/shared/domain'
import { collectWorkflowSubtreeIds, indexWorkflowGraph } from './index-workflow-graph'
import { WORKFLOW_LAYOUT_SPACING } from './layout-workflow'
import {
  validateWorkflowBusinessHoursFields,
  validateWorkflowNodeFields,
} from './validate-workflow-fields'
import type {
  InsertWorkflowNodeInput,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowMutationError,
  WorkflowNode,
  WorkflowPosition,
} from './types'

const defaultBusinessHours = ['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => ({
  day,
  startTime: '09:00',
  endTime: '17:00',
}))

interface ResolvedInsertionPoint {
  source: WorkflowNode
  target: WorkflowNode | null
}

interface ValidatedInsertionFields {
  title: string
  description: string
  timezone: string | null
}

export function insertWorkflowNode(
  graph: WorkflowGraph,
  input: InsertWorkflowNodeInput,
): DomainResult<WorkflowGraph, WorkflowMutationError> {
  const insertionPointResult = resolveInsertionPoint(graph, input)

  if (!insertionPointResult.ok) {
    return insertionPointResult
  }

  const fieldsResult = validateInsertionDetails(input)
  const idErrors = validateInsertionIds(graph, input)
  const errors = [
    ...idErrors,
    ...(fieldsResult.ok ? [] : fieldsResult.errors),
  ]

  if (!fieldsResult.ok || idErrors.length > 0) {
    return { ok: false, errors }
  }

  const { source, target } = insertionPointResult.value
  const anchor = target?.position ?? {
    x: source.position.x,
    y: source.position.y + WORKFLOW_LAYOUT_SPACING.vertical,
  }
  const insertedNodes = createInsertedNodeGroup(
    input,
    source.id,
    anchor,
    fieldsResult.value,
  )
  const nextTargetParentId =
    input.kind === 'business-hours' ? input.successConnectorId : input.id

  return {
    ok: true,
    value: {
      nodes: [
        ...moveInsertionTarget(graph, target, nextTargetParentId, input.kind),
        ...insertedNodes,
      ],
      edges: [
        ...graph.edges.filter(
          (edge) => !(edge.source === source.id && edge.target === target?.id),
        ),
        ...insertedNodes.map((node) => createEdge(node.parentId!, node.id)),
        ...(target ? [createEdge(nextTargetParentId, target.id)] : []),
      ],
    },
  }
}

function moveInsertionTarget(
  graph: WorkflowGraph,
  target: WorkflowNode | null,
  nextParentId: string,
  kind: InsertWorkflowNodeInput['kind'],
): WorkflowNode[] {
  if (!target) {
    return graph.nodes
  }

  const shiftedIds = collectWorkflowSubtreeIds(indexWorkflowGraph(graph), target.id)
  const offset =
    kind === 'business-hours'
      ? {
          x: -WORKFLOW_LAYOUT_SPACING.horizontal / 2,
          y: WORKFLOW_LAYOUT_SPACING.vertical * 2,
        }
      : { x: 0, y: WORKFLOW_LAYOUT_SPACING.vertical }

  return graph.nodes.map((node) => {
    if (!shiftedIds.has(node.id)) {
      return node
    }

    return {
      ...node,
      parentId: node.id === target.id ? nextParentId : node.parentId,
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
    }
  })
}

function createEdge(source: string, target: string): WorkflowEdge {
  return { id: `${source}:${target}`, source, target }
}

function resolveInsertionPoint(
  graph: WorkflowGraph,
  input: InsertWorkflowNodeInput,
): DomainResult<ResolvedInsertionPoint, WorkflowMutationError> {
  const source = graph.nodes.find((node) => node.id === input.insertionPoint.sourceId)

  if (!source) {
    return failure(
      'insertion-source-not-found',
      'The insertion source no longer exists',
      ['insertionPoint', 'sourceId'],
    )
  }

  const target = input.insertionPoint.targetId
    ? graph.nodes.find((node) => node.id === input.insertionPoint.targetId) ?? null
    : null

  if (input.insertionPoint.targetId && !target) {
    return failure(
      'insertion-target-not-found',
      'The insertion target no longer exists',
      ['insertionPoint', 'targetId'],
    )
  }

  if (
    target &&
    !graph.edges.some((edge) => edge.source === source.id && edge.target === target.id)
  ) {
    return failure(
      'insertion-edge-not-found',
      'The selected workflow connection no longer exists',
      ['insertionPoint'],
    )
  }

  if (!target && graph.edges.some((edge) => edge.source === source.id)) {
    return failure(
      'insertion-not-allowed',
      'Nodes can only be appended at the end of a path',
      ['insertionPoint'],
    )
  }

  if (target?.kind === 'branch' && source.kind === 'business-hours') {
    return failure(
      'insertion-not-allowed',
      'Steps cannot be inserted before a generated branch',
      ['insertionPoint'],
    )
  }

  return { ok: true, value: { source, target } }
}

function validateInsertionIds(
  graph: WorkflowGraph,
  input: InsertWorkflowNodeInput,
): WorkflowMutationError[] {
  const proposedIds =
    input.kind === 'business-hours'
      ? [input.id, input.successConnectorId, input.failureConnectorId]
      : [input.id]
  const existingIds = new Set(graph.nodes.map((node) => node.id))
  const hasDuplicateIds =
    new Set(proposedIds).size !== proposedIds.length ||
    proposedIds.some((id) => existingIds.has(id))

  return hasDuplicateIds
    ? [
        {
          code: 'duplicate-node-id',
          message: 'Every workflow node must have a unique ID',
          path: ['id'],
        },
      ]
    : []
}

function validateInsertionDetails(
  input: InsertWorkflowNodeInput,
): DomainResult<ValidatedInsertionFields, WorkflowMutationError> {
  const detailsResult = validateWorkflowNodeFields(input)
  const businessHoursResult =
    input.kind === 'business-hours'
      ? validateWorkflowBusinessHoursFields({
          hours: defaultBusinessHours,
          timezone: input.timezone,
        })
      : null

  const errors = [
    ...(detailsResult.ok ? [] : detailsResult.errors),
    ...(businessHoursResult?.ok === false ? businessHoursResult.errors : []),
  ]

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  if (!detailsResult.ok) {
    return detailsResult
  }

  return {
    ok: true,
    value: {
      ...detailsResult.value,
      timezone: businessHoursResult?.ok ? businessHoursResult.value.timezone : null,
    },
  }
}

function createInsertedNodeGroup(
  input: InsertWorkflowNodeInput,
  parentId: string,
  position: WorkflowPosition,
  fields: ValidatedInsertionFields,
): WorkflowNode[] {
  if (input.kind === 'send-message') {
    return [
      createSendMessageNode(
        input.id,
        parentId,
        fields.title,
        fields.description,
        position,
      ),
    ]
  }

  if (input.kind === 'add-comment') {
    return [
      createAddCommentNode(
        input.id,
        parentId,
        fields.title,
        fields.description,
        position,
      ),
    ]
  }

  return createBusinessHoursNodeGroup(
    input,
    parentId,
    fields.title,
    fields.description,
    fields.timezone ?? input.timezone,
    position,
  )
}

function createSendMessageNode(
  id: string,
  parentId: string,
  title: string,
  description: string,
  position: WorkflowNode['position'],
): WorkflowNode {
  return {
    id,
    parentId,
    kind: 'send-message',
    title,
    description,
    editable: true,
    accent: 'green',
    position,
    config: { parts: [] },
  }
}

function createAddCommentNode(
  id: string,
  parentId: string,
  title: string,
  description: string,
  position: WorkflowNode['position'],
): WorkflowNode {
  return {
    id,
    parentId,
    kind: 'add-comment',
    title,
    description,
    editable: true,
    accent: 'blue',
    position,
    config: { comment: '' },
  }
}

function createBusinessHoursNodeGroup(
  input: Extract<InsertWorkflowNodeInput, { kind: 'business-hours' }>,
  parentId: string,
  title: string,
  description: string,
  timezone: string,
  position: WorkflowNode['position'],
): WorkflowNode[] {
  return [
    {
      id: input.id,
      parentId,
      kind: 'business-hours',
      title,
      description,
      editable: true,
      accent: 'orange',
      position,
      config: {
        hours: defaultBusinessHours.map((hours) => ({ ...hours })),
        timezone,
        connectorIds: [input.successConnectorId, input.failureConnectorId],
      },
    },
    {
      id: input.successConnectorId,
      parentId: input.id,
      kind: 'branch',
      title: 'Success',
      description: 'Conditions matched',
      editable: false,
      accent: 'green',
      position: {
        x: position.x - WORKFLOW_LAYOUT_SPACING.horizontal / 2,
        y: position.y + WORKFLOW_LAYOUT_SPACING.vertical,
      },
      config: { outcome: 'success' },
    },
    {
      id: input.failureConnectorId,
      parentId: input.id,
      kind: 'branch',
      title: 'Failure',
      description: 'Conditions did not match',
      editable: false,
      accent: 'neutral',
      position: {
        x: position.x + WORKFLOW_LAYOUT_SPACING.horizontal / 2,
        y: position.y + WORKFLOW_LAYOUT_SPACING.vertical,
      },
      config: { outcome: 'failure' },
    },
  ]
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
