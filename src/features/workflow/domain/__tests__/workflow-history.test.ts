import { describe, expect, it } from 'vitest'
import {
  createWorkflowHistory,
  recordWorkflowChange,
  redoWorkflowChange,
  undoWorkflowChange,
  type WorkflowGraph,
} from '../index'

function graphNamed(name: string): WorkflowGraph {
  return {
    nodes: [
      {
        id: name,
        parentId: null,
        kind: 'trigger',
        title: name,
        description: name,
        editable: true,
        accent: 'violet',
        position: { x: 0, y: 0 },
        config: { eventType: 'conversationOpened', oncePerContact: false },
      },
    ],
    edges: [],
  }
}

describe('workflow history', () => {
  it('walks back and forth through recorded changes with their labels', () => {
    const first = graphNamed('first')
    const second = graphNamed('second')
    const third = graphNamed('third')
    const history = recordWorkflowChange(
      recordWorkflowChange(createWorkflowHistory(), first, 'Edit first'),
      second,
      'Move second',
    )

    const undone = undoWorkflowChange(history, third)

    expect(undone?.graph).toBe(second)
    expect(undone?.label).toBe('Move second')

    const undoneAgain = undoWorkflowChange(undone!.history, second)

    expect(undoneAgain?.graph).toBe(first)
    expect(undoneAgain?.history.past).toEqual([])

    const redone = redoWorkflowChange(undoneAgain!.history, first)

    expect(redone?.graph).toBe(second)
    expect(redone?.label).toBe('Edit first')
    expect(redoWorkflowChange(redone!.history, second)?.graph).toBe(third)
  })

  it('clears the redo stack when a new change is recorded', () => {
    const first = graphNamed('first')
    const second = graphNamed('second')
    const undone = undoWorkflowChange(
      recordWorkflowChange(createWorkflowHistory(), first, 'Edit first'),
      second,
    )

    expect(undone?.history.future).toHaveLength(1)

    const rewritten = recordWorkflowChange(undone!.history, first, 'Delete first')

    expect(rewritten.future).toEqual([])
    expect(redoWorkflowChange(rewritten, first)).toBeNull()
  })

  it('keeps only the most recent changes up to the limit without mutating input', () => {
    let history = createWorkflowHistory()

    for (let step = 0; step < 5; step += 1) {
      history = recordWorkflowChange(history, graphNamed(`step-${step}`), `Step ${step}`, 3)
    }

    const snapshot = history.past

    expect(history.past.map((entry) => entry.label)).toEqual(['Step 2', 'Step 3', 'Step 4'])
    recordWorkflowChange(history, graphNamed('extra'), 'Extra', 3)
    expect(history.past).toBe(snapshot)
    expect(history.past).toHaveLength(3)
  })

  it('returns null when there is nothing to undo or redo', () => {
    const history = createWorkflowHistory()

    expect(undoWorkflowChange(history, graphNamed('current'))).toBeNull()
    expect(redoWorkflowChange(history, graphNamed('current'))).toBeNull()
  })
})
