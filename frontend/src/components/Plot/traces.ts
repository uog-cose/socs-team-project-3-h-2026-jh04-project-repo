
import type { PlotSeries } from './types'

export const seriesColors = {
  light: ['#5145cd', '#0d9488', '#d97706', '#dc2626', '#2563eb'],
  dark: ['#a5b4fc', '#5eead4', '#fcd34d', '#fca5a5', '#93c5fd'],
}

export function buildTraces(
  series: PlotSeries[],
  colors: string[],
) {
  return series.map((item, index) => ({
    type: 'scatter' as const,
    name: item.name,
    x: item.x,
    y: item.y,
    mode: item.mode ?? 'lines+markers',
    line: {
      color: colors[index % colors.length],
      dash: item.dash ?? 'solid',
    },
    marker: {
      color: colors[index % colors.length],
    },
  }))
}
