
import { useComputedColorScheme, useMantineTheme } from '@mantine/core'
import Plotly, { type Config, type Layout, type LayoutAxis } from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory'
import { useMemo } from 'react'
import { useSessionStore } from '../../state/sessionStore'
import { palette } from '../../theme/palette'
import { axisLabel } from './axisLabel'
import { buildTraces, seriesColors } from './traces'
import type { PlotProps } from './types'

const PlotlyComponent = createPlotlyComponent(Plotly)

const schemes = {
  light: { surface: '#ffffff', text: palette.ink, grid: '#e2e3ec', line: palette.mist },
  dark: { surface: '#1d1f26', text: '#e4e5ea', grid: palette.graphite, line: '#5f6170' },
}

export default function PlotlyChart({
  series,
  xLabel,
  yLabel,
  xMeasure,
  yMeasure,
  title,
  height = 400,
  filename = 'pymecht-plot',
}: PlotProps) {
  const theme = useMantineTheme()
  const scheme = useComputedColorScheme('light') === 'dark' ? 'dark' : 'light'
  const colors = schemes[scheme]
  const units = useSessionStore((state) => state.units)

  const resolvedXLabel = xMeasure ? axisLabel(xMeasure, units) : xLabel
  const resolvedYLabel = yMeasure ? axisLabel(yMeasure, units) : yLabel

  const data = useMemo(() => buildTraces(series, seriesColors[scheme]), [series, scheme])

  const layout = useMemo((): Partial<Layout> => {
    const axis = (text: string): Partial<LayoutAxis> => ({
      title: { text },
      gridcolor: colors.grid,
      zerolinecolor: colors.line,
      linecolor: colors.line,
      ticks: 'outside',
      tickcolor: colors.line,
      automargin: true,
    })

    return {
      autosize: true,
      height,
      margin: { l: 64, r: 16, t: title ? 48 : 24, b: 56 },
      paper_bgcolor: colors.surface,
      plot_bgcolor: colors.surface,
      font: { family: theme.fontFamily, size: 12, color: colors.text },
      title: title ? { text: title, x: 0, xanchor: 'left', font: { size: 15 } } : undefined,
      xaxis: axis(resolvedXLabel),
      yaxis: axis(resolvedYLabel),
      showlegend: series.length > 1,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1.02, yanchor: 'bottom' },
      hovermode: 'closest',
      hoverlabel: { font: { family: theme.fontFamilyMonospace } },
    }
  }, [
    colors,
    height,
    series.length,
    theme,
    title,
    resolvedXLabel,
    resolvedYLabel,
  ])

  const config = useMemo(
    (): Partial<Config> => ({
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      toImageButtonOptions: { format: 'png', filename, scale: 2 },
      modeBarButtonsToAdd: [
        {
          name: 'downloadSvg',
          title: 'Download plot as SVG',
          icon: Plotly.Icons.disk,
          click: (graphDiv) => void Plotly.downloadImage(graphDiv, { format: 'svg', filename }),
        },
      ],
    }),
    [filename],
  )

  return (
    <PlotlyComponent
      data={data}
      layout={layout}
      config={config}
      useResizeHandler
      style={{ width: '100%', height }}
    />
  )
}
