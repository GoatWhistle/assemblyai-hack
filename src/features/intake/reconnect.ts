export type ReconnectState = "steady" | "reconnecting" | "recovered" | "degraded"

export type ReconnectOptions = {
  readonly reconnect: () => Promise<void>
  readonly onReconnecting: () => void
  readonly onRecovered: () => void
  readonly onDegraded: () => void
}

export type ReconnectSupervisor = {
  unexpectedClose: () => void
  readonly state: ReconnectState
}

export function createReconnectSupervisor(options: ReconnectOptions): ReconnectSupervisor {
  let state: ReconnectState = "steady"

  const degrade = () => {
    if (state === "degraded") {
      return
    }
    state = "degraded"
    options.onDegraded()
  }

  return {
    get state() {
      return state
    },
    unexpectedClose: () => {
      if (state === "reconnecting" || state === "degraded") {
        return
      }
      if (state === "recovered") {
        degrade()
        return
      }
      state = "reconnecting"
      options.onReconnecting()
      options.reconnect().then(
        () => {
          if (state !== "reconnecting") {
            return
          }
          state = "recovered"
          options.onRecovered()
        },
        () => degrade(),
      )
    },
  }
}
