import { describe, expect, it } from 'vitest'
import { axisLabel } from './axisLabel'

const units = { length: 'mm', force: 'N', stress: 'kPa' }

describe('axisLabel', () => {
  it('adds the unit for the measure quantity', () => {
    expect(axisLabel({ label: 'Cauchy stress', quantity: 'stress' }, units)).toBe(
      'Cauchy stress (kPa)',
    )
    expect(axisLabel({ label: 'Force', quantity: 'force' }, units)).toBe('Force (N)')
    expect(axisLabel({ label: 'Lumen area', quantity: 'area' }, units)).toBe('Lumen area (mm²)')
    expect(axisLabel({ label: 'Membrane tension', quantity: 'tension' }, units)).toBe(
      'Membrane tension (N/mm)',
    )
  })

  it('leaves dimensionless measures without a unit', () => {
    expect(axisLabel({ label: 'Stretch', quantity: 'dimensionless' }, units)).toBe('Stretch')
  })

  it('follows the user unit labels', () => {
    expect(
      axisLabel({ label: 'Inner radius', quantity: 'length' }, { ...units, length: 'cm' }),
    ).toBe('Inner radius (cm)')
  })
})
