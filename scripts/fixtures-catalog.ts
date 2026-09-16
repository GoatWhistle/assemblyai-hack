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

export function happyPath(): SessionFixture {
  const id = "fixture-happy-path"
  return fixture({
    name: "happy-path",
    description:
      "a clean dictation where every field passes its validator and the mandatory read-backs are confirmed",
    frames: [
      begin(0, id),
      created(10),
      ...agentSays(
        200,
        "Pharmacy intake, this line is recorded for verification. Go ahead with the prescription.",
      ),
      userSaid(2000, "Lisinopril ten milligrams tablet by mouth", 1),
      sttFrame(
        2100,
        turn({
          turnOrder: 1,
          startMs: 2000,
          specs: [
            ["Lisinopril", 0.97],
            ["ten", 0.98],
            ["milligrams", 0.99],
            ["tablet", 0.98],
            ["by", 0.99],
            ["mouth", 0.98],
          ],
        }),
      ),
      ...agentSays(3200, "Confirming the drug name: lisinopril. Correct?"),
      userSaid(5000, "Correct", 2),
      sttFrame(5100, turn({ turnOrder: 2, startMs: 5000, specs: [["Correct", 0.99]] })),
      ...agentSays(5600, "Confirming the quantity: 30. Correct?"),
      userSaid(7000, "Yes", 3),
      sttFrame(7100, turn({ turnOrder: 3, startMs: 7000, specs: [["Yes", 0.99]] })),
      ...agentSays(7600, "One moment, placing the order."),
      ...ended(9000),
    ],
  })
}

export function lasaCatch(): SessionFixture {
  const id = "fixture-lasa-catch"
  return fixture({
    name: "lasa-catch",
    description:
      "the human said Lisinopril, the recognizer returned Bisoprolol at confidence 1.0 and the validator passed it; the gate re-asks anyway because the name is in a published ISMP pair",
    frames: [
      begin(0, id),
      created(10),
      ...agentSays(200, "Pharmacy intake, this line is recorded for verification."),
      userSaid(2000, "Bisoprolol ten milligrams", 1),
      sttFrame(
        2100,
        turn({
          turnOrder: 1,
          startMs: 4120,
          turnConfidence: 0.99,
          specs: [
            ["Bisoprolol", 1.0],
            ["ten", 0.99],
            ["milligrams", 0.99],
          ],
        }),
      ),
      ...agentSays(
        3300,
        "I heard Bisoprolol. That name is on the published confused-drug-names list together with lisinopril. To be certain: did you say Bisoprolol or lisinopril?",
      ),
      userSaid(6000, "Lisinopril", 2),
      sttFrame(6100, turn({ turnOrder: 2, startMs: 6000, specs: [["Lisinopril", 0.98]] })),
      ...agentSays(6800, "Confirming the drug name: lisinopril. Correct?"),
      userSaid(8200, "Yes", 3),
      sttFrame(8300, turn({ turnOrder: 3, startMs: 8200, specs: [["Yes", 0.99]] })),
      ...ended(9500),
    ],
  })
}

export function comboInvalid(): SessionFixture {
  const id = "fixture-combo-invalid"
  return fixture({
    name: "combo-invalid",
    description:
      "a strength that does not exist for the drug, form and route already collected, so the gate asks which part to change",
    frames: [
      begin(0, id),
      created(10),
      userSaid(1500, "Lisinopril eighty milligrams tablet", 1),
      sttFrame(
        1600,
        turn({
          turnOrder: 1,
          startMs: 1500,
          specs: [
            ["Lisinopril", 0.98],
            ["eighty", 0.97],
            ["milligrams", 0.98],
            ["tablet", 0.97],
          ],
        }),
      ),
      ...agentSays(
        3000,
        "I have lisinopril 80 mg TABLET ORAL, but that combination does not exist in the directory. Which part should I change?",
      ),
      userSaid(6000, "Make it twenty milligrams", 2),
      sttFrame(
        6100,
        turn({
          turnOrder: 2,
          startMs: 6000,
          specs: [
            ["Make", 0.97],
            ["it", 0.98],
            ["twenty", 0.97],
            ["milligrams", 0.98],
          ],
        }),
      ),
      ...agentSays(7400, "Confirming the strength: 20 mg. Correct?"),
      ...ended(9000),
    ],
  })
}
