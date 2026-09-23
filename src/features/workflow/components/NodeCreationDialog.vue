<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  creation: {
    isOpen,
    context,
    kind,
    title,
    description,
    titleError,
    descriptionError,
    errorMessage,
    typeOptions,
    showsBusinessHoursNote,
    isCreating,
    setVisibility,
    updateKind,
    updateTitle,
    updateDescription,
    submit,
  },
} = useWorkflowEditorContext()
</script>

<template>
  <Dialog
    :visible="isOpen"
    modal
    dismissable-mask
    block-scroll
    header="Add workflow step"
    class="mx-4 !w-full !max-w-[34rem]"
    @update:visible="setVisibility"
  >
    <form class="space-y-5" @submit.prevent="submit">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          Insert at
        </span>
        <p class="mt-0.5 text-xs font-medium text-slate-700">{{ context }}</p>
      </div>

      <fieldset>
        <legend class="text-xs font-medium text-slate-700">Step type</legend>
        <div class="mt-2 grid gap-2 sm:grid-cols-3">
          <label
            v-for="option in typeOptions"
            :key="option.value"
            class="cursor-pointer rounded-xl border p-3 transition-[border-color,background-color,box-shadow,transform] duration-150 hover:border-slate-300 active:scale-[0.99]"
            :class="
              kind === option.value
                ? 'border-violet-300 bg-violet-50/60 shadow-sm'
                : 'border-slate-200 bg-white'
            "
          >
            <input
              type="radio"
              name="node-type"
              :value="option.value"
              :checked="kind === option.value"
              class="sr-only"
              @change="updateKind(option.value)"
            />
            <span
              class="grid size-7 place-items-center rounded-lg text-sm font-semibold"
              :class="option.iconClass"
              aria-hidden="true"
            >
              {{ option.icon }}
            </span>
            <span class="mt-2 block text-xs font-semibold text-slate-900">
              {{ option.label }}
            </span>
            <span class="mt-1 block text-[10px] leading-4 text-slate-500">
              {{ option.description }}
            </span>
          </label>
        </div>
      </fieldset>

      <div class="space-y-1.5">
        <label for="new-node-title" class="block text-xs font-medium text-slate-700">
          Title
        </label>
        <InputText
          id="new-node-title"
          :model-value="title"
          :invalid="Boolean(titleError)"
          :aria-describedby="titleError ? 'new-node-title-error' : undefined"
          autocomplete="off"
          autofocus
          fluid
          @update:model-value="updateTitle"
        />
        <p v-if="titleError" id="new-node-title-error" class="text-xs text-red-600">
          {{ titleError }}
        </p>
      </div>

      <div class="space-y-1.5">
        <label for="new-node-description" class="block text-xs font-medium text-slate-700">
          Description
        </label>
        <Textarea
          id="new-node-description"
          :model-value="description"
          :invalid="Boolean(descriptionError)"
          :aria-describedby="
            descriptionError ? 'new-node-description-error' : undefined
          "
          rows="3"
          auto-resize
          fluid
          @update:model-value="updateDescription"
        />
        <p
          v-if="descriptionError"
          id="new-node-description-error"
          class="text-xs text-red-600"
        >
          {{ descriptionError }}
        </p>
      </div>

      <p
        v-if="showsBusinessHoursNote"
        class="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] leading-4 text-orange-800"
      >
        Success and Failure branches will be created automatically. The existing path
        will continue from Success.
      </p>

      <p
        v-if="errorMessage"
        role="alert"
        class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          text
          @click="setVisibility(false)"
        />
        <Button
          type="submit"
          :label="isCreating ? 'Creating…' : 'Create step'"
          :loading="isCreating"
        />
      </div>
    </form>
  </Dialog>
</template>
