import type { DomainResult } from '@/features/shared/domain'
import type {
  BusinessHoursWorkflowNode,
  WorkflowGraph,
  WorkflowGraphIndex,
  WorkflowMutationError,
  WorkflowNode,
  WorkflowReadinessError,
} from './types'
import { indexWorkflowGraph } from './index-workflow-graph'
import { WORKFLOW_NODE_CAPABILITIES } from './workflow-node-kinds'
import { validateBusinessHourRules } from './validate-business-hour-rules'
import {
  validateWorkflowBusinessHoursFields,
  validateWorkflowMessageFields,
  validateWorkflowNodeFields,
} from './validate-workflow-fields'

export function validateWorkflowReadiness(
  graph: WorkflowGraph,
): DomainResult<WorkflowGraph, WorkflowReadinessError> {
  const index = indexWorkflowGraph(graph)
  const errors = [
    ...validateWorkflowStructure(graph, index),
    ...graph.nodes.flatMap(validateWorkflowNodeReadiness),
  ]

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, value: graph }
}

export function validateWorkflowStructure(
  graph: WorkflowGraph,
  index: WorkflowGraphIndex,
): WorkflowReadinessError[] {
  if (graph.nodes.length === 0) {
    return [
      {
        code: 'workflow-empty',
        message: 'Add at least one trigger to start the workflow',
        path: ['nodes'],
      },
    ]
  }

  return [
    ...validateTriggerCount(graph),
    ...validateRootCount(index),
    ...validateRequiredOutgoingPaths(graph, index),
    ...graph.nodes.flatMap((node) =>
      node.kind === 'business-hours' ? validateBusinessConnectors(index, node) : [],
    ),
  ]
}

export function validateWorkflowNodeReadiness(
  node: WorkflowNode,
): WorkflowReadinessError[] {
  const detailsResult = validateWorkflowNodeFields(node)
  const errors = detailsResult.ok
    ? []
    : prefixNodeErrors(node.id, detailsResult.errors)

  if (node.kind === 'send-message') {
    const messageResult = validateWorkflowMessageFields(node.config.parts)
    return messageResult.ok
      ? errors
      : [...errors, ...prefixNodeErrors(node.id, messageResult.errors)]
  }

  if (node.kind === 'business-hours') {
    const fieldsResult = validateWorkflowBusinessHoursFields(node.config)

    return [
      ...errors,
      ...(fieldsResult.ok ? [] : prefixNodeErrors(node.id, fieldsResult.errors)),
      ...prefixNodeErrors(node.id, validateBusinessHourRules(node.config.hours)),
    ]
  }

  return errors
}

function validateTriggerCount(graph: WorkflowGraph): WorkflowReadinessError[] {
  const triggerCount = graph.nodes.filter((node) => node.kind === 'trigger').length

  return triggerCount === 1
    ? []
    : [
        {
          code: 'workflow-trigger-count-invalid',
          message: 'The workflow must contain exactly one trigger',
          path: ['nodes'],
        },
      ]
}

function validateRootCount(index: WorkflowGraphIndex): WorkflowReadinessError[] {
  const roots = index.childrenByParent.get(null) ?? []
  const hasSingleTriggerRoot = roots.length === 1 && roots[0]?.kind === 'trigger'

  return hasSingleTriggerRoot
    ? []
    : [
        {
          code: 'workflow-root-count-invalid',
          message: 'The workflow must have one trigger as its root',
          path: ['nodes'],
        },
      ]
}

function validateRequiredOutgoingPaths(
  graph: WorkflowGraph,
  index: WorkflowGraphIndex,
): WorkflowReadinessError[] {
  return graph.nodes.flatMap((node): WorkflowReadinessError[] => {
    const requiresOutgoingPath =
      WORKFLOW_NODE_CAPABILITIES[node.kind].requiresOutgoingPath

    return requiresOutgoingPath && !index.childrenByParent.has(node.id)
      ? [
          {
            code: 'outgoing-path-required',
            message: `${node.title} requires at least one workflow step`,
            path: ['nodes', node.id],
          },
        ]
      : []
  })
}

function validateBusinessConnectors(
  index: WorkflowGraphIndex,
  node: BusinessHoursWorkflowNode,
): WorkflowReadinessError[] {
  const connectorIdSet = new Set(node.config.connectorIds)
  const connectors = (index.childrenByParent.get(node.id) ?? []).filter(
    (candidate) => candidate.kind === 'branch' && connectorIdSet.has(candidate.id),
  )
  const outcomes = new Set(
    connectors.map((connector) =>
      connector.kind === 'branch' ? connector.config.outcome : null,
    ),
  )
  const isValid =
    node.config.connectorIds.length === 2 &&
    connectorIdSet.size === 2 &&
    connectors.length === 2 &&
    outcomes.has('success') &&
    outcomes.has('failure')

  return isValid
    ? []
    : [
      {
        code: 'business-connectors-invalid',
        message: 'Business Hours requires one Success and one Failure branch',
        path: ['nodes', node.id, 'config', 'connectorIds'],
      },
    ]
}

function prefixNodeErrors(
  nodeId: string,
  errors: readonly WorkflowMutationError[],
): WorkflowReadinessError[] {
  return errors.map((error) => ({
    ...error,
    path: ['nodes', nodeId, ...(error.path ?? [])],
  }))
}
