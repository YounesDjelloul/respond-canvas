<script setup lang="ts">
import { ArrowRightIcon, TriangleAlertIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  readiness: { isReady, hasIssues, label, summary, isOpen, groups, setOpen, applyFix },
} = useWorkflowEditorContext()
</script>

<template>
  <Popover v-if="hasIssues" :open="isOpen" @update:open="setOpen">
    <PopoverTrigger as-child>
      <Badge
        as="button"
        type="button"
        variant="warning"
        :aria-label="`${label}. Show readiness issues`"
        class="h-6 cursor-pointer gap-1.5 px-2 text-[11px] sm:px-2.5"
      >
        <TriangleAlertIcon aria-hidden="true" />
        <span class="sr-only sm:not-sr-only">{{ label }}</span>
      </Badge>
    </PopoverTrigger>

    <PopoverContent align="end" :side-offset="8" :collision-padding="12" class="w-80 gap-0 p-0">
      <PopoverHeader class="border-b border-slate-100 px-3 py-2.5">
        <PopoverTitle class="text-xs font-semibold text-slate-900">{{ summary }}</PopoverTitle>
      </PopoverHeader>

      <ul class="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        <li v-for="group in groups" :key="group.key" class="flex items-start gap-3 px-3 py-2.5">
          <span
            class="grid size-7 shrink-0 place-items-center rounded-lg"
            :class="group.iconClass"
            aria-hidden="true"
          >
            <component :is="group.icon" v-if="group.icon" class="size-3.5" />
            <TriangleAlertIcon v-else class="size-3.5" />
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-slate-900">{{ group.title }}</p>
            <ul class="mt-0.5 space-y-0.5">
              <li
                v-for="message in group.messages"
                :key="message"
                class="text-[11px] leading-4 text-slate-500"
              >
                {{ message }}
              </li>
            </ul>
          </div>

          <Button
            v-if="group.fixLabel"
            type="button"
            variant="ghost"
            size="xs"
            :aria-label="group.fixAriaLabel ?? undefined"
            class="shrink-0"
            @click="applyFix(group.key)"
          >
            {{ group.fixLabel }}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </li>
      </ul>
    </PopoverContent>
  </Popover>

  <Badge
    v-else
    :variant="isReady ? 'success' : 'warning'"
    class="h-6 gap-1.5 px-2 text-[11px] sm:px-2.5"
  >
    <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    <span class="sr-only sm:not-sr-only">{{ label }}</span>
  </Badge>
</template>
