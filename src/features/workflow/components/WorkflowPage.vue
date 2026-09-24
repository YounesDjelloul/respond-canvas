<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { provideWorkflowEditor } from '../composables/workflow-editor-context'
import NodeDetailsDrawer from './NodeDetailsDrawer.vue'
import NodeCreationDialog from './NodeCreationDialog.vue'
import NodeDeleteDialog from './NodeDeleteDialog.vue'
import WorkflowCanvas from './WorkflowCanvas.vue'

const {
  status: {
    errorMessage,
    isEmpty,
    isLoading,
    readinessLabel,
    readinessTitle,
    isWorkflowReady,
  },
  creation: { isChoosingInsertion, buttonLabel, toggle: toggleInsertion },
} = provideWorkflowEditor()
</script>

<template>
  <main class="flex h-svh min-h-[36rem] flex-col bg-white p-3 sm:p-4">
    <header class="flex items-center justify-between px-1 pb-3 sm:px-2 sm:pb-4">
      <div class="flex items-center gap-3">
        <span
          class="grid size-8 place-items-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm"
          aria-hidden="true"
        >
          R
        </span>
        <div>
          <h1 class="text-sm font-semibold tracking-[-0.01em] text-slate-950">Respond Canvas</h1>
          <p class="text-[11px] text-slate-500">Customer conversation workflow</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Badge
          :variant="isWorkflowReady ? 'success' : 'warning'"
          :title="readinessTitle"
          class="h-6 gap-1.5 px-2 text-[11px] sm:px-2.5"
        >
          <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
          <span class="sr-only sm:not-sr-only">{{ readinessLabel }}</span>
        </Badge>
        <Button
          :variant="isChoosingInsertion ? 'outline' : 'default'"
          size="sm"
          @click="toggleInsertion"
        >
          {{ buttonLabel }}
        </Button>
      </div>
    </header>

    <section
      v-if="isLoading"
      aria-label="Loading workflow"
      aria-busy="true"
      class="grid min-h-0 flex-1 place-items-center rounded-2xl border border-slate-200 bg-slate-50"
    >
      <div class="flex flex-col items-center gap-3 text-sm text-slate-500">
        <span
          class="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
          aria-hidden="true"
        />
        Loading workflow
      </div>
    </section>

    <section
      v-else-if="errorMessage"
      role="alert"
      class="grid min-h-0 flex-1 place-items-center rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center"
    >
      <div class="max-w-sm">
        <h2 class="text-sm font-semibold text-slate-900">We couldn’t load the workflow</h2>
        <p class="mt-1.5 text-xs leading-5 text-slate-600">{{ errorMessage }}</p>
      </div>
    </section>

    <section
      v-else-if="isEmpty"
      class="grid min-h-0 flex-1 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
    >
      <div>
        <h2 class="text-sm font-semibold text-slate-900">This workflow is empty</h2>
        <p class="mt-1.5 text-xs text-slate-500">Add a node to begin building the conversation.</p>
      </div>
    </section>

    <WorkflowCanvas v-else />

    <NodeDetailsDrawer />
    <NodeCreationDialog />
    <NodeDeleteDialog />
  </main>
</template>
