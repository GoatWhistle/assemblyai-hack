# The public data this product validates against

Verified 11 September 2026. Every URL below was checked with a live request (HTTP code
and size) unless the row says otherwise; anything that could not be checked is marked
rather than left to look verified.

**Why this domain at all.** An entity with a built-in checksum lets a recognition error
be proved objectively, with no human labelling: if the recognised string fails its
validator, that is an ASR error and a machine-checkable fact. This file was once an
assessment of five candidate domains — laboratory tests, vehicles, logistics, securities
and pharmacy — scored on exactly that criterion. Pharmacy won and the other four were
never implemented, so their sections have been deleted rather than kept as reference
material for a project that does not exist. What survives is the data this product
actually reads.

**One network limitation, stated because it shapes what could be verified.** Every
`*.nlm.nih.gov` host (RxNav, RxTerms, clinicaltables, DailyMed) is unreachable from this
environment at the network level — a TLS handshake failure through curl, WebFetch,
PowerShell and Playwright alike. That is a property of the environment, not a sign the
services are broken. Rows depending on those hosts carry their contract from
documentation and are marked as unfetched.

## The datasets

| Dataset | URL (verbatim) | Licence | Size | Format | Registration | Entities | Verified |
|---|---|---|---|---|---|---|---|
| **FDA NDC Directory (files)** | `https://www.accessdata.fda.gov/cder/ndctext.zip` | Public domain (US gov) | 10.8 MB zip → 70.4 MB: `product.txt` 40.2 MB + `package.txt` 30.1 MB | TSV (tab-delimited) | **No** | **116,155 products**: proprietary/generic name, dosage form, route, strength, unit, DEA schedule, labeler, pharm class | ✅ HTTP 200, downloaded, unpacked, counted |
| **openFDA NDC API** | `https://api.fda.gov/drug/ndc.json?limit=1` | `https://open.fda.gov/license/` | **137,830** records (`meta.results.total`) | JSON | **No key** (240 req/min, 1000 req/day per IP; a free key → 120,000/day) | product_ndc, generic_name, brand_name, labeler, dosage_form, route, active_ingredients | ✅ HTTP 200, fields and total read |
| **openFDA Drug Label API** | `https://api.fda.gov/drug/label.json?limit=1` | same | — | JSON | No key | SPL label text, indications, dosages | ✅ HTTP 200 |
| **openFDA bulk downloads** | `https://open.fda.gov/data/downloads/` | same | — | JSON.zip by partition | No | everything listed above | ✅ HTTP 200 |
| **openFDA NDC bulk (partition)** | `https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip` | same | 922,305 B | JSON.zip | No | the NDC directory in full | ✅ HTTP 200, 922 KB |
| **RxNorm Current Prescribable Content** | `https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_prescribe_current.zip` | a UMLS licence is **NOT required** for this subset | ~30–40 MB | RRF (pipe-delimited), files RXNCONSO / RXNSAT / RXNREL | **No** (this is the key difference from full RxNorm) | RxCUI, normalised names, ingredients, doses, NDC mapping | ⚠️ URL template confirmed by search (the latest dated release is `RxNorm_full_prescribe_07062026.zip`), **a live fetch is impossible — the host is blocked** |
| **RxNorm full** | `https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html` | Free, **but UMLS/UTS registration is required** | ~150 MB | RRF | **Yes** (free) | full RxNorm + First DataBank/Micromedex/VA | ⚠️ host blocked |
| **RxTerms API / RxNav API** | `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=metf&ef=STRENGTHS_AND_FORMS` · `https://rxnav.nlm.nih.gov/REST/drugs.json?name=metformin` | Free, no licence needed for the API | — | JSON | **No key** | DISPLAY_NAME, STRENGTHS_AND_FORMS, RXCUIS | ⚠️ contract taken from the documentation, **a live request is impossible — the host is blocked** |
| **NPPES (the prescriber/NPI registry)** | `https://download.cms.gov/nppes/NPI_Files.html` | Public domain | ~1 GB zip | CSV | No | NPI, prescriber name, specialty, address | ✅ HTTP 200 |
| **NPI Registry API** | `https://npiregistry.cms.hhs.gov/api/?number=1234567893&version=2.1` | Public domain | — | JSON | **No key** | NPI → prescriber (existence validation) | ✅ HTTP 200 |

## Validators and checksums: three independent ones, each verified by hand

