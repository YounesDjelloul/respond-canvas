<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core'
import type { Position } from '@vue-flow/core'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'
import { useWorkflowInsertionEdge } from '../composables/use-workflow-insertion-edge'
import type { WorkflowCanvasEdgeData } from '../types'

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
    <button
      type="button"
      :style="buttonStyle"
      :aria-label="data.insertionLabel"
      class="nodrag nopan pointer-events-auto absolute grid size-7 place-items-center rounded-full border border-slate-200 bg-white text-base font-medium leading-none text-slate-600 shadow-sm transition-[opacity,transform,box-shadow,border-color,color] duration-150 hover:border-violet-300 hover:text-violet-600 hover:shadow-md focus:opacity-100"
      :class="data.isInsertionMode || isHovered ? 'opacity-100' : 'opacity-0'"
      @mouseenter="showControl"
      @mouseleave="hideControl"
      @click.stop="openCreation(data.insertionPoint)"
    >
      <span aria-hidden="true">+</span>
    </button>
  </EdgeLabelRenderer>
</template>
