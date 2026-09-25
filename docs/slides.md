# Readback: slide contents

Generated from `src/features/deck/slides.ts` by `make deck-markdown`; edit the deck, not
this file. The printable deck is the `/deck` page, and the PDF is printed from it. Every
figure carries its source; figures without a source do not reach the PDF.

---

## 1. Readback

A voice agent that takes a prescription over the phone and proves it did not mishear.

A technology demonstration, not a medical device. Synthetic data only.

---

## 2. The problem, in the vendor's own numbers

For Universal-3.5 Pro Realtime, AssemblyAI publishes an Entity Error Rate of 15.31% at a WER of 6.99%, and 16.92% in the benchmark's names category.

Then it multiplies: at 84.69% entity capture per turn, a five-turn conversation comes through clean 43.6% of the time. If every entity is read back and the caller catches 70% of errors, 79.1%: the vendor's projection, not a measurement.

These are not our measurements, they are the vendor's benchmark. The problem exists before us.

Source: AssemblyAI, Universal-3.5 Pro Realtime (23 June 2026) and The Voice Agent Accuracy Problem Nobody Benchmarks (8 September 2026); not measured by us

---

## 3. What exactly breaks

The recognizer can be certain and wrong at the same time.

Suppose the prescriber says hydromorphone and the recognizer returns morphine at confidence 1.0, the case our synthesised replay stages. Both drugs exist and pass the catalogue check, and ISMP's 2017 survey reports exactly this mishearing between people.

A confidence threshold does not save you here: the confidence is high. A plain read-back does not either: a caller who hears morphine read back can say yes by reflex. What saves you is a published list of confused names and a question the caller can only answer with a name.

Source: the synthesised replay at /demo (not a recorded recognizer output); ISMP List of Confused Drug Names, 2023

---

## 4. The product thesis

High recognizer confidence does not protect against homophony.

So a drug name on the 2023 ISMP List of Confused Drug Names, 514 pairs parsed from the published list, triggers a mandatory re-ask even at confidence 1.0.

The re-ask is contrastive: the agent names the drug it heard and every drug the list pairs with it, and only a spoken name answers it. A yes is not counted, and naming a partner corrects the value.

This is not a threshold and not a heuristic. It is the order of the branches in the code: the pair check is read before the confidence check.

Source: branch order in src/gate/decide.ts; ismpPairCount() in src/lasa

---

## 5. Three reasons to re-ask, and they are not interchangeable

Confidence below the field's threshold.

Failure of an independent validator.

Membership in a pair of similar names, which fires regardless of confidence.

The third reason is the product. Collapsing it into the first destroys the idea.

---

## 6. An invariant, not a policy

A value cannot reach the order around the gate. ConfirmedValue is a branded type, the brand symbol is private to its module, and there is exactly one type assertion in the whole repository, inside gate/confirm().

So "the LLM decided it was fine" cannot write a value: there is no code path.

make gate-invariant fails if a second assertion appears, if this one disappears, or if a double type assertion through unknown shows up.

---

## 7. The demo: two arms, one rule apart

The same synthesised case plays in both arms at /demo: the prescriber says hydromorphone, the recognizer returns morphine at confidence 1.0. Both arms run the shipped policy, so both read the drug name back.

Pair rule off: the agent asks "Confirming the drug name: morphine. Correct?", the caller says yes, and morphine is ordered.

Pair rule on: the agent asks "Which: morphine, M-O-R, or hydromorphone, H-Y-D? Answer with a name." A yes is refused as E_LASA_NAMED_ANSWER_REQUIRED. The caller has to say a name, says hydromorphone, and hydromorphone is ordered.

The arms differ by one policy flag, lasaChecked, and by nothing else.

Source: the synthesised replay at /demo (not a recorded recognizer output); withoutPairRule in src/domain

---

## 8. What was measured: the recognizer is sometimes certain and wrong

40 utterances, rare names chosen before the measurement.

Said vinorelbine, heard venorelbine, confidence 0.981.

Said glycopyrronium, heard glycopyrrhonium, confidence 0.955.

A threshold of 0.95 would have accepted both. Entity Error Rate 27.5% [16.1%, 42.8%], Wilson interval.

Source: make eval-control, 40 utterances

---

## 9. What was measured: which mechanism pays for what

80 recorded utterances, 21 recognition errors.

Absence from the catalogue: 21 of 21 errors caught, 0 of 59 correct values asked about.

Pair rule: 0 of 21 errors caught, 21 of 59 correct values given a contrastive question, because the rare names of this corpus sit on the full ISMP list.

Correct drug names asked about by the shipped gate: 59 of 59, because every drug name is read back once by policy; the threshold and the pair rule change which question is asked, not whether one is.

Source: make coverage-matrix, 80 recorded utterances

---

## 10. The cost of the idea is published next to the benefit

The shipped gate reads every drug name back, so the question is not whether it asks but what a yes can write.

Without the pair rule a reflex yes writes 20 of 20 pair mishearings; with it, 0. The same candidates, the same read-back, one flag apart.

The price is a longer question on correct values whose name is on the list. It is published beside the catches, because publishing only the catches would make the metric one-sided.

Source: make ab-gate, 40 candidates: 20 correct, 20 misheard

---

## 11. We threw away our own flattering numbers

