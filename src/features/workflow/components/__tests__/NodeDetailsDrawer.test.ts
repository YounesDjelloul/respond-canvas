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

    await user.click(
      screen.getByRole('button', { name: 'Edit title: Welcome message' }),
    )
    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Greeting')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(details.updateTitle).toHaveBeenLastCalledWith('Greeting')
    expect(details.save).toHaveBeenCalledOnce()
  })

  it('hands deletion off to the shared confirmation', async () => {
    const user = userEvent.setup()
    const details = renderDrawer()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(details.requestDelete).toHaveBeenCalledOnce()
  })

  it('edits message text and forwards attachment uploads', async () => {
    const user = userEvent.setup()
    const editor = createEditor()
    editor.details.sendMessage.isVisible = computed(() => true)
    editor.details.sendMessage.hasContent = computed(() => true)
    editor.details.sendMessage.textItems = computed(() => [
      {
        index: 0,
        type: 'text',
        value: 'Hello',
        name: '',
        label: 'Text 1',
        extension: '',
        isImage: false,
        error: null,
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
    const commentEditor = createEditor()
    commentEditor.details.addComment.isVisible = computed(() => true)
    commentEditor.details.addComment.value.value = 'Follow up'
    renderEditor(commentEditor)

    await user.click(screen.getByRole('button', { name: 'Clear comment' }))
    expect(commentEditor.details.addComment.clear).toHaveBeenCalledOnce()

    const businessEditor = createEditor()
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
    const timezone = screen.getByLabelText('Timezone')
    await user.click(timezone)
    await user.clear(timezone)
    await user.type(timezone, 'Asia/Singapore')
    await user.click(
      await screen.findByRole('option', { name: 'Asia/Singapore' }),
    )

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

function renderDrawer() {
  const editor = createEditor()
  renderEditor(editor)

  return editor.details
}

function renderEditor(editor: WorkflowEditorController) {
  vi.mocked(useWorkflowEditorContext).mockReturnValue(editor)

  render(NodeDetailsDrawer, {
    global: {
      stubs: {
        Sheet: {
          props: ['open'],
          template: '<template v-if="open"><slot /></template>',
        },
        SheetContent: {
          template: '<aside role="dialog"><slot /></aside>',
        },
        SheetHeader: {
          template: '<header><slot /></header>',
        },
        SheetTitle: {
          template: '<h1><slot /></h1>',
        },
        SheetDescription: {
          template: '<p><slot /></p>',
        },
        SheetFooter: {
          template: '<footer><slot /></footer>',
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

function createEditor(): WorkflowEditorController {
  const isEditingTitle = ref(false)
  const isEditingDescription = ref(false)

  return {
    status: {
      isLoading: ref(false),
      errorMessage: computed(() => null),
      isEmpty: computed(() => false),
      readinessLabel: computed(() => 'Workflow ready'),
      readinessTitle: computed(() => 'All workflow checks passed'),
      isWorkflowReady: computed(() => true),
    },
    canvas: {
      nodes: computed(() => []),
      edges: computed(() => []),
      openNode: vi.fn(),
      openCreation: vi.fn(),
      openCreationAfter: vi.fn(),
      updateNodePosition: vi.fn(),
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
    deletion: {
      isOpen: computed(() => false),
      title: computed(() => ''),
      message: computed(() => ''),
      errorMessage: ref(null),
      isDeleting: ref(false),
      confirmLabel: computed(() => 'Delete'),
      request: vi.fn(),
      requestFromDetails: vi.fn(),
      cancel: vi.fn(),
      confirm: vi.fn(),
      setVisibility: vi.fn(),
      handleCloseAutoFocus: vi.fn(),
    },
    details: {
      selectedNode: computed(() => null),
      isOpen: computed(() => true),
      typeLabel: computed(() => 'Send message'),
      title: ref('Welcome message'),
      description: ref('Hello there'),
      titleError: computed(() => null),
      descriptionError: computed(() => null),
      errorMessage: computed(() => null),
      isEditingTitle: computed(() => isEditingTitle.value),
      isEditingDescription: computed(() => isEditingDescription.value),
      isDirty: computed(() => true),
      isSaving: ref(false),
      close: vi.fn(),
      setVisibility: vi.fn(),
      updateTitle: vi.fn(),
      updateDescription: vi.fn(),
      startEditing: vi.fn(async (field) => {
        isEditingTitle.value = field === 'title'
        isEditingDescription.value = field === 'description'
      }),
      finishEditing: vi.fn(),
      cancelEditing: vi.fn(),
      handleDescriptionKeydown: vi.fn(),
      focusDetailsPanel: vi.fn(),
      sendMessage: {
        isVisible: computed(() => false),
        textItems: computed(() => []),
        attachmentItems: computed(() => []),
        hasContent: computed(() => false),
        contentError: computed(() => null),
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
        hoursError: computed(() => null),
        hourErrorMessages: computed(() => []),
        timezone: ref(''),
        timezoneOptions: computed(() => []),
        timezoneError: computed(() => null),
        updateHour: vi.fn(),
        updateTimezone: vi.fn(),
      },
      save: vi.fn(),
      requestDelete: vi.fn(),
    },
  }
}
