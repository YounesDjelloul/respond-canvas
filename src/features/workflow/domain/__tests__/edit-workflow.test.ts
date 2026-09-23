import { describe, expect, it } from 'vitest'
import { createWorkflowGraph, deleteWorkflowNode, updateWorkflowNode } from '../index'

const payload = [
  {
    id: 'root',
    parentId: -1,
    type: 'trigger',
    data: {
      type: 'conversationOpened',
      oncePerContact: false,
    },
  },
  {
    id: 'branch',
    parentId: 'root',
    type: 'dateTimeConnector',
    name: 'Success',
    data: {
      connectorType: 'success',
    },
  },
  {
    id: 'message',
    parentId: 'branch',
    type: 'sendMessage',
    name: 'Welcome',
    data: {
      payload: [{ type: 'text', text: 'Hello' }],
    },
  },
  {
    id: 'comment',
    parentId: 'message',
    type: 'addComment',
    name: 'Follow up',
    data: {
      comment: 'Follow up later',
    },
  },
  {
    id: 'hours',
    parentId: 'root',
    type: 'dateTime',
    name: 'Business Hours',
    data: {
      times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }],
      connectors: [],
      timezone: 'UTC',
      action: 'businessHours',
    },
  },
]

describe('workflow editing', () => {
  it('updates editable node details without mutating the source graph', () => {
    const graph = validGraph()
    const result = updateWorkflowNode(graph, {
      id: 'message',
      title: '  Greeting  ',
      description: '  Welcome the customer  ',
      kind: 'send-message',
      parts: [{ type: 'text', value: 'Updated hello' }],
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'message')).toMatchObject({
      title: 'Greeting',
      description: 'Welcome the customer',
      config: {
        parts: [{ type: 'text', value: 'Updated hello' }],
      },
    })
    expect(graph.nodes.find((node) => node.id === 'message')).toMatchObject({
      title: 'Welcome',
      description: 'Hello',
    })
  })

  it('returns all field validation errors together', () => {
    const result = updateWorkflowNode(validGraph(), {
      id: 'message',
      title: ' ',
      description: '',
      kind: 'send-message',
      parts: [{ type: 'text', value: 'Hello' }],
    })

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'title-required',
          message: 'Title is required',
          path: ['title'],
        },
        {
          code: 'description-required',
          message: 'Description is required',
          path: ['description'],
        },
      ],
    })
  })

  it('prevents editing display-only branch nodes', () => {
    const result = updateWorkflowNode(validGraph(), {
      id: 'branch',
      title: 'Changed',
      description: 'Changed',
      kind: 'send-message',
      parts: [{ type: 'text', value: 'Changed' }],
    })

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'node-read-only',
          message: 'This node is read-only',
          path: ['nodes', 'branch'],
        },
      ],
    })
  })

  it('validates message content and business-hour ranges', () => {
    const emptyMessageResult = updateWorkflowNode(validGraph(), {
      id: 'message',
      title: 'Welcome',
      description: 'Welcome',
      kind: 'send-message',
      parts: [],
    })
    const invalidHoursResult = updateWorkflowNode(validGraph(), {
      id: 'hours',
      title: 'Business Hours',
      description: 'Office schedule',
      kind: 'business-hours',
      hours: [{ day: 'mon', startTime: '17:00', endTime: '09:00' }],
      timezone: 'UTC',
    })

    expect(emptyMessageResult).toMatchObject({
      ok: false,
      errors: [{ code: 'message-content-required' }],
    })
    expect(invalidHoursResult).toMatchObject({
      ok: false,
      errors: [{ code: 'business-time-range-invalid' }],
    })
  })

  it('allows an existing internal comment to be cleared', () => {
    const result = updateWorkflowNode(validGraph(), {
      id: 'comment',
      title: 'Follow up',
      description: 'Internal note',
      kind: 'add-comment',
      comment: '',
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'comment')).toMatchObject({
      config: {
        comment: '',
      },
    })
  })

  it('deletes a node together with all of its descendants', () => {
    const result = deleteWorkflowNode(validGraph(), 'message')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.map((node) => node.id)).toEqual(['root', 'branch', 'hours'])
    expect(result.value.edges).toEqual([
      { id: 'root:branch', source: 'root', target: 'branch' },
      { id: 'root:hours', source: 'root', target: 'hours' },
    ])
  })
})

function validGraph() {
  const result = createWorkflowGraph(payload)

  if (!result.ok) {
    throw new Error('The test fixture must produce a valid graph')
  }

  return result.value
}
