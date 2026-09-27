export type IndexedRoute = {
  readonly path: string
  readonly priority: number
}

export const INDEXED_ROUTES: readonly IndexedRoute[] = Object.freeze([
  { path: "/", priority: 1 },
  { path: "/demo", priority: 0.9 },
  { path: "/docs", priority: 0.8 },
  { path: "/how-it-works", priority: 0.8 },
  { path: "/compare", priority: 0.7 },
  { path: "/metrics", priority: 0.7 },
  { path: "/metrics/benchmark", priority: 0.6 },
  { path: "/metrics/operations", priority: 0.6 },
  { path: "/docs/limitations", priority: 0.6 },
  { path: "/docs/threat-model", priority: 0.6 },
  { path: "/docs/glossary", priority: 0.5 },
])

export const UNINDEXED_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  "/live": "a permanent redirect to the call page",
  "/start": "a permanent redirect to the replay",
  "/cover": "the submission cover image, not a page to land on",
  "/deck": "the submission slides, printed rather than read",
  "/order": "a local file check that only works with a receipt in hand",
  "/order/[id]": "one session's receipt, private to whoever holds the link",
  "/qa-states": "a visual QA harness for the call screen",
})

export const DISALLOWED_PATHS: readonly string[] = Object.freeze(["/api/"])
