import { defineComponent, h } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { render, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { WorkflowRepository } from '../../data/types'
import { useWorkflowEditor } from '../use-workflow-editor'

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

const typeSpecificPayload = [
  ...validPayload,
  {
    id: 'comment',
    parentId: 'message',
    type: 'addComment',
    name: 'Internal note',
    data: {
      comment: 'Follow up',
    },
  },
  {
    id: 'hours',
    parentId: 1,
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

describe('useWorkflowEditor', () => {
  it('loads and presents a draggable canvas view model', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.status.isLoading.value).toBe(false)
    })

    expect(model.status.errorMessage.value).toBeNull()
    expect(model.canvas.nodes.value).toEqual([
      expect.objectContaining({
        id: '1',
        draggable: true,
        focusable: false,
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
    expect(model.canvas.edges.value).toEqual([
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
    const { model } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.status.errorMessage.value).toBe('Workflow service is unavailable')
    })

    expect(model.canvas.nodes.value).toEqual([])
    expect(model.status.isEmpty.value).toBe(false)
  })

  it('opens editable nodes through the public navigation action', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model, router } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.canvas.nodes.value).toHaveLength(2)
    })

    model.canvas.openNode('message')

    await waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/nodes/message')
    })
  })

  it('keeps display-only branch nodes inaccessible', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => [
        ...validPayload,
        {
          id: 'success',
          parentId: 1,
          type: 'dateTimeConnector',
          name: 'Success',
          data: {
            connectorType: 'success',
          },
        },
      ],
    }
    const { model, router } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.canvas.nodes.value).toHaveLength(3)
    })

    model.canvas.openNode('success')
    expect(router.currentRoute.value.fullPath).toBe('/')

    await router.push('/nodes/success')

    await waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/')
    })
  })

  it('updates node details in memory through a mutation', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository, '/nodes/message')

    await waitFor(() => {
      expect(model.details.isOpen.value).toBe(true)
    })

    model.details.updateTitle('Updated welcome')
    model.details.updateDescription('Updated description')
    model.details.sendMessage.updateText(0, 'Updated body')
    model.details.save()

    await waitFor(() => {
      expect(model.details.isSaving.value).toBe(false)
      expect(
        model.canvas.nodes.value.find((node) => node.id === 'message')?.data,
      ).toMatchObject({
        title: 'Updated welcome',
        description: 'Updated description',
      })
      expect(model.details.selectedNode.value).toMatchObject({
        config: {
          parts: [{ type: 'text', value: 'Updated body' }],
        },
      })
    })
  })

  it('deletes the selected node and closes its route', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model, router } = await renderComposable(repository, '/nodes/message')

    await waitFor(() => {
      expect(model.details.isOpen.value).toBe(true)
    })

    model.details.requestDelete()
    expect(model.details.isDeleteConfirming.value).toBe(true)
    model.details.confirmDelete()

    await waitFor(() => {
      expect(model.canvas.nodes.value.map((node) => node.id)).toEqual(['1'])
      expect(router.currentRoute.value.fullPath).toBe('/')
    })
  })

  it('edits comment and business-hour content through focused detail APIs', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => typeSpecificPayload,
    }
    const { model, router } = await renderComposable(repository, '/nodes/comment')

    await waitFor(() => {
      expect(model.details.addComment.value.value).toBe('Follow up')
    })

    model.details.addComment.clear()
    model.details.save()

    await waitFor(() => {
      expect(model.details.selectedNode.value).toMatchObject({
        config: {
          comment: '',
        },
      })
    })

    await router.push('/nodes/hours')
    await waitFor(() => {
      expect(model.details.businessHours.isVisible.value).toBe(true)
    })

    model.details.businessHours.updateHour(0, 'startTime', '18:00')
    model.details.save()

    await waitFor(() => {
      expect(model.details.contentErrorMessages.value).toContain(
        'Opening time must be before closing time',
      )
    })

    model.details.businessHours.updateHour(0, 'startTime', '08:00')
    model.details.businessHours.updateTimezone('Asia/Singapore')
    model.details.save()

    await waitFor(() => {
      expect(model.details.selectedNode.value).toMatchObject({
        config: {
          hours: [{ day: 'mon', startTime: '08:00', endTime: '17:00' }],
          timezone: 'Asia/Singapore',
        },
      })
    })
  })
})

async function renderComposable(repository: WorkflowRepository, initialPath = '/') {
  let model!: ReturnType<typeof useWorkflowEditor>
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'workflow', component: { render: () => h('div') } },
      {
        path: '/nodes/:nodeId',
        name: 'workflow-node',
        component: { render: () => h('div') },
      },
    ],
  })
  const TestHarness = defineComponent({
    setup() {
      model = useWorkflowEditor(repository)
      return () => h('div')
    },
  })

  await router.push(initialPath)
  await router.isReady()

  render(TestHarness, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
    },
  })

  return { model, router }
}
