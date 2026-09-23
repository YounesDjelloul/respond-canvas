import { defineComponent, h } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { render, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { WorkflowRepository } from '../../data/types'
import { CREATABLE_WORKFLOW_NODE_KINDS } from '../../domain'
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
    expect(model.status.readinessLabel.value).toBe('Workflow ready')
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
    expect(model.creation.typeOptions.map((option) => option.value)).toEqual(
      CREATABLE_WORKFLOW_NODE_KINDS,
    )
    expect(model.canvas.nodes.value[1]?.data).toMatchObject({
      icon: '➤',
      accentClass: 'border-l-emerald-400',
      iconClass: 'bg-emerald-50 text-emerald-600',
    })
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

    model.canvas.updateNodePosition({
      id: 'message',
      position: { x: 480, y: 320 },
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
        position: { x: 480, y: 320 },
        config: {
          parts: [{ type: 'text', value: 'Updated body' }],
        },
      })
    })
  })

  it('owns inline editing state and restores cancelled field changes', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository, '/nodes/message')

    await waitFor(() => {
      expect(model.details.isOpen.value).toBe(true)
    })

    await model.details.startEditing('title')
    expect(model.details.isEditingTitle.value).toBe(true)

    model.details.updateTitle('Draft greeting')
    model.details.cancelEditing('title')

    expect(model.details.title.value).toBe('Welcome')
    expect(model.details.isEditingTitle.value).toBe(false)

    await model.details.startEditing('description')
    model.details.updateDescription('Updated description')
    model.details.finishEditing('description')

    expect(model.details.description.value).toBe('Updated description')
    expect(model.details.isEditingDescription.value).toBe(false)
  })

  it('focuses the inline field with the caret after its existing text', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository, '/nodes/message')
    const titleField = document.createElement('input')
    titleField.id = 'node-title'
    titleField.value = 'Welcome'
    document.body.append(titleField)

    await waitFor(() => {
      expect(model.details.isOpen.value).toBe(true)
    })
    await model.details.startEditing('title')

    expect(document.activeElement).toBe(titleField)
    expect(titleField.selectionStart).toBe('Welcome'.length)
    expect(titleField.selectionEnd).toBe('Welcome'.length)
    titleField.remove()
  })

  it('focuses the details panel instead of its first control when opened', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository, '/nodes/message')
    const panel = document.createElement('div')
    panel.tabIndex = -1
    document.body.append(panel)
    const openAutoFocus = new Event('open-auto-focus', { cancelable: true })
    panel.addEventListener('open-auto-focus', model.details.focusDetailsPanel)

    panel.dispatchEvent(openAutoFocus)

    expect(openAutoFocus.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(panel)
    panel.remove()
  })

  it('projects validation failures onto their exact editor fields', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => typeSpecificPayload,
    }
    const { model, router } = await renderComposable(repository, '/nodes/message')

    await waitFor(() => {
      expect(model.details.isOpen.value).toBe(true)
    })

    model.details.sendMessage.updateText(0, ' ')
    model.details.save()

    await waitFor(() => {
      expect(model.details.sendMessage.items.value[0]?.error).toBe(
        'Message text cannot be empty',
      )
    })
    expect(model.details.errorMessage.value).toBeNull()

    model.details.updateTitle(' ')
    model.details.save()

    await waitFor(() => {
      expect(model.details.titleError.value).toBe('Title is required')
    })
    expect(model.details.sendMessage.items.value[0]?.error).toBe(
      'Message text cannot be empty',
    )

    model.details.updateTitle('Welcome')

    expect(model.details.titleError.value).toBeNull()
    expect(model.details.sendMessage.items.value[0]?.error).toBe(
      'Message text cannot be empty',
    )

    model.details.sendMessage.removePart(0)
    model.details.save()

    await waitFor(() => {
      expect(model.details.sendMessage.contentError.value).toBe(
        'Add at least one message or attachment',
      )
    })

    await router.push('/nodes/hours')
    await waitFor(() => {
      expect(model.details.businessHours.isVisible.value).toBe(true)
    })

    model.details.businessHours.updateHour(0, 'startTime', '18:00')
    model.details.businessHours.updateTimezone('')
    model.details.save()

    await waitFor(() => {
      expect(model.details.businessHours.hourErrorMessages.value[0]).toContain(
        'Opening time must be before closing time',
      )
      expect(model.details.businessHours.timezoneError.value).toBe(
        'Timezone is required',
      )
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

    const timezoneOptions = model.details.businessHours.timezoneOptions.value
    const firstAsianTimezoneIndex = timezoneOptions.findIndex((value) =>
      value.startsWith('Asia/'),
    )
    const firstAmericanTimezoneIndex = timezoneOptions.findIndex((value) =>
      value.startsWith('America/'),
    )

    expect(timezoneOptions).toContain('UTC')
    expect(firstAsianTimezoneIndex).toBeGreaterThanOrEqual(0)
    expect(firstAmericanTimezoneIndex).toBeGreaterThan(firstAsianTimezoneIndex)

    model.details.businessHours.updateHour(0, 'startTime', '18:00')
    model.details.save()

    await waitFor(() => {
      expect(model.details.businessHours.hourErrorMessages.value[0]).toContain(
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

  it('enters insertion mode and inserts a step into an existing edge', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model, router } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.canvas.edges.value).toHaveLength(1)
    })

    model.creation.begin()

    expect(model.creation.isChoosingInsertion.value).toBe(true)
    expect(model.canvas.edges.value[0]?.data?.isInsertionMode).toBe(true)

    model.canvas.openCreation({ sourceId: '1', targetId: 'message' })
    model.creation.updateTitle('Qualify contact')
    model.creation.updateDescription('Add context before greeting')
    model.creation.submit()

    await waitFor(() => {
      expect(model.details.selectedNode.value?.title).toBe('Qualify contact')
    })

    const insertedNode = model.details.selectedNode.value
    expect(insertedNode?.kind).toBe('send-message')
    expect(model.creation.isOpen.value).toBe(false)
    expect(model.status.readinessLabel.value).toBe('1 issue')
    expect(router.currentRoute.value.fullPath).toBe(`/nodes/${insertedNode?.id}`)
    expect(model.canvas.edges.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: '1', target: insertedNode?.id }),
        expect.objectContaining({ source: insertedNode?.id, target: 'message' }),
      ]),
    )
  })

  it('creates Business Hours branches and continues the existing path through Success', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.canvas.edges.value).toHaveLength(1)
    })

    model.canvas.openCreation({ sourceId: '1', targetId: 'message' })
    model.creation.updateKind('business-hours')
    model.creation.updateTitle('Support hours')
    model.creation.updateDescription('Route by team availability')
    model.creation.submit()

    await waitFor(() => {
      expect(model.details.selectedNode.value?.kind).toBe('business-hours')
    })

    const businessHoursNode = model.details.selectedNode.value

    if (businessHoursNode?.kind !== 'business-hours') {
      throw new Error('The created node must be Business Hours')
    }

    const [successId, failureId] = businessHoursNode.config.connectorIds
    expect(model.canvas.edges.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: businessHoursNode.id, target: successId }),
        expect.objectContaining({ source: businessHoursNode.id, target: failureId }),
        expect.objectContaining({ source: successId, target: 'message' }),
      ]),
    )
    expect(
      model.canvas.edges.value.find(
        (edge) => edge.source === businessHoursNode.id && edge.target === successId,
      )?.type,
    ).toBe('smoothstep')
    expect(model.status.readinessLabel.value).toBe('1 issue')
    expect(model.status.readinessTitle.value).toBe(
      'Failure requires at least one workflow step',
    )
  })

  it('keeps creation open and presents validation failures', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => validPayload,
    }
    const { model } = await renderComposable(repository)

    await waitFor(() => {
      expect(model.canvas.edges.value).toHaveLength(1)
    })

    model.canvas.openCreation({ sourceId: '1', targetId: 'message' })
    model.creation.submit()

    await waitFor(() => {
      expect(model.creation.titleError.value).toBe('Title is required')
    })

    expect(model.creation.descriptionError.value).toBe('Description is required')
    expect(model.creation.errorMessage.value).toBeNull()
    expect(model.creation.isOpen.value).toBe(true)

    model.creation.updateTitle('Escalation note')

    expect(model.creation.titleError.value).toBeNull()
    expect(model.creation.descriptionError.value).toBe('Description is required')
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
      plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]],
    },
  })

  return { model, router }
}
