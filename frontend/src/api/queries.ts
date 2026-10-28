import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { unwrap } from './errors'
import type { ParametersRequest, SimulateRequest } from './types'

export const queryKeys = {
  catalog: ['catalog'] as const,
}

export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: async () => unwrap(await api.GET('/catalog')),
    staleTime: Infinity,
  })
}

export function useBuildParameters() {
  return useMutation({
    mutationFn: async (body: ParametersRequest) => unwrap(await api.POST('/parameters', { body })),
  })
}

export function useSimulate() {
  return useMutation({
    mutationFn: async (body: SimulateRequest) => unwrap(await api.POST('/simulate', { body })),
  })
}
