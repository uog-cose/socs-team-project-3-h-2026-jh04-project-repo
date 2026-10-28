import { delay, http, HttpResponse, type PathParams } from 'msw'
import { API_URL } from '../api/config'
import type {
  Catalog,
  ErrorResponse,
  ParametersRequest,
  ParametersResponse,
  SimulateRequest,
  SimulateResponse,
} from '../api/types'
import { catalog } from './data'
import { buildParameterRows } from './parameters'
import { simulate } from './simulate'

const url = (path: string) => `${API_URL}${path}`

export const handlers = [
  http.get(url('/health'), () => HttpResponse.json({ status: 'ok', pymechtVersion: 'mock' })),

  http.get(url('/catalog'), async () => {
    await delay()
    return HttpResponse.json<Catalog>(catalog)
  }),

  http.post<PathParams, ParametersRequest, ParametersResponse | ErrorResponse>(
    url('/parameters'),
    async ({ request }) => {
      const body = await request.json()
      await delay()
      try {
        return HttpResponse.json<ParametersResponse>({
          parameters: buildParameterRows(catalog, body),
        })
      } catch (e) {
        return HttpResponse.json<ErrorResponse>({ detail: (e as Error).message }, { status: 422 })
      }
    },
  ),

  http.post<PathParams, SimulateRequest, SimulateResponse | ErrorResponse>(
    url('/simulate'),
    async ({ request }) => {
      const { config } = await request.json()
      await delay(600)
      if (config.material.components.length === 0) {
        return HttpResponse.json<ErrorResponse>(
          { detail: 'Add at least one material component before simulating.' },
          { status: 422 },
        )
      }
      return HttpResponse.json<SimulateResponse>(simulate(config))
    },
  ),
]
