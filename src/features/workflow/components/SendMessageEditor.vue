<script setup lang="ts">
import { PaperclipIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    sendMessage: {
      textItems,
      attachmentItems,
      hasContent,
      contentError,
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
        <p class="mt-1 text-[11px] text-slate-500">Text and files sent to the customer.</p>
      </div>

      <div class="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" @click="addText">
          <PlusIcon aria-hidden="true" />
          Add text
        </Button>
        <Button
          as="label"
          variant="outline"
          size="sm"
          class="has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <UploadIcon aria-hidden="true" />
          Upload
          <input
            type="file"
            multiple
            class="sr-only"
            aria-label="Upload attachments"
            @change="addAttachments(($event.target as HTMLInputElement).files)"
          />
        </Button>
      </div>
    </div>

    <div
      v-if="!hasContent"
      class="rounded-xl border border-dashed px-4 py-6 text-center text-xs"
      :class="
        contentError
          ? 'border-red-200 bg-red-50/50 text-red-700'
          : 'border-slate-200 text-slate-500'
      "
    >
      Add text or an attachment to build this message.
      <p v-if="contentError" role="alert" class="mt-1 font-medium">
        {{ contentError }}
      </p>
    </div>

    <div v-if="textItems.length" class="space-y-3">
      <div v-for="item in textItems" :key="item.index" class="group space-y-1.5">
        <div class="flex h-6 items-center justify-between gap-2">
          <label
            :for="`message-text-${item.index}`"
            class="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            {{ item.label }}
          </label>
          <Button
            type="button"
            variant="ghost-destructive"
            size="icon-xs"
            :aria-label="`Remove ${item.label.toLowerCase()}`"
            class="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
            @click="removePart(item.index)"
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
        <Textarea
          :id="`message-text-${item.index}`"
          :model-value="item.value"
          :aria-invalid="Boolean(item.error)"
          :aria-describedby="item.error ? `message-text-error-${item.index}` : undefined"
          class="min-h-20 resize-none"
          @update:model-value="updateText(item.index, $event)"
        />
        <p
          v-if="item.error"
          :id="`message-text-error-${item.index}`"
          role="alert"
          class="text-[11px] text-red-600"
        >
          {{ item.error }}
        </p>
      </div>
    </div>

    <section
      v-if="attachmentItems.length"
      aria-labelledby="message-attachments-heading"
      class="space-y-1.5"
    >
      <h4
        id="message-attachments-heading"
        class="flex h-6 items-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
      >
        Attachments
      </h4>
      <ul class="divide-y divide-border rounded-lg border border-input">
        <li
          v-for="item in attachmentItems"
          :key="item.index"
          class="group flex items-center gap-3 p-2"
        >
          <img
            v-if="item.isImage"
            :src="item.value"
            :alt="item.name"
            class="size-10 rounded-md object-cover"
          />
          <span
            v-else
            class="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <PaperclipIcon class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm text-slate-800">{{ item.name }}</p>
            <p v-if="item.error" role="alert" class="text-[11px] text-red-600">
              {{ item.error }}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost-destructive"
            size="icon-xs"
            :aria-label="`Remove ${item.label}`"
            class="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
            @click="removePart(item.index)"
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </li>
      </ul>
    </section>

    <p
      v-if="attachmentError"
      role="alert"
      class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {{ attachmentError }}
    </p>
  </section>
</template>
