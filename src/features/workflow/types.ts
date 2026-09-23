import type { Edge, Node } from '@vue-flow/core'
import type { WorkflowNodeAccent, WorkflowNodeKind } from './domain'

export interface WorkflowCanvasNodeData extends Record<string, unknown> {
  title: string
  description: string
  kind: WorkflowNodeKind
  accent: WorkflowNodeAccent
  editable: boolean
  hasParent: boolean
  hasChildren: boolean
  icon: string
  accentClass: string
  iconClass: string
}

export type WorkflowCanvasNode = Node<WorkflowCanvasNodeData>
export type WorkflowCanvasEdge = Edge

export interface WorkflowMessageDraftItem {
  index: number
  type: 'text' | 'attachment'
  value: string
  name: string
  isImage: boolean
}
