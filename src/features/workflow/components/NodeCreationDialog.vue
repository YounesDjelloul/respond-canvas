<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'
import type { CreatableWorkflowNodeKind } from '../domain'

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
    :open="isOpen"
    @update:open="setVisibility"
  >
    <DialogContent class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[34rem]">
      <DialogHeader>
        <DialogTitle>Add workflow step</DialogTitle>
        <DialogDescription>
          Choose a step type and configure its initial details.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-5" @submit.prevent="submit">
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span class="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Insert at
          </span>
          <p class="mt-0.5 text-xs font-medium text-slate-700">{{ context }}</p>
        </div>

        <div class="space-y-2">
          <span id="node-type-label" class="block text-xs font-medium text-slate-700">
            Step type
          </span>
          <RadioGroup
            :model-value="kind"
            aria-labelledby="node-type-label"
            class="gap-2 sm:grid-cols-3"
            @update:model-value="updateKind($event as CreatableWorkflowNodeKind)"
          >
            <label
              v-for="option in typeOptions"
              :key="option.value"
              :for="`node-type-${option.value}`"
              class="relative flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-[border-color,background-color,box-shadow] duration-150 hover:border-slate-300 has-data-checked:border-violet-300 has-data-checked:bg-violet-50/60 has-data-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:block"
            >
              <RadioGroupItem
                :id="`node-type-${option.value}`"
                :value="option.value"
                class="absolute top-3 right-3"
              />
              <span
                class="grid size-7 shrink-0 place-items-center rounded-lg"
                :class="option.iconClass"
                aria-hidden="true"
              >
                <component :is="option.icon" class="size-3.5" />
              </span>
              <span class="block min-w-0 pr-6 sm:mt-2 sm:pr-0">
                <span class="block text-xs font-semibold text-slate-900">
                  {{ option.label }}
                </span>
                <span class="mt-1 block text-[10px] leading-4 text-slate-500">
                  {{ option.description }}
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <div class="space-y-1.5">
          <label for="new-node-title" class="block text-xs font-medium text-slate-700">
            Title
          </label>
          <Input
            id="new-node-title"
            :model-value="title"
            :aria-invalid="Boolean(titleError)"
            :aria-describedby="titleError ? 'new-node-title-error' : undefined"
            autocomplete="off"
            autofocus
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
            :aria-invalid="Boolean(descriptionError)"
            :aria-describedby="
              descriptionError ? 'new-node-description-error' : undefined
            "
            rows="3"
            class="resize-none"
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

        <DialogFooter class="border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            @click="setVisibility(false)"
          >
            Cancel
          </Button>
          <Button type="submit" :disabled="isCreating">
            {{ isCreating ? 'Creating…' : 'Create step' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
