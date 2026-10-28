import { Skeleton } from '@mantine/core'
import { lazy, Suspense } from 'react'
import type { PlotProps } from './types'

// Plotly is ~1 MB, so it is only downloaded once a plot is shown.
const PlotlyChart = lazy(() => import('./PlotlyChart'))

/** Line/scatter plot with zoom, hover, a legend and PNG/SVG export. */
export function Plot(props: PlotProps) {
  const height = props.height ?? 400
  return (
    <Suspense fallback={<Skeleton height={height} radius="md" />}>
      <PlotlyChart {...props} height={height} />
    </Suspense>
  )
}