The first measurement gave an EER of 52.5%. Before publishing it we checked the socket close codes: all 21 failures closed with code 1008, all 19 successes with 1000. The measurement measured the new-session rate limiter, not the recognizer. After spacing the runs 24 s apart, no errors were left.

Separately: the claim that NPI and DEA are equally checkable turned out to be true for NPI and false by 4.8% for DEA, over an exhaustive enumeration of 32,080 mutations. The policy did not change; the claim was corrected.

Source: the discarded pass and its close codes in eval/REPORT.md; make audit-checksums, 32,080 mutations

---

## 12. The gate refused to confirm a federally impossible order

deaSchedule sat in the data for 193 drugs and was read by nobody. Morphine sulfate with five refills was accepted with a green verdict.

Under 21 CFR 1306.12(a), refilling a Schedule II drug is prohibited. Now the gate refuses it and hands the agent a line that cites the regulation, and it does not ask you to spell it out, because this is a prohibition, not a typo.

This is worse than a mishearing: a misheard value looks uncertain, whereas an order like that looked proven.

Source: data/catalog.json as counted in eval/REPORT.md; 21 CFR 1306.12(a)

---

## 13. Who the buyer is

Primary: pharmacy chains and prescription delivery services that take orders by voice. Compliance pays for this, not convenience.

Secondary: telemedicine and insurer call centres, where voice prescription intake already exists and proof of intake does not.

The purchaser is not the technology procurement department but whoever owns the regulatory risk.

---

## 14. Why the budget exists

Read-back is not our idea and not an option. It is a procedure the regulator already requires: ICAO Annex 11 §3.7.3.1 for flight crews, Joint Commission NPSG since 2003 for verbal orders and critical results.

We automate a step that regulation requires and practice routinely skips.

A regulatory requirement is a mandatory budget, not a buyer to be convinced.

Source: ICAO Annex 11 §3.7.3.1; Joint Commission National Patient Safety Goals

---

## 15. Market

The unit of the market is a prescription intake workstation, not an abstract volume: every pharmacy and every delivery service that takes a prescription by voice has a finite number of them, and each one falls under the read-back requirement.

SAM is those already deploying voice agents into intake. Several dozen teams at this hackathon are building voice intake for healthcare right now, and none we found checks for homophony.

We publish no TAM estimate in money, because we did not measure it, and a project rule forbids a figure without a method and a set size. Everything we did measure sits in eval/REPORT.md with a command above every line.

---

## 16. Revenue model

Per workstation: a pharmacy intake line, a subscription.

Per verified field: the volume component. It grows with use, and it is easy to set against the cost of a single dispensing error.

A compliance report: the provenance of every field, with source words, timecodes and the validator's verdict, is already an audit artefact. That is what regulatory risk buys.

---

## 17. What makes this different

Voice agents for medical intake are not a new idea, and there are several at this hackathon. Some use the same two AssemblyAI sockets and likewise keep the model from writing a value directly.

The difference is what overrides certainty. The gates we found fire on low confidence, a failed validator, or a value missing from a known set. A confidently pronounced wrong drug that exists in the catalogue passes all three.

Here a published sound-alike list overrides confidence 1.0: a drug name in a published LASA pair is re-asked even when the recognizer is certain and the drug is valid, and the re-ask has to be answered with the name, not a yes.

Source: branch order in src/gate/decide.ts

---

## 18. What a judge can check for themselves in a minute

With no key, in one command: make honest reproduces every offline measurement it lists, each above the command that produced it and the size of its set. Not a single network call.

In the browser: the attack console at /how-it-works. Lower the threshold to zero and get E_LASA_HIT, and see for yourself that the pair check is read before the threshold.

Mechanically: make gate-mutation breaks one gate branch at a time and requires exactly the named test to fail. 12 of 12.

Source: make gate-mutation, as recorded in eval/REPORT.md

---

## 19. Honest limitations

Provenance is computed in the browser. The browser holds the recognizer socket, word timings never pass through our server, so this is client-supplied data. Doing it otherwise means bringing back the always-on host we deliberately removed.

The corpus is synthesised. We found no open English corpus of human speech reading drug names.

The product rule is the full 2023 ISMP list, 514 pairs parsed from the PDF with the page and row of each kept. The 20 curated pairs, each checked by hand against its row, are the evaluation core and the demo.

Some lines in the report honestly read "not measured": everything that requires a live agent socket.

Source: LASA_PAIRS in src/lasa/pairs.ts

---

## 20. Next

Immediately: turn-to-turn latency on a live deployment, the only block of measurements that cannot be obtained offline.

Then: human voices from three team members (make eval-live), and a second run of one set for reproducibility (make eval-repeat).

Product-wise: the pair rule already applies to every published pair, and its cost on correct values is measured. A pair we derived ourselves still does not go into the table of published ones.

---

## 21. Conclusion

We do not claim to recognize speech better. We claim that we know when we have no right to write down what we heard, and we prove it on our own data.

12 of 12 gate mutations are killed by their own tests.

Two of our own checks we bypassed and fixed ourselves: the gate invariant let through an angle-bracket cast, and the key check let through a directory named api at any depth. Both were green until they were attacked.

Every figure in the report carries its command and its set size. Numbers without a method we do not publish.

Source: make gate-mutation, as recorded in eval/REPORT.md
