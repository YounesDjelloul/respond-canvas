<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core'
import { Button } from '@/components/ui/button'
import type { Position } from '@vue-flow/core'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'
import { useWorkflowInsertionEdge } from '../composables/use-workflow-insertion-edge'
import type { WorkflowCanvasEdgeData } from '../types'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  markerEnd?: string
  data: WorkflowCanvasEdgeData
}>()

const { path, buttonStyle, isHovered, showControl, hideControl } =
  useWorkflowInsertionEdge(() => ({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }))
const {
  canvas: { openCreation },
} = useWorkflowEditorContext()
</script>

<template>
  <BaseEdge :id="id" :path="path" :marker-end="markerEnd" />
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    stroke-width="20"
    class="workflow-edge-hit"
    @mouseenter="showControl"
    @mouseleave="hideControl"
  />
  <EdgeLabelRenderer>
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      :style="buttonStyle"
      :aria-label="data.insertionLabel"
      class="nodrag nopan pointer-events-auto absolute rounded-full shadow-sm group-data-[inserting=true]/canvas:opacity-100 focus-visible:opacity-100"
      :class="isHovered ? 'opacity-100' : 'opacity-0'"
      @mouseenter="showControl"
      @mouseleave="hideControl"
      @click.stop="openCreation(data.insertionPoint)"
    >
      <PlusIcon aria-hidden="true" />
    </Button>
  </EdgeLabelRenderer>
</template>
