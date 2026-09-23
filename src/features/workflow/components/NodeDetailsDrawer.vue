<script setup lang="ts">
import Drawer from 'primevue/drawer'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    isOpen,
    heading,
    typeLabel,
    title,
    description,
    titleError,
    descriptionError,
    errorMessage,
    isDirty,
    isSaving,
    isDeleting,
    isDeleteConfirming,
    setVisibility,
    updateTitle,
    updateDescription,
    save,
    requestDelete,
    cancelDelete,
    confirmDelete,
  },
} = useWorkflowEditorContext()
</script>

<template>
  <Drawer
    :visible="isOpen"
    position="right"
    header="Node details"
    modal
    dismissable
    block-scroll
    class="!w-full sm:!w-[30rem]"
    @update:visible="setVisibility"
  >
    <form class="flex h-full flex-col" @submit.prevent="save">
      <div class="flex-1 space-y-6">
        <div>
          <span
            class="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            {{ typeLabel }}
          </span>
          <h2 class="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-950">
            {{ heading }}
          </h2>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Changes remain in this session and reset when the page is refreshed.
          </p>
        </div>

        <div class="space-y-1.5">
          <label for="node-title" class="block text-xs font-medium text-slate-700">Title</label>
          <input
            id="node-title"
            :value="title"
            type="text"
            autocomplete="off"
            :aria-invalid="Boolean(titleError)"
            :aria-describedby="titleError ? 'node-title-error' : undefined"
            class="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400"
            :class="
              titleError
                ? 'border-red-300 focus:border-red-400'
                : 'border-slate-200 hover:border-slate-300 focus:border-violet-400'
            "
            @input="updateTitle(($event.target as HTMLInputElement).value)"
          />
          <p v-if="titleError" id="node-title-error" class="text-xs text-red-600">
            {{ titleError }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label for="node-description" class="block text-xs font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="node-description"
            :value="description"
            rows="5"
            :aria-invalid="Boolean(descriptionError)"
            :aria-describedby="descriptionError ? 'node-description-error' : undefined"
            class="w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400"
            :class="
              descriptionError
                ? 'border-red-300 focus:border-red-400'
                : 'border-slate-200 hover:border-slate-300 focus:border-violet-400'
            "
            @input="updateDescription(($event.target as HTMLTextAreaElement).value)"
          />
          <p
            v-if="descriptionError"
            id="node-description-error"
            class="text-xs text-red-600"
          >
            {{ descriptionError }}
          </p>
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {{ errorMessage }}
        </p>

        <div class="border-t border-slate-100 pt-6">
          <h3 class="text-xs font-semibold text-slate-900">Danger zone</h3>

          <div
            v-if="isDeleteConfirming"
            class="mt-3 rounded-xl border border-red-200 bg-red-50/60 p-3"
          >
            <p class="text-xs font-medium text-red-900">Delete this part of the workflow?</p>
            <p class="mt-1 text-[11px] leading-4 text-red-700">
              This node and every node connected after it will be removed.
            </p>
            <div class="mt-3 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-white"
                @click="cancelDelete"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="isDeleting"
                class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                @click="confirmDelete"
              >
                {{ isDeleting ? 'Deleting…' : 'Delete node' }}
              </button>
            </div>
          </div>

          <button
            v-else
            type="button"
            class="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-[background-color,border-color] duration-150 hover:border-red-300 hover:bg-red-50"
            @click="requestDelete"
          >
            Delete node
          </button>
        </div>
      </div>

      <div class="sticky bottom-0 mt-6 flex justify-end border-t border-slate-100 bg-white pt-4">
        <button
          type="submit"
          :disabled="!isDirty || isSaving"
          class="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-[background-color,opacity,transform] duration-150 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {{ isSaving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </form>
  </Drawer>
</template>
