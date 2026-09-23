<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PencilIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'
import AddCommentEditor from './AddCommentEditor.vue'
import BusinessHoursEditor from './BusinessHoursEditor.vue'
import SendMessageEditor from './SendMessageEditor.vue'

const {
  details: {
    isOpen,
    typeLabel,
    title,
    description,
    titleError,
    descriptionError,
    errorMessage,
    isEditingTitle,
    isEditingDescription,
    isDirty,
    isSaving,
    isDeleting,
    isDeleteConfirming,
    deleteButtonLabel,
    setVisibility,
    focusDetailsPanel,
    updateTitle,
    updateDescription,
    startEditing,
    finishEditing,
    cancelEditing,
    handleDescriptionKeydown,
    sendMessage: { isVisible: isSendMessage },
    addComment: { isVisible: isAddComment },
    businessHours: { isVisible: isBusinessHours },
    save,
    cancelDelete,
    handleDeleteAction,
  },
} = useWorkflowEditorContext()
</script>

<template>
  <Sheet :open="isOpen" @update:open="setVisibility">
    <SheetContent
      side="right"
      class="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[30rem]"
      @open-auto-focus="focusDetailsPanel"
    >
      <SheetHeader class="shrink-0 border-b border-slate-100 px-6 py-4">
        <SheetTitle>Node details</SheetTitle>
        <SheetDescription class="sr-only">
          Edit the selected workflow node
        </SheetDescription>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <form id="node-details-form" class="space-y-6" @submit.prevent="save">
          <div class="space-y-4">
            <span
              class="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
            >
              {{ typeLabel }}
            </span>

            <div class="space-y-1.5">
              <label v-if="isEditingTitle" for="node-title" class="sr-only">Title</label>
              <input
                v-if="isEditingTitle"
                id="node-title"
                :value="title"
                type="text"
                autocomplete="off"
                placeholder="Untitled node"
                :aria-invalid="Boolean(titleError)"
                :aria-describedby="titleError ? 'node-title-error' : undefined"
                class="-mx-2 block h-9 w-[calc(100%+1rem)] border-0 bg-transparent py-1 pr-8 pl-2 text-lg leading-7 font-semibold tracking-[-0.02em] text-slate-950 outline-none placeholder:text-slate-400"
                @input="updateTitle(($event.target as HTMLInputElement).value)"
                @blur="finishEditing('title')"
                @keydown.enter.prevent="finishEditing('title')"
                @keydown.esc.stop.prevent="cancelEditing('title')"
              />
              <h2 v-else class="text-lg leading-7 font-semibold tracking-[-0.02em] text-slate-950">
                <button
                  type="button"
                  :aria-label="`Edit title: ${title || 'Untitled node'}`"
                  class="group relative -mx-2 block h-9 w-[calc(100%+1rem)] cursor-text rounded-md py-1 pr-8 pl-2 text-left"
                  @click="startEditing('title')"
                >
                  <span class="block truncate">{{ title || 'Untitled node' }}</span>
                  <PencilIcon
                    class="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </h2>
              <p v-if="titleError" id="node-title-error" role="alert" class="text-xs text-red-600">
                {{ titleError }}
              </p>
            </div>

            <div class="space-y-1.5">
              <label v-if="isEditingDescription" for="node-description" class="sr-only">
                Description
              </label>
              <textarea
                v-if="isEditingDescription"
                id="node-description"
                :value="description"
                rows="1"
                placeholder="Add a description"
                :aria-invalid="Boolean(descriptionError)"
                :aria-describedby="descriptionError ? 'node-description-error' : undefined"
                class="field-sizing-content -mx-2 block min-h-9 w-[calc(100%+1rem)] resize-none overflow-hidden border-0 bg-transparent py-1.5 pr-8 pl-2 text-sm leading-6 text-slate-500 outline-none placeholder:text-slate-400"
                @input="updateDescription(($event.target as HTMLTextAreaElement).value)"
                @blur="finishEditing('description')"
                @keydown="handleDescriptionKeydown"
              />
              <button
                v-else
                type="button"
                :aria-label="`Edit description: ${description || 'No description'}`"
                class="group relative -mx-2 block min-h-9 w-[calc(100%+1rem)] cursor-text rounded-md py-1.5 pr-8 pl-2 text-left text-sm leading-6 text-slate-500"
                @click="startEditing('description')"
              >
                <span class="block whitespace-pre-wrap break-words">{{ description || 'Add a description' }}</span>
                <PencilIcon
                  class="absolute top-2.5 right-2 size-3.5 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                  aria-hidden="true"
                />
              </button>
              <p
                v-if="descriptionError"
                id="node-description-error"
                role="alert"
                class="text-xs text-red-600"
              >
                {{ descriptionError }}
              </p>
            </div>

            <p class="text-[11px] leading-4 text-slate-400">
              Changes remain in this session and reset when the page is refreshed.
            </p>
          </div>

          <div
            v-if="isSendMessage || isAddComment || isBusinessHours"
            class="border-t border-slate-100 pt-6"
          >
            <SendMessageEditor v-if="isSendMessage" />
            <AddCommentEditor v-else-if="isAddComment" />
            <BusinessHoursEditor v-else-if="isBusinessHours" />
          </div>

          <p
            v-if="errorMessage"
            role="alert"
            class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {{ errorMessage }}
          </p>
        </form>
      </div>

      <SheetFooter
        class="mt-0 shrink-0 gap-3 border-t border-slate-200 bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div
          v-if="isDeleteConfirming"
          class="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2.5"
        >
          <p class="text-xs font-medium text-red-900">Delete this part of the workflow?</p>
          <p class="mt-1 text-[11px] leading-4 text-red-700">
            This node and every node connected after it will be removed.
          </p>
        </div>

        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Button
              v-if="isDeleteConfirming"
              type="button"
              variant="outline"
              @click="cancelDelete"
            >
              Cancel
            </Button>
            <Button
              type="button"
              :variant="isDeleteConfirming ? 'destructive' : 'ghost'"
              :class="isDeleteConfirming ? undefined : 'text-destructive hover:bg-destructive/10 hover:text-destructive'"
              :disabled="isDeleting"
              @click="handleDeleteAction"
            >
              {{ deleteButtonLabel }}
            </Button>
          </div>

          <Button
            type="submit"
            form="node-details-form"
            :disabled="!isDirty || isSaving"
          >
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
