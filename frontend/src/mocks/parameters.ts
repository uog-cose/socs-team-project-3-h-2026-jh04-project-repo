import type { Catalog, ParameterRow, ParametersRequest } from '../api/types'
import { geometryDefaults, materialDefaults } from './data'

/** Mock of POST /parameters: rebuilds the table, keeping previous values where possible. */
export function buildParameterRows(
  catalog: Catalog,
  { material, experiment, previous = [] }: ParametersRequest,
): ParameterRow[] {
  const keep = (row: ParameterRow): ParameterRow => {
    const old = previous.find((p) =>
      row.group === 'geometry'
        ? p.group === 'geometry' && p.key === row.key
        : p.componentId === row.componentId && p.base === row.base,
    )
    return old
      ? { ...row, value: old.value, fixed: old.fixed, lower: old.lower, upper: old.upper }
      : row
  }

  const geometry = Object.entries(geometryDefaults[experiment.type]).map(([key, d]) =>
    keep({ key, base: key, componentId: null, group: 'geometry', fixed: true, ...d }),
  )

  const materials = material.components.flatMap((component, index) => {
    const model = catalog.materials.find((m) => m.type === component.type)
    if (!model) throw new Error(`Unknown material model "${component.type}"`)
    return model.params.map((base) =>
      keep({
        key: `${base}_${index}`,
        base,
        componentId: component.id,
        group: 'material',
        fixed: false,
        ...(materialDefaults[base] ?? { label: base, value: 1, lower: 0, upper: 1000 }),
      }),
    )
  })

  return [...geometry, ...materials]
}
