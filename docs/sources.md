# Sources

> Every outside rule and figure this project rests on, with the exact wording and a link to
> the publisher's document. The evidence that cuts against the product is listed alongside the
> rest. The vendor's prices are quoted in [cost and budget](cost-and-budget.md).

**Read this if** you want to check a quoted figure or wording against its origin ·
**Related:** [evidence](evidence.md) · [limitations](limitations.md) · [product](product.md)

Every row with a link was checked against the linked document itself; the two rows without
one say why. Dates in the source column are publication dates or editions.

---

## What requires read-back?

| Claim | Exact wording | Source |
|---|---|---|
| Aviation read-back, flight crew | "The flight crew shall read back to the air traffic controller safety-related parts of ATC clearances and instructions which are transmitted by voice." | ICAO Annex 11, §3.7.3.1, Thirteenth Edition, as reproduced in EASA's Annex 11 checklist: <https://www.easa.europa.eu/en/downloads/21380/en> |
| Aviation read-back, controller | The controller "shall take immediate action to correct any discrepancies revealed by the read-back." | the same document, §3.7.3.1.2 |
| Clinical read-back, 2009 wording | "For verbal or telephone orders or for telephone reporting of critical test results, the individual giving the order or test result verifies the complete order or test result by having the person receiving the information record and 'read back' the complete order or test result." | Joint Commission, 2009 National Patient Safety Goals, NPSG.02.01.01 (pre-publication text, from a third-party copy of the primary document; no stable public link) |
| Where it sat later | "(PC 02.01.03, EP 20) for the receiver of a verbal order to record it and read (not repeat) it back to the prescriber" | ISMP Medication Safety Alert, 18 May 2017: <https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf> |
| Where it sits in 2026 | **Not verified.** The Joint Commission restructured the goals chapter for hospitals for 2026, and where read-back sits now is not established. | none |

## What does the vendor publish about recognition errors?

These are AssemblyAI's own figures. None is re-measured here; the project's own measurements
are in [eval/REPORT.md](../eval/REPORT.md).

| Claim | Exact wording or figure | Source |
|---|---|---|
| Entity error rate and word error rate | "Entity error rate 15.31%"; "Universal-3.5 Pro Realtime posts a market-leading pooled word error rate of 6.99%" | AssemblyAI, *Universal-3.5 Pro Realtime*, 23 June 2026: <https://www.assemblyai.com/blog/universal-3-5-pro-realtime> |
| Entity errors on names | "Names 16.92%", the benchmark's names category (not drug names specifically) | the same page |
| The chain | "A conversation isn't one transcription. It's a chain of them." | AssemblyAI, *The Voice Agent Accuracy Problem Nobody Benchmarks*, 8 September 2026: <https://www.assemblyai.com/blog/voice-agent-accuracy-problem-benchmarks> |
| The lisinopril example | "A patient states an allergy to Lisinopril. The transcript reads Bisoprolol." | the same article |
| Five turns without confirmation | "At 84.69% per turn it comes through clean 43.6% of the time." | the same article |
| Per turn with read-back | "If your agent reads back every entity and the caller catches errors 70% of the time, the effective per-turn rate rises to about 95.4%" | the same article |
| Five turns with read-back | "Across five turns that's 79.1% versus 44.0%": 79.1% for the model above, 44.0% for a weaker second model (84.9% per turn with read-back), both with read-back | the same article |

The last two rows are the vendor's projection under an assumed catch rate, not a measurement.
Its weak point is the caller: it assumes a person who hears a wrong value read back catches it
seven times in ten. A caller who hears "morphine, correct?" and says "yes" out of habit is how
that assumption fails, and it is the case this product is built around.

## How large is the error class?

