import { beforeEach, describe, expect, it } from 'vitest'
import { initialSession, selectSessionConfig, useSessionStore } from './sessionStore'

const store = () => useSessionStore.getState()
const types = () => store().material.components.map((c) => c.type)

describe('session store', () => {
  beforeEach(() => store().reset())

  it('starts from the initial session', () => {
    expect(selectSessionConfig(store())).toEqual(initialSession)
  })

  describe('material components', () => {
    it('adds components, allowing the same type more than once', () => {
      store().addComponent('goh')
      store().addComponent('nh')
      store().addComponent('nh')
      expect(types()).toEqual(['goh', 'nh', 'nh'])
      expect(new Set(store().material.components.map((c) => c.id)).size).toBe(3)
    })

    it('returns the id of the new component', () => {
      const id = store().addComponent('nh')
      expect(store().material.components[0].id).toBe(id)
    })

    it('removes a component by id', () => {
      const id = store().addComponent('goh')
      store().addComponent('nh')
      store().removeComponent(id)
      expect(types()).toEqual(['nh'])
    })

    it('reorders components and keeps their ids', () => {
      const goh = store().addComponent('goh')
      store().addComponent('nh')
      store().addComponent('hgo')
      store().moveComponent(0, 2)
      expect(types()).toEqual(['nh', 'hgo', 'goh'])
      expect(store().material.components[2].id).toBe(goh)
    })

    it('ignores moves outside the list', () => {
      store().addComponent('nh')
      const before = store().material
      store().moveComponent(0, 5)
      expect(store().material).toBe(before)
    })

    it('changes a component type and clears its fiber settings', () => {
      const id = store().addComponent('goh')
      store().setFiber(id, { mode: 'symmetric', angleDeg: 30 })
      store().setComponentType(id, 'nh')
      expect(store().material.components[0]).toEqual({ id, type: 'nh', fiber: null })
    })

    it('sets fiber directions on one component', () => {
      const goh = store().addComponent('goh')
      const nh = store().addComponent('nh')
      store().setFiber(goh, { mode: 'single', angleDeg: 45 })
      expect(store().material.components.find((c) => c.id === goh)?.fiber).toEqual({
        mode: 'single',
        angleDeg: 45,
      })
      expect(store().material.components.find((c) => c.id === nh)?.fiber).toBeNull()
    })

    it('replaces all components from a preset', () => {
      store().addComponent('yeoh')
      store().setComponents(['goh', 'nh'])
      expect(types()).toEqual(['goh', 'nh'])
    })
  })

  describe('experiment', () => {
    it('changes experiment and measures', () => {
      store().setExperiment({ type: 'tube', inputMeasure: 'radius', outputMeasure: 'pressure' })
      expect(store().experiment).toEqual({
        type: 'tube',
        inputMeasure: 'radius',
        outputMeasure: 'pressure',
      })
    })

    it('uses two protocol ranges for biaxial and one otherwise', () => {
      store().updateProtocolAxis(0, { end: 1.5 })
      store().setExperiment({ type: 'biaxial', inputMeasure: 'stretch', outputMeasure: 'cauchy' })
      expect(store().protocol.axes).toEqual([
        { start: 1, end: 1.5, points: 20 },
        { start: 1, end: 1.5, points: 20 },
      ])

      store().setExperiment({ type: 'uniaxial', inputMeasure: 'stretch', outputMeasure: 'cauchy' })
      expect(store().protocol.axes).toHaveLength(1)
    })

    it('clears the initial guess when the experiment changes', () => {
      store().setProtocol({ control: 'force', initialGuess: [1.1] })
      store().setExperiment({ type: 'biaxial', inputMeasure: 'stretch', outputMeasure: 'cauchy' })
      expect(store().protocol.initialGuess).toBeNull()
      expect(store().protocol.control).toBe('force')
    })

    it('updates one measure at a time', () => {
      store().setMeasures({ outputMeasure: '1pk' })
      expect(store().experiment).toEqual({
        type: 'uniaxial',
        inputMeasure: 'stretch',
        outputMeasure: '1pk',
      })
    })
  })

  describe('parameters', () => {
    it('sets and edits parameter rows by key', () => {
      store().setParameters([
        {
          key: 'mu_0',
          base: 'mu',
          componentId: 'a',
          group: 'material',
          label: 'Shear modulus',
          value: 10,
          fixed: false,
          lower: 0,
          upper: 100,
        },
      ])
      store().updateParameter('mu_0', { value: 25, fixed: true })
      expect(store().parameters[0]).toMatchObject({ key: 'mu_0', value: 25, fixed: true })
    })
  })

  it('updates unit labels', () => {
    store().setUnits({ stress: 'MPa' })
    expect(store().units).toEqual({ length: 'mm', force: 'N', stress: 'MPa' })
  })

  it('resets to the initial session', () => {
    store().addComponent('nh')
    store().setUnits({ length: 'cm' })
    store().reset()
    expect(selectSessionConfig(store())).toEqual(initialSession)
  })
})
