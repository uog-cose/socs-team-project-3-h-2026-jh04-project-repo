export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// Mocks are on by default in `npm run dev` and off in production builds.
export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? String(import.meta.env.DEV)) === 'true'
