# Readback — slide contents

The source for the mandatory PDF. One section = one slide. Two or three sentences per
slide, as the Pro Tips require. Every figure carries its source; figures without a
source do not reach the PDF.

The owner assembles the PDF. The numbering is for assembly; it does not need to be
printed on the slides.

---

## 1. Title

**Readback**

A voice agent that takes a prescription over the phone and proves it did not mishear.

A technology demonstration, not a medical device. Synthetic data only.

---

## 2. The problem, in the vendor's own numbers

For Universal-3.5 Pro Realtime AssemblyAI publishes an **Entity Error Rate of 15.31%**
at a WER of 6.99%, and **16.92%** errors on proper nouns — and a drug name is a proper
noun.

Then it multiplies: at 84.69% entity capture per turn, a five-turn task succeeds
**43.6%** of the time. With confirmation steps — **79.1%**.

These are not our measurements, they are the vendor's benchmark. The problem exists
before us.

---

## 3. What exactly breaks

The recogniser can be **certain and wrong at the same time**.

The human said *Lisinopril* — an antihypertensive. The model returned *Bisoprolol* — a
beta blocker. Confidence 1.0. Both drugs exist, both pass the catalogue check, both
sound alike.

A confidence threshold does not save you here: the confidence is high. What saves you
is a regulator-published list of similar names.

---

## 4. The product thesis

**High recogniser confidence does not protect against homophony.**

So a drug name that belongs to a published ISMP or FDA pair triggers a mandatory
re-ask **even at confidence 1.0**.

This is not a threshold and not a heuristic. It is the order of the branches in the
code: the pair check is read before the confidence check.

---

## 5. Three reasons to re-ask, and they are not interchangeable

1. Confidence below the field's threshold.
2. Failure of an independent validator.
3. Membership in a pair of similar names — **fires regardless of confidence**.

The third reason is the product. Collapsing it into the first destroys the idea.

---

## 6. An invariant, not a policy

A value cannot reach the order around the gate. `ConfirmedValue` is a branded type, the
brand symbol is private to its module, and there is **exactly one type assertion in the
whole repository**, inside `gate/confirm()`.

So "the LLM decided it was fine" cannot write a value: there is no code path.

`make gate-invariant` fails if a second assertion appears, if this one disappears, or if
a double `as unknown as` shows up.

---

## 7. What was measured: the recogniser is sometimes certain and wrong

`make eval-control`, 40 utterances, rare names chosen before the measurement.

| Said | Heard | Confidence |
|---|---|---|
| vinorelbine | venorelbine | 0.981 |
| glycopyrronium | glycopyrrhonium | 0.955 |

A threshold of 0.95 would have accepted both. Entity Error Rate
**27.5% [16.1%, 42.8%]**, Wilson interval.

---

## 8. What was measured: which mechanism pays for what

`make coverage-matrix`, 80 recorded utterances, 21 recognition errors.

| Mechanism | Errors caught | Needless questions |
|---|---|---|
| absence from the catalogue | **21 / 21** | **0 / 59** |
| confidence threshold | 0 / 21 | **16 / 59** |

Every needless question in the system is paid for by the confidence threshold. The
mechanism that catches things costs not a single one.

---

## 9. The cost of the idea is published next to the benefit

False-ask rate — how often the agent re-asked when the value was already right.

With the gate on, **40.0%**; with it off, **40.0%** (`make ab-gate`, 20 candidates).
The pair check adds not one needless question, and it catches mishearings that the
threshold accepted at confidences up to 1.00.

Publishing only the catches would make the metric one-sided.

---

## 10. We threw away our own flattering numbers

The first measurement gave an EER of 52.5%. Before publishing it we checked the socket
close codes: all 21 failures closed with code **1008**, all 19 successes with 1000. The
measurement measured the session limit, not the recogniser. After spacing the runs 24 s
apart, no errors were left.

Separately: the claim that "NPI and DEA are equally checkable" turned out to be true for
NPI and **false by 4.8% for DEA** — an exhaustive enumeration of 30,600 mutations. The
policy did not change; the claim was corrected.

---

## 11. The gate refused to confirm a federally impossible order

`deaSchedule` sat in the data for 193 drugs and **was read by nobody**. `morphine
sulfate` with five refills was accepted with a green verdict.

Under 21 CFR 1306.12(a), refilling a Schedule II drug is prohibited. Now the agent says
so and cites the regulation — and it does not ask you to "spell it out", because this is
a prohibition, not a typo.

