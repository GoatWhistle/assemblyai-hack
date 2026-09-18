import { list as blobList, put as blobPut } from "@vercel/blob"
import { isUsableSessionId, SessionStorageError } from "@/domain"
import {
  ALL_SESSION_ORIGINS,
  type SessionOrigin,
  sessionOriginOf,
  storagePrefixFor,
} from "./origin"
import type { SessionStore, StoredSession } from "./store"
import { createMemoryStore, summarize } from "./store"

const PREFIX = "sessions"

function blobKey(sessionId: string, origin: SessionOrigin): string {
  if (!isUsableSessionId(sessionId)) {
    throw new Error("a session id that is not a safe blob key cannot address storage")
  }
  return `${storagePrefixFor(origin)}/${sessionId}`
}

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

  async function findAnyOrigin(sessionId: string): Promise<string | undefined> {
    for (const origin of ALL_SESSION_ORIGINS) {
      const { blobs } = await client.list({
        prefix: `${blobKey(sessionId, origin)}.json`,
        token,
      })
      const found = blobs[0]?.url
      if (found !== undefined) {
        return found
      }
    }
    return undefined
  }

  return {
    async put(session) {
      const { url } = await client.put(
        `${blobKey(session.sessionId, sessionOriginOf(session.origin))}.json`,
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
      const url = known ?? (await findAnyOrigin(sessionId))
      if (url === undefined) {
        return null
      }
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) {
        return null
      }
      return (await response.json()) as StoredSession
    },
    async list(origin) {
      const prefix = origin === undefined ? `${PREFIX}/` : `${storagePrefixFor(origin)}/`
      const { blobs } = await client.list({ prefix, token })
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

function vercelBlobClient(): BlobClient {
  return {
    put: (path, body, options) => blobPut(path, body, options),
    list: (options) => blobList(options),
  }
}

export function chooseSessionStore(
  env: Record<string, string | undefined>,
  client: BlobClient = vercelBlobClient(),
): SessionStore {
  const token = env.BLOB_READ_WRITE_TOKEN
  const configured = token !== undefined && token.trim().length > 0
  if (configured) {
    return createBlobStore(token.trim(), client)
  }
  if (env.NODE_ENV === "production" && env.READBACK_ALLOW_MEMORY_STORE !== "1") {
    throw new SessionStorageError(
      "BLOB_READ_WRITE_TOKEN is absent in production; a finished session would be written to memory and lost when the function is torn down, which would read as a successful commit",
    )
  }
  return createMemoryStore()
}

export function sessionStore(): SessionStore {
  if (active === null) {
    active = chooseSessionStore(process.env)
  }
  return active
}
