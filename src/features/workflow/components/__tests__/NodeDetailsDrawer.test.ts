import { computed, ref } from 'vue'
import { render, screen } from '@testing-library/vue'
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
})

function renderDrawer(overrides: { isDeleteConfirming?: boolean } = {}) {
  const editor = createEditor(overrides)
  vi.mocked(useWorkflowEditorContext).mockReturnValue(editor)

  render(NodeDetailsDrawer, {
    global: {
      stubs: {
        Drawer: {
          props: ['visible'],
          template: '<aside v-if="visible" role="dialog"><slot /></aside>',
        },
      },
    },
  })

  return editor.details
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
      isDirty: computed(() => true),
      isSaving: ref(false),
      isDeleting: ref(false),
      isDeleteConfirming: ref(overrides.isDeleteConfirming ?? false),
      close: vi.fn(),
      setVisibility: vi.fn(),
      updateTitle: vi.fn(),
      updateDescription: vi.fn(),
      save: vi.fn(),
      requestDelete: vi.fn(),
      cancelDelete: vi.fn(),
      confirmDelete: vi.fn(),
    },
  }
}
