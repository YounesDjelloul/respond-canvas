import { computed, ref, toValue } from 'vue'
import { getSmoothStepPath } from '@vue-flow/core'
import type { MaybeRefOrGetter } from 'vue'
import type { Position } from '@vue-flow/core'

interface WorkflowInsertionEdgeGeometry {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
}

export function useWorkflowInsertionEdge(
  geometry: MaybeRefOrGetter<WorkflowInsertionEdgeGeometry>,
) {
  const pathDetails = computed(() => getSmoothStepPath(toValue(geometry)))
  const path = computed(() => pathDetails.value[0])
  const isHovered = ref(false)
  const buttonStyle = computed(() => ({
    transform: `translate(-50%, -50%) translate(${pathDetails.value[1]}px, ${pathDetails.value[2]}px)`,
  }))

  return {
    path,
    buttonStyle,
    isHovered,
    showControl: () => {
      isHovered.value = true
    },
    hideControl: () => {
      isHovered.value = false
    },
  }
}
