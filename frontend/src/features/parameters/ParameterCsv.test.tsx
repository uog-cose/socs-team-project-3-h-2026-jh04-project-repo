import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import type { ParameterRow } from '../../api/types'
import { useLogStore } from '../../state/logStore'
import { initialSession, useSessionStore } from '../../state/sessionStore'
import { renderWithProviders } from '../../test/render'
import { ParameterCsv } from './ParameterCsv'

const row: ParameterRow = {
  key: 'mu_0',
  base: 'mu',
  componentId: 'c1',
  group: 'material',
  label: 'Shear modulus',
  value: 1,
  fixed: false,
  lower: 0,
  upper: 10,
}

const header = ',Initial value,Lower bound,Upper bound,Fixed'

function csvFile(text: string) {
  const file = new File([text], 'params.csv', { type: 'text/csv' })
  return Object.assign(file, { text: async () => text })
}

async function upload(text: string) {
  const user = userEvent.setup()
  const { container } = renderWithProviders(<ParameterCsv />)
  await user.upload(container.querySelector('input[type="file"]')!, csvFile(text))
}

describe('ParameterCsv', () => {
  beforeEach(() => {
    useSessionStore.setState({ ...initialSession, parameters: [row] })
    useLogStore.getState().clear()
  })

  it('disables export when there are no parameters', () => {
    useSessionStore.setState({ parameters: [] })
    renderWithProviders(<ParameterCsv />)
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('imports values into the session', async () => {
    await upload(`${header}\nmu_0,4.0,1.0,8.0,True\n`)

    expect(await screen.findByText('Imported params.csv.')).toBeInTheDocument()
    expect(useSessionStore.getState().parameters[0]).toMatchObject({
      value: 4,
      lower: 1,
      upper: 8,
      fixed: true,
    })
  })

  it('reports unknown and missing keys', async () => {
    useSessionStore.setState({ parameters: [row, { ...row, key: 'k1_0', base: 'k1' }] })
    await upload(`${header}\nmu_0,4.0,1.0,8.0,False\nfoo,1.0,0.0,2.0,False\n`)

    expect(await screen.findByText(/Ignored, not in the current model: foo/)).toBeInTheDocument()
    expect(screen.getByText(/kept current values: k1_0/)).toBeInTheDocument()
    expect(useLogStore.getState().entries.filter((e) => e.level === 'warning')).toHaveLength(2)
  })

  it('shows a readable error and leaves the session unchanged for a bad file', async () => {
    await upload('name,value\nmu_0,4\n')

    expect(await screen.findByText('Import failed')).toBeInTheDocument()
    expect(screen.getByText(/Missing column\(s\)/)).toBeInTheDocument()
    expect(useSessionStore.getState().parameters).toEqual([row])
  })
})
