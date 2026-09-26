# Reference data

> The public data the product validates against, how each source is built into `data/`,
> and what the arithmetic identifiers prove. Two sources are read by the product: the FDA
> NDC Directory, built into `data/catalog.json`, and the ISMP List of Confused Drug Names,
> built into `data/lasa-pairs.json`. Both are built ahead of time by `make data` and never
> fetched at runtime, and an NDC has no check digit, so a drug is proved by existence and
> combination, never by arithmetic.

**Read this if** you are rebuilding `data/`, adding a validator, or checking where a rule's
source comes from · **Related:** [specification](specification.md) · [product](product.md) ·
[sources](sources.md) · [limitations](limitations.md)

---

## A checkable domain proves an error without a human label

An entity with a built-in checksum lets a recognition error be proved objectively: if the
recognized string fails its validator, that is a machine-checkable fact. Pharmacy has two
such entities (NPI and DEA), a public catalogue for the rest, and a regulator-published
list of the names that are confused in practice.

## Which sources does the product read?

| Source | Licence | Built into, by | Read at runtime by |
|---|---|---|---|
| [FDA NDC Directory](https://www.accessdata.fda.gov/cder/ndctext.zip), `product.txt` | public domain (US government) | `data/catalog.json`, by `scripts/build/ndc.ts` | `src/catalog/` |
| [ISMP List of Confused Drug Names](https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf), updated through February 2023 | ISMP publication | `data/lasa-pairs.json`, by `scripts/build/lasa.ts` | `src/lasa/` |
| [ISMP List of Error-Prone Abbreviations](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf), 2024-04 | ISMP publication | `ISMP_DO_NOT_USE`, transcribed by hand | [`src/validators/sig-abbreviations.ts`](../src/validators/sig-abbreviations.ts) |

`make data` runs `scripts/build/ndc.ts` and `scripts/build/lasa.ts`, then
`scripts/build/stitch-lasa.ts`, which writes nothing and reports how many curated names the
catalogue matches. No key and no registration is needed for any of them. Both built files
carry their own provenance: the source URL, the build time and a sha256 over the content
(`scripts/build/snapshot.ts`), and the LASA file also records the sha256 of the PDF it was
parsed from and the page and row of every pair.

## What does the catalogue need before it is usable?

Two filters, both load-bearing, and salt stripping for matching. The counts are the ones the
committed snapshot records about itself in `data/catalog.json` (`rowsRead`,
`rowsAfterPrescriptionFilter`, `rowsAfterDedup`, and the length of `drugs`).

| Step | Rule | Committed snapshot |
|---|---|---|
| Read | every row of `product.txt` | 116,240 rows |
| Prescription filter | `PRODUCTTYPENAME == 'HUMAN PRESCRIPTION DRUG'` | 56,619 rows |
| Deduplication | by `(name, strength, form, route)` | 11,309 rows |
| Grouping | per nonproprietary name, with proprietary names, DEA schedule and every `(strength, dosage form, route)` combination | 3,730 drugs |

Without the prescription filter about half the rows are over-the-counter products,
homeopathic dilutions among them, and the most frequent names in the file are `zinc oxide`
and `alcohol`. Deduplication matters because many labellers list the same product. A rebuild
prints the row count per product type and after each step.

**Never hardcode a count from this file.** The FDA updates the directory continuously, so
the table above is the committed snapshot's own record and changes when `make data` runs.

**Matching needs salt stripping.** `SUBSTANCENAME` stores `tramadol hydrochloride`, so a
spoken "tramadol" misses on a naive comparison. `normalizeDrugName` in
[`src/lasa/normalize.ts`](../src/lasa/normalize.ts) strips the listed salt suffixes, and the
catalogue lookup applies it to both the query and the stored names. Over the curated tier's
40 names, 31 match the committed catalogue by exact name and all 40 after salt stripping
(`npx tsx scripts/build/stitch-lasa.ts`).

## How is the LASA table built?

`scripts/build/lasa.ts` parses the PDF with `pdftotext` in two modes (raw for reading order,
layout for cell boundaries) and resolves a row that spans several lines by the list's own
symmetry, since every pair appears in both directions. The result has two tiers:

| Tier | Where | Role |
|---|---|---|
| The full list | `ISMP_PAIRS`, `ismpPairCount()` | the product rule: `lasaRiskFor` checks every published pair, and a name can have several partners |
| The curated tier | `LASA_PAIRS` in [`src/lasa/pairs.ts`](../src/lasa/pairs.ts) | pairs checked by hand against their row; the demo, the evaluation corpora and the spoken-support test use them |

Never quote either count from memory: `npx tsx scripts/measure/ismp-coverage.ts` prints
both, and `tests/lasa/published-count.test.ts` fails if a document states a pair count the
code does not have. Without the PDF (by default at
`artefacts/sources/ismp-confused-drug-names-2023.pdf`, or a path passed to the script),
`make data` keeps the committed snapshot, and a parse yielding fewer than the floor of 40
refuses to overwrite it. A pair we derived ourselves never enters either tier.

## What does the arithmetic prove?

Each worked example below is reproduced by `validateNpi` and `validateDea` in
[`src/validators/`](../src/validators/), and the identifiers in the [voice set](../eval/live/voice-set.md)
must pass their own validators in `tests/scripts/live-pipeline.test.ts`.

| Entity | Rule | Worked example | Status |
|---|---|---|---|
| DEA number | two letters and seven digits; `(d1+d3+d5) + 2*(d2+d4+d6)`, the last digit of the result equals `d7` | `AB1234563`: odd 9, even 12, total 33, computed 3, given 3, **valid**. `BX1234567` (given 7) and `AF1234561` (given 1) **rejected** | **Enforced**, mod-10 checksum |
| NPI | ten digits; the last is a Luhn check digit over the prefix `80840` plus the first nine | `1234567893`: sum 67, computed 3, **valid**. `1245319599` and `9876543213` **valid**. `1234567890` **rejected** | **Enforced**, Luhn checksum |
| NDC | **no check digit.** Format rules only: 10 digits as 4-4-2, 5-3-2 or 5-4-1, or 11 digits strictly 5-4-2 | none: the order has no NDC code field | not used as a validator |
| Drug, strength, form, route | the combination must exist in the built catalogue | `hydromorphone`, `2 mg/mL`, `INJECTION, SOLUTION`, `INTRAVENOUS` passes | **Enforced**, existence and consistency |

The NPI prefix `80840` is the ISO/IEC 7812 issuer identifier for US health care, and it is
mandatory in the Luhn sum.

The two checksums are not equally strong; `make audit-checksums` measures exactly how, and
[evidence](evidence.md#how-strong-is-the-arithmetic-on-dea-and-npi) reports the figures. The
NDC format is defined by the
[FDA](https://www.fda.gov/drugs/electronic-drug-registration-and-listing-system-edrls/national-drug-code-format).
A [final rule](https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements),
effective 7 March 2033, moves every NDC to one 12-digit 6-4-2 format; the product proves
drugs by name and combination, so the change does not touch it.

## Which sources were considered and are not used?

| Source | Why it is not in the product |
|---|---|
| [openFDA NDC API](https://api.fda.gov/drug/ndc.json) | the same directory as a JSON API; the build reads the bulk file instead, and nothing calls an API at runtime |
| [openFDA bulk NDC partition](https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip) | the same data in another format |
| [NPI Registry API](https://npiregistry.cms.hhs.gov/api/?number=1234567893&version=2.1) | our NPIs are synthesised from the checksum and are not in the registry, so a lookup answers "not found" for a number that provably adds up |
| [NPPES bulk download](https://download.cms.gov/nppes/NPI_Files.html) | real prescriber data, which the product deliberately does not use |
| [RxNorm Current Prescribable Content](https://download.nlm.nih.gov/rxnorm/RxNorm_full_prescribe_current.zip) | a normalised vocabulary with NDC mapping, free of licence restrictions; the NDC Directory already gives the combinations the gate needs |
| [RxTerms](https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=hydromorphone) and [RxNav](https://rxnav.nlm.nih.gov/REST/drugs.json?name=hydromorphone) APIs | runtime lookups, which the product avoids |
| [FDA Name Differentiation Project](https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project) | official tall-man spellings; the pair rule reads the ISMP list only, and the evaluation corpora are built from its curated tier |
| [ISMP Canada Dangerous Abbreviations](https://www.ismp-canada.org/download/ISMPCanadaListOfDangerousAbbreviations.pdf) | the Canadian counterpart of the abbreviation list; the product follows the US list |
| [WHO look-alike, sound-alike overview](https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution1-look-alike-sound-alike-medication-names.pdf) | an international overview with examples, not a pair list |

---

<sub>[Documentation index](README.md) · [Project README](../README.md)</sub>
