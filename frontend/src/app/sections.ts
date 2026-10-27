import type { ComponentType } from 'react'
import { ExperimentPage } from '../features/experiment/ExperimentPage'
import { MaterialPage } from '../features/material/MaterialPage'
import { ParametersPage } from '../features/parameters/ParametersPage'
import { ProtocolPage } from '../features/protocol/ProtocolPage'
import { SimulatePage } from '../features/simulate/SimulatePage'

export interface Section {
  id: string
  label: string
  description: string
  Page: ComponentType
}

export const sections: Section[] = [
  {
    id: 'material',
    label: 'Material',
    description: 'Combine strain-energy components into a material model.',
    Page: MaterialPage,
  },
  {
    id: 'experiment',
    label: 'Experiment',
    description: 'Choose the test and what is measured.',
    Page: ExperimentPage,
  },
  {
    id: 'parameters',
    label: 'Parameters',
    description: 'Set geometry and material parameter values and bounds.',
    Page: ParametersPage,
  },
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'Define how the sample is loaded.',
    Page: ProtocolPage,
  },
  {
    id: 'simulate',
    label: 'Simulate',
    description: 'Run pyMechT and inspect the response.',
    Page: SimulatePage,
  },
]
