# Sources for the figures we quote

Every figure outside our own measurements comes from this table, with the quote it rests
on. Rows were checked on 25 September 2026 against the publisher's own document unless
the row says otherwise. A figure that is not here is not quoted anywhere else. The
evidence that cuts against us is listed alongside the rest.

## The requirement

| Claim | Exact wording | Source |
|---|---|---|
| Aviation read-back | "The flight crew shall read back to the air traffic controller safety-related parts of ATC clearances and instructions which are transmitted by voice." The controller "shall take immediate action to correct any discrepancies revealed by the read-back." | ICAO Annex 11, §3.7.3.1 (flight crew) and §3.7.3.1.2 (controller), 13th edition, as reproduced by EASA (2013): <https://www.easa.europa.eu/en/downloads/21380/en> |
| Clinical read-back, 2009 wording | "For verbal or telephone orders or for telephone reporting of critical test results, the individual giving the order or test result verifies the complete order or test result by having the person receiving the information record and 'read back' the complete order or test result." | Joint Commission, 2009 National Patient Safety Goals, NPSG.02.01.01 (pre-publication text, a third-party copy of the primary document) |
| Where it sat later | "PC 02.01.03, EP 20 … for the receiver of a verbal order to record it and read (not repeat) it back" | ISMP Medication Safety Alert, 18 May 2017: <https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf> |
| Status in 2026 | **Not verified.** The Joint Commission replaced the goals chapter for hospitals on 1 January 2026, and we did not find where read-back sits now. | none |

## The vendor's figures

| Claim | Exact wording or figure | Source |
|---|---|---|
| Entity error rate and word error rate | "Entity error rate 15.31%"; "a market-leading pooled word error rate of 6.99%" | AssemblyAI, *Universal-3.5 Pro Realtime*, 23 June 2026: <https://www.assemblyai.com/blog/universal-3-5-pro-realtime> |
| Entity errors on names | "Names 16.92%", the benchmark's names category (not drug names specifically) | the same page |
| The chain | "A conversation isn't one transcription. It's a chain of them." | AssemblyAI, *The Voice Agent Accuracy Problem Nobody Benchmarks*, 8 September 2026: <https://www.assemblyai.com/blog/voice-agent-accuracy-problem-benchmarks> |
| The lisinopril example | "A patient states an allergy to Lisinopril. The transcript reads Bisoprolol." | the same article |
| Five turns without confirmation | "At 84.69% per turn it comes through clean 43.6% of the time." | the same article |
| Five turns with read-back | "If your agent reads back every entity and the caller catches errors 70% of the time, the effective per-turn rate rises to about 95.4%"; "Across five turns that's 79.1% versus 44.0%". A projection under an assumed catch rate, not a measurement | the same article |

## The error class

| Claim | Figure | Source |
|---|---|---|
| Share of medication errors from LASA names | "estimated to be responsible for 6.2–14.7% of all medication errors" | WHO, *Medication Safety for Look-Alike, Sound-Alike Medicines*, 2023: <https://iris.who.int/server/api/core/bitstreams/5a2f5a2c-e95c-45b8-ad44-f15c9351f9f1/content> |
| FDA's share of **reported** errors | "about 10 percent of all medication errors reported result from drug name confusion" | FDA Consumer, 2005, archived copy: <https://permanent.access.gpo.gov/lps1609/www.fda.gov/fdac/features/2005/405_confusion.html> |
| Hydromorphone and morphine are a published pair | The row "HYDROmorphone / morphine" | ISMP List of Confused Drug Names, 2023: <https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf> |
| The same pair misheard in a verbal order | "HYDROmorphone heard as morphine", among other examples in Table 2 | ISMP, 18 May 2017, as above |
| How often practitioners read back | 45% of respondents read back less than half the time, 9% never | ISMP, 18 May 2017, as above (survey, n ≈ 2,164) |
| Errors from mishearing | "Fourteen percent of respondents were aware of an error that occurred in the past year due to mishearing" | ISMP, 18 May 2017, as above |
| How community pharmacies receive verbal orders | telephone 96%, voicemail 79% | ISMP, 18 May 2017, as above |

## Evidence against us

| Claim | Figure | Source |
|---|---|---|
| Verbal orders had **fewer** errors than written ones in one hospital | verbal 2.6 per 1,000 orders; handwritten 8.5; computer-entered 6.3 | West et al., *Arch Pediatr Adolesc Med*, 1994, one children's hospital over three months: <https://pubmed.ncbi.nlm.nih.gov/7951816> |

This study does not say verbal orders are safe. It says that in one setting, with trained
staff, their error rate was lower than that of handwriting, and it is the strongest reason
not to claim that phoned-in orders are the most error-prone channel. We do not claim that.
Our claim is narrower: when a sound-alike name is misheard, recognizer confidence does not
reveal it.

## Cost

| Claim | Figure | Source |
|---|---|---|
| Cost of one preventable adverse drug event in hospital | $4,685 (the dollar year is not stated in the abstract) | Bates et al., *JAMA*, 1997: <https://pubmed.ncbi.nlm.nih.gov/9002493> |
| The same, as later estimated by the IOM | about $8,750 per event **in 2006 dollars**; $3.5 billion a year across an assumed 400,000 events | Institute of Medicine, *Preventing Medication Errors*, report brief, July 2006: <https://nap.nationalacademies.org/resource/11623/medicationerrorsnew.pdf> |

## Not found

- **How many US prescriptions are phoned in.** No credible source found. E-prescribing
  reached 94% of prescriptions by Surescripts' 2022 count, but phone, fax and paper are
  not reported separately, so the rest cannot be read as a phone share.
- **A documented lisinopril and bisoprolol mix-up.** None found, and the pair is not on
  the ISMP list. See the README's section on withdrawn claims.
- **"One in four medication errors is a name confusion."** A figure often attributed to
  WHO's 2007 solution on LASA names. It is not in that document, which we read in full.
