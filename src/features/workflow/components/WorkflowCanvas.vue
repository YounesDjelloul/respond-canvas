<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { VueFlow } from '@vue-flow/core'
import { Button } from '@/components/ui/button'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'
import WorkflowInsertionEdge from './WorkflowInsertionEdge.vue'
import WorkflowNodeCard from './WorkflowNodeCard.vue'

const {
  canvas: { flowId, openNode, openCreationAfter, updateNodePosition },
  creation: { isChoosingInsertion, cancel: cancelInsertion },
  deletion: { request: requestNodeDelete },
} = useWorkflowEditorContext()
</script>

<template>
  <section
    aria-label="Workflow canvas"
    :data-inserting="isChoosingInsertion"
    class="group/canvas relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
  >
    <VueFlow
      :id="flowId"
      only-render-visible-elements
      :min-zoom="0.35"
      :max-zoom="1.75"
      :nodes-connectable="false"
      :edges-focusable="false"
      fit-view-on-init
      class="h-full"
      @node-click="openNode($event.node.id)"
      @node-drag-stop="updateNodePosition($event.node)"
    >
      <Background :gap="20" :size="1" color="#d9dde5" />

      <template #node-workflow="nodeProps">
        <WorkflowNodeCard
          v-bind="nodeProps"
          @keyboard-open="openNode"
          @insert-after="openCreationAfter"
          @request-delete="requestNodeDelete"
        />
      </template>

      <template
        #edge-workflow-insertion="{
          id,
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          markerEnd,
          data,
        }"
      >
        <WorkflowInsertionEdge
          :id="id"
          :source-x="sourceX"
          :source-y="sourceY"
          :target-x="targetX"
          :target-y="targetY"
          :source-position="sourcePosition"
          :target-position="targetPosition"
          :marker-end="markerEnd"
          :data="data"
        />
      </template>
    </VueFlow>

    <div
      v-if="isChoosingInsertion"
      role="status"
      class="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-violet-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur transition-all duration-150"
    >
      <span>Choose where to add the new step</span>
      <Button type="button" variant="ghost" size="xs" @click="cancelInsertion">
        Cancel
      </Button>
    </div>

    <div
      class="pointer-events-none absolute bottom-4 left-4 rounded-lg pointer-coarse:hidden border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur"
    >
      Drag nodes · Scroll to zoom · Drag canvas to pan
    </div>
  </section>
</template>
