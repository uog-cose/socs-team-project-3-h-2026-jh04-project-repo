import type { components } from './schema.gen'

type Schemas = components['schemas']

export type Catalog = Schemas['Catalog']
export type CatalogMaterial = Schemas['CatalogMaterial']
export type CatalogExperiment = Schemas['CatalogExperiment']
export type MaterialPreset = Schemas['MaterialPreset']
export type Measure = Schemas['Measure']
export type Quantity = Schemas['Quantity']

export type SessionConfig = Schemas['SessionConfig']
export type MaterialComponent = Schemas['MaterialComponent']
export type FiberConfig = Schemas['FiberConfig']
export type ExperimentType = Schemas['ExperimentType']
export type ExperimentConfig = Schemas['ExperimentConfig']
export type ParameterRow = Schemas['ParameterRow']
export type Protocol = Schemas['Protocol']
export type ProtocolAxis = Schemas['ProtocolAxis']
export type UnitLabels = Schemas['UnitLabels']

export type ParametersRequest = Schemas['ParametersRequest']
export type ParametersResponse = Schemas['ParametersResponse']
export type SimulateRequest = Schemas['SimulateRequest']
export type SimulateResponse = Schemas['SimulateResponse']
export type ErrorResponse = Schemas['ErrorResponse']
