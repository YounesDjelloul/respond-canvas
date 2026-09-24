import { computed, onBeforeUnmount, onMounted, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { storeToRefs } from 'pinia'
import type { WorkflowGraph } from '../domain'
import { useWorkflowHistoryStore } from '../stores/workflow-history'

interface WorkflowHistoryDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  applyGraph: (graph: WorkflowGraph) => void
  isBlocked: MaybeRefOrGetter<boolean>
}

export function useWorkflowHistory({
  graph,
  applyGraph,
  isBlocked,
}: WorkflowHistoryDependencies) {
  const store = useWorkflowHistoryStore()
  const { history } = storeToRefs(store)
  const announcement = ref('')
  const previousEntry = computed(() => history.value.past.at(-1) ?? null)
  const nextEntry = computed(() => history.value.future[0] ?? null)
  const canUndo = computed(() => previousEntry.value !== null && !toValue(isBlocked))
  const canRedo = computed(() => nextEntry.value !== null && !toValue(isBlocked))

  function commit(nextGraph: WorkflowGraph, label: string) {
    const currentGraph = toValue(graph)

    if (currentGraph) {
      store.record(currentGraph, label)
    }

    applyGraph(nextGraph)
  }

  function undo() {
    const currentGraph = toValue(graph)

    if (!canUndo.value || !currentGraph) {
      return
    }

    const result = store.undo(currentGraph)

    if (result) {
      applyGraph(result.graph)
      announcement.value = `Undid ${lowercaseFirst(result.label)}`
    }
  }

  function redo() {
    const currentGraph = toValue(graph)

    if (!canRedo.value || !currentGraph) {
      return
    }

    const result = store.redo(currentGraph)

    if (result) {
      applyGraph(result.graph)
      announcement.value = `Redid ${lowercaseFirst(result.label)}`
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || isEditableTarget(event.target)) {
      return
    }

    const key = event.key.toLowerCase()
    const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey)
    const isUndo = key === 'z' && !event.shiftKey

    if (!isUndo && !isRedo) {
      return
    }

    event.preventDefault()

    if (isRedo) {
      redo()
      return
    }

    undo()
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    canUndo,
    canRedo,
    undoLabel: computed(() =>
      previousEntry.value ? `Undo ${lowercaseFirst(previousEntry.value.label)}` : 'Undo',
    ),
    redoLabel: computed(() =>
      nextEntry.value ? `Redo ${lowercaseFirst(nextEntry.value.label)}` : 'Redo',
    ),
    announcement,
    commit,
    undo,
    redo,
  }
}

function lowercaseFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1)
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  )
}
