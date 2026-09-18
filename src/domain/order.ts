import type { ConfirmationMode, FieldName } from "./enums"
import type { Provenance } from "./provenance"
import type { ValidatorVerdict } from "./verdict"

declare const confirmedBrand: unique symbol

export type ConfirmedValue = {
  readonly [confirmedBrand]: true
  readonly field: FieldName
  readonly value: string | number
  readonly provenance: Provenance
  readonly verdict: ValidatorVerdict
  readonly confirmationMode: ConfirmationMode
  readonly candidateId: string
  readonly confirmedAt: string
}

export type OrderStatus = "in_progress" | "needs_pharmacist" | "committed" | "abandoned"

export type Order = {
  readonly orderId: string
  readonly sessionId: string
  readonly fields: ReadonlyMap<FieldName, ConfirmedValue>
  readonly abortedFields: readonly FieldName[]
  readonly status: OrderStatus
  readonly createdAt: string
}

export function emptyOrder(input: {
  orderId: string
  sessionId: string
  createdAt?: string
}): Order {
  return Object.freeze({
    orderId: input.orderId,
    sessionId: input.sessionId,
    fields: new Map<FieldName, ConfirmedValue>(),
    abortedFields: Object.freeze([]),
    status: "in_progress" as const,
    createdAt: input.createdAt ?? new Date().toISOString(),
  })
}

export function setField(order: Order, value: ConfirmedValue): Order {
  const fields = new Map(order.fields)
  fields.set(value.field, value)
  return Object.freeze({ ...order, fields })
}

export function withdrawField(order: Order, field: FieldName): Order {
  if (!order.fields.has(field)) {
    return order
  }
  const fields = new Map(order.fields)
  fields.delete(field)
  return Object.freeze({ ...order, fields })
}

export function abortField(order: Order, field: FieldName): Order {
  if (order.abortedFields.includes(field)) {
    return order
  }
  return Object.freeze({
    ...order,
    abortedFields: Object.freeze([...order.abortedFields, field]),
  })
}

export function withStatus(order: Order, status: OrderStatus): Order {
  return Object.freeze({ ...order, status })
}

export function missingFields(
  order: Order,
  required: readonly FieldName[],
): readonly FieldName[] {
  return required.filter((f) => !order.fields.has(f))
}
