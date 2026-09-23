import { defineComponent, h, ref } from 'vue'
import { Position } from '@vue-flow/core'
import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { useWorkflowInsertionEdge } from '../use-workflow-insertion-edge'

describe('useWorkflowInsertionEdge', () => {
  it('exposes reactive path placement and hover state', async () => {
    const geometry = ref({
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    })
    let model!: ReturnType<typeof useWorkflowInsertionEdge>
    const Harness = defineComponent({
      setup() {
        model = useWorkflowInsertionEdge(geometry)
        return () => h('div')
      },
    })

    render(Harness)

    expect(model.path.value).toContain('100')
    expect(model.buttonStyle.value.transform).toContain('translate')
    expect(model.isHovered.value).toBe(false)

    model.showControl()
    expect(model.isHovered.value).toBe(true)

    model.hideControl()
    expect(model.isHovered.value).toBe(false)
  })
})
