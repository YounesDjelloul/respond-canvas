import { describe, expect, it } from 'vitest'
import { createWorkflowGraph } from '../index'

const payload = [
  {
    id: 1,
    parentId: -1,
    type: 'trigger',
    data: {
      type: 'conversationOpened',
      oncePerContact: false,
    },
  },
  {
    name: 'Business Hours',
    id: 'hours',
    type: 'dateTime',
    data: {
      times: [{ startTime: '09:00', endTime: '17:00', day: 'mon' }],
      connectors: ['success', 'failure'],
      timezone: 'UTC',
      action: 'businessHours',
    },
    parentId: 1,
  },
  {
    name: 'Success',
    id: 'success',
    type: 'dateTimeConnector',
    data: {
      connectorType: 'success',
    },
    parentId: 'hours',
  },
  {
    name: 'Failure',
    id: 'failure',
    type: 'dateTimeConnector',
    data: {
      connectorType: 'failure',
    },
    parentId: 'hours',
  },
  {
    name: 'Welcome',
    id: 'welcome',
    type: 'sendMessage',
    data: {
      payload: [{ type: 'text', text: 'Hello there' }],
    },
    parentId: 'success',
  },
  {
    name: 'Add Comment',
    id: 'comment',
    type: 'addComment',
    data: {
      comment: 'Customer contacted',
    },
    parentId: 'failure',
  },
]

describe('createWorkflowGraph', () => {
  it('normalizes the transport payload into a positioned workflow graph', () => {
    const result = createWorkflowGraph(payload)

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes).toHaveLength(6)
    expect(result.value.edges).toEqual(
      expect.arrayContaining([
        { id: '1:hours', source: '1', target: 'hours' },
        { id: 'hours:success', source: 'hours', target: 'success' },
        { id: 'hours:failure', source: 'hours', target: 'failure' },
      ]),
    )
    expect(result.value.nodes.find((node) => node.id === '1')).toMatchObject({
      parentId: null,
      kind: 'trigger',
      title: 'Conversation opened',
    })
    expect(result.value.nodes.find((node) => node.id === 'hours')).toMatchObject({
      kind: 'business-hours',
      description: '09:00–17:00 · UTC',
      config: {
        connectorIds: ['success', 'failure'],
      },
    })
    expect(result.value.nodes.find((node) => node.id === 'success')).toMatchObject({
      kind: 'branch',
      editable: false,
      config: {
        outcome: 'success',
      },
    })
    expect(result.value.nodes.find((node) => node.id === 'welcome')).toMatchObject({
      kind: 'send-message',
      description: 'Hello there',
    })
    expect(result.value.nodes.find((node) => node.id === 'success')?.position.x).not.toBe(
      result.value.nodes.find((node) => node.id === 'failure')?.position.x,
    )
  })

  it('returns coded validation errors for unsupported node types', () => {
    const result = createWorkflowGraph([
      {
        id: 'unknown',
        parentId: -1,
        type: 'unsupported',
        data: {},
      },
    ])

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'unsupported-node-type',
          path: ['nodes', 'unknown', 'type'],
          message: 'Unsupported node type: unsupported',
        },
      ],
    })
  })

  it('rejects missing parents and cyclic relationships', () => {
    const invalidPayload = [
      {
        id: 'first',
        parentId: 'second',
        type: 'addComment',
        name: 'First',
        data: { comment: 'First' },
      },
      {
        id: 'second',
        parentId: 'first',
        type: 'addComment',
        name: 'Second',
        data: { comment: 'Second' },
      },
      {
        id: 'orphan',
        parentId: 'missing',
        type: 'addComment',
        name: 'Orphan',
        data: { comment: 'Orphan' },
      },
    ]

    const result = createWorkflowGraph(invalidPayload)

    expect(result.ok).toBe(false)

    if (result.ok) {
      return
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: 'missing-parent',
          path: ['nodes', 'orphan', 'parentId'],
          message: 'Parent node missing does not exist',
        },
        {
          code: 'missing-root',
          path: ['nodes'],
          message: 'The workflow must contain a root node',
        },
        {
          code: 'cyclic-relationship',
          path: ['nodes', 'first'],
          message: 'Workflow relationships must be acyclic',
        },
      ]),
    )
  })
})