| Entity | Validator | My test | Status |
|---|---|---|---|
| **DEA number** (the prescriber's number for controlled substances) | 2 letters + 7 digits. `(d1+d3+d5) + 2*(d2+d4+d6)`, the last digit of the result = the 7th digit | `AB1234563` → odd=9, even=12, total=33, calc=3, given=3 → **VALID**; `BX1234567` and `AF1234561` → **MISMATCH** (correctly rejected) | ✅ **A hard mod-10 checksum** |
| **NPI** (National Provider Identifier) | 10 digits, the last one a Luhn digit, but with the mandatory prefix **`80840`** (the ISO/IEC 7812 issuer ID for US healthcare) | `1234567893` → sum=67, calc=3 = given → **VALID**; `1245319599` → **VALID**; `1234567890` → **MISMATCH** | ✅ **A hard checksum (Luhn + 80840)** |
| **NDC** | ⚠️ **There is NO check digit.** Format rules only: 10-digit in the variants 4-4-2 / 5-3-2 / 5-4-1, 11-digit strictly 5-4-2 (conversion = inserting a leading zero into the right segment) | — | ⚠️ **Format plus existence in the directory only** (but a directory of 116,155 rows held locally is a strong existence check) |
| **Dosage/form** | Validation against `product.txt`: the combination (drug × strength × dosage form × route) must exist | — | ✅ A consistency check against a local database |

The official source for the NDC format: `https://www.fda.gov/drugs/electronic-drug-registration-and-listing-system-edrls/national-drug-code-format`
and the PDF `https://www.fda.gov/media/173715/download` (✅ HTTP 200, 1.57 MB).
⚠️ Important for the future: the FDA has published a proposal to move to a single NDC format —
`https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements`.

## Confusable sets, published by regulators rather than generated by us

| List | URL (verbatim) | What is inside | Verified |
|---|---|---|---|
| **ISMP List of Confused Drug Names (2023)** | `https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf` | Ready-made **pairs** of look-alike/sound-alike drugs (LASA) — direct ground truth for the test | ✅ HTTP 200, 631,964 B, downloaded |
| ECRI mirror | `https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ConfusedDrugNames.pdf` | the same | ✅ HTTP 200, 661,766 B |
| landing page | `https://www.ismp.org/recommendations/confused-drug-names-list` | description plus links | ✅ HTTP 200 |
| **ISMP List of Error-Prone Abbreviations (2024-04)** | `https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf` | **Sig codes**: dangerous abbreviations (`qd` vs `qid`, `U` vs `0`, `HS`, `BID/TID`, `MSO4` vs `MgSO4`) plus the correct replacements. Ideal for testing sig codes | ✅ HTTP 200, 330,358 B |
| ECRI mirror | `https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf` | the same | ✅ HTTP 200, 330,358 B |
| **ISMP Canada Dangerous Abbreviations** | `https://www.ismp-canada.org/download/ISMPCanadaListOfDangerousAbbreviations.pdf` | the same, the Canadian version | ✅ HTTP 200, 469,253 B |
| **FDA Name Differentiation Project (Tall Man Letters)** | `https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project` | **23 official pairs** of drugs with tall-man spelling (vinBLAStine/vinCRIStine, CISplatin/CARBOplatin). An HTML table, not a file. Current as of 06/12/2026 | ✅ read, 23 pairs |
| ISMP tall-man | `https://www.ismp.org/resources/special-edition-tall-man-lettering-ismp-updates-its-list-drug-names-tall-man-letters` | an extended list | ⚠️ not fetched directly |
| WHO LASA | `https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution1-look-alike-sound-alike-medication-names.pdf` | an international overview plus examples | ⚠️ not fetched |

**This is the domain's unique advantage**: the confusable pairs do not have to be generated by us — they are published
by a regulator precisely because confusing them kills people. For Entity Error Rate this is a ready-made
adversarial set with a documented clinical rationale.

---

## What the catalogue needs before it is usable

Two filters, both load-bearing, both established by reading the raw file rather than by
assumption:

- `PRODUCTTYPENAME == 'HUMAN PRESCRIPTION DRUG'`. Without it roughly half the rows are
  over-the-counter products and homeopathic dilutions, and `alcohol` and `oxygen` sort to
  the top of the catalogue.
- Deduplication by `(name, strength, form, route)`. About 80% of rows are duplicates
  across labellers.

Matching also needs salt stripping. `SUBSTANCENAME` stores `tramadol hydrochloride`, so a
naive comparison misses `tramadol` and scores 42% where stripping the salt scores 52%.

**Never hardcode a row count from this file.** The FDA rebuilds it daily, and a count
written into code or into prose is a number that was true once. `scripts/build-ndc.ts`
reads it at build time.

## The LASA table is curated, not imported

The ISMP list moved to ECRI and no longer sits at a stable public PDF URL, so
`scripts/build-lasa.ts` falls back to the hand-curated table in `src/lasa/pairs.ts` and
records that fallback as the provenance of the built artefact. Use `LASA_PAIRS.length`
rather than a remembered number; it is **20 curated pairs** today.

A design target of roughly 240 surviving pairs was written down before the source
disappeared. It was never measured and must not be quoted as though it were. If the ECRI
list becomes reachable again, the parser refuses to overwrite the curated table below a
40-pair floor, so a broken parse cannot quietly shrink the protection.

## What could not be verified

| Item | Reason |
|---|---|
| Everything under `*.nlm.nih.gov` — the RxNorm prescribable zip, RxNav, the RxTerms and clinicaltables APIs, DailyMed | The host is blocked at the network level in this environment (curl, WebFetch, PowerShell, Playwright all fail the TLS handshake). The contracts come from documentation and search, never from a live response |
| The ISMP tall-man extended list and the WHO LASA overview | Not fetched directly; both are cited above with that status on the row |
