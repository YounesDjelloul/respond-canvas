import { describe, expect, it } from 'vitest'
import {
  errorMessageAt,
  errorMessageOutside,
  errorMessagesAt,
  withoutErrorsUnder,
  type DomainError,
} from '../index'

const errors: DomainError[] = [
  { code: 'title-required', message: 'Title is required', path: ['title'] },
  { code: 'hours-required', message: 'Add business hours', path: ['config', 'hours'] },
  { code: 'time-invalid', message: 'Invalid time', path: ['config', 'hours', 1] },
  { code: 'day-duplicate', message: 'mon is repeated', path: ['config', 'hours', 1] },
  { code: 'node-not-found', message: 'The node no longer exists', path: ['nodes', 'a'] },
  { code: 'unknown', message: 'Something went wrong' },
]

describe('domain error paths', () => {
  it('reads the first message at an exact path', () => {
    expect(errorMessageAt(errors, ['title'])).toBe('Title is required')
    expect(errorMessageAt(errors, ['config', 'hours'])).toBe('Add business hours')
    expect(errorMessageAt(errors, ['config', 'hours', 1])).toBe('Invalid time')
  })

  it('ignores errors that sit above or below the requested path', () => {
    expect(errorMessageAt(errors, ['config'])).toBeNull()
    expect(errorMessageAt(errors, ['config', 'hours', 0])).toBeNull()
    expect(errorMessagesAt(errors, ['config', 'hours'])).toEqual(['Add business hours'])
  })

  it('reads every message at an exact path in order', () => {
    expect(errorMessagesAt(errors, ['config', 'hours', 1])).toEqual([
      'Invalid time',
      'mon is repeated',
    ])
    expect(errorMessagesAt([], ['title'])).toEqual([])
  })

  it('reads the first message not owned by the given fields', () => {
    expect(errorMessageOutside(errors, ['title', 'config'])).toBe(
      'The node no longer exists',
    )
    expect(errorMessageOutside(errors.slice(0, 4), ['title', 'config'])).toBeNull()
    expect(errorMessageOutside([errors[5]!], ['title'])).toBe('Something went wrong')
  })

  it('removes errors at or below a path without mutating the input', () => {
    const remaining = withoutErrorsUnder(errors, ['config'])

    expect(remaining.map((error) => error.code)).toEqual([
      'title-required',
      'node-not-found',
      'unknown',
    ])
    expect(withoutErrorsUnder(errors, ['config', 'hours', 1])).toHaveLength(4)
    expect(errors).toHaveLength(6)
  })
})
