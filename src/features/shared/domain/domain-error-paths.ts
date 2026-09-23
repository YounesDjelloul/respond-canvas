import type { DomainError } from './domain-result'

type DomainErrorPath = readonly (string | number)[]

export function errorMessageAt(
  errors: readonly DomainError[],
  path: DomainErrorPath,
): string | null {
  return errorMessagesAt(errors, path)[0] ?? null
}

export function errorMessagesAt(
  errors: readonly DomainError[],
  path: DomainErrorPath,
): string[] {
  return errors
    .filter((error) => isSamePath(error.path ?? [], path))
    .map((error) => error.message)
}

export function errorMessageOutside(
  errors: readonly DomainError[],
  fields: readonly string[],
): string | null {
  return (
    errors.find((error) => {
      const field = error.path?.[0]

      return typeof field !== 'string' || !fields.includes(field)
    })?.message ?? null
  )
}

export function withoutErrorsUnder<E extends DomainError>(
  errors: readonly E[],
  path: DomainErrorPath,
): E[] {
  return errors.filter((error) => !startsWithPath(error.path ?? [], path))
}

function isSamePath(path: DomainErrorPath, expected: DomainErrorPath): boolean {
  return path.length === expected.length && startsWithPath(path, expected)
}

function startsWithPath(path: DomainErrorPath, prefix: DomainErrorPath): boolean {
  return prefix.every((segment, index) => path[index] === segment)
}
