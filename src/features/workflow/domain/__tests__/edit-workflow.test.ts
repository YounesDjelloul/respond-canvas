import { describe, expect, it } from 'vitest'
import {
  canQuickDeleteWorkflowNode,
  countWorkflowNodeDescendants,
  createWorkflowGraph,
  collectWorkflowSubtreeIds,
  groupWorkflowReadinessIssues,
  indexWorkflowGraph,
  deleteWorkflowNode,
  insertWorkflowNode,
  updateWorkflowNodePosition,
  updateWorkflowNode,
  validateWorkflowAttachment,
  validateWorkflowNodeReadiness,
  validateWorkflowReadiness,
  validateWorkflowStructure,
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

    const emptyTextResult = updateWorkflowNode(validGraph(), {
      id: 'message',
      title: 'Welcome',
      description: 'Welcome',
      kind: 'send-message',
      parts: [{ type: 'text', value: ' ' }],
    })

    expect(emptyTextResult).toMatchObject({
      ok: false,
      errors: [{ code: 'message-text-required', path: ['config', 'parts', 0] }],
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
        expect.objectContaining({
          code: 'business-day-duplicate',
          path: ['config', 'hours', 1],
        }),
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

  it('counts every step that would be removed after a node', () => {
    const graph = validGraph()

    expect(countWorkflowNodeDescendants(graph, 'message')).toBe(1)
    expect(countWorkflowNodeDescendants(graph, 'comment')).toBe(0)
    expect(countWorkflowNodeDescendants(graph, 'root')).toBe(4)
    expect(countWorkflowNodeDescendants(graph, 'missing')).toBe(0)
  })

  it('allows quick deletion only for editable steps other than the trigger', () => {
    const nodesById = new Map(validGraph().nodes.map((node) => [node.id, node]))

    expect(canQuickDeleteWorkflowNode(nodesById.get('message')!)).toBe(true)
    expect(canQuickDeleteWorkflowNode(nodesById.get('hours')!)).toBe(true)
    expect(canQuickDeleteWorkflowNode(nodesById.get('root')!)).toBe(false)
    expect(canQuickDeleteWorkflowNode(nodesById.get('branch')!)).toBe(false)
  })

  it('groups readiness issues by step with field paths relative to the step', () => {
    const graph = validGraph()
    const groups = groupWorkflowReadinessIssues(graph, [
      {
        code: 'message-text-required',
        message: 'Message text cannot be empty',
        path: ['nodes', 'message', 'config', 'parts', 0],
      },
      {
        code: 'workflow-trigger-count-invalid',
        message: 'The workflow must contain exactly one trigger',
        path: ['nodes'],
      },
      {
        code: 'title-required',
        message: 'Title is required',
        path: ['nodes', 'message', 'title'],
      },
      {
        code: 'outgoing-path-required',
        message: 'Business Hours requires at least one workflow step',
        path: ['nodes', 'hours'],
      },
    ])

    expect(
      groups.map((group) => ({
        nodeId: group.node?.id ?? null,
        fix: group.fix,
        issues: group.issues.map(({ code, fieldPath }) => ({ code, fieldPath })),
      })),
    ).toEqual([
      {
        nodeId: null,
        fix: 'none',
        issues: [{ code: 'workflow-trigger-count-invalid', fieldPath: [] }],
      },
      {
        nodeId: 'message',
        fix: 'open-node',
        issues: [
          { code: 'message-text-required', fieldPath: ['config', 'parts', 0] },
          { code: 'title-required', fieldPath: ['title'] },
        ],
      },
      {
        nodeId: 'hours',
        fix: 'add-step',
        issues: [{ code: 'outgoing-path-required', fieldPath: [] }],
      },
    ])
  })

  it('chooses the readiness fix that can resolve each step', () => {
    const graph = validGraph()
    const fixes = groupWorkflowReadinessIssues(graph, [
      {
        code: 'outgoing-path-required',
        message: 'Success requires at least one workflow step',
        path: ['nodes', 'branch'],
      },
      {
        code: 'outgoing-path-required',
        message: 'Conversation opened requires at least one workflow step',
        path: ['nodes', 'root'],
      },
      {
        code: 'description-required',
        message: 'Description is required',
        path: ['nodes', 'root', 'description'],
      },
      {
        code: 'business-connectors-invalid',
        message: 'Business Hours requires one Success and one Failure branch',
        path: ['nodes', 'hours', 'config', 'connectorIds'],
      },
    ]).map((group) => [group.node?.id, group.fix])

    expect(fixes).toEqual([
      ['root', 'open-node'],
      ['branch', 'add-step'],
      ['hours', 'open-node'],
    ])
  })

  it('merges duplicate readiness issues and keeps unknown steps at workflow level', () => {
    const duplicate = {
      code: 'message-content-required' as const,
      message: 'Add at least one message or attachment',
      path: ['nodes', 'message', 'config', 'parts'],
    }
    const groups = groupWorkflowReadinessIssues(validGraph(), [
      duplicate,
      duplicate,
      {
        code: 'node-not-found',
        message: 'The selected node no longer exists',
        path: ['nodes', 'missing'],
      },
    ])

    expect(groups.map((group) => [group.node?.id ?? null, group.issues.length])).toEqual([
      [null, 1],
      ['message', 1],
    ])
    expect(groupWorkflowReadinessIssues(validGraph(), [])).toEqual([])
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

  it('splits readiness into node-local and structural checks that compose exactly', () => {
    const emptied = updateWorkflowNode(validGraph(), {
      id: 'message',
      title: 'Welcome',
      description: 'Welcome',
      kind: 'send-message',
      parts: [{ type: 'text', value: 'Hello' }],
    })

    if (!emptied.ok) {
      throw new Error('The fixture update must succeed')
    }

    const graph = {
      ...emptied.value,
      nodes: emptied.value.nodes.map((node) =>
        node.kind === 'send-message' ? { ...node, config: { parts: [] } } : node,
      ),
    }
    const message = graph.nodes.find((node) => node.id === 'message')!
    const structural = validateWorkflowStructure(graph, indexWorkflowGraph(graph))
    const nodeLocal = graph.nodes.flatMap(validateWorkflowNodeReadiness)
    const combined = validateWorkflowReadiness(graph)

    expect(validateWorkflowNodeReadiness(message)).toEqual([
      expect.objectContaining({
        code: 'message-content-required',
        path: ['nodes', 'message', 'config', 'parts'],
      }),
    ])
    expect(structural).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'outgoing-path-required', path: ['nodes', 'hours'] }),
      ]),
    )
    expect(combined.ok ? [] : combined.errors).toEqual([...structural, ...nodeLocal])
    expect(
      validateWorkflowStructure({ nodes: [], edges: [] }, indexWorkflowGraph({ nodes: [], edges: [] })),
    ).toEqual([expect.objectContaining({ code: 'workflow-empty' })])
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

  it('indexes nodes by id and children by parent in graph order', () => {
    const index = indexWorkflowGraph(validGraph())

    expect(index.nodesById.get('message')?.title).toBe('Welcome')
    expect(index.childrenByParent.get(null)?.map((node) => node.id)).toEqual(['root'])
    expect(index.childrenByParent.get('root')?.map((node) => node.id)).toEqual([
      'branch',
      'hours',
    ])
    expect([...collectWorkflowSubtreeIds(index, 'branch')].sort()).toEqual([
      'branch',
      'comment',
      'message',
    ])
    expect([...collectWorkflowSubtreeIds(index, 'missing')]).toEqual(['missing'])
  })

  it('inserts locally, shifting only the downstream subtree and reusing everything else', () => {
    const moved = updateWorkflowNodePosition(validGraph(), 'hours', { x: 900, y: 40 })

    if (!moved.ok) {
      throw new Error('The fixture move must succeed')
    }

    const graph = moved.value
    const nodesBefore = new Map(graph.nodes.map((node) => [node.id, node]))
    const result = insertWorkflowNode(graph, {
      id: 'inserted',
      insertionPoint: { sourceId: 'branch', targetId: 'message' },
      kind: 'add-comment',
      title: 'Qualify lead',
      description: 'Add context for the team',
    })

    if (!result.ok) {
      throw new Error('The insertion must succeed')
    }

    const nodesAfter = new Map(result.value.nodes.map((node) => [node.id, node]))
    const message = nodesBefore.get('message')!
    const comment = nodesBefore.get('comment')!

    expect(nodesAfter.get('root')).toBe(nodesBefore.get('root'))
    expect(nodesAfter.get('branch')).toBe(nodesBefore.get('branch'))
    expect(nodesAfter.get('hours')).toBe(nodesBefore.get('hours'))
    expect(nodesAfter.get('hours')?.position).toEqual({ x: 900, y: 40 })
    expect(nodesAfter.get('inserted')?.position).toEqual(message.position)
    expect(nodesAfter.get('message')?.position).toEqual({
      x: message.position.x,
      y: message.position.y + 180,
    })
    expect(nodesAfter.get('comment')?.position).toEqual({
      x: comment.position.x,
      y: comment.position.y + 180,
    })
    expect(result.value.edges.find((edge) => edge.id === 'root:hours')).toBe(
      graph.edges.find((edge) => edge.id === 'root:hours'),
    )
    expect(result.value.edges.map((edge) => edge.id).sort()).toEqual([
      'branch:inserted',
      'inserted:message',
      'message:comment',
      'root:branch',
      'root:hours',
    ])
  })

  it('places generated branches below Business Hours and appends below a leaf', () => {
    const graph = validGraph()
    const comment = graph.nodes.find((node) => node.id === 'comment')!
    const appended = insertWorkflowNode(graph, {
      id: 'appended',
      insertionPoint: { sourceId: 'comment', targetId: null },
      kind: 'business-hours',
      title: 'Support hours',
      description: 'Route by team availability',
      successConnectorId: 'appended-success',
      failureConnectorId: 'appended-failure',
      timezone: 'UTC',
    })

    if (!appended.ok) {
      throw new Error('The append must succeed')
    }

    const positions = new Map(appended.value.nodes.map((node) => [node.id, node.position]))

    expect(positions.get('appended')).toEqual({
      x: comment.position.x,
      y: comment.position.y + 180,
    })
    expect(positions.get('appended-success')).toEqual({
      x: comment.position.x - 160,
      y: comment.position.y + 360,
    })
    expect(positions.get('appended-failure')).toEqual({
      x: comment.position.x + 160,
      y: comment.position.y + 360,
    })
    expect(appended.value.nodes.slice(0, graph.nodes.length)).toEqual(graph.nodes)
    expect(appended.value.nodes[0]).toBe(graph.nodes[0])
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
