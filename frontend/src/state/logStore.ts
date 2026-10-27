import { create } from 'zustand'

export type LogLevel = 'info' | 'warning' | 'error'

export interface LogEntry {
  id: number
  time: Date
  level: LogLevel
  message: string
}

interface LogState {
  entries: LogEntry[]
  append: (level: LogLevel, message: string) => void
  clear: () => void
}

let nextId = 0

export const useLogStore = create<LogState>()((set) => ({
  entries: [],
  append: (level, message) =>
    set((s) => ({ entries: [...s.entries, { id: nextId++, time: new Date(), level, message }] })),
  clear: () => set({ entries: [] }),
}))
