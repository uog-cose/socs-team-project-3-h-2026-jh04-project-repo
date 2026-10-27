import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { cssVariablesResolver, theme } from '../theme/theme'

/** Renders with the same providers as the app, and a fresh query cache per test. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        {children}
      </MantineProvider>
    </QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
