import { computed, ref } from 'vue'
import type { BusinessHour, WorkflowNode } from '../domain'

export function useBusinessHoursDraft(clearErrors: () => void) {
  const hours = ref<BusinessHour[]>([])
  const timezone = ref('')
  const timezoneOptions = computed(() => createTimezoneOptions(timezone.value))

  function reset(node: WorkflowNode | null) {
    hours.value =
      node?.kind === 'business-hours'
        ? node.config.hours.map((businessHour) => ({ ...businessHour }))
        : []
    timezone.value = node?.kind === 'business-hours' ? node.config.timezone : ''
  }

  function hasChanges(node: WorkflowNode): boolean {
    return (
      node.kind === 'business-hours' &&
      (!haveSameHours(node.config.hours, hours.value) ||
        node.config.timezone !== timezone.value)
    )
  }

  function updateHour(
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) {
    hours.value = hours.value.map((businessHour, businessHourIndex) =>
      businessHourIndex === index
        ? { ...businessHour, [field]: value }
        : businessHour,
    )
    clearErrors()
  }

  function updateTimezone(value: string) {
    timezone.value = value
    clearErrors()
  }

  return {
    hours,
    timezone,
    timezoneOptions,
    reset,
    hasChanges,
    updateHour,
    updateTimezone,
  }
}

function createTimezoneOptions(selectedTimezone: string): string[] {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const supportedTimezones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : []
  const asianTimezones = supportedTimezones.filter((value) =>
    value.startsWith('Asia/'),
  )
  const remainingTimezones = supportedTimezones.filter(
    (value) => !value.startsWith('Asia/'),
  )

  return Array.from(
    new Set([
      selectedTimezone,
      detectedTimezone,
      'UTC',
      ...asianTimezones,
      ...remainingTimezones,
    ]),
  ).filter(Boolean)
}

function haveSameHours(
  saved: readonly BusinessHour[],
  draft: readonly BusinessHour[],
): boolean {
  return (
    saved.length === draft.length &&
    saved.every((hour, index) => {
      const draftHour = draft[index]

      return (
        draftHour !== undefined &&
        hour.day === draftHour.day &&
        hour.startTime === draftHour.startTime &&
        hour.endTime === draftHour.endTime
      )
    })
  )
}
