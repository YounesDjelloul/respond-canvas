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
]

describe('workflow editing', () => {
  it('updates editable node details without mutating the source graph', () => {
    const graph = validGraph()
    const result = updateWorkflowNode(graph, {
      id: 'message',
      title: '  Greeting  ',
      description: '  Welcome the customer  ',
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.find((node) => node.id === 'message')).toMatchObject({
      title: 'Greeting',
      description: 'Welcome the customer',
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

  it('deletes a node together with all of its descendants', () => {
    const result = deleteWorkflowNode(validGraph(), 'message')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.nodes.map((node) => node.id)).toEqual(['root', 'branch'])
    expect(result.value.edges).toEqual([{ id: 'root:branch', source: 'root', target: 'branch' }])
  })
})

function validGraph() {
  const result = createWorkflowGraph(payload)

  if (!result.ok) {
    throw new Error('The test fixture must produce a valid graph')
  }

  return result.value
}
