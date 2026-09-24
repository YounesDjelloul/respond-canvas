<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    addComment: { value, update, clear },
  },
} = useWorkflowEditorContext()
</script>

<template>
  <section aria-labelledby="comment-heading" class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="comment-heading" class="text-xs font-semibold text-slate-900">Internal comment</h3>
        <p class="mt-1 text-[11px] text-slate-500">
          Added to the contact profile for teammates.
        </p>
      </div>
      <Button v-if="value" type="button" variant="ghost-destructive" size="sm" @click="clear">
        Clear comment
      </Button>
    </div>

    <label for="node-comment" class="sr-only">Internal comment</label>
    <Textarea
      id="node-comment"
      :model-value="value"
      placeholder="Add context for your team"
      class="min-h-24 resize-none"
      @update:model-value="update"
    />
  </section>
</template>
