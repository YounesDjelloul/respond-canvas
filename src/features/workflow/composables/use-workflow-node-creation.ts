import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
} from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import {
  insertWorkflowNode,
  type CreatableWorkflowNodeKind,
  type InsertWorkflowNodeInput,
  type WorkflowGraph,
  type WorkflowInsertionPoint,
  type WorkflowMutationError,
} from '../domain'
import { CREATABLE_WORKFLOW_NODE_OPTIONS } from '../presentation/workflow-node-presentation'
import { useWorkflowEditorStore } from '../stores/workflow-editor'

interface WorkflowNodeCreationDependencies {
  graph: MaybeRefOrGetter<WorkflowGraph | null>
  applyGraph: (graph: WorkflowGraph) => void
  openNode: (nodeId: string) => void
}

export function useWorkflowNodeCreation({
  graph,
  applyGraph,
  openNode,
}: WorkflowNodeCreationDependencies) {
  const editorStore = useWorkflowEditorStore()
  const { insertionPoint, mode } = storeToRefs(editorStore)
  const kind = ref<CreatableWorkflowNodeKind>('send-message')
  const title = ref('')
  const description = ref('')
  const errors = ref<readonly WorkflowMutationError[]>([])
  const insertMutation = useMutation({
    mutationFn: async (input: InsertWorkflowNodeInput) =>
      insertWorkflowNode(requireGraph(toValue(graph)), input),
  })
  const isChoosingInsertion = computed(() => mode.value === 'choosing-insertion')
  const isOpen = computed(
    () => mode.value === 'creating' && insertionPoint.value !== null,
  )
  const context = computed(() => createInsertionContext(toValue(graph), insertionPoint.value))
  const titleError = computed(
    () => errors.value.find((error) => error.path?.[0] === 'title')?.message ?? null,
  )
  const descriptionError = computed(
    () =>
      errors.value.find((error) => error.path?.[0] === 'description')?.message ??
      null,
  )
  const errorMessage = computed(
    () =>
      errors.value.find(
        (error) => error.path?.[0] !== 'title' && error.path?.[0] !== 'description',
      )?.message ?? null,
  )
  const showsBusinessHoursNote = computed(() => kind.value === 'business-hours')
  const buttonLabel = computed(() =>
    isChoosingInsertion.value ? 'Cancel' : 'Create New Node',
  )

  function handleEditorKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isChoosingInsertion.value) {
      cancel()
    }
  }

  onMounted(() => window.addEventListener('keydown', handleEditorKeydown))
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEditorKeydown)
    editorStore.cancelInsertion()
  })

  function begin() {
    editorStore.beginInsertion()
  }

  function toggle() {
    if (isChoosingInsertion.value) {
      cancel()
      return
    }

    begin()
  }

  function open(point: WorkflowInsertionPoint) {
    kind.value = 'send-message'
    title.value = ''
    description.value = ''
    errors.value = []
    editorStore.selectInsertionPoint(point)
  }

  function openAfter(sourceId: string) {
    open({ sourceId, targetId: null })
  }

  function cancel() {
    editorStore.cancelInsertion()
    errors.value = []
  }

  function setVisibility(visible: boolean) {
    if (!visible) {
      cancel()
    }
  }

  function updateKind(value: CreatableWorkflowNodeKind) {
    kind.value = value
    errors.value = []
  }

  function updateTitle(value: string | undefined) {
    title.value = value ?? ''
    errors.value = errors.value.filter((error) => error.path?.[0] !== 'title')
  }

  function updateDescription(value: string | undefined) {
    description.value = value ?? ''
    errors.value = errors.value.filter(
      (error) => error.path?.[0] !== 'description',
    )
  }

  function submit() {
    if (!insertionPoint.value) {
      return
    }

    const nodeId = createWorkflowId('step')
    const input = createInsertionInput(
      nodeId,
      insertionPoint.value,
      kind.value,
      title.value,
      description.value,
    )

    errors.value = []
    insertMutation.mutate(input, {
      onSuccess: (result) => {
        if (!result.ok) {
          errors.value = result.errors
          return
        }

        applyGraph(result.value)
        editorStore.cancelInsertion()
        openNode(nodeId)
      },
    })
  }

  return {
    controller: {
      isOpen,
      isChoosingInsertion,
      context,
      kind,
      title,
      description,
      titleError,
      descriptionError,
      errorMessage,
      typeOptions: CREATABLE_WORKFLOW_NODE_OPTIONS,
      showsBusinessHoursNote,
      buttonLabel,
      isCreating: insertMutation.isPending,
      begin,
      toggle,
      cancel,
      setVisibility,
      updateKind,
      updateTitle,
      updateDescription,
      submit,
    },
    open,
    openAfter,
    isChoosingInsertion,
  }
}

function createInsertionContext(
  graph: WorkflowGraph | null,
  insertionPoint: WorkflowInsertionPoint | null,
): string {
  if (!graph || !insertionPoint) {
    return ''
  }

  const source = graph.nodes.find((node) => node.id === insertionPoint.sourceId)
  const target = insertionPoint.targetId
    ? graph.nodes.find((node) => node.id === insertionPoint.targetId)
    : null

  return target
    ? `${source?.title ?? 'Step'} → ${target.title}`
    : `After ${source?.title ?? 'step'}`
}

function createInsertionInput(
  id: string,
  insertionPoint: WorkflowInsertionPoint,
  kind: CreatableWorkflowNodeKind,
  title: string,
  description: string,
): InsertWorkflowNodeInput {
  const base = {
    id,
    insertionPoint: { ...insertionPoint },
    title,
    description,
  }

  if (kind === 'business-hours') {
    return {
      ...base,
      kind,
      successConnectorId: createWorkflowId('success'),
      failureConnectorId: createWorkflowId('failure'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }
  }

  return {
    ...base,
    kind,
  }
}

function createWorkflowId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

function requireGraph(graph: WorkflowGraph | null): WorkflowGraph {
  if (!graph) {
    throw new Error('The workflow is not available')
  }

  return graph
}
