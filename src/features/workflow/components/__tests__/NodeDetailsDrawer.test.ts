import { computed, ref } from 'vue'
import { fireEvent, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useWorkflowEditorContext } from '../../composables/workflow-editor-context'
import type { WorkflowEditorController } from '../../composables/use-workflow-editor'
import NodeDetailsDrawer from '../NodeDetailsDrawer.vue'

vi.mock('../../composables/workflow-editor-context')

describe('NodeDetailsDrawer', () => {
  it('exposes labelled fields and delegates editing actions', async () => {
    const user = userEvent.setup()
    const details = renderDrawer()

    expect(screen.getByRole('dialog')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Welcome message' })).not.toBeNull()

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Greeting')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(details.updateTitle).toHaveBeenLastCalledWith('Greeting')
    expect(details.save).toHaveBeenCalledOnce()
  })

  it('describes and confirms cascading deletion', async () => {
    const user = userEvent.setup()
    const details = renderDrawer({ isDeleteConfirming: true })

    expect(screen.getByText(/every node connected after it/i)).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Delete node' }))

    expect(details.confirmDelete).toHaveBeenCalledOnce()
  })

  it('edits message text and forwards attachment uploads', async () => {
    const user = userEvent.setup()
    const editor = createEditor({})
    editor.details.sendMessage.isVisible = computed(() => true)
    editor.details.sendMessage.items = computed(() => [
      {
        index: 0,
        type: 'text',
        value: 'Hello',
        name: '',
        isImage: false,
      },
    ])
    renderEditor(editor)

    const message = screen.getByLabelText('Text 1')
    await user.clear(message)
    await user.type(message, 'Updated')
    const upload = screen.getByLabelText('Upload attachments')
    await user.upload(upload, new File(['image'], 'welcome.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Remove text 1' }))

    expect(editor.details.sendMessage.updateText).toHaveBeenLastCalledWith(0, 'Updated')
    expect(editor.details.sendMessage.addAttachments).toHaveBeenCalledOnce()
    expect(editor.details.sendMessage.removePart).toHaveBeenCalledWith(0)
  })

  it('edits internal comments and business hours', async () => {
    const user = userEvent.setup()
    const commentEditor = createEditor({})
    commentEditor.details.addComment.isVisible = computed(() => true)
    commentEditor.details.addComment.value.value = 'Follow up'
    renderEditor(commentEditor)

    await user.click(screen.getByRole('button', { name: 'Clear comment' }))
    expect(commentEditor.details.addComment.clear).toHaveBeenCalledOnce()

    const businessEditor = createEditor({})
    businessEditor.details.businessHours.isVisible = computed(() => true)
    businessEditor.details.businessHours.hours.value = [
      { day: 'mon', startTime: '09:00', endTime: '17:00' },
    ]
    businessEditor.details.businessHours.timezone.value = 'UTC'
    businessEditor.details.businessHours.timezoneOptions = computed(() => [
      'UTC',
      'Asia/Singapore',
    ])
    renderEditor(businessEditor)

    await fireEvent.update(screen.getByLabelText('mon opening time'), '08:00')
    await user.selectOptions(screen.getByLabelText('Timezone'), 'Asia/Singapore')

    expect(businessEditor.details.businessHours.updateHour).toHaveBeenCalledWith(
      0,
      'startTime',
      '08:00',
    )
    expect(businessEditor.details.businessHours.updateTimezone).toHaveBeenCalledWith(
      'Asia/Singapore',
    )
  })
})

function renderDrawer(overrides: { isDeleteConfirming?: boolean } = {}) {
  const editor = createEditor(overrides)
  renderEditor(editor)

  return editor.details
}

function renderEditor(editor: WorkflowEditorController) {
  vi.mocked(useWorkflowEditorContext).mockReturnValue(editor)

  render(NodeDetailsDrawer, {
    global: {
      stubs: {
        Drawer: {
          props: ['visible'],
          template: '<aside v-if="visible" role="dialog"><slot /></aside>',
        },
        Select: {
          props: ['inputId', 'modelValue', 'options'],
          emits: ['update:modelValue'],
          template:
            '<select :id="inputId" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option" :value="option">{{ option }}</option></select>',
        },
      },
    },
  })
}

function createEditor(overrides: {
  isDeleteConfirming?: boolean
}): WorkflowEditorController {
  return {
    status: {
      isLoading: ref(false),
      errorMessage: computed(() => null),
      isEmpty: computed(() => false),
    },
    canvas: {
      nodes: computed(() => []),
      edges: computed(() => []),
      openNode: vi.fn(),
      openCreation: vi.fn(),
      openCreationAfter: vi.fn(),
      isChoosingInsertion: computed(() => false),
    },
    creation: {
      isOpen: computed(() => false),
      isChoosingInsertion: computed(() => false),
      context: computed(() => ''),
      kind: ref('send-message'),
      title: ref(''),
      description: ref(''),
      titleError: computed(() => null),
      descriptionError: computed(() => null),
      errorMessage: computed(() => null),
      typeOptions: [],
      showsBusinessHoursNote: computed(() => false),
      buttonLabel: computed(() => 'Create New Node'),
      isCreating: ref(false),
      begin: vi.fn(),
      toggle: vi.fn(),
      cancel: vi.fn(),
      setVisibility: vi.fn(),
      updateKind: vi.fn(),
      updateTitle: vi.fn(),
      updateDescription: vi.fn(),
      submit: vi.fn(),
    },
    details: {
      selectedNode: computed(() => null),
      isOpen: computed(() => true),
      heading: computed(() => 'Welcome message'),
      typeLabel: computed(() => 'Send message'),
      title: ref('Welcome message'),
      description: ref('Hello there'),
      titleError: computed(() => null),
      descriptionError: computed(() => null),
      errorMessage: computed(() => null),
      contentErrorMessages: computed(() => []),
      isDirty: computed(() => true),
      isSaving: ref(false),
      isDeleting: ref(false),
      isDeleteConfirming: ref(overrides.isDeleteConfirming ?? false),
      close: vi.fn(),
      setVisibility: vi.fn(),
      updateTitle: vi.fn(),
      updateDescription: vi.fn(),
      sendMessage: {
        isVisible: computed(() => false),
        items: computed(() => []),
        attachmentError: ref(null),
        addText: vi.fn(),
        updateText: vi.fn(),
        removePart: vi.fn(),
        addAttachments: vi.fn(),
      },
      addComment: {
        isVisible: computed(() => false),
        value: ref(''),
        update: vi.fn(),
        clear: vi.fn(),
      },
      businessHours: {
        isVisible: computed(() => false),
        hours: ref([]),
        timezone: ref(''),
        timezoneOptions: computed(() => []),
        updateHour: vi.fn(),
        updateTimezone: vi.fn(),
      },
      save: vi.fn(),
      requestDelete: vi.fn(),
      cancelDelete: vi.fn(),
      confirmDelete: vi.fn(),
    },
  }
}
