import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { reportApplicationError } from './report-application-error'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportApplicationError(error, `query:${query.queryHash}`)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportApplicationError(error, `mutation:${mutation.mutationId}`)
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 60 * 60 * 1_000,
    },
    mutations: {
      networkMode: 'always',
    },
  },
})
