export interface PlotSeries {
  name: string
  x: number[]
  y: number[]
  /** Defaults to 'lines+markers'. Use 'markers' for measured data and 'lines' for fits. */
  mode?: 'lines' | 'markers' | 'lines+markers'
  dash?: 'solid' | 'dash' | 'dot'
}

export interface PlotProps {
  series: PlotSeries[]
  xLabel: string
  yLabel: string
  title?: string
  height?: number
  /** Download file name, without extension. */
  filename?: string
}
