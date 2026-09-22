<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { VueFlow } from '@vue-flow/core'
import type { WorkflowCanvasEdge, WorkflowCanvasNode } from '../types'
import WorkflowNodeCard from './WorkflowNodeCard.vue'

defineProps<{
  nodes: WorkflowCanvasNode[]
  edges: WorkflowCanvasEdge[]
}>()
</script>

<template>
  <section
    aria-label="Workflow canvas"
    class="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
  >
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :min-zoom="0.35"
      :max-zoom="1.75"
      :nodes-connectable="false"
      :edges-focusable="false"
      fit-view-on-init
      class="h-full"
    >
      <Background :gap="20" :size="1" color="#d9dde5" />

      <template #node-workflow="nodeProps">
        <WorkflowNodeCard v-bind="nodeProps" />
      </template>
    </VueFlow>

    <div
      class="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur"
    >
      Drag nodes · Scroll to zoom · Drag canvas to pan
    </div>
  </section>
</template>
