export type SigEntry = {
  readonly abbreviation: string
  readonly confusedWith: string
  readonly instead: string
}

export const ISMP_DO_NOT_USE: readonly SigEntry[] = [
  { abbreviation: "qd", confusedWith: "qid, or the period read as an i", instead: "daily" },
  { abbreviation: "q.d.", confusedWith: "qid", instead: "daily" },
  { abbreviation: "od", confusedWith: "right eye (oculus dexter)", instead: "daily" },
  { abbreviation: "qod", confusedWith: "qd or qid", instead: "every other day" },
  { abbreviation: "q.o.d.", confusedWith: "qd or qid", instead: "every other day" },
  { abbreviation: "bid", confusedWith: "tid when handwritten", instead: "twice daily" },
  { abbreviation: "tid", confusedWith: "bid when handwritten", instead: "three times daily" },
  { abbreviation: "qid", confusedWith: "qd", instead: "four times daily" },
  { abbreviation: "hs", confusedWith: "half strength or hour of sleep", instead: "at bedtime" },
  { abbreviation: "qhs", confusedWith: "every hour", instead: "nightly at bedtime" },
  {
    abbreviation: "tiw",
    confusedWith: "three times a day or twice a week",
    instead: "three times a week",
  },
  { abbreviation: "biw", confusedWith: "twice a day", instead: "twice a week" },
  {
    abbreviation: "u",
    confusedWith: "the digit 0 or 4, giving a tenfold overdose",
    instead: "unit",
  },
  { abbreviation: "iu", confusedWith: "IV or the digit 10", instead: "unit" },
  { abbreviation: "cc", confusedWith: "the letter u", instead: "mL" },
  { abbreviation: "ug", confusedWith: "mg, giving a thousandfold overdose", instead: "mcg" },
  {
    abbreviation: "\u00b5g",
    confusedWith: "mg, giving a thousandfold overdose",
    instead: "mcg",
  },
  { abbreviation: "ad", confusedWith: "the right ear read as a route", instead: "right ear" },
  { abbreviation: "as", confusedWith: "the left ear read as a route", instead: "left ear" },
  { abbreviation: "au", confusedWith: "both ears read as a route", instead: "both ears" },
  { abbreviation: "os", confusedWith: "mouth (os) rather than left eye", instead: "left eye" },
  { abbreviation: "ou", confusedWith: "both eyes read as a unit", instead: "both eyes" },
  { abbreviation: "sc", confusedWith: "SL for sublingual", instead: "subcutaneous" },
  {
    abbreviation: "sq",
    confusedWith: "5 every, when the q is read as every",
    instead: "subcutaneous",
  },
  { abbreviation: "subq", confusedWith: "the q read as every", instead: "subcutaneous" },
  {
    abbreviation: "d/c",
    confusedWith: "discharge rather than discontinue",
    instead: "discontinue",
  },
  {
    abbreviation: "dc",
    confusedWith: "discharge rather than discontinue",
    instead: "discontinue",
  },
  {
    abbreviation: "ms",
    confusedWith: "morphine sulfate or magnesium sulfate",
    instead: "the full drug name",
  },
  { abbreviation: "mso4", confusedWith: "magnesium sulfate", instead: "morphine sulfate" },
  { abbreviation: "mgso4", confusedWith: "morphine sulfate", instead: "magnesium sulfate" },
  { abbreviation: "per os", confusedWith: "the os read as left eye", instead: "by mouth" },
  { abbreviation: "po qd", confusedWith: "qid", instead: "by mouth daily" },
  { abbreviation: "hct", confusedWith: "hydrocortisone", instead: "hydrochlorothiazide" },
  { abbreviation: "hctz", confusedWith: "hydrocortisone", instead: "hydrochlorothiazide" },
  {
    abbreviation: "aza",
    confusedWith: "azathioprine or azithromycin",
    instead: "the full drug name",
  },
  {
    abbreviation: "ntg",
    confusedWith: "nitroglycerin written as an abbreviation",
    instead: "nitroglycerin",
  },
  {
    abbreviation: "tac",
    confusedWith: "triamcinolone or tacrolimus",
    instead: "the full drug name",
  },
  {
    abbreviation: "ss",
    confusedWith: "the apothecary symbol for one half, or sliding scale",
    instead: "one half or sliding scale",
  },
  { abbreviation: "x3d", confusedWith: "three doses or three days", instead: "for three days" },
  {
    abbreviation: "ss insulin",
    confusedWith: "strong solution",
    instead: "sliding scale insulin",
  },
  {
    abbreviation: "apothecary dram",
    confusedWith: "the dram symbol read as the digit 3",
    instead: "metric units",
  },
  {
    abbreviation: "apothecary minim",
    confusedWith: "the minim symbol read as mL",
    instead: "metric units",
  },
  { abbreviation: "+", confusedWith: "the digit 4", instead: "the word plus or and" },
  { abbreviation: "&", confusedWith: "the digit 2", instead: "the word and" },
  { abbreviation: "@", confusedWith: "the digit 2 or the letter a", instead: "the word at" },
  { abbreviation: "o.d.", confusedWith: "right eye", instead: "daily" },
  { abbreviation: "q1d", confusedWith: "qid", instead: "daily" },
  {
    abbreviation: "nitro drip",
    confusedWith: "nitroglycerin or nitroprusside",
    instead: "the full drug name",
  },
]

export const ISMP_SYMBOLS: readonly string[] = ["\u2125", "\u0292", "\u211e", "\u00b5"]
