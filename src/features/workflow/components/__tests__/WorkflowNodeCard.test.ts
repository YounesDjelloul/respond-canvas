import { SendIcon } from '@lucide/vue'
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { WorkflowCanvasNodeData } from '../../types'
import WorkflowNodeCard from '../WorkflowNodeCard.vue'

const editableNode: WorkflowCanvasNodeData = {
  title: 'Welcome message',
  description: 'Say hello',
  kind: 'send-message',
  accent: 'green',
  editable: true,
  hasParent: true,
  hasChildren: false,
  canInsertAfter: true,
  isInsertionMode: false,
  insertionLabel: 'Insert a step after Welcome message',
  showsDeleteControl: true,
  deleteLabel: 'Delete Welcome message',
  icon: SendIcon,
  accentClass: 'border-l-emerald-400',
  iconClass: 'bg-emerald-50 text-emerald-600',
}

describe('WorkflowNodeCard', () => {
  it('opens an editable node with the keyboard', async () => {
    const user = userEvent.setup()
    const view = renderNode(editableNode)
    const node = screen.getByRole('button', { name: 'Welcome message. Say hello' })

    node.focus()
    await user.keyboard('{Enter}')

    expect(view.emitted()['keyboard-open']).toEqual([['message']])
  })

  it('keeps display-only nodes out of the keyboard tab order', () => {
    renderNode({
      ...editableNode,
      editable: false,
    })

    const node = screen.getByRole('group', { name: /welcome message/i })
    expect(node.getAttribute('tabindex')).toBe('-1')
  })
})

function renderNode(data: WorkflowCanvasNodeData) {
  return render(WorkflowNodeCard, {
    props: {
      id: 'message',
      data,
      selected: false,
    },
    global: {
      stubs: {
        Handle: true,
      },
    },
  })
}
