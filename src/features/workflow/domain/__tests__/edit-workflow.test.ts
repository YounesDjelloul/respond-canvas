import { describe, expect, it } from 'vitest'
import {
  createWorkflowGraph,
  deleteWorkflowNode,
  insertWorkflowNode,
  updateWorkflowNodePosition,
  updateWorkflowNode,
  validateWorkflowAttachment,
  validateWorkflowReadiness,
} from '../index'

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
      parts: [{ type: 'text', value: '  Updated hello  ' }],
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

  it('combines schema-backed field errors with explicit business rules', () => {
    const result = updateWorkflowNode(validGraph(), {
      id: 'hours',
      title: 'Business Hours',
      description: 'Office schedule',
      kind: 'business-hours',
      hours: [
        { day: 'mon', startTime: '25:00', endTime: '17:00' },
        { day: 'mon', startTime: '09:00', endTime: '17:00' },
      ],
      timezone: ' ',
    })

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'business-time-invalid' }),
        expect.objectContaining({ code: 'timezone-required' }),
        expect.objectContaining({ code: 'business-day-duplicate' }),
      ]),
    })
  })

  it('validates attachment metadata before file IO', () => {
    const result = validateWorkflowAttachment({
      name: 'large-video.mp4',
      size: 5 * 1024 * 1024 + 1,
    })

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'attachment-too-large',
          message: 'large-video.mp4 exceeds the 5 MB limit',
          path: ['size'],
        },
      ],
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

  it('updates a dragged node position without mutating the source graph', () => {
    const graph = validGraph()
    const result = updateWorkflowNodePosition(graph, 'message', { x: 480, y: 320 })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'message')?.position).toEqual({
      x: 480,
      y: 320,
    })
    expect(graph.nodes.find((node) => node.id === 'message')?.position).not.toEqual({
      x: 480,
      y: 320,
    })
  })

  it('reports incomplete node content in workflow readiness checks', () => {
    const graph = readyGraph()
    const readyResult = validateWorkflowReadiness(graph)
    const insertionResult = insertWorkflowNode(graph, {
      id: 'empty-message',
      insertionPoint: { sourceId: 'message', targetId: null },
      kind: 'send-message',
      title: 'Follow up',
      description: 'Send another message',
    })

    expect(readyResult.ok).toBe(true)
    expect(insertionResult.ok).toBe(true)

    if (!insertionResult.ok) {
      return
    }

    expect(validateWorkflowReadiness(insertionResult.value)).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'message-content-required',
          path: ['nodes', 'empty-message', 'config', 'parts'],
        }),
      ],
    })
  })

  it('requires every generated Business Hours branch to continue', () => {
    const insertionResult = insertWorkflowNode(readyGraph(), {
      id: 'support-hours',
      successConnectorId: 'support-success',
      failureConnectorId: 'support-failure',
      insertionPoint: { sourceId: 'root', targetId: 'message' },
      kind: 'business-hours',
      title: 'Support hours',
      description: 'Route by team availability',
      timezone: 'UTC',
    })

    expect(insertionResult.ok).toBe(true)

    if (!insertionResult.ok) {
      return
    }

    expect(validateWorkflowReadiness(insertionResult.value)).toEqual({
      ok: false,
      errors: [
        {
          code: 'outgoing-path-required',
          message: 'Failure requires at least one workflow step',
          path: ['nodes', 'support-failure'],
        },
      ],
    })
  })

  it('requires every non-terminal node kind to have an outgoing path', () => {
    const graphResult = createWorkflowGraph([
      {
        id: 'root',
        parentId: -1,
        type: 'trigger',
        data: {
          type: 'conversationOpened',
          oncePerContact: false,
        },
      },
    ])

    expect(graphResult.ok).toBe(true)

    if (!graphResult.ok) {
      return
    }

    expect(validateWorkflowReadiness(graphResult.value)).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'outgoing-path-required',
          message: 'Conversation opened requires at least one workflow step',
          path: ['nodes', 'root'],
        },
      ],
    })
  })

  it('inserts a node into an existing edge without mutating the source graph', () => {
    const graph = validGraph()
    const result = insertWorkflowNode(graph, {
      id: 'inserted',
      insertionPoint: { sourceId: 'branch', targetId: 'message' },
      kind: 'add-comment',
      title: '  Qualify lead  ',
      description: '  Add context for the team  ',
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'inserted')).toMatchObject({
      parentId: 'branch',
      kind: 'add-comment',
      title: 'Qualify lead',
      description: 'Add context for the team',
    })
    expect(result.value.nodes.find((node) => node.id === 'message')?.parentId).toBe('inserted')
    expect(result.value.edges).toEqual(
      expect.arrayContaining([
        { id: 'branch:inserted', source: 'branch', target: 'inserted' },
        { id: 'inserted:message', source: 'inserted', target: 'message' },
      ]),
    )
    expect(graph.nodes.find((node) => node.id === 'message')?.parentId).toBe('branch')
  })

  it('creates Business Hours branches and continues the old path through Success', () => {
    const result = insertWorkflowNode(validGraph(), {
      id: 'new-hours',
      successConnectorId: 'new-success',
      failureConnectorId: 'new-failure',
      insertionPoint: { sourceId: 'branch', targetId: 'message' },
      kind: 'business-hours',
      title: 'Support hours',
      description: 'Route contacts by team availability',
      timezone: 'Europe/Paris',
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'new-hours')).toMatchObject({
      parentId: 'branch',
      config: {
        timezone: 'Europe/Paris',
        connectorIds: ['new-success', 'new-failure'],
      },
    })
    expect(result.value.nodes.find((node) => node.id === 'new-success')).toMatchObject({
      parentId: 'new-hours',
      config: { outcome: 'success' },
    })
    expect(result.value.nodes.find((node) => node.id === 'new-failure')).toMatchObject({
      parentId: 'new-hours',
      config: { outcome: 'failure' },
    })
    expect(result.value.nodes.find((node) => node.id === 'message')?.parentId).toBe(
      'new-success',
    )
  })

  it('rejects appending after a node that already has an outgoing path', () => {
    const result = insertWorkflowNode(validGraph(), {
      id: 'inserted',
      insertionPoint: { sourceId: 'root', targetId: null },
      kind: 'send-message',
      title: 'Message',
      description: 'Send a message',
    })

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: 'insertion-not-allowed' }],
    })
  })

  it('rejects insertion between Business Hours and its generated connector', () => {
    const graphWithBranches = insertWorkflowNode(validGraph(), {
      id: 'new-hours',
      successConnectorId: 'new-success',
      failureConnectorId: 'new-failure',
      insertionPoint: { sourceId: 'branch', targetId: 'message' },
      kind: 'business-hours',
      title: 'Support hours',
      description: 'Route by availability',
      timezone: 'UTC',
    })

    expect(graphWithBranches.ok).toBe(true)

    if (!graphWithBranches.ok) {
      return
    }

    const protectedResult = insertWorkflowNode(graphWithBranches.value, {
      id: 'another',
      insertionPoint: { sourceId: 'new-hours', targetId: 'new-success' },
      kind: 'send-message',
      title: 'Another',
      description: 'Another message',
    })

    expect(protectedResult).toMatchObject({
      ok: false,
      errors: [{ code: 'insertion-not-allowed' }],
    })
  })
})

function validGraph() {
  const result = createWorkflowGraph(payload)

  if (!result.ok) {
    throw new Error('The test fixture must produce a valid graph')
  }

  return result.value
}

function readyGraph() {
  const result = createWorkflowGraph([
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
      id: 'message',
      parentId: 'root',
      type: 'sendMessage',
      name: 'Welcome',
      data: {
        payload: [{ type: 'text', text: 'Hello' }],
      },
    },
  ])

  if (!result.ok) {
    throw new Error('The readiness fixture must produce a valid graph')
  }

  return result.value
}
