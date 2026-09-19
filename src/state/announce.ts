/**
 * One polite live region for the whole app, so status messages reach screen
 * readers without stealing focus.
 */

import { useSyncExternalStore } from 'react'

export interface Announcement {
  id: number
  message: string
}

let current: Announcement = { id: 0, message: '' }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export function announce(message: string): void {
  current = { id: current.id + 1, message }
  for (const listener of listeners) listener()
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    current = { id: current.id + 1, message: '' }
    for (const listener of listeners) listener()
  }, 6000)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Announcement {
  return current
}

export function useAnnouncement(): Announcement {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
