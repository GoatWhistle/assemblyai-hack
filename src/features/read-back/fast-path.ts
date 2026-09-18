import {
  classifyHeard,
  type HeardVerdict,
  OPEN_TO_ANSWER,
  type ReadBackState,
} from "./read-back-machine"

export const FastPathAction = {
  None: "none",
  Affirm: "affirm",
  Deny: "deny",
  Cancel: "cancel",
} as const

export type FastPathAction = (typeof FastPathAction)[keyof typeof FastPathAction]

export type FastPath = {
  readonly action: FastPathAction
  readonly heard: string
  readonly endpointNow: boolean
  readonly awaitsServer: boolean
  readonly label: string
}

const FAST_PATH_LABEL: Readonly<Record<FastPathAction, string>> = Object.freeze({
  none: "No local answer was recognised, so the turn goes to the agent as it stands",
  affirm: "Heard as a yes here; the server still decides whether the value is written",
  deny: "Heard as a no here; the agent asks again without waiting for a model reply",
  cancel: "Heard as a cancellation here; the read-back is dropped and nothing is written",
})

const ACTION_OF_VERDICT: Readonly<Record<HeardVerdict, FastPathAction>> = Object.freeze({
  affirmed: FastPathAction.Affirm,
  denied: FastPathAction.Deny,
  cancelled: FastPathAction.Cancel,
  unclear: FastPathAction.None,
})

export const NO_FAST_PATH: FastPath = Object.freeze({
  action: FastPathAction.None,
  heard: "",
  endpointNow: false,
  awaitsServer: false,
  label: FAST_PATH_LABEL.none,
})

export function fastPathFor(state: ReadBackState, heard: string): FastPath {
  if (!OPEN_TO_ANSWER.includes(state)) {
    return NO_FAST_PATH
  }
  const action = ACTION_OF_VERDICT[classifyHeard(heard)]
  if (action === FastPathAction.None) {
    return { ...NO_FAST_PATH, heard }
  }
  return Object.freeze({
    action,
    heard,
    endpointNow: true,
    awaitsServer: action === FastPathAction.Affirm,
    label: FAST_PATH_LABEL[action],
  })
}
