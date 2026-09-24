import type { Component } from 'vue'
import type { Edge, Node } from '@vue-flow/core'
import type {
  CreatableWorkflowNodeKind,
  WorkflowInsertionPoint,
  WorkflowNodeAccent,
  WorkflowNodeKind,
} from './domain'

export interface WorkflowCanvasNodeData extends Record<string, unknown> {
  title: string
  description: string
  kind: WorkflowNodeKind
  accent: WorkflowNodeAccent
  editable: boolean
  hasParent: boolean
  hasChildren: boolean
  canInsertAfter: boolean
  isInsertionMode: boolean
  insertionLabel: string
  showsDeleteControl: boolean
  deleteLabel: string
  issueLabel: string | null
  accessibleLabel: string
  icon: Component
  accentClass: string
  iconClass: string
}

export type WorkflowCanvasNode = Node<WorkflowCanvasNodeData>

export interface WorkflowCanvasEdgeData extends Record<string, unknown> {
  insertionPoint: WorkflowInsertionPoint
  insertionLabel: string
  isInsertionMode: boolean
}

export type WorkflowCanvasEdge = Edge<WorkflowCanvasEdgeData>

export interface WorkflowReadinessGroupView {
  key: string
  title: string
  icon: Component | null
  iconClass: string
  messages: string[]
  fixLabel: 'Open step' | 'Add step' | null
  fixAriaLabel: string | null
}

export interface WorkflowNodeTypeOption {
  value: CreatableWorkflowNodeKind
  label: string
  description: string
  icon: Component
  iconClass: string
}

export interface WorkflowMessageDraftItem {
  index: number
  type: 'text' | 'attachment'
  value: string
  name: string
  label: string
  extension: string
  isImage: boolean
  error: string | null
}
