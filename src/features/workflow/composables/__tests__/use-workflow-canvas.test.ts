import { defineComponent, h } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { render, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import type { WorkflowRepository } from '../../data/types'
import { useWorkflowCanvas } from '../use-workflow-canvas'

const validPayload = [
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
    id: 'message',
    parentId: 1,
    type: 'sendMessage',
    name: 'Welcome',
    data: {
      payload: [{ type: 'text', text: 'Hello' }],
    },
  },
]

describe('useWorkflowCanvas', () => {
  it('loads and presents a draggable canvas view model', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = renderComposable(repository)

    await waitFor(() => {
      expect(model.isLoading.value).toBe(false)
    })

    expect(model.errorMessage.value).toBeNull()
    expect(model.nodes.value).toEqual([
      expect.objectContaining({
        id: '1',
        draggable: true,
        focusable: true,
        data: expect.objectContaining({
          title: 'Conversation opened',
          hasParent: false,
          hasChildren: true,
        }),
      }),
      expect.objectContaining({
        id: 'message',
        data: expect.objectContaining({
          title: 'Welcome',
          hasParent: true,
          hasChildren: false,
        }),
      }),
    ])
    expect(model.edges.value).toEqual([
      expect.objectContaining({
        source: '1',
        target: 'message',
        focusable: false,
      }),
    ])
  })

  it('exposes repository failures as a presentation-ready error', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => {
        throw new Error('Workflow service is unavailable')
      },
    }
    const { model } = renderComposable(repository)

    await waitFor(() => {
      expect(model.errorMessage.value).toBe('Workflow service is unavailable')
    })

    expect(model.nodes.value).toEqual([])
    expect(model.isEmpty.value).toBe(false)
  })
})

function renderComposable(repository: WorkflowRepository) {
  let model!: ReturnType<typeof useWorkflowCanvas>
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const TestHarness = defineComponent({
    setup() {
      model = useWorkflowCanvas(repository)
      return () => h('div')
    },
  })

  render(TestHarness, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
    },
  })

  return { model }
}
