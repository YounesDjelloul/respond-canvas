import { z } from 'zod'
import type { DomainResult } from '@/features/shared/domain'
import type {
  BusinessHour,
  WorkflowMessagePart,
  WorkflowMutationError,
} from './types'

const maximumAttachmentSize = 5 * 1024 * 1024
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

const workflowNodeFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
})

const workflowMessageFieldsSchema = z
  .array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('text'),
        value: z.string().trim().min(1, 'Message text cannot be empty'),
      }),
      z.object({
        type: z.literal('attachment'),
        value: z.string().trim().min(1, 'Attachment is required'),
        name: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    ]),
  )
  .min(1, 'Add at least one message or attachment')

const workflowBusinessHoursFieldsSchema = z.object({
  hours: z
    .array(
      z.object({
        day: z.string(),
        startTime: z.string().regex(timePattern, 'Use a valid 24-hour time'),
        endTime: z.string().regex(timePattern, 'Use a valid 24-hour time'),
      }),
    )
    .min(1, 'Configure at least one business day'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
})

const workflowAttachmentSchema = z.object({
  name: z.string(),
  size: z
    .number()
    .max(maximumAttachmentSize, 'Attachment exceeds the 5 MB limit'),
})

const workflowCommentSchema = z.string().trim()

export function validateWorkflowNodeFields(input: {
  title: string
  description: string
}): DomainResult<
  { title: string; description: string },
  WorkflowMutationError
> {
  const result = workflowNodeFieldsSchema.safeParse(input)

  if (result.success) {
    return { ok: true, value: result.data }
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      code: issue.path[0] === 'title' ? 'title-required' : 'description-required',
      message: issue.message,
      path: normalizePath(issue.path),
    })),
  }
}

export function validateWorkflowMessageFields(
  parts: WorkflowMessagePart[],
): DomainResult<WorkflowMessagePart[], WorkflowMutationError> {
  const result = workflowMessageFieldsSchema.safeParse(parts)

  if (result.success) {
    return { ok: true, value: result.data }
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const partIndex = typeof issue.path[0] === 'number' ? issue.path[0] : null
      const part = partIndex === null ? null : parts[partIndex]

      return {
        code:
          partIndex === null
            ? 'message-content-required'
            : part?.type === 'attachment'
              ? 'attachment-required'
              : 'message-text-required',
        message: issue.message,
        path:
          partIndex === null
            ? ['config', 'parts']
            : ['config', 'parts', partIndex],
      }
    }),
  }
}

export function validateWorkflowBusinessHoursFields(input: {
  hours: BusinessHour[]
  timezone: string
}): DomainResult<
  { hours: BusinessHour[]; timezone: string },
  WorkflowMutationError
> {
  const result = workflowBusinessHoursFieldsSchema.safeParse(input)

  if (result.success) {
    return { ok: true, value: result.data }
  }

  const errors = result.error.issues.map((issue): WorkflowMutationError => {
    if (issue.path[0] === 'timezone') {
      return {
        code: 'timezone-required',
        message: issue.message,
        path: ['config', 'timezone'],
      }
    }

    const hourIndex = typeof issue.path[1] === 'number' ? issue.path[1] : null

    return hourIndex === null
      ? {
          code: 'business-hours-required',
          message: issue.message,
          path: ['config', 'hours'],
        }
      : {
          code: 'business-time-invalid',
          message: issue.message,
          path: ['config', 'hours', hourIndex],
        }
  })

  return {
    ok: false,
    errors: uniqueErrors(errors),
  }
}

export function validateWorkflowAttachment(input: {
  name: string
  size: number
}): DomainResult<{ name: string; size: number }, WorkflowMutationError> {
  const result = workflowAttachmentSchema.safeParse(input)

  if (result.success) {
    return { ok: true, value: result.data }
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      code: 'attachment-too-large',
      message:
        issue.code === 'too_big'
          ? `${input.name} exceeds the 5 MB limit`
          : issue.message,
      path: ['size'],
    })),
  }
}

export function sanitizeWorkflowComment(comment: string): string {
  const result = workflowCommentSchema.safeParse(comment)
  return result.success ? result.data : comment
}

function uniqueErrors(errors: WorkflowMutationError[]): WorkflowMutationError[] {
  const seen = new Set<string>()

  return errors.filter((error) => {
    const identity = `${error.code}:${error.path?.join('.')}`

    if (seen.has(identity)) {
      return false
    }

    seen.add(identity)
    return true
  })
}

function normalizePath(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((segment) =>
    typeof segment === 'symbol' ? segment.description ?? segment.toString() : segment,
  )
}
