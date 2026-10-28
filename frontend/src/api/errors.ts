import type { ErrorResponse } from './types'

/** An API failure with a message that is safe to show to the user. */
export class ApiError extends Error {
  readonly status: number
  readonly log: string[]

  constructor(message: string, status: number, log: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.log = log
  }
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { detail?: unknown }).detail === 'string'
  )
}

/** Returns `data`, or throws an ApiError built from the error body. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data
  const { error, response } = result
  if (isErrorResponse(error)) throw new ApiError(error.detail, response.status, error.log ?? [])
  throw new ApiError(`Request failed (${response.status} ${response.statusText})`, response.status)
}
