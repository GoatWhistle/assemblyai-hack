import type { Limitation } from "./limitation-types"

export const OPERATIONS_LIMITATIONS: readonly Limitation[] = [
  {
    id: "close-codes",
    group: "operations",
    title: "Close codes are observations, not specification",
    status: "Observed; the vendor documents none",
    body: "AssemblyAI documents no WebSocket close codes at all. We measured 1000 and 1008 ourselves, and 1006 once; 1008 is what the rate limiter actually sends, and we have never observed the 3009 its condition is supposed to produce. 3006 comes from another team's measurement, and 3007, 3008 and 3009 from vendor prose.",
    link: { href: "/metrics/operations#close-codes", label: "The counted close codes" },
  },
  {
    id: "vendor-audio",
    group: "operations",
    title: "Voice audio leaves this application for a third-party vendor",
    status: "Disclosed, not independently verified",
    body: "Both sockets stream the caller's voice to AssemblyAI: the recognizer to its global endpoint and the voice agent to its US region, pinned because stored agents live in one region and the global host sent a US server and a European browser to different stores. No data-residency choice was made or evaluated; the EU endpoints are not used. What the vendor retains, and for how long, is governed by its own terms, which we have not summarised because a summary we had not verified would be an unsourced claim. No consent screen names the vendor before a session starts. Every demonstration and evaluation run in this project used synthetic speech.",
  },
  {
    id: "emergency",
    group: "operations",
    title: "In a real emergency, do not use this application",
    status: "Disclaimer, with an action",
    body: "If something is wrong right now, such as an allergic reaction, a medication error already taken, or any symptom that feels like an emergency, call 911, or 988 for a mental health crisis, immediately. This application does not call emergency services, does not triage symptoms, and routes nothing to a human faster than a phone would.",
  },
  {
    id: "device",
    group: "operations",
    title: "This is not a medical device",
    status: "Stated on every page",
    body: "A technology demonstration on synthetic data: no real patients, no real prescriptions, no clinical use and no claim of regulatory approval or review. The project quotes ISMP, the FDA, the Joint Commission and 21 CFR and is not affiliated with, endorsed by or reviewed by any of them. Do not enter real patient data.",
  },
  {
    id: "citations",
    group: "operations",
    title: "The regulatory citations carry no penalty figure",
    status: "Cited by clause number; no sanction figure sourced",
    body: "Read-back is cited to ICAO Annex 11, the Joint Commission's verbal-order goal and 21 CFR 1306.12(a), each by clause. We have not located a sourced, current penalty or sanction figure for any of them that we can check against a primary source, so none is published.",
    link: { href: "/docs/glossary#citations", label: "The exact citations" },
  },
]
