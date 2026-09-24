<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    businessHours: {
      hours,
      hoursError,
      hourErrorMessages,
      timezone,
      timezoneError,
      timezoneOptions,
      updateHour,
      updateTimezone,
    },
  },
} = useWorkflowEditorContext()
</script>

<template>
  <section aria-labelledby="business-hours-heading" class="space-y-4">
    <div>
      <h3 id="business-hours-heading" class="text-xs font-semibold text-slate-900">
        Weekly schedule
      </h3>
      <p class="mt-1 text-[11px] text-slate-500">
        Success runs inside these hours; Failure runs outside them.
      </p>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200">
      <div
        v-for="(dayHours, index) in hours"
        :key="`${dayHours.day}-${index}`"
        class="border-b border-slate-100 last:border-b-0"
      >
        <div class="grid grid-cols-[2.5rem_1fr_auto_1fr] items-center gap-2 px-3 py-2.5">
          <span class="text-[11px] font-semibold capitalize text-slate-600">
            {{ dayHours.day }}
          </span>

          <label :for="`start-time-${index}`" class="sr-only">
            {{ dayHours.day }} opening time
          </label>
          <Input
            :id="`start-time-${index}`"
            :model-value="dayHours.startTime"
            type="time"
            :aria-invalid="hourErrorMessages[index]?.length > 0"
            :aria-describedby="
              hourErrorMessages[index]?.length ? `business-hour-error-${index}` : undefined
            "
            class="min-w-0"
            @update:model-value="updateHour(index, 'startTime', $event)"
          />

          <span class="text-[10px] text-slate-400">to</span>

          <label :for="`end-time-${index}`" class="sr-only">
            {{ dayHours.day }} closing time
          </label>
          <Input
            :id="`end-time-${index}`"
            :model-value="dayHours.endTime"
            type="time"
            :aria-invalid="hourErrorMessages[index]?.length > 0"
            :aria-describedby="
              hourErrorMessages[index]?.length ? `business-hour-error-${index}` : undefined
            "
            class="min-w-0"
            @update:model-value="updateHour(index, 'endTime', $event)"
          />
        </div>
        <ul
          v-if="hourErrorMessages[index]?.length"
          :id="`business-hour-error-${index}`"
          role="alert"
          class="space-y-0.5 px-3 pb-2.5 text-[11px] text-red-600"
        >
          <li v-for="message in hourErrorMessages[index]" :key="message">
            {{ message }}
          </li>
        </ul>
      </div>
    </div>
    <p v-if="hoursError" role="alert" class="text-[11px] text-red-600">
      {{ hoursError }}
    </p>

    <div class="space-y-1.5">
      <label for="business-timezone" class="block text-xs font-medium text-slate-700">
        Timezone
      </label>
      <Combobox
        :model-value="timezone"
        @update:model-value="updateTimezone(String($event ?? ''))"
      >
        <ComboboxAnchor class="w-full">
          <ComboboxInput
            id="business-timezone"
            aria-label="Timezone"
            placeholder="Search timezones"
            :aria-invalid="Boolean(timezoneError)"
            :aria-describedby="timezoneError ? 'business-timezone-error' : undefined"
          />
        </ComboboxAnchor>
        <ComboboxList>
          <ComboboxEmpty>No timezone found.</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem
              v-for="option in timezoneOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
              <ComboboxItemIndicator>
                <CheckIcon class="ml-auto size-4" />
              </ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxList>
      </Combobox>
      <p
        v-if="timezoneError"
        id="business-timezone-error"
        role="alert"
        class="text-[11px] text-red-600"
      >
        {{ timezoneError }}
      </p>
    </div>
  </section>
</template>
