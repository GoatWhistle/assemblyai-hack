import type { SessionStore, StoredSession } from "./store"
import { createMemoryStore, summarize } from "./store"

const PREFIX = "sessions"

type BlobPutter = (
  path: string,
  body: string,
  options: { access: "public"; contentType: string; allowOverwrite: boolean; token: string },
) => Promise<{ url: string }>

type BlobLister = (options: { prefix: string; token: string }) => Promise<{
  blobs: readonly { url: string; pathname: string }[]
}>

export type BlobClient = {
  readonly put: BlobPutter
  readonly list: BlobLister
}

export function createBlobStore(token: string, client: BlobClient): SessionStore {
  const urls = new Map<string, string>()

  return {
    async put(session) {
      const { url } = await client.put(
        `${PREFIX}/${session.sessionId}.json`,
        JSON.stringify(session),
        {
          access: "public",
          contentType: "application/json",
          allowOverwrite: true,
          token,
        },
      )
      urls.set(session.sessionId, url)
    },
    async get(sessionId) {
      const known = urls.get(sessionId)
      const url =
        known ?? (await client.list({ prefix: `${PREFIX}/${sessionId}`, token })).blobs[0]?.url
      if (url === undefined) {
        return null
      }
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) {
        return null
      }
      return (await response.json()) as StoredSession
    },
    async list() {
      const { blobs } = await client.list({ prefix: `${PREFIX}/`, token })
      const out = []
      for (const blob of blobs) {
        const response = await fetch(blob.url, { cache: "no-store" })
        if (response.ok) {
          out.push(summarize((await response.json()) as StoredSession))
        }
      }
      return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },
    backend() {
      return "blob"
    },
  }
}

let active: SessionStore | null = null

export function sessionStore(): SessionStore {
  if (active === null) {
    active = createMemoryStore()
  }
  return active
}

export function setSessionStore(store: SessionStore | null): void {
  active = store
}
