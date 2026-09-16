import type { SessionFixture } from "@/realtime/protocol"
import {
  agentSays,
  begin,
  created,
  ended,
  fixture,
  sttFrame,
  turn,
  userSaid,
} from "./fixture-frames"

export function checksumFail(): SessionFixture {
  const id = "fixture-checksum-fail"
  return fixture({
    name: "checksum-fail",
    description:
      "an NPI whose Luhn check digit does not match, so the gate goes straight to spell-out rather than spending a voice repeat",
    frames: [
      begin(0, id),
      created(10),
      userSaid(
        1500,
        "The prescriber NPI is one two three four five six seven eight nine zero",
        1,
      ),
      sttFrame(
        1600,
        turn({
          turnOrder: 1,
          startMs: 1500,
          specs: [
            ["one", 0.96],
            ["two", 0.97],
            ["three", 0.96],
            ["four", 0.97],
            ["five", 0.95],
            ["six", 0.96],
            ["seven", 0.97],
            ["eight", 0.96],
            ["nine", 0.97],
            ["zero", 0.96],
          ],
        }),
      ),
      ...agentSays(
        3000,
        "The prescriber NPI I have, one two three four five six seven eight nine zero, does not pass its check, so one character is off. Please read it back to me one character at a time.",
      ),
      userSaid(7000, "one two four five three one nine five nine nine", 2),
      sttFrame(
        7100,
        turn({
          turnOrder: 2,
          startMs: 7000,
          specs: [
            ["one", 0.98],
            ["two", 0.98],
            ["four", 0.98],
            ["five", 0.97],
            ["three", 0.98],
            ["one", 0.98],
            ["nine", 0.97],
            ["five", 0.98],
            ["nine", 0.97],
            ["nine", 0.98],
          ],
        }),
      ),
      ...agentSays(9000, "Got it, the prescriber NPI is 1245319599."),
      ...ended(10500),
    ],
  })
}

export function lowConfidence(): SessionFixture {
  const id = "fixture-low-confidence"
  return fixture({
    name: "low-confidence",
    description:
      "a mumbled quantity where the minimum word confidence over the span falls below the field threshold",
    frames: [
      begin(0, id),
      created(10),
      userSaid(1500, "quantity thirty", 1),
      sttFrame(
        1600,
        turn({
          turnOrder: 1,
          startMs: 1500,
          turnConfidence: 0.62,
          specs: [
            ["quantity", 0.91],
            ["thirty", 0.54],
          ],
        }),
      ),
      ...agentSays(2600, "I think I heard the quantity as 30. Is that correct?"),
      userSaid(4500, "Yes that is right", 2),
      sttFrame(
        4600,
        turn({
          turnOrder: 2,
          startMs: 4500,
          specs: [
            ["Yes", 0.98],
            ["that", 0.97],
            ["is", 0.98],
            ["right", 0.97],
          ],
        }),
      ),
      ...ended(6000),
    ],
  })
}

export function spellOut(): SessionFixture {
  const id = "fixture-spell-out"
  return fixture({
    name: "spell-out",
    description:
      "a DEA number read back with the NATO alphabet after two ordinary repeats failed to settle it",
    frames: [
      begin(0, id),
      created(10),
      userSaid(1500, "DEA number AB one two three four five six three", 1),
      sttFrame(
        1600,
        turn({
          turnOrder: 1,
          startMs: 1500,
          turnConfidence: 0.7,
          specs: [
            ["DEA", 0.96],
            ["number", 0.95],
            ["AB", 0.61],
            ["one", 0.94],
            ["two", 0.93],
            ["three", 0.94],
          ],
        }),
      ),
      ...agentSays(
        3200,
        "I am still not certain about the prescriber DEA number. Could you give it to me letter by letter, using words for the letters - like Alfa for A?",
      ),
      userSaid(7000, "Alfa Bravo one two three four five six three", 2),
      sttFrame(
        7100,
        turn({
          turnOrder: 2,
          startMs: 7000,
          specs: [
            ["Alfa", 0.99],
            ["Bravo", 0.99],
            ["one", 0.98],
            ["two", 0.98],
            ["three", 0.98],
            ["four", 0.98],
            ["five", 0.97],
            ["six", 0.98],
            ["three", 0.98],
          ],
        }),
      ),
      ...agentSays(
        9500,
        "Reading it back: Alfa Bravo one two three four five six three. Is that right?",
      ),
      ...ended(11500),
    ],
  })
}
