import { create } from 'zustand'
import type {
  ExperimentConfig,
  FiberConfig,
  ParameterRow,
  Protocol,
  ProtocolAxis,
  SessionConfig,
  UnitLabels,
} from '../api/types'

export interface SessionActions {
  addComponent: (type: string) => string
  removeComponent: (id: string) => void
  moveComponent: (from: number, to: number) => void
  setComponentType: (id: string, type: string) => void
  /** Replaces the whole component list, e.g. from a preset. */
  setComponents: (types: string[]) => void
  setFiber: (id: string, fiber: FiberConfig | null) => void
  setExperiment: (experiment: ExperimentConfig) => void
  setMeasures: (measures: Partial<Omit<ExperimentConfig, 'type'>>) => void
  setParameters: (rows: ParameterRow[]) => void
  updateParameter: (key: string, patch: Partial<Omit<ParameterRow, 'key'>>) => void
  setProtocol: (patch: Partial<Protocol>) => void
  updateProtocolAxis: (index: number, patch: Partial<ProtocolAxis>) => void
  setUnits: (patch: Partial<UnitLabels>) => void
  reset: () => void
}

export type SessionState = SessionConfig & SessionActions

const defaultAxis: ProtocolAxis = { start: 1, end: 1.3, points: 20 }

export const initialSession: SessionConfig = {
  material: { components: [] },
  experiment: { type: 'uniaxial', inputMeasure: 'stretch', outputMeasure: 'cauchy' },
  parameters: [],
  protocol: { control: 'displacement', axes: [defaultAxis], initialGuess: null },
  units: { length: 'mm', force: 'N', stress: 'kPa' },
}

let nextId = 0
const createId = () => `c${Date.now().toString(36)}${(nextId++).toString(36)}`

/** Biaxial runs need one protocol range per axis; everything else needs one. */
function resizeAxes(axes: ProtocolAxis[], count: number): ProtocolAxis[] {
  if (axes.length === count) return axes
  return Array.from({ length: count }, (_, i) => axes[i] ?? axes[0] ?? defaultAxis)
}

export const useSessionStore = create<SessionState>()((set) => ({
  ...initialSession,

  addComponent: (type) => {
    const id = createId()
    set((s) => ({
      material: { components: [...s.material.components, { id, type, fiber: null }] },
    }))
    return id
  },

  removeComponent: (id) =>
    set((s) => ({
      material: { components: s.material.components.filter((c) => c.id !== id) },
    })),

  moveComponent: (from, to) =>
    set((s) => {
      const components = [...s.material.components]
      if (from < 0 || from >= components.length || to < 0 || to >= components.length) return s
      const [moved] = components.splice(from, 1)
      components.splice(to, 0, moved)
      return { material: { components } }
    }),

  setComponentType: (id, type) =>
    set((s) => ({
      material: {
        components: s.material.components.map((c) =>
          c.id === id ? { ...c, type, fiber: null } : c,
        ),
      },
    })),

  setComponents: (types) =>
    set({ material: { components: types.map((type) => ({ id: createId(), type, fiber: null })) } }),

  setFiber: (id, fiber) =>
    set((s) => ({
      material: {
        components: s.material.components.map((c) => (c.id === id ? { ...c, fiber } : c)),
      },
    })),

  setExperiment: (experiment) =>
    set((s) => ({
      experiment,
      protocol: {
        ...s.protocol,
        axes: resizeAxes(s.protocol.axes, experiment.type === 'biaxial' ? 2 : 1),
        initialGuess: null,
      },
    })),

  setMeasures: (measures) => set((s) => ({ experiment: { ...s.experiment, ...measures } })),

  setParameters: (parameters) => set({ parameters }),

  updateParameter: (key, patch) =>
    set((s) => ({
      parameters: s.parameters.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    })),

  setProtocol: (patch) => set((s) => ({ protocol: { ...s.protocol, ...patch } })),

  updateProtocolAxis: (index, patch) =>
    set((s) => ({
      protocol: {
        ...s.protocol,
        axes: s.protocol.axes.map((a, i) => (i === index ? { ...a, ...patch } : a)),
      },
    })),

  setUnits: (patch) => set((s) => ({ units: { ...s.units, ...patch } })),

  reset: () => set(initialSession),
}))

/** The plain session config, without the store's actions, e.g. for POST /simulate. */
export function selectSessionConfig(s: SessionState): SessionConfig {
  const { material, experiment, parameters, protocol, units } = s
  return { material, experiment, parameters, protocol, units }
}
