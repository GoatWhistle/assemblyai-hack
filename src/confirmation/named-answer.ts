import {
  CORRECTIONS,
  ConfirmationReason,
  type ConfirmationVerdict,
  type FieldName,
  NEGATIONS,
  replyWords,
} from "@/domain"
import { lasaRiskFor } from "@/lasa"
import { classifyCallerReply } from "./caller-reply"
import type { TurnRecord } from "./provenance-match"
import { reconcileValue } from "./reconcile-value"
import { negatedMention, retractionOf } from "./self-correction"

export type PairSubject = {
  readonly field: FieldName
  readonly rawValue: string
  readonly normalizedValue: string | number | null
}

export type NamedAnswer = {
  readonly verdict: ConfirmationVerdict
  readonly reasonCode: ConfirmationReason
  readonly correctedTo: string | null
}

function textAsTurn(text: string): TurnRecord {
  return { turnOrder: 0, transcript: text, isFormatted: true, words: [] }
}

export function spokenIn(value: string, text: string): boolean {
  return value.trim().length > 0 && reconcileValue({ value, turn: textAsTurn(text) }).supported
}

export function valueSpokenIn(subject: PairSubject, text: string): boolean {
  if (spokenIn(subject.rawValue, text)) {
    return true
  }
  return subject.normalizedValue !== null && spokenIn(String(subject.normalizedValue), text)
}

export function partnersOf(subject: PairSubject): readonly string[] {
  const names = [
    subject.rawValue,
    ...(subject.normalizedValue === null ? [] : [subject.normalizedValue]),
  ]
  const partners = new Set(names.flatMap((name) => lasaRiskFor(String(name)).confusableWith))
  return [...partners].filter((partner) => !valueSpokenIn(subject, partner))
}

export function pairRuleApplies(subject: PairSubject, lasaChecked: boolean): boolean {
  return lasaChecked && partnersOf(subject).length > 0
}

export function readBackIsContrastive(subject: PairSubject, text: string): boolean {
  const partners = partnersOf(subject)
  return partners.length > 0 && partners.every((partner) => spokenIn(partner, text))
}

function named(
  verdict: ConfirmationVerdict,
  reasonCode: ConfirmationReason,
  correctedTo: string | null = null,
): NamedAnswer {
  return Object.freeze({ verdict, reasonCode, correctedTo })
}

const NAME_REQUIRED = named("unclear", ConfirmationReason.LasaNamedAnswerRequired)

function withdrawn(input: {
  subject: PairSubject
  name: string
  others: readonly string[]
  text: string
}): boolean {
  if (negatedMention(input.text, input.name)) {
    return true
  }
  const retraction = retractionOf({
    value: input.name,
    field: input.subject.field,
    text: input.text,
    sameKind: (token) => input.others.some((other) => spokenIn(other, token)),
  })
  return retraction !== null
}

function resolveBoth(
  subject: PairSubject,
  partners: readonly string[],
  text: string,
): NamedAnswer {
  const value = String(subject.normalizedValue ?? subject.rawValue)
  const [partner, ...rest] = partners
  if (partner === undefined || rest.length > 0) {
    return NAME_REQUIRED
  }
  const valueWithdrawn = withdrawn({ subject, name: value, others: [partner], text })
  const partnerWithdrawn = withdrawn({ subject, name: partner, others: [value], text })
  if (valueWithdrawn && !partnerWithdrawn) {
    return named("rejected", ConfirmationReason.CallerNamedPartner, partner)
  }
  if (partnerWithdrawn && !valueWithdrawn) {
    return named("confirmed", ConfirmationReason.CallerNamedValue)
  }
  return NAME_REQUIRED
}

export function judgeNamedAnswer(input: { subject: PairSubject; text: string }): NamedAnswer {
  const { subject, text } = input
  const partners = partnersOf(subject)
  const partnersNamed = partners.filter((partner) => spokenIn(partner, text))
  const valueNamed = valueSpokenIn(subject, text)
  const valueText = [subject.rawValue, subject.normalizedValue ?? ""].join(" ")

  if (valueNamed && partnersNamed.length > 0) {
    return resolveBoth(subject, partnersNamed, text)
  }
  if (valueNamed) {
    const words = replyWords(text)
    if (words.some((word) => NEGATIONS.has(word) || CORRECTIONS.has(word))) {
      const reply = classifyCallerReply({ text, valueText })
      return named(reply.verdict, reply.reasonCode)
    }
    return named("confirmed", ConfirmationReason.CallerNamedValue)
  }
  const [partner, ...rest] = partnersNamed
  if (partner !== undefined) {
    if (rest.length > 0 || negatedMention(text, partner)) {
      return NAME_REQUIRED
    }
    return named("rejected", ConfirmationReason.CallerNamedPartner, partner)
  }
  const reply = classifyCallerReply({ text, valueText })
  if (reply.verdict === "confirmed") {
    return NAME_REQUIRED
  }
  return named(reply.verdict, reply.reasonCode)
}
