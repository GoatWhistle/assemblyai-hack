import type { ReactNode } from "react"
import { degradesToReplay, isMicrophoneFault, type SessionFault } from "../../session-status"

export type NoticeGlyph = "microphone" | "connection" | "meter"

export function glyphFor(fault: SessionFault): NoticeGlyph {
  if (isMicrophoneFault(fault)) {
    return "microphone"
  }
  return degradesToReplay(fault) ? "meter" : "connection"
}

function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const DRAWN: Readonly<Record<NoticeGlyph, ReactNode>> = {
  microphone: (
    <>
      <path d="M15 10.5V6a3 3 0 0 0-5.7-1.3" />
      <path d="M9 9v2a3 3 0 0 0 4.6 2.5" />
      <path d="M18 11a6 6 0 0 1-1 3.3M6 11a6 6 0 0 0 9.4 4.9" />
      <path d="M12 17v4" />
      <path d="M4 4l16 16" />
    </>
  ),
  connection: (
    <>
      <path d="M9.5 17H7a5 5 0 0 1 0-10h2.5" />
      <path d="M14.5 7H17a5 5 0 0 1 0 10h-2.5" />
      <path d="M8 12h1.5M14.5 12H16" />
      <path d="M12 4.5v1.5M12 18v1.5" />
    </>
  ),
  meter: (
    <>
      <path d="M4.2 16.5a8.5 8.5 0 1 1 15.6 0" />
      <path d="M12 15l4.5-3.5" />
      <circle cx="12" cy="15.5" r="1.2" />
      <path d="M6.5 11.5l1 .6M12 7.2v1.2" />
    </>
  ),
}

export function FaultGlyph({ glyph }: { readonly glyph: NoticeGlyph }) {
  return <Frame>{DRAWN[glyph]}</Frame>
}
