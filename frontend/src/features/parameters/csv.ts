import type { ParameterRow } from '../../api/types'

const COLUMNS = ['Initial value', 'Lower bound', 'Upper bound', 'Fixed'] as const

export class ParameterCsvError extends Error {}

export interface ParameterCsvImport {
  rows: ParameterRow[]
  unknownKeys: string[]
  missingKeys: string[]
}

function formatNumber(n: number): string {
  if (n === Infinity) return 'inf'
  if (n === -Infinity) return '-inf'
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

export function parametersToCsv(rows: ParameterRow[]): string {
  const lines = [`,${COLUMNS.join(',')}`]
  for (const row of rows) {
    const values = [row.value, row.lower, row.upper].map(formatNumber)
    lines.push([row.key, ...values, row.fixed ? 'True' : 'False'].join(','))
  }
  return `${lines.join('\n')}\n`
}

function splitLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'))
}

function parseNumber(text: string, column: string, key: string): number {
  const lower = text.toLowerCase()
  if (lower === 'inf' || lower === 'infinity') return Infinity
  if (lower === '-inf' || lower === '-infinity') return -Infinity
  const n = text === '' ? NaN : Number(text)
  if (Number.isNaN(n)) {
    throw new ParameterCsvError(`"${column}" for ${key} is not a number: "${text}".`)
  }
  return n
}

function parseFixed(text: string, key: string): boolean {
  const lower = text.toLowerCase()
  if (lower === 'true' || lower === '1') return true
  if (lower === 'false' || lower === '0') return false
  throw new ParameterCsvError(`"Fixed" for ${key} must be True or False, not "${text}".`)
}

export function applyParametersCsv(text: string, rows: ParameterRow[]): ParameterCsvImport {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) throw new ParameterCsvError('The file is empty.')

  const header = splitLine(lines[0])
  const index = Object.fromEntries(COLUMNS.map((column) => [column, header.indexOf(column)]))
  const missingColumns = COLUMNS.filter((column) => index[column] < 1)
  if (missingColumns.length > 0) {
    throw new ParameterCsvError(
      `This doesn't look like a pyMechT parameter file. Missing column(s): ${missingColumns.join(', ')}.`,
    )
  }

  const imported = new Map<string, Pick<ParameterRow, 'value' | 'lower' | 'upper' | 'fixed'>>()
  for (const line of lines.slice(1)) {
    const cells = splitLine(line)
    const key = cells[0]
    if (!key) throw new ParameterCsvError(`A row has no parameter key: "${line}".`)
    if (imported.has(key)) throw new ParameterCsvError(`${key} appears more than once.`)
    const cell = (column: (typeof COLUMNS)[number]) => cells[index[column]] ?? ''
    imported.set(key, {
      value: parseNumber(cell('Initial value'), 'Initial value', key),
      lower: parseNumber(cell('Lower bound'), 'Lower bound', key),
      upper: parseNumber(cell('Upper bound'), 'Upper bound', key),
      fixed: parseFixed(cell('Fixed'), key),
    })
  }

  const known = new Set(rows.map((row) => row.key))
  return {
    rows: rows.map((row) => {
      const match = imported.get(row.key)
      return match ? { ...row, ...match } : row
    }),
    unknownKeys: [...imported.keys()].filter((key) => !known.has(key)),
    missingKeys: rows.filter((row) => !imported.has(row.key)).map((row) => row.key),
  }
}
