import { describe, expect, it } from 'vitest'

import type { ParameterRow } from '../../api/types'
import { applyParametersCsv, ParameterCsvError, parametersToCsv } from './csv'

const rows: ParameterRow[] = [
  {
    key: 'L0',
    base: 'L0',
    componentId: null,
    group: 'geometry',
    label: 'Initial length',
    value: 1,
    fixed: true,
    lower: 0.001,
    upper: 1000,
  },
  {
    key: 'mu_0',
    base: 'mu',
    componentId: 'c1',
    group: 'material',
    label: 'Shear modulus',
    value: 2.5,
    fixed: false,
    lower: 0.0001,
    upper: Infinity,
  },
]

const pymechtCsv = [
  ',Initial value,Lower bound,Upper bound,Fixed',
  'L0,2.0,0.001,1000.0,True',
  'mu_0,3.5,0.0001,inf,False',
  '',
].join('\n')

describe('parametersToCsv', () => {
  it('writes the ParamDict.save format', () => {
    expect(parametersToCsv(rows)).toBe(
      [
        ',Initial value,Lower bound,Upper bound,Fixed',
        'L0,1.0,0.001,1000.0,True',
        'mu_0,2.5,0.0001,inf,False',
        '',
      ].join('\n'),
    )
  })

  it('round-trips through applyParametersCsv', () => {
    const result = applyParametersCsv(parametersToCsv(rows), rows)
    expect(result).toEqual({ rows, unknownKeys: [], missingKeys: [] })
  })
})

describe('applyParametersCsv', () => {
  it('reads a file written by pyMechT', () => {
    const result = applyParametersCsv(pymechtCsv, rows)
    expect(result.rows[0]).toMatchObject({ key: 'L0', value: 2, fixed: true })
    expect(result.rows[1]).toMatchObject({ key: 'mu_0', value: 3.5, upper: Infinity })
  })

  it('keeps labels and groups from the current table', () => {
    const result = applyParametersCsv(pymechtCsv, rows)
    expect(result.rows[1]).toMatchObject({ label: 'Shear modulus', componentId: 'c1' })
  })

  it('reports unknown keys and ignores them', () => {
    const csv = `${pymechtCsv}k1_0,4.0,0.0,10.0,False\n`
    const result = applyParametersCsv(csv, rows)
    expect(result.unknownKeys).toEqual(['k1_0'])
    expect(result.rows.map((row) => row.key)).toEqual(['L0', 'mu_0'])
  })

  it('reports missing keys and keeps their current values', () => {
    const csv = ',Initial value,Lower bound,Upper bound,Fixed\nL0,5.0,0.001,1000.0,True\n'
    const result = applyParametersCsv(csv, rows)
    expect(result.missingKeys).toEqual(['mu_0'])
    expect(result.rows[1]).toEqual(rows[1])
  })

  it('handles Windows line endings', () => {
    const result = applyParametersCsv(pymechtCsv.replace(/\n/g, '\r\n'), rows)
    expect(result.unknownKeys).toEqual([])
    expect(result.rows[0].value).toBe(2)
  })

  it.each([
    ['an empty file', '', /empty/],
    ['a missing column', ',Initial value,Lower bound,Fixed\nL0,1,0,True\n', /Upper bound/],
    ['a value that is not a number', pymechtCsv.replace('3.5', 'abc'), /mu_0 is not a number/],
    ['a bad Fixed value', pymechtCsv.replace('True', 'maybe'), /True or False/],
    ['a duplicated key', `${pymechtCsv}L0,1.0,0.0,1.0,True\n`, /more than once/],
  ])('rejects %s with a readable message', (_, csv, message) => {
    expect(() => applyParametersCsv(csv, rows)).toThrow(ParameterCsvError)
    expect(() => applyParametersCsv(csv, rows)).toThrow(message)
  })
})
