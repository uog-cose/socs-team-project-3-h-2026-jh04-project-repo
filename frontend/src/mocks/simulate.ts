import type { SessionConfig, SimulateResponse } from '../api/types'

function linspace(start: number, end: number, points: number): number[] {
  if (points < 2) return [start]
  return Array.from({ length: points }, (_, i) => start + ((end - start) * i) / (points - 1))
}

/**
 * Mock of POST /simulate. The curves only look plausible (stiffening, biaxial
 * coupling); they are not pyMechT results.
 */
export function simulate(config: SessionConfig): SimulateResponse {
  const { material, experiment, parameters, protocol } = config
  const modulus =
    parameters
      .filter((p) => p.group === 'material' && /^(mu|C10|c1|k1|d1)$/.test(p.base))
      .reduce((sum, p) => sum + p.value, 0) || 1
  const stiffening = material.components.some((c) => ['goh', 'hgo', 'ls', 'expI1'].includes(c.type))
    ? 4
    : 0

  const ranges = protocol.axes.map((a) => linspace(a.start, a.end, a.points))
  const n = Math.min(...ranges.map((r) => r.length))
  const input = Array.from({ length: n }, (_, i) => ranges.map((r) => r[i]))

  const toStretch = (x: number) =>
    experiment.inputMeasure === 'strain' || experiment.inputMeasure.startsWith('delta') ? 1 + x : x

  const output = input.map((row) => {
    if (protocol.control === 'force') {
      return row.map((x) => 1 + 0.3 * Math.log1p(Math.max(x, 0) / modulus))
    }
    const stretches = row.map(toStretch)
    // Incompressible neo-Hookean: uniaxial mu(l^2 - 1/l), biaxial mu(l_i^2 - 1/(l1 l2)^2).
    const lateral =
      stretches.length === 1 ? 1 / stretches[0] : 1 / stretches.reduce((a, b) => a * b, 1) ** 2
    return stretches.map(
      (lambda) => modulus * (lambda ** 2 - lateral) * Math.exp(stiffening * (lambda - 1) ** 2),
    )
  })

  const models = material.components.map((c) => `'${c.type}'`).join(', ')
  const warnings =
    protocol.control === 'force' && !protocol.initialGuess
      ? ['No initial guess given for a force-controlled run; using the default for each axis.']
      : []

  return {
    input,
    output,
    log: [
      `[mock] mat = MatModel(${models})`,
      `[mock] sample = ${experiment.type}(inp='${experiment.inputMeasure}', out='${experiment.outputMeasure}')`,
      `[mock] ${protocol.control}-controlled run with ${n} points`,
    ],
    warnings,
  }
}
