import { defineComponent, h } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { WorkflowRepository } from '../../data/types'
import {
  provideWorkflowEditor,
  useWorkflowEditorContext,
} from '../workflow-editor-context'
import type { WorkflowEditorController } from '../use-workflow-editor'

describe('workflow editor context', () => {
  it('shares one scoped controller instance with descendants', async () => {
    const repository: WorkflowRepository = {
      getWorkflow: async () => [],
    }
    let providedEditor!: WorkflowEditorController
    let injectedEditor!: WorkflowEditorController
    const Child = defineComponent({
      setup() {
        injectedEditor = useWorkflowEditorContext()
        return () => h('div')
      },
    })
    const Parent = defineComponent({
      setup() {
        providedEditor = provideWorkflowEditor(repository)
        return () => h(Child)
      },
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'workflow', component: Parent }],
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    await router.push('/')
    await router.isReady()

    render(Parent, {
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]],
      },
    })

    expect(injectedEditor).toBe(providedEditor)
  })
})
