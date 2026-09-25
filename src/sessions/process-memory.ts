const REGISTRY_KEY = "__readbackProcessMemory"

function registry(): Map<string, unknown> {
  const existing: unknown = Reflect.get(globalThis, REGISTRY_KEY)
  if (existing instanceof Map) {
    return existing
  }
  const created = new Map<string, unknown>()
  Reflect.set(globalThis, REGISTRY_KEY, created)
  return created
}

export function processSingleton<T>(key: string, create: () => T): T {
  const memory = registry()
  if (!memory.has(key)) {
    memory.set(key, create())
  }
  return memory.get(key) as T
}