This is worse than a mishearing: a misheard value looks uncertain, whereas an order like
that looked proven.

---

## 12. Who the buyer is

**Primary: pharmacy chains and prescription delivery services** that take orders by
voice. Compliance pays for this, not convenience.

**Secondary: telemedicine and insurer call centres**, where voice prescription intake
already exists and proof of intake does not.

The purchaser is not the technology procurement department but whoever owns the
regulatory risk.

---

## 13. Why the budget exists

Read-back is not our idea and not an option. It is a procedure the regulator **already
requires**: ICAO Annex 11 §3.7.3 for flight crews, Joint Commission NPSG since 2003 for
verbal orders and critical results.

We automate a step that regulation requires and practice routinely skips.

**A regulatory requirement is a mandatory budget, not a buyer to be convinced.**

---

## 14. Market

**The unit of the market is a prescription intake workstation**, not an abstract volume:
every pharmacy and every delivery service that takes a prescription by voice has a
finite number of them, and each one falls under the read-back requirement.

**SAM is those already deploying voice agents into intake.** This hackathon is itself
proof that the demand exists: several dozen teams are building voice intake for
healthcare right now, and not one checks for homophony.

**A caveat we make ourselves, and it matters more than the figure:** we publish no TAM
estimate in money. We have no number of the "an $X billion market" kind, because we did
not measure it, and a project rule forbids a figure without a method and a set size.
Everything we did measure ourselves sits in `eval/REPORT.md` with a command above every
line. Mixing those two kinds of number in one PDF would devalue the second kind.

---

## 15. Revenue model

**Per workstation** — a pharmacy intake line, a subscription.

**Per verified field** — the volume component, it grows with use, and it is easy to set
against the cost of a single dispensing error.

**A compliance report** — the provenance of every field, with source words, timecodes
and the validator's verdict, is already an audit artefact. That is what regulatory risk
buys.

---

## 16. Competitors and what makes us different

Voice agents for medical intake are not a new idea, and there are several at this
hackathon. The closest ones use the same two AssemblyAI sockets and likewise do not let
the agent write a value directly.

**There is one difference and it is substantial: their gates fire on low confidence.** A
confidently pronounced wrong drug passes straight through.

Of the field we checked, nobody uses LASA lists, nobody re-asks at confidence 1.0 and
nobody measures Entity Error Rate.

---

## 17. What a judge can check for themselves in a minute

**With no key, in one command:** `make honest` prints thirteen measurements, each above
the command that produced it and the size of its set. Not a single network call.

**In the browser:** the attack console at `/how-it-works`. The judge lowers the threshold
to zero and gets `E_LASA_HIT` — discovering for themselves that the pair check is read
before the threshold.

**Mechanically:** `make gate-mutation` breaks one gate branch at a time and requires
exactly the named test to fail. 11 of 11.

---

## 18. Honest limitations

**Provenance is computed in the browser.** The browser holds the STT socket, `words[]`
never passes through our server, so this is client-supplied data. For a demonstration it
does not matter; doing it otherwise means bringing back the always-on host we
deliberately removed.

**The corpus is synthesised.** No open corpus of human speech containing drug names
exists.

**The LASA table holds 20 curated pairs.** The ISMP list moved to ECRI and no longer
sits at a stable public URL. Coverage is partial and unmeasured.

**Some lines in the report honestly read "not measured"** — everything that requires a
live agent socket.

---

## 19. Next

**Immediately:** turn-to-turn latency on a live deployment — the only block of
measurements that cannot be obtained offline.

**Then:** open the sealed held-out set against the pre-registered hypothesis about
rarity. The seal is machine-enforced; `make heldout-seal` fails if the set changed.

**Product-wise:** expanding the pair table remains a question of access to the source,
not of code. A pair we derived ourselves does not go into the table of published ones —
otherwise the mechanism stops being independent of our own guesses.

---

## 20. Conclusion

We do not claim to recognise speech better. We claim that we **know when we have no
right to write down what we heard**, and we prove it on our own data.

1361 tests, 23 steps in `make verify` of which 17 run a dedicated check script, 11 of 11 gate
mutations killed by their own tests.

Two of those checks we **bypassed and fixed ourselves**: the gate invariant let through
an angle-bracket cast `<ConfirmedValue>`, and the key check let through a directory named
`api` at any depth. Both were green until they were attacked.

Every figure in the report carries its command and its set size. Numbers without a method
we do not publish.
