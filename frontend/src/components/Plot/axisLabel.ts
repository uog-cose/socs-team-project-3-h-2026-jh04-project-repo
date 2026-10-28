import type { Measure, Quantity, UnitLabels } from '../../api/types'

export function unitFor(quantity: Quantity, units: UnitLabels): string | null {
  switch (quantity) {
    case 'dimensionless':
      return null
    case 'length':
      return units.length
    case 'area':
      return `${units.length}²`
    case 'force':
      return units.force
    case 'stress':
      return units.stress
    case 'tension':
      return `${units.force}/${units.length}`
  }
}

/** "Cauchy stress (kPa)", or just "Stretch" for dimensionless measures. */
export function axisLabel(measure: Pick<Measure, 'label' | 'quantity'>, units: UnitLabels): string {
  const unit = unitFor(measure.quantity, units)
  return unit ? `${measure.label} (${unit})` : measure.label
}
