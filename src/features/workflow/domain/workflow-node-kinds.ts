export const WORKFLOW_NODE_KINDS = [
  'trigger',
  'send-message',
  'business-hours',
  'branch',
  'add-comment',
] as const

export const CREATABLE_WORKFLOW_NODE_KINDS = [
  'send-message',
  'business-hours',
  'add-comment',
] as const

export type WorkflowNodeKind = (typeof WORKFLOW_NODE_KINDS)[number]
export type CreatableWorkflowNodeKind = (typeof CREATABLE_WORKFLOW_NODE_KINDS)[number]
