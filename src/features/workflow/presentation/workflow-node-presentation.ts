import {
  CREATABLE_WORKFLOW_NODE_KINDS,
  type WorkflowNodeAccent,
  type WorkflowNodeKind,
} from '../domain'
import type { WorkflowNodeTypeOption } from '../types'

const workflowNodePresentation = {
  trigger: {
    label: 'Trigger',
    icon: '↗',
    defaultAccent: 'violet',
    creationDescription: 'Start a workflow from a customer event.',
  },
  'send-message': {
    label: 'Send message',
    icon: '➤',
    defaultAccent: 'green',
    creationDescription: 'Send text or attachments to the contact.',
  },
  'business-hours': {
    label: 'Business hours',
    icon: '◷',
    defaultAccent: 'orange',
    creationDescription: 'Route the workflow by team availability.',
  },
  branch: {
    label: 'Branch',
    icon: '◇',
    defaultAccent: 'neutral',
    creationDescription: 'Continue from a generated workflow outcome.',
  },
  'add-comment': {
    label: 'Add comment',
    icon: '≡',
    defaultAccent: 'blue',
    creationDescription: 'Leave an internal note for your team.',
  },
} satisfies Record<
  WorkflowNodeKind,
  {
    label: string
    icon: string
    defaultAccent: WorkflowNodeAccent
    creationDescription: string
  }
>

const workflowAccentPresentation = {
  neutral: {
    accentClass: 'border-l-slate-300',
    iconClass: 'bg-slate-100 text-slate-500',
  },
  violet: {
    accentClass: 'border-l-violet-400',
    iconClass: 'bg-violet-50 text-violet-600',
  },
  orange: {
    accentClass: 'border-l-orange-400',
    iconClass: 'bg-orange-50 text-orange-600',
  },
  green: {
    accentClass: 'border-l-emerald-400',
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
  blue: {
    accentClass: 'border-l-sky-400',
    iconClass: 'bg-sky-50 text-sky-600',
  },
} satisfies Record<
  WorkflowNodeAccent,
  {
    accentClass: string
    iconClass: string
  }
>

export const CREATABLE_WORKFLOW_NODE_OPTIONS: WorkflowNodeTypeOption[] =
  CREATABLE_WORKFLOW_NODE_KINDS.map((kind) => {
    const presentation = workflowNodePresentation[kind]

    return {
      value: kind,
      label: presentation.label,
      description: presentation.creationDescription,
      icon: presentation.icon,
      iconClass: workflowAccentPresentation[presentation.defaultAccent].iconClass,
    }
  })

export function workflowNodePresentationFor(kind: WorkflowNodeKind) {
  return workflowNodePresentation[kind]
}

export function workflowAccentPresentationFor(accent: WorkflowNodeAccent) {
  return workflowAccentPresentation[accent]
}
