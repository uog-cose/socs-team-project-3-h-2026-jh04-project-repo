import { screen } from '@testing-library/react'
import type { Config, Layout, ModeBarButton, ScatterData } from 'plotly.js-dist-min'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { Plot } from './Plot'

// Plotly needs a real browser, so swap it for a stub that records its props.
const plotly = vi.hoisted(() => ({
  downloadImage: vi.fn(),
  lastProps: undefined as
    { data: Partial<ScatterData>[]; layout: Partial<Layout>; config: Partial<Config> } | undefined,
}))

vi.mock('plotly.js-dist-min', () => ({
  default: { Icons: { disk: {} }, downloadImage: plotly.downloadImage },
}))

vi.mock('react-plotly.js/factory', () => ({
  default: () =>
    function PlotlyStub(props: NonNullable<typeof plotly.lastProps>) {
      plotly.lastProps = props
      return <div data-testid="plotly" />
    },
}))

const series = [
  { name: 'Axis 1', x: [1, 1.1, 1.2], y: [0, 2, 5] },
  { name: 'Axis 2', x: [1, 1.1, 1.2], y: [0, 1, 3], mode: 'lines' as const },
]

describe('Plot', () => {
  beforeEach(() => {
    plotly.lastProps = undefined
    plotly.downloadImage.mockClear()
  })

  it('draws one trace per series with a legend', async () => {
    renderWithProviders(<Plot series={series} xLabel="Stretch" yLabel="Cauchy stress (kPa)" />)
    await screen.findByTestId('plotly')

    const { data, layout } = plotly.lastProps!
    expect(data.map((t) => t.name)).toEqual(['Axis 1', 'Axis 2'])
    expect(data[0].mode).toBe('lines+markers')
    expect(data[1].mode).toBe('lines')
    expect(data[0].line?.color).not.toBe(data[1].line?.color)
    expect(layout.showlegend).toBe(true)
  })

  it('hides the legend for a single series', async () => {
    renderWithProviders(<Plot series={series.slice(0, 1)} xLabel="x" yLabel="y" />)
    await screen.findByTestId('plotly')
    expect(plotly.lastProps!.layout.showlegend).toBe(false)
  })

  it('labels both axes', async () => {
    renderWithProviders(<Plot series={series} xLabel="Stretch" yLabel="Cauchy stress (kPa)" />)
    await screen.findByTestId('plotly')

    const { layout } = plotly.lastProps!
    expect(layout.xaxis?.title).toMatchObject({ text: 'Stretch' })
    expect(layout.yaxis?.title).toMatchObject({ text: 'Cauchy stress (kPa)' })
  })

  it('exports PNG from the camera button and SVG from an extra button', async () => {
    renderWithProviders(<Plot series={series} xLabel="x" yLabel="y" filename="results" />)
    await screen.findByTestId('plotly')

    const { config } = plotly.lastProps!
    expect(config.toImageButtonOptions).toMatchObject({ format: 'png', filename: 'results' })

    const svgButton = config.modeBarButtonsToAdd?.find(
      (b): b is ModeBarButton => typeof b === 'object' && b.name === 'downloadSvg',
    )
    const graphDiv = document.createElement('div')
    svgButton!.click(graphDiv as never, new MouseEvent('click'))
    expect(plotly.downloadImage).toHaveBeenCalledWith(graphDiv, {
      format: 'svg',
      filename: 'results',
    })
  })
})
