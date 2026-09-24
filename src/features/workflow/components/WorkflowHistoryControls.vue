<script setup lang="ts">
import { Redo2Icon, Undo2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  history: { canUndo, canRedo, undoLabel, redoLabel, announcement, undo, redo },
} = useWorkflowEditorContext()
</script>

<template>
  <div class="flex items-center gap-0.5">
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      :aria-label="undoLabel"
      :title="undoLabel"
      :disabled="!canUndo"
      @click="undo"
    >
      <Undo2Icon aria-hidden="true" />
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      :aria-label="redoLabel"
      :title="redoLabel"
      :disabled="!canRedo"
      @click="redo"
    >
      <Redo2Icon aria-hidden="true" />
    </Button>
    <p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>
  </div>
</template>
