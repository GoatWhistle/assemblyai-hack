"use client"

import { useEffect, useState } from "react"
import type { FaultDetail } from "./session-options"
import { budgetRefusal } from "./start-faults"

export function useBudgetAhead(): FaultDetail | null {
  const [refusal, setRefusal] = useState<FaultDetail | null>(null)
  useEffect(() => {
    let current = true
    void budgetRefusal().then((found) => {
      if (current) {
        setRefusal(found)
      }
    })
    return () => {
      current = false
    }
  }, [])
  return refusal
}
