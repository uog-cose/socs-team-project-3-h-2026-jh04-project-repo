import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/700.css'
import '@mantine/core/styles.css'
import '../theme/global.css'

import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AppLayout } from '../components/AppLayout/AppLayout'
import { cssVariablesResolver, theme } from '../theme/theme'

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="light"
      >
        <AppLayout />
      </MantineProvider>
    </QueryClientProvider>
  )
}
