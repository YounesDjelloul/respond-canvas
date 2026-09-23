<script setup lang="ts">
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
      <button
        v-if="value"
        type="button"
        class="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50"
        @click="clear"
      >
        Clear comment
      </button>
    </div>

    <label for="node-comment" class="sr-only">Internal comment</label>
    <textarea
      id="node-comment"
      :value="value"
      rows="4"
      placeholder="Add context for your team"
      class="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 shadow-sm transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400"
      @input="update(($event.target as HTMLTextAreaElement).value)"
    />
  </section>
</template>
