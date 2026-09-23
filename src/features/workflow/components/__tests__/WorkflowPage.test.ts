import { computed, ref } from 'vue'
import { render, screen } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { provideWorkflowEditor } from '../../composables/workflow-editor-context'
import type { WorkflowEditorController } from '../../composables/use-workflow-editor'
import WorkflowPage from '../WorkflowPage.vue'

vi.mock('../../composables/workflow-editor-context')

describe('WorkflowPage', () => {
  beforeEach(() => {
    vi.mocked(provideWorkflowEditor).mockReturnValue(
      createEditor({
        isLoading: false,
        errorMessage: null,
        isEmpty: false,
      }),
    )
  })

  it('announces the workflow loading state', () => {
    vi.mocked(provideWorkflowEditor).mockReturnValue(
      createEditor({
        isLoading: true,
        errorMessage: null,
        isEmpty: false,
      }),
    )

    renderWorkflowPage()

    expect(screen.getByLabelText('Loading workflow')).not.toBeNull()
    expect(screen.getByText('Loading workflow')).not.toBeNull()
  })

  it('presents loading failures as an alert', () => {
    vi.mocked(provideWorkflowEditor).mockReturnValue(
      createEditor({
        isLoading: false,
        errorMessage: 'Unable to load workflow',
        isEmpty: false,
      }),
    )

    renderWorkflowPage()

    expect(screen.getByRole('alert').textContent).toContain('Unable to load workflow')
  })

  it('renders the workflow canvas when data is ready', () => {
    renderWorkflowPage()

    expect(screen.getByRole('heading', { name: 'Respond Canvas' })).not.toBeNull()
    expect(screen.getByLabelText('Workflow canvas')).not.toBeNull()
  })
})

function createEditor(state: {
  isLoading: boolean
  errorMessage: string | null
  isEmpty: boolean
}): WorkflowEditorController {
  return {
    status: {
      isLoading: ref(state.isLoading),
      errorMessage: computed(() => state.errorMessage),
      isEmpty: computed(() => state.isEmpty),
    },
    canvas: {
      nodes: computed(() => []),
      edges: computed(() => []),
      openNode: vi.fn(),
    },
    details: {
      selectedNode: computed(() => null),
      isOpen: computed(() => false),
      heading: computed(() => 'Node details'),
      typeLabel: computed(() => ''),
      title: ref(''),
      description: ref(''),
      titleError: computed(() => null),
      descriptionError: computed(() => null),
      errorMessage: computed(() => null),
      isDirty: computed(() => false),
      isSaving: ref(false),
      isDeleting: ref(false),
      isDeleteConfirming: ref(false),
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

function renderWorkflowPage() {
  return render(WorkflowPage, {
    global: {
      stubs: {
        WorkflowCanvas: {
          template: '<div aria-label="Workflow canvas" />',
        },
        NodeDetailsDrawer: {
          template: '<div />',
        },
      },
    },
  })
}
