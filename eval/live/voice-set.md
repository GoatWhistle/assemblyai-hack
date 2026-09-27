# Human voice set

> The recording script for the first evaluation set spoken by people rather than a
> synthesiser, and what each line tests. It answers one question the synthesised corpora
> cannot: does the gate behave the same when the audio comes from a human mouth in an
> ordinary room. No recording exists yet, so every figure that depends on this set is
> **not measured**.

**Read this if** you are recording the set, or reading a result that claims to come from
human speech · **Related:** [evidence](../../docs/evidence.md) · [limitations](../../docs/limitations.md) ·
[specification](../../docs/specification.md) · [reference data](../../docs/reference-data.md) ·
[evaluation report](../REPORT.md)

---

## Who records, and what is recorded

- Three speakers, `s1`, `s2` and `s3`, each recording with their own consent.
- Synthetic content only. No real patient, no real prescriber, no real prescription. Every
  NPI and DEA number below is invented and passes its checksum.
- 25 lines per speaker, 75 in total. That is small, and the report says so: every figure
  from this set carries its n and a per-speaker row.

## How each file must be made

1. Record one line per file, with half a second of silence before and after. A phone voice
   memo is fine.
2. Read at a natural pace. Do not over-articulate the drug names: the point is ordinary
   speech, not a pronunciation test. A slip stays in; re-record only if the file is cut off.
3. Convert to WAV, 16 kHz, mono, PCM16:
   `ffmpeg -i in.m4a -ac 1 -ar 16000 -sample_fmt s16 out.wav`.
4. Name the file `<speaker>-<line>.wav` with the two-digit line number, for example
   `s2-07.wav`.
5. Put it in `eval/live/audio/`. The directory is not committed (`eval/*/audio/` is ignored).
6. Run `make live-set`. Its "audio files present" line counts the files it found out of 75;
   after one speaker has finished, the count has grown by 25. The manifest now records a sha256 of each file, so a later
   run can prove it used the same audio.

## What each speaker says

Lines 01 to 14 differ by speaker, so that both names of every pair in the curated tier
(`LASA_PAIRS` in [`src/lasa/pairs.ts`](../../src/lasa/pairs.ts)) are spoken, in the order of
that file. Hydromorphone and morphine are spoken by two speakers, because that pair carries
the demo. Lines 15 to 25 are the same for everyone.

### Speaker s1: curated pairs 1 to 7

| Line | Say |
|---|---|
| 01 | Hydromorphone two milligrams per millilitre, one milligram intravenous every four hours as needed. |
| 02 | Morphine two milligrams per millilitre, two milligrams intravenous every four hours as needed. |
| 03 | Hydralazine twenty-five milligrams, by mouth three times a day. |
| 04 | Hydroxyzine twenty-five milligrams, by mouth at bedtime as needed. |
| 05 | Clonidine zero point one milligrams, by mouth twice daily. |
| 06 | Clozapine twenty-five milligrams, by mouth at bedtime. |
| 07 | Metformin five hundred milligrams, by mouth twice daily with meals. |
| 08 | Metronidazole five hundred milligrams, by mouth three times a day for seven days. |
| 09 | Tramadol fifty milligrams, by mouth every six hours as needed. |
| 10 | Trazodone fifty milligrams, by mouth at bedtime. |
| 11 | Diazepam five milligrams, by mouth twice daily as needed. |
| 12 | Diltiazem one hundred twenty milligrams, by mouth once daily. |
| 13 | Cycloserine two hundred fifty milligrams, by mouth twice daily. |
| 14 | Cyclosporine one hundred milligrams, by mouth twice daily. |

### Speaker s2: curated pairs 8 to 14

| Line | Say |
|---|---|
| 01 | Dexamethasone four milligrams, by mouth once daily. |
| 02 | Dexmedetomidine zero point four micrograms per kilogram per hour, intravenous. |
| 03 | Glipizide five milligrams, by mouth once daily before breakfast. |
| 04 | Glyburide five milligrams, by mouth once daily with breakfast. |
| 05 | Amiloride five milligrams, by mouth once daily. |
| 06 | Amlodipine five milligrams, by mouth once daily. |
| 07 | Oxycodone five milligrams, by mouth every six hours as needed. |
| 08 | OxyContin ten milligrams, by mouth every twelve hours. |
| 09 | Rifampin six hundred milligrams, by mouth once daily. |
| 10 | Rifaximin five hundred fifty milligrams, by mouth twice daily. |
| 11 | Clobazam ten milligrams, by mouth twice daily. |
| 12 | Clonazepam half a milligram, by mouth twice daily. |
| 13 | Lamotrigine twenty-five milligrams, by mouth once daily. |
| 14 | Lamivudine one hundred fifty milligrams, by mouth twice daily. |

### Speaker s3: curated pairs 15 to 20, and pair 1 again

