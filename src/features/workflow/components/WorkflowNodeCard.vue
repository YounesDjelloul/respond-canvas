<script setup lang="ts">
import { PlusIcon, Trash2Icon, TriangleAlertIcon } from '@lucide/vue'
import { Handle, Position } from '@vue-flow/core'
import { Button } from '@/components/ui/button'
import type { WorkflowCanvasNodeData } from '../types'

defineProps<{
  id: string
  data: WorkflowCanvasNodeData
  selected: boolean
}>()

defineEmits<{
  'keyboard-open': [nodeId: string]
  'insert-after': [nodeId: string]
  'request-delete': [nodeId: string]
}>()
</script>

<template>
  <div class="group relative w-64">
    <article
      class="rounded-xl border border-l-2 border-slate-200 bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[border-color,box-shadow,transform] duration-150 ease-out"
      :class="[
        data.accentClass,
        data.editable ? 'cursor-pointer' : 'cursor-default',
        selected
          ? 'border-slate-300 shadow-[0_8px_24px_rgb(15_23_42/0.10)]'
          : 'hover:border-slate-300 hover:shadow-[0_4px_14px_rgb(15_23_42/0.07)]',
      ]"
      :role="data.editable ? 'button' : 'group'"
      :tabindex="data.editable ? 0 : -1"
      :data-workflow-node-id="id"
      :aria-label="data.accessibleLabel"
      @keydown.enter.prevent="data.editable && $emit('keyboard-open', id)"
      @keydown.space.prevent="data.editable && $emit('keyboard-open', id)"
      @keydown.delete.prevent="$emit('request-delete', id)"
    >
      <Handle
        v-if="data.hasParent"
        type="target"
        :position="Position.Top"
        :connectable="false"
        class="!size-2 !border-2 !border-white !bg-slate-300"
      />

      <div class="flex items-start gap-3">
        <span
          class="grid size-7 shrink-0 place-items-center rounded-lg"
          :class="data.iconClass"
          aria-hidden="true"
        >
          <component :is="data.icon" class="size-3.5" />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-[13px] font-semibold leading-5 text-slate-900">
              {{ data.title }}
            </h2>
            <TriangleAlertIcon
              v-if="data.issueLabel"
              class="size-3.5 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <span
              v-if="!data.editable"
              class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500"
            >
              View only
            </span>
          </div>
          <p
            class="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500"
            :title="data.description"
          >
            {{ data.description }}
          </p>
        </div>
      </div>

      <Handle
        v-if="data.hasChildren"
        type="source"
        :position="Position.Bottom"
        :connectable="false"
        class="!size-2 !border-2 !border-white !bg-slate-300"
      />
    </article>

    <div
      v-if="data.showsDeleteControl"
      class="nodrag nopan pointer-events-none absolute -top-3.5 right-2 flex rounded-lg border border-slate-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 pointer-coarse:hidden group-data-[inserting=true]/canvas:hidden"
    >
      <Button
        type="button"
        variant="ghost-destructive"
        size="icon-xs"
        :aria-label="data.deleteLabel"
        @click.stop="$emit('request-delete', id)"
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>

    <div
      v-if="data.canInsertAfter"
      class="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center"
    >
      <span class="h-5 w-px bg-slate-300" aria-hidden="true" />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        :aria-label="data.insertionLabel"
        class="nodrag nopan rounded-full opacity-0 shadow-sm group-hover:opacity-100 group-data-[inserting=true]/canvas:opacity-100 focus-visible:opacity-100"
        @click.stop="$emit('insert-after', id)"
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </div>
  </div>
</template>
