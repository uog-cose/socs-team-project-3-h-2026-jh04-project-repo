import type { Data } from 'plotly.js-dist-min'
import { palette } from '../../theme/palette'
import type { PlotSeries } from './types'

export const seriesColors = {
  light: [palette.cobalt, palette.ink, '#7d7f8b', '#7382ec', palette.navy],
  dark: ['#4a5de6', palette.mist, '#a5aef3', '#7d7f8b', '#e4e5ea'],
} as const

export function buildTraces(series: PlotSeries[], colors: readonly string[]): Data[] {
  return series.map((s, i) => {
    const color = colors[i % colors.length]
    const mode = s.mode ?? 'lines+markers'
    return {
      type: 'scatter',
      name: s.name,
      x: s.x,
      y: s.y,
      mode,
      line: { color, width: 2, dash: s.dash ?? 'solid' },
      marker: { color, size: mode === 'markers' ? 7 : 5 },
    }
  })
}
