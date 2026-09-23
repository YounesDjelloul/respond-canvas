import type { DomainError } from '@/features/shared/domain'

export type {
  CreatableWorkflowNodeKind,
  WorkflowNodeKind,
} from './workflow-node-kinds'

export type WorkflowNodeAccent = 'neutral' | 'violet' | 'orange' | 'green' | 'blue'

export interface WorkflowPosition {
  x: number
  y: number
}

export interface WorkflowTextPart {
  type: 'text'
  value: string
}

export interface WorkflowAttachmentPart {
  type: 'attachment'
  value: string
  name?: string
  mimeType?: string
}

export type WorkflowMessagePart = WorkflowTextPart | WorkflowAttachmentPart

export interface BusinessHour {
  day: string
  startTime: string
  endTime: string
}

interface WorkflowNodeBase {
  id: string
  parentId: string | null
  title: string
  description: string
  editable: boolean
  accent: WorkflowNodeAccent
  position: WorkflowPosition
}

export interface TriggerWorkflowNode extends WorkflowNodeBase {
  kind: 'trigger'
  config: {
    eventType: string
    oncePerContact: boolean
  }
}

export interface SendMessageWorkflowNode extends WorkflowNodeBase {
  kind: 'send-message'
  config: {
    parts: WorkflowMessagePart[]
  }
}

export interface BusinessHoursWorkflowNode extends WorkflowNodeBase {
  kind: 'business-hours'
  config: {
    hours: BusinessHour[]
    timezone: string
    connectorIds: string[]
  }
}

export interface BranchWorkflowNode extends WorkflowNodeBase {
  kind: 'branch'
  config: {
    outcome: 'success' | 'failure'
  }
}

export interface AddCommentWorkflowNode extends WorkflowNodeBase {
  kind: 'add-comment'
  config: {
    comment: string
  }
}

export type WorkflowNode =
  | TriggerWorkflowNode
  | SendMessageWorkflowNode
  | BusinessHoursWorkflowNode
  | BranchWorkflowNode
  | AddCommentWorkflowNode

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface WorkflowInsertionPoint {
  sourceId: string
  targetId: string | null
}

interface InsertWorkflowNodeBase {
  id: string
  insertionPoint: WorkflowInsertionPoint
  title: string
  description: string
}

export type InsertWorkflowNodeInput =
  | (InsertWorkflowNodeBase & {
      kind: 'send-message'
    })
  | (InsertWorkflowNodeBase & {
      kind: 'add-comment'
    })
  | (InsertWorkflowNodeBase & {
      kind: 'business-hours'
      successConnectorId: string
      failureConnectorId: string
      timezone: string
    })

export type WorkflowGraphErrorCode =
  | 'invalid-payload'
  | 'invalid-node-data'
  | 'unsupported-node-type'
  | 'duplicate-node-id'
  | 'missing-parent'
  | 'missing-root'
  | 'cyclic-relationship'

export type WorkflowGraphError = DomainError<WorkflowGraphErrorCode>

interface UpdateWorkflowNodeBase {
  id: string
  title: string
  description: string
}

export type UpdateWorkflowNodeInput =
  | (UpdateWorkflowNodeBase & {
      kind: 'trigger'
    })
  | (UpdateWorkflowNodeBase & {
      kind: 'send-message'
      parts: WorkflowMessagePart[]
    })
  | (UpdateWorkflowNodeBase & {
      kind: 'business-hours'
      hours: BusinessHour[]
      timezone: string
    })
  | (UpdateWorkflowNodeBase & {
      kind: 'add-comment'
      comment: string
    })

export type WorkflowMutationErrorCode =
  | 'node-not-found'
  | 'node-read-only'
  | 'node-kind-mismatch'
  | 'invalid-node-position'
  | 'duplicate-node-id'
  | 'insertion-source-not-found'
  | 'insertion-target-not-found'
  | 'insertion-edge-not-found'
  | 'insertion-not-allowed'
  | 'title-required'
  | 'description-required'
  | 'message-content-required'
  | 'message-text-required'
  | 'attachment-required'
  | 'attachment-too-large'
  | 'business-hours-required'
  | 'business-day-duplicate'
  | 'business-time-invalid'
  | 'business-time-range-invalid'
  | 'timezone-required'

export type WorkflowMutationError = DomainError<WorkflowMutationErrorCode>

export type WorkflowReadinessErrorCode =
  | WorkflowMutationErrorCode
  | 'workflow-empty'
  | 'workflow-trigger-count-invalid'
  | 'workflow-root-count-invalid'
  | 'business-connectors-invalid'
  | 'outgoing-path-required'

export type WorkflowReadinessError = DomainError<WorkflowReadinessErrorCode>
