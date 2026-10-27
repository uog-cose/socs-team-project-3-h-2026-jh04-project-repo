import createClient from 'openapi-fetch'
import { API_URL } from './config'
import type { paths } from './schema.gen'

export const api = createClient<paths>({
  baseUrl: API_URL,
  // Look fetch up on every call so MSW's interceptor is used in tests.
  fetch: (request) => globalThis.fetch(request),
})
