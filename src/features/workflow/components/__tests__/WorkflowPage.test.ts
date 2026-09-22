import { computed, ref } from 'vue'
import { render, screen } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowCanvas } from '../../composables/use-workflow-canvas'
import WorkflowPage from '../WorkflowPage.vue'

vi.mock('../../composables/use-workflow-canvas')

describe('WorkflowPage', () => {
  beforeEach(() => {
    vi.mocked(useWorkflowCanvas).mockReturnValue(
      createCanvasModel({
        isLoading: false,
        errorMessage: null,
        isEmpty: false,
      }),
    )
  })

  it('announces the workflow loading state', () => {
    vi.mocked(useWorkflowCanvas).mockReturnValue(
      createCanvasModel({
        isLoading: true,
        errorMessage: null,
        isEmpty: false,
      }),
    )

    render(WorkflowPage)

    expect(screen.getByLabelText('Loading workflow')).not.toBeNull()
    expect(screen.getByText('Loading workflow')).not.toBeNull()
  })

  it('presents loading failures as an alert', () => {
    vi.mocked(useWorkflowCanvas).mockReturnValue(
      createCanvasModel({
        isLoading: false,
        errorMessage: 'Unable to load workflow',
        isEmpty: false,
      }),
    )

    render(WorkflowPage)

    expect(screen.getByRole('alert').textContent).toContain('Unable to load workflow')
  })

  it('renders the workflow canvas when data is ready', () => {
    render(WorkflowPage, {
      global: {
        stubs: {
          WorkflowCanvas: {
            template: '<div aria-label="Workflow canvas" />',
          },
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'Respond Canvas' })).not.toBeNull()
    expect(screen.getByLabelText('Workflow canvas')).not.toBeNull()
  })
})

function createCanvasModel(state: {
  isLoading: boolean
  errorMessage: string | null
  isEmpty: boolean
}): ReturnType<typeof useWorkflowCanvas> {
  return {
    nodes: computed(() => []),
    edges: computed(() => []),
    isLoading: ref(state.isLoading),
    errorMessage: computed(() => state.errorMessage),
    isEmpty: computed(() => state.isEmpty),
  }
}
