# Human voice set: recording script

The evaluation corpus is spoken by TTS, and every fixture is synthesised. This set is the
first one spoken by people. It exists to answer one question the TTS corpus cannot: does
the gate behave the same when the audio comes from a human mouth in an ordinary room.

## Who records, and what is recorded

- Three speakers, all members of the team, each recording with their own consent.
- Synthetic content only. No real patient, no real prescriber, no real prescription. Every
  NPI and DEA number below is invented and passes its checksum by construction.
- 25 utterances per speaker, 75 in total. That is small, and the report says so: every
  figure from this set carries its n and a per-speaker row.

## Format

- WAV, 16 kHz, mono, PCM16. A phone voice memo converted with
  `ffmpeg -i in.m4a -ac 1 -ar 16000 -sample_fmt s16 out.wav` is fine.
- One utterance per file, half a second of silence before and after.
- File name: `<speaker>-<line>.wav`, where `<speaker>` is `s1`, `s2` or `s3` and `<line>` is
  the two-digit line number below, for example `s2-07.wav`.
- Files go to `eval/live/audio/`, which is not committed. The manifest records a sha256 of
  each file so a later run can prove it used the same audio.
- Read at a natural pace. Do not over-articulate the drug names: the point is ordinary
  speech, not a pronunciation test. A mistake stays in; re-record only if the file is cut off.

## Lines

Lines 01 to 14 differ by speaker, so that all 20 curated LASA pairs are spoken from both
sides. Hydromorphone and morphine are spoken by two speakers, because that pair carries the
demo. Lines 15 to 25 are the same for everyone.

### Speaker s1: pairs 1 to 7

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

### Speaker s2: pairs 8 to 14

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
| 10 | Rifabutin three hundred milligrams, by mouth once daily. |
| 11 | Clobazam ten milligrams, by mouth twice daily. |
| 12 | Clonazepam half a milligram, by mouth twice daily. |
| 13 | Lamotrigine twenty-five milligrams, by mouth once daily. |
| 14 | Lamivudine one hundred fifty milligrams, by mouth twice daily. |

### Speaker s3: pairs 15 to 20, and pair 1 again

| Line | Say |
|---|---|
| 01 | Guaifenesin four hundred milligrams, by mouth every four hours as needed. |
| 02 | Guanfacine one milligram, by mouth at bedtime. |
| 03 | Buprenorphine eight milligrams, under the tongue once daily. |
| 04 | Bupropion one hundred fifty milligrams, by mouth once daily. |
| 05 | Dobutamine five micrograms per kilogram per minute, intravenous. |
| 06 | Dopamine five micrograms per kilogram per minute, intravenous. |
| 07 | Nifedipine thirty milligrams, by mouth once daily. |
| 08 | Nimodipine sixty milligrams, by mouth every four hours. |
| 09 | Cefazolin one gram, intravenous every eight hours. |
| 10 | Cefotetan one gram, intravenous every twelve hours. |
| 11 | Levothyroxine fifty micrograms, by mouth once daily. |
| 12 | Levetiracetam five hundred milligrams, by mouth twice daily. |
| 13 | Hydromorphone four milligrams, by mouth every four hours as needed. |
| 14 | Morphine thirty milligrams, by mouth every four hours as needed. |

### Every speaker: lines 15 to 25

Identifiers are read in the groups shown, with the breath a person naturally takes
between groups. The groups are the point: they are what `min_turn_silence` and
`max_turn_silence` have to survive.

| Line | Kind | Say |
|---|---|---|
| 15 | safe drug | Lisinopril ten milligrams, by mouth once daily. |
| 16 | safe drug | Atorvastatin twenty milligrams, by mouth at bedtime. |
| 17 | NPI | My NPI is one two three, four five six, seven eight nine three. |
| 18 | NPI | NPI nine eight seven, six five four, three two one three. |
| 19 | DEA | DEA number A B, one two three, four five six three. |
| 20 | read-back answer | Yes. |
| 21 | read-back answer | Yeah, no. |
| 22 | read-back answer | Yes, but the dose is wrong. |
| 23 | read-back answer | Yes, morphine. |
| 24 | non-command | Thank you. |
| 25 | non-command | Mhm. |

## What each line tests

- Lines 01 to 14 measure natural LASA mishearings: how often a recognizer turns one side
  of a pair into the other on human speech. If the count is zero, the report says zero,
  and the claim of the product rests on the adversarial corpus rather than on this set.
- Lines 15 and 16 are the false-ask side: a safe, correctly heard drug should pass
  without a re-ask.
- Line 15 is lisinopril on purpose. It is AssemblyAI's own example of a drug misheard as
  bisoprolol, and the pair is on no published list, so the pair rule does not guard it.
  If a recognizer turns it into bisoprolol here, the report says so, and only the
  read-back stood in the way.
- Lines 17 to 19 give the pause distribution between digit groups (E8) and check that a
  dictated identifier is not cut in half at the first breath.
- Lines 20 to 23 are answers to a read-back. Only line 20 may ever count as a
  confirmation. Line 23 is a rejection whenever the read-back named hydromorphone.
- Lines 24 and 25 are non-commands. A confirmation from either is a false confirmation,
  and the report publishes the count.

## Valid identifiers used above

Invented for this set; each passes its checksum:

| Kind | Value |
|---|---|
| NPI | 1234567893 |
| NPI | 9876543213 |
| DEA | AB1234563 |
