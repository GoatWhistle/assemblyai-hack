import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { comboExists, combosFor, loadCatalog } from "@/catalog"
import { classifyCallerReply, judgeNamedAnswer } from "@/confirmation"
import { ConfirmationReason, ReasonCode } from "@/domain"
import { answerTo } from "@/features/judge-demo/demo-answer"
import {
  DEMO_ARMS,
  NAMED_ANSWER,
  PLAIN_ANSWER,
  RECOGNIZED_AS,
  SHIPPED_POLICY,
  SPOKEN_TRUTH,
  WITHOUT_PAIR_RULE_POLICY,
} from "@/features/judge-demo/demo-arms"
import { LASA_CANDIDATE, STRENGTH_CANDIDATE } from "@/features/judge-demo/scenario"
import { decide } from "@/gate"

const contrastive = decide(LASA_CANDIDATE, SHIPPED_POLICY)
const plain = decide(LASA_CANDIDATE, WITHOUT_PAIR_RULE_POLICY)
const subject = {
  field: LASA_CANDIDATE.field,
  rawValue: LASA_CANDIDATE.rawValue,
  normalizedValue: LASA_CANDIDATE.normalizedValue,
}

describe("S0: the contrastive read-back in the replay needs a spoken name", () => {
  it("does not take a plain yes as an answer to the pair question", () => {
    for (const reply of ["Yes.", "Correct.", "That's right.", "Yeah."]) {
      const answer = answerTo(contrastive, LASA_CANDIDATE, reply)
      expect(answer.verdict, reply).toBe("unclear")
      expect(answer.reasonCode, reply).toBe(ConfirmationReason.LasaNamedAnswerRequired)
      expect(answer.settledOn).toBeNull()
    }
  })

  it("takes the partner's name as a correction to the partner", () => {
    const answer = answerTo(contrastive, LASA_CANDIDATE, NAMED_ANSWER)
    expect(answer.reasonCode).toBe(ConfirmationReason.CallerNamedPartner)
    expect(answer.settledOn).toBe(SPOKEN_TRUTH)
  })

  it("takes the heard name as a confirmation of it", () => {
    const answer = answerTo(contrastive, LASA_CANDIDATE, "Morphine.")
    expect(answer.reasonCode).toBe(ConfirmationReason.CallerNamedValue)
    expect(answer.settledOn).toBe(RECOGNIZED_AS)
  })

  it("does not settle on either when both names are said", () => {
    const answer = answerTo(contrastive, LASA_CANDIDATE, "Hydromorphone or morphine.")
    expect(answer.reasonCode).toBe(ConfirmationReason.LasaNamedAnswerRequired)
  })

  it("lets a plain yes confirm the plain read-back, which is the failure shown", () => {
    expect(plain.reasonCode).toBe(ReasonCode.ReadBackRequired)
    const answer = answerTo(plain, LASA_CANDIDATE, PLAIN_ANSWER)
    expect(answer.reasonCode).toBe(ConfirmationReason.CallerAffirmed)
    expect(answer.settledOn).toBe(RECOGNIZED_AS)
    expect(answerTo(plain, LASA_CANDIDATE, "Yeah, no.").verdict).toBe("rejected")
  })
})

describe("the replay reads each answer with the server's own functions", () => {
  it("holds no answer vocabulary of its own", () => {
    const source = readFileSync("src/features/judge-demo/demo-answer.ts", "utf8")
    expect(source).toContain('from "@/confirmation"')
    expect(source).not.toMatch(/AFFIRMATIONS|NEGATIONS|CORRECTIONS|FILLERS|replyWords/)
  })

  it("settles a contrastive reply exactly where judgeNamedAnswer does", () => {
    for (const reply of [NAMED_ANSWER, "Morphine.", "Yes.", "Correct.", "Yeah, no."]) {
      const answer = answerTo(contrastive, LASA_CANDIDATE, reply)
      const named = judgeNamedAnswer({ subject, text: reply })
      expect([answer.verdict, answer.reasonCode], reply).toEqual([
        named.verdict,
        named.reasonCode,
      ])
      if (named.correctedTo !== null) {
        expect(answer.settledOn).toBe(named.correctedTo)
      }
    }
  })

  it("reads a backchannel or a hedge after a yes the way the server does", () => {
    expect(answerTo(plain, LASA_CANDIDATE, "Yes okay.").verdict).toBe("confirmed")
    expect(answerTo(plain, LASA_CANDIDATE, "Yes but.").verdict).toBe(
      classifyCallerReply({ text: "Yes but.", valueText: "Morphine morphine" }).verdict,
    )
  })
})

describe("the product path of the replay invokes the answer reading and the gate", () => {
  it("builds each arm's written value through confirm() from the arm's own answer", () => {
    for (const arm of DEMO_ARMS) {
      expect(arm.answer).toEqual(answerTo(arm.decision, LASA_CANDIDATE, arm.answer.callerSaid))
      expect(arm.written?.value).toBe(arm.answer.settledOn)
      expect(arm.written?.confirmationMode).toBe("read_back")
    }
  })
})

describe("the replay's order exists for both drugs in the built catalogue", () => {
  const evidence = STRENGTH_CANDIDATE.verdict.evidence
  const strength = String(evidence.strength)
  const form = String(evidence.dosageForm)

  it("uses a strength and form that exist for both, with a route list that includes intravenous", () => {
    const index = loadCatalog()
    for (const drug of [RECOGNIZED_AS, SPOKEN_TRUTH]) {
      const routes = combosFor(index, drug)
      const found = routes.some(
        (combo) =>
          combo.strength === strength &&
          combo.dosageForm === form &&
          combo.route.split(";").some((route) => route.trim() === "INTRAVENOUS"),
      )
      expect(found, `${drug} ${strength} ${form} intravenous`).toBe(true)
    }
    expect(
      comboExists(index, {
        drugName: RECOGNIZED_AS,
        strength,
        dosageForm: form,
        route: "INTRAVENOUS",
      }),
    ).toBe(true)
  })
})
