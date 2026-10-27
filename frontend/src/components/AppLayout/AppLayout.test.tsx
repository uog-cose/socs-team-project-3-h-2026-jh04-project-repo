import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLogStore } from '../../state/logStore'
import { renderWithProviders } from '../../test/render'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  beforeEach(() => useLogStore.getState().clear())

  it('shows the first section and switches sections from the navigation', async () => {
    renderWithProviders(<AppLayout />)
    expect(screen.getByRole('heading', { name: 'Material' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Parameters/ }))
    expect(screen.getByRole('heading', { name: 'Parameters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Parameters/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('opens the log panel and shows entries', async () => {
    useLogStore.getState().append('warning', 'Solver did not converge')
    renderWithProviders(<AppLayout />)
    expect(screen.queryByText('Solver did not converge')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Expand log' }))
    expect(screen.getByText('Solver did not converge')).toBeInTheDocument()
    expect(screen.getByText('1 warning')).toBeInTheDocument()
  })

  it('clears the log', async () => {
    useLogStore.getState().append('info', 'hello')
    renderWithProviders(<AppLayout />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear log' }))
    expect(useLogStore.getState().entries).toEqual([])
  })
})
