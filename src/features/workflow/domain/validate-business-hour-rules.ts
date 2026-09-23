import type { BusinessHour, WorkflowMutationError } from './types'

export function validateBusinessHourRules(
  hours: BusinessHour[],
): WorkflowMutationError[] {
  const errors: WorkflowMutationError[] = []
  const seenDays = new Set<string>()

  hours.forEach((businessHour, index) => {
    if (seenDays.has(businessHour.day)) {
      errors.push({
        code: 'business-day-duplicate',
        message: `${businessHour.day} is configured more than once`,
        path: ['config', 'hours', index, 'day'],
      })
    }

    seenDays.add(businessHour.day)

    if (
      isComparableTime(businessHour.startTime) &&
      isComparableTime(businessHour.endTime) &&
      businessHour.startTime >= businessHour.endTime
    ) {
      errors.push({
        code: 'business-time-range-invalid',
        message: 'Opening time must be before closing time',
        path: ['config', 'hours', index],
      })
    }
  })

  return errors
}

function isComparableTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