| Claim | Figure or wording | Source |
|---|---|---|
| Share of medication errors from LASA names | "LASA errors are estimated to be responsible for 6.2–14.7% of all medication errors" | WHO, *Medication Safety for Look-Alike, Sound-Alike Medicines*, 2023: <https://iris.who.int/server/api/core/bitstreams/5a2f5a2c-e95c-45b8-ad44-f15c9351f9f1/content> |
| FDA's share of **reported** errors | "The FDA says that about 10 percent of all medication errors reported result from drug name confusion." | *FDA Consumer*, July-August 2005, *Drug Name Confusion: Preventing Medication Errors*, archived copy: <https://permanent.access.gpo.gov/lps1609/www.fda.gov/fdac/features/2005/405_confusion.html> |
| Hydromorphone and morphine are a published pair | The row "HYDROmorphone / morphine" | ISMP List of Confused Drug Names, updated through February 2023: <https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf>; `data/lasa-pairs.json` records the sha256 of the PDF it was parsed from, and it matches the PDF at that link |
| The same pair misheard in a verbal order | "A nurse misheard a verbal physician's order for HYDROmorphone as morphine.", among the misheard sound-alike examples in Table 2 | ISMP, 18 May 2017, as above |
| How often practitioners read back | "nearly half (45%) of all respondents who reported receiving telephone or spoken orders told us they do this less than 50% of the time" | ISMP, 18 May 2017, as above; a survey completed by 1,622 practitioners |
| How many never read back | "9% indicated they never carry out this important verification process" | the same survey |
| Errors from verbal orders | "Fourteen percent of respondents were aware of an error that occurred in the past year due to mishearing, misunderstanding, or incorrectly transcribing verbal orders." Mishearing is not reported separately | the same survey |
| How community pharmacies receive verbal orders | "In community pharmacies, telephone (96%) and voicemail (79%) were the primary modes of communicating verbal orders." | ISMP, 18 May 2017, as above |

## What evidence cuts against the product?

| Claim | Figure | Source |
|---|---|---|
| Verbal orders had **fewer** errors than written ones in one hospital | verbal 2.6 per 1,000 orders; handwritten 8.5; computer-entered 6.3 | West et al., *Arch Pediatr Adolesc Med*, 1994, one children's hospital over three months: <https://pubmed.ncbi.nlm.nih.gov/7951816> |

This study does not say verbal orders are safe. It says that in one setting their error rate
was lower than that of handwriting, and it is the strongest reason not to claim that phoned-in
orders are the most error-prone channel. That claim is not made. The claim here is narrower:
when a sound-alike name is misheard, recognizer confidence does not reveal it.

## What does a medication error cost?

| Claim | Figure | Source |
|---|---|---|
| Cost of one preventable adverse drug event in hospital | $4,685 (the dollar year is not stated in the abstract) | Bates et al., *JAMA*, 1997: <https://pubmed.ncbi.nlm.nih.gov/9002493> |
| The same kind of cost, as restated by the IOM | "One study found that each preventable ADE that took place in a hospital added about $8,750 (in 2006 dollars) to the cost of the hospital stay"; $3.5 billion a year across an assumed 400,000 events | Institute of Medicine, *Preventing Medication Errors*, report brief, July 2006: <https://nap.nationalacademies.org/resource/11623/medicationerrorsnew.pdf> |

## What could not be sourced?

- **How many US prescriptions are phoned in.** No credible source found. Surescripts publishes
  an e-prescribing share, but phone, fax and paper are not reported separately, so the rest
  cannot be read as a phone share.
- **A documented lisinopril and bisoprolol mix-up.** None found, and neither name is on the
  2023 ISMP list. The pair is AssemblyAI's own example of a mishearing, not a published
  confusion pair ([limitations](limitations.md#the-pair-rule-covers-the-2023-ismp-list-and-nothing-else)).
- **"One in four medication errors is a name confusion."** A figure often attributed to WHO's
  2007 solution on LASA names. It is not in that document.
- **A penalty or sanction figure** for a Joint Commission lapse or a 21 CFR 1306.12(a)
  violation. None verified against a primary source, so none is quoted
  ([limitations](limitations.md#the-regulatory-citations-and-what-we-have-not-sourced-about-them)).

---

<p align="center"><sub><a href="README.md">Documentation index</a> · <a href="../README.md">Project README</a></sub></p>