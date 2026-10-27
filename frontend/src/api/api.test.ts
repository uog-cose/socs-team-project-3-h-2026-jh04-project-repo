import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { initialSession } from '../state/sessionStore'
import { server } from '../mocks/server'
import { api } from './client'
import { API_URL } from './config'
import { ApiError, unwrap } from './errors'
import type { SessionConfig } from './types'

type MaterialConfig = SessionConfig['material']

const goh = { id: 'a', type: 'goh', fiber: null }
const nh = { id: 'b', type: 'nh', fiber: null }
const experiment = initialSession.experiment

describe('API client against the mocks', () => {
  it('loads the catalog', async () => {
    const catalog = unwrap(await api.GET('/catalog'))
    expect(catalog.materials.map((m) => m.type)).toContain('goh')
    expect(catalog.experiments.map((e) => e.type)).toEqual(['uniaxial', 'biaxial', 'tube'])
  })

  it('builds a parameter table with component suffixes', async () => {
    const material: MaterialConfig = { components: [goh, nh] }
    const { parameters } = unwrap(await api.POST('/parameters', { body: { material, experiment } }))
    expect(parameters.map((p) => p.key)).toEqual(['L0', 'A0', 'k1_0', 'k2_0', 'k3_0', 'mu_1'])
  })

  it('keeps edited values when components are reordered', async () => {
    const first = unwrap(
      await api.POST('/parameters', { body: { material: { components: [goh, nh] }, experiment } }),
    )
    const previous = first.parameters.map((p) => (p.key === 'mu_1' ? { ...p, value: 42 } : p))
    const second = unwrap(
      await api.POST('/parameters', {
        body: { material: { components: [nh, goh] }, experiment, previous },
      }),
    )
    expect(second.parameters.find((p) => p.key === 'mu_0')?.value).toBe(42)
  })

  it('returns N×2 arrays for biaxial simulations', async () => {
    const config = {
      ...initialSession,
      material: { components: [nh] },
      experiment: { type: 'biaxial' as const, inputMeasure: 'stretch', outputMeasure: 'cauchy' },
      protocol: {
        control: 'displacement' as const,
        axes: [
          { start: 1, end: 1.2, points: 5 },
          { start: 1, end: 1.1, points: 5 },
        ],
      },
    }
    const result = unwrap(await api.POST('/simulate', { body: { config } }))
    expect(result.input).toHaveLength(5)
    expect(result.output.every((row) => row.length === 2)).toBe(true)
    expect(result.log.length).toBeGreaterThan(0)
  })

  it('turns error responses into an ApiError with a readable message', async () => {
    const promise = api.POST('/simulate', { body: { config: initialSession } }).then(unwrap)
    await expect(promise).rejects.toThrow(ApiError)
    await expect(promise).rejects.toThrow('Add at least one material component before simulating.')
  })

  it('reports errors without a JSON body by status', async () => {
    server.use(http.get(`${API_URL}/catalog`, () => new HttpResponse(null, { status: 503 })))
    await expect(api.GET('/catalog').then(unwrap)).rejects.toMatchObject({ status: 503 })
  })
})
