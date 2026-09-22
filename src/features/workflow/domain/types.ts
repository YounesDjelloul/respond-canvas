import type { DomainError } from '@/features/shared/domain'

export type WorkflowNodeKind =
  | 'trigger'
  | 'send-message'
  | 'business-hours'
  | 'branch'
  | 'add-comment'

export type WorkflowNodeAccent = 'neutral' | 'violet' | 'orange' | 'green' | 'blue'

export interface WorkflowPosition {
  x: number
  y: number
}

export interface WorkflowMessagePart {
  type: 'text' | 'attachment'
  value: string
}

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

export type WorkflowGraphErrorCode =
  | 'invalid-payload'
  | 'invalid-node-data'
  | 'unsupported-node-type'
  | 'duplicate-node-id'
  | 'missing-parent'
  | 'missing-root'
  | 'cyclic-relationship'

export type WorkflowGraphError = DomainError<WorkflowGraphErrorCode>