| Line | Say |
|---|---|
| 01 | Guaifenesin four hundred milligrams, by mouth every four hours as needed. |
| 02 | Guanfacine one milligram, by mouth at bedtime. |
| 03 | Bupropion one hundred fifty milligrams, by mouth once daily. |
| 04 | Buspirone ten milligrams, by mouth twice daily. |
| 05 | Dobutamine five micrograms per kilogram per minute, intravenous. |
| 06 | Dopamine five micrograms per kilogram per minute, intravenous. |
| 07 | Nifedipine thirty milligrams, by mouth once daily. |
| 08 | Nimodipine sixty milligrams, by mouth every four hours. |
| 09 | Cefazolin one gram, intravenous every eight hours. |
| 10 | Cefotetan one gram, intravenous every twelve hours. |
| 11 | Levothyroxine fifty micrograms, by mouth once daily. |
| 12 | Liothyronine twenty-five micrograms, by mouth once daily. |
| 13 | Hydromorphone four milligrams, by mouth every four hours as needed. |
| 14 | Morphine thirty milligrams, by mouth every four hours as needed. |

### Every speaker: lines 15 to 25

Read identifiers in the groups shown, with the breath a person naturally takes between
groups. The groups are the point: they are what the recognizer's `min_turn_silence` and
`max_turn_silence` have to survive. Say lines 20 to 25 as a reply to the agent having just
read back "hydromorphone 2 mg".

| Line | Kind | Say |
|---|---|---|
| 15 | safe drug | Lisinopril ten milligrams, by mouth once daily. |
| 16 | safe drug | Simvastatin twenty milligrams, by mouth at bedtime. |
| 17 | NPI | My NPI is one two three, four five six, seven eight nine three. |
| 18 | NPI | NPI nine eight seven, six five four, three two one three. |
| 19 | DEA | DEA number A B, one two three, four five six three. |
| 20 | read-back answer | Yes. |
| 21 | read-back answer | Yeah, no. |
| 22 | read-back answer | Yes, but the dose is wrong. |
| 23 | read-back answer | Yes, morphine. |
| 24 | non-command | Thank you. |
| 25 | non-command | Mhm. |

The three identifiers, as digits: NPI `1234567893`, NPI `9876543213`, DEA `AB1234563`.

## What does each line test?

| Lines | What they test | Expected |
|---|---|---|
| 01 to 14 | how often a recognizer turns one name of a pair into the other on human speech | a count, reported even when it is zero |
| 15, 16 | the cost side: a drug on no published list, heard correctly | no contrastive question |
| 15 | lisinopril, the vendor's own example of a drug misheard as bisoprolol | a bisoprolol here is reported |
| 17 to 19 | whether a dictated identifier survives the breaths between digit groups | the whole identifier in one turn |
| 20 to 23 | replies to the read-back | only line 20 confirms |
| 24, 25 | non-commands | never a confirmation |

If lines 01 to 14 produce no mishearing, the product's claim rests on the constructed
mishearings of the synthesised corpora, not on this set.

Neither lisinopril nor simvastatin is in the pair table; `lasaRiskFor` decides this when the
manifest is built, and the manifest records any partner it finds for either. Lisinopril and
bisoprolol are not a published confusion pair
([limitations](../../docs/limitations.md#the-pair-rule-covers-the-2023-ismp-list-and-nothing-else)),
so on line 15 only the ordinary read-back stands between the mishearing and the order.

The pauses between digit groups are measured from the recognizer's word timings and counted
against 400 ms, the value [`scripts/live/live-analysis.ts`](../../scripts/live/live-analysis.ts)
takes as the recognizer's default minimum turn silence.

Line 21 is a negation, line 22 a correction and line 23 names a different drug, so none of
them confirms. A confirmation from line 24 or 25 is a false confirmation, and the report
publishes their count.

## How the code reads this page

This page is the source of the set, not a copy of it. `make live-set`
([`scripts/build/live-set.ts`](../../scripts/build/live-set.ts)) parses the tables above with
`parseVoiceSet` in [`scripts/live/voice-set.ts`](../../scripts/live/voice-set.ts) and writes
[`manifest.json`](manifest.json), recording for each line its expected drug and listed
partners, its expected identifier, or its expected answer, and a sha256 of the audio file
once it exists. [`tests/scripts/live-pipeline.test.ts`](../../tests/scripts/live-pipeline.test.ts)
requires 75 lines, 25 per speaker, identifiers that pass their own checksums, and line 20
as the only line that may confirm.

Keep the shape the parser reads: a `### Speaker sN` heading followed directly by a
two-column table of line and text, and a `### Every speaker` heading followed by a
three-column table of line, kind and text. Any other heading ends a section.

| Command | Bills | What it does |
|---|---|---|
| `make live-set` | no | rebuilds the manifest from this page and the files present |
| `make eval-live` | **yes** | sends the recorded files through the recognizer; refuses when no file is present |
| `make eval-live-keyterms` | **yes** | the same with the LASA names in `keyterms_prompt`, for the ablation arm |
| `make live-report` | no | the stratum, or "not measured" when no run exists |

---

<p align="center"><sub><a href="../../docs/README.md">Documentation index</a> · <a href="../../README.md">Project README</a></sub></p>