<script setup lang="ts">
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  details: {
    businessHours: {
      hours,
      timezone,
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
        class="grid grid-cols-[2.5rem_1fr_auto_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
      >
        <span class="text-[11px] font-semibold capitalize text-slate-600">
          {{ dayHours.day }}
        </span>

        <label :for="`start-time-${index}`" class="sr-only">
          {{ dayHours.day }} opening time
        </label>
        <input
          :id="`start-time-${index}`"
          :value="dayHours.startTime"
          type="time"
          class="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm transition-colors duration-150 hover:border-slate-300 focus:border-violet-400"
          @input="
            updateHour(index, 'startTime', ($event.target as HTMLInputElement).value)
          "
        />

        <span class="text-[10px] text-slate-400">to</span>

        <label :for="`end-time-${index}`" class="sr-only">
          {{ dayHours.day }} closing time
        </label>
        <input
          :id="`end-time-${index}`"
          :value="dayHours.endTime"
          type="time"
          class="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm transition-colors duration-150 hover:border-slate-300 focus:border-violet-400"
          @input="updateHour(index, 'endTime', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <label for="business-timezone" class="block text-xs font-medium text-slate-700">
        Timezone
      </label>
      <select
        id="business-timezone"
        :value="timezone"
        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors duration-150 hover:border-slate-300 focus:border-violet-400"
        @change="updateTimezone(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in timezoneOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
  </section>
</template>
