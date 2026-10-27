import type { Catalog, ExperimentType, Measure } from '../api/types'

// Names follow pyMechT and are placeholders until the backend confirms them (BE #1).

const stretch: Measure = { id: 'stretch', label: 'Stretch', quantity: 'dimensionless' }
const strain: Measure = { id: 'strain', label: 'Strain', quantity: 'dimensionless' }
const deltal: Measure = { id: 'deltal', label: 'Change in length', quantity: 'length' }
const length: Measure = { id: 'length', label: 'Length', quantity: 'length' }
const cauchy: Measure = { id: 'cauchy', label: 'Cauchy stress', quantity: 'stress' }
const pk1: Measure = { id: '1pk', label: '1st Piola–Kirchhoff stress', quantity: 'stress' }
const pk2: Measure = { id: '2pk', label: '2nd Piola–Kirchhoff stress', quantity: 'stress' }
const force: Measure = { id: 'force', label: 'Force', quantity: 'force' }
const tension: Measure = { id: 'tension', label: 'Membrane tension', quantity: 'tension' }
const radius: Measure = { id: 'radius', label: 'Inner radius', quantity: 'length' }
const deltar: Measure = { id: 'deltar', label: 'Change in radius', quantity: 'length' }
const area: Measure = { id: 'area', label: 'Lumen area', quantity: 'area' }
const pressure: Measure = { id: 'pressure', label: 'Pressure', quantity: 'stress' }

export const catalog: Catalog = {
  materials: [
    {
      type: 'nh',
      name: 'Neo-Hookean',
      equation: String.raw`\Psi = \frac{\mu}{2}\left(I_1 - 3\right)`,
      params: ['mu'],
      fiberBased: false,
    },
    {
      type: 'mr',
      name: 'Mooney–Rivlin',
      equation: String.raw`\Psi = C_{10}\left(I_1 - 3\right) + C_{01}\left(I_2 - 3\right)`,
      params: ['C10', 'C01'],
      fiberBased: false,
    },
    {
      type: 'yeoh',
      name: 'Yeoh',
      equation: String.raw`\Psi = \sum_{i=1}^{4} c_i \left(I_1 - 3\right)^i`,
      params: ['c1', 'c2', 'c3', 'c4'],
      fiberBased: false,
    },
    {
      type: 'expI1',
      name: 'Exponential in I₁ (Demiray)',
      equation: String.raw`\Psi = \frac{k_1}{2k_2}\left(e^{k_2 (I_1 - 3)} - 1\right)`,
      params: ['k1', 'k2'],
      fiberBased: false,
    },
    {
      type: 'goh',
      name: 'Gasser–Ogden–Holzapfel',
      equation: String.raw`\Psi = \frac{k_1}{2k_2}\left(e^{k_2 E^2} - 1\right),\quad E = k_3\left(I_1 - 3\right) + \left(1 - 3k_3\right)\left(I_4 - 1\right)`,
      params: ['k1', 'k2', 'k3'],
      fiberBased: true,
    },
    {
      type: 'hgo',
      name: 'Holzapfel–Gasser–Ogden',
      equation: String.raw`\Psi = \frac{k_1}{2k_2}\left(e^{k_2 (I_4 - 1)^2} - 1\right)`,
      params: ['k1', 'k2'],
      fiberBased: true,
    },
    {
      type: 'ls',
      name: 'Lee–Sacks',
      equation: String.raw`\Psi = \frac{k_1}{2}\left[k_4 e^{k_2 (I_1 - 3)^2} + \left(1 - k_4\right) e^{k_3 (I_4 - 1)^2} - 1\right]`,
      params: ['k1', 'k2', 'k3', 'k4'],
      fiberBased: true,
    },
    {
      type: 'polyI4',
      name: 'Polynomial in I₄',
      equation: String.raw`\Psi = \sum_{i=1}^{3} d_i \left(I_4 - 1\right)^i`,
      params: ['d1', 'd2', 'd3'],
      fiberBased: true,
    },
  ],
  experiments: [
    {
      type: 'uniaxial',
      name: 'Uniaxial extension',
      description: 'A strip pulled along one axis.',
      axes: 1,
      inputMeasures: [stretch, strain, deltal, length],
      outputMeasures: [cauchy, pk1, pk2, force],
      fiberReferenceAxis: 'x',
    },
    {
      type: 'biaxial',
      name: 'Planar biaxial extension',
      description: 'A thin sheet stretched along two perpendicular axes.',
      axes: 2,
      inputMeasures: [stretch, strain, deltal, length],
      outputMeasures: [cauchy, pk1, pk2, force, tension],
      fiberReferenceAxis: 'x',
    },
    {
      type: 'tube',
      name: 'Tube inflation',
      description: 'A thick-walled tube inflated under internal pressure.',
      axes: 1,
      inputMeasures: [radius, stretch, deltar, area],
      outputMeasures: [pressure, force],
      fiberReferenceAxis: 'circumferential',
    },
  ],
  presets: [
    { id: 'goh-nh', name: 'GOH + neo-Hookean', components: ['goh', 'nh'] },
    { id: 'hgo-nh', name: 'HGO + neo-Hookean', components: ['hgo', 'nh'] },
    { id: 'nh', name: 'Neo-Hookean', components: ['nh'] },
  ],
}

type ParamDefault = { label: string; value: number; lower: number; upper: number }

export const geometryDefaults: Record<ExperimentType, Record<string, ParamDefault>> = {
  uniaxial: {
    L0: { label: 'Initial length', value: 1, lower: 1e-3, upper: 1000 },
    A0: { label: 'Cross-sectional area', value: 1, lower: 1e-3, upper: 1000 },
  },
  biaxial: {
    L10: { label: 'Initial length, axis 1', value: 1, lower: 1e-3, upper: 1000 },
    L20: { label: 'Initial length, axis 2', value: 1, lower: 1e-3, upper: 1000 },
    thick: { label: 'Thickness', value: 0.1, lower: 1e-3, upper: 100 },
  },
  tube: {
    Ri: { label: 'Inner radius', value: 1, lower: 1e-3, upper: 1000 },
    thick: { label: 'Wall thickness', value: 0.1, lower: 1e-3, upper: 100 },
    omega: { label: 'Opening angle', value: 0, lower: 0, upper: 180 },
    L0: { label: 'Initial length', value: 1, lower: 1e-3, upper: 1000 },
    lambdaZ: { label: 'Axial stretch', value: 1, lower: 0.5, upper: 2 },
  },
}

const stiffness = (label: string, value = 10): ParamDefault => ({
  label,
  value,
  lower: 1e-4,
  upper: 1000,
})

export const materialDefaults: Record<string, ParamDefault> = {
  mu: stiffness('Shear modulus'),
  C10: stiffness('Mooney–Rivlin C₁₀', 5),
  C01: stiffness('Mooney–Rivlin C₀₁', 1),
  c1: stiffness('Yeoh c₁', 5),
  c2: stiffness('Yeoh c₂', 1),
  c3: stiffness('Yeoh c₃', 0.1),
  c4: stiffness('Yeoh c₄', 0.01),
  k1: stiffness('Stiffness k₁'),
  k2: { label: 'Exponent k₂', value: 10, lower: 0.1, upper: 100 },
  k3: { label: 'Dispersion k₃', value: 0.1, lower: 0, upper: 1 / 3 },
  k4: { label: 'Weighting k₄', value: 0.5, lower: 0, upper: 1 },
  d1: stiffness('Fiber coefficient d₁', 1),
  d2: stiffness('Fiber coefficient d₂', 1),
  d3: stiffness('Fiber coefficient d₃', 1),
}
