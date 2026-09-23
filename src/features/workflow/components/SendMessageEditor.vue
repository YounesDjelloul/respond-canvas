<script setup lang="ts">
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    sendMessage: {
      items,
      attachmentError,
      addText,
      updateText,
      removePart,
      addAttachments,
    },
  },
} = useWorkflowEditorContext()
</script>

<template>
  <section aria-labelledby="message-content-heading" class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="message-content-heading" class="text-xs font-semibold text-slate-900">
          Message content
        </h3>
        <p class="mt-1 text-[11px] text-slate-500">Sent to the customer in this order.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50"
          @click="addText"
        >
          Add text
        </button>
        <label
          class="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50"
        >
          Upload
          <input
            type="file"
            multiple
            class="sr-only"
            aria-label="Upload attachments"
            @change="addAttachments(($event.target as HTMLInputElement).files)"
          />
        </label>
      </div>
    </div>

    <div
      v-if="items.length === 0"
      class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500"
    >
      Add text or an attachment to build this message.
    </div>

    <div v-for="item in items" :key="item.index" class="group relative">
      <div v-if="item.type === 'text'" class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <label
          :for="`message-text-${item.index}`"
          class="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
        >
          Text {{ item.index + 1 }}
        </label>
        <textarea
          :id="`message-text-${item.index}`"
          :value="item.value"
          rows="3"
          class="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-900 shadow-sm transition-colors duration-150 hover:border-slate-300 focus:border-violet-400"
          @input="updateText(item.index, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div
        v-else
        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
      >
        <img
          v-if="item.isImage"
          :src="item.value"
          :alt="item.name"
          class="size-14 rounded-lg border border-slate-200 bg-white object-cover"
        />
        <span
          v-else
          class="grid size-14 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-400"
          aria-hidden="true"
        >
          ↗
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-slate-800">{{ item.name }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Attachment</p>
        </div>
      </div>

      <button
        type="button"
        :aria-label="`Remove ${item.type === 'text' ? `text ${item.index + 1}` : item.name}`"
        class="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-500 opacity-0 shadow-sm transition-opacity duration-150 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        @click="removePart(item.index)"
      >
        Remove
      </button>
    </div>

    <p
      v-if="attachmentError"
      role="alert"
      class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {{ attachmentError }}
    </p>
  </section>
</template>
