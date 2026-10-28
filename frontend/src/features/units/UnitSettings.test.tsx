
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { initialSession, useSessionStore } from '../../state/sessionStore'
import { renderWithProviders } from '../../test/render'
import { UnitSettings } from './UnitSettings'

describe('UnitSettings', () => {
  beforeEach(() => {
    useSessionStore.setState(initialSession)
  })

  it('shows the default unit labels', () => {
    renderWithProviders(<UnitSettings />)

    expect(screen.getByRole('combobox', { name: 'Length' }))
      .toHaveValue('Millimetres (mm)')
    expect(screen.getByRole('combobox', { name: 'Force' }))
      .toHaveValue('Newtons (N)')
    expect(screen.getByRole('combobox', { name: 'Stress' }))
      .toHaveValue('Kilopascals (kPa)')
  })

  it('updates the selected length unit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UnitSettings />)

    await user.click(screen.getByRole('combobox', { name: 'Length' }))
    await user.click(
      screen.getByRole('option', { name: 'Centimetres (cm)' }),
    )

    expect(useSessionStore.getState().units.length).toBe('cm')
  })

  it('explains that pyMechT is unit-free', () => {
    renderWithProviders(<UnitSettings />)

    expect(screen.getByText(/pyMechT is unit-free/i)).toBeInTheDocument()
    expect(
      screen.getByText(/does not convert values automatically/i),
    ).toBeInTheDocument()
  })
})
