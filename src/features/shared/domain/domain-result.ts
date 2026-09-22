export interface DomainError<Code extends string = string> {
  code: Code
  message: string
  path?: readonly (string | number)[]
}

export type DomainResult<T, E extends DomainError = DomainError> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly E[] }
