export function reportApplicationError(error: unknown, context: string): void {
  const normalizedError =
    error instanceof Error ? error : new Error('Unexpected application error', { cause: error })

  console.error(`[${context}]`, normalizedError)
}
