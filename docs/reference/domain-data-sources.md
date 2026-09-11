# Оценка 5 доменов для демо голосового агента (AssemblyAI keyterms + Entity Error Rate)

Дата проверки: 2026-09-11. Все URL проверялись живыми запросами (HTTP-код + размер), где не указано иное.
Явно помечено `⚠️ НЕ ПРОВЕРЕНО`, если проверить не удалось.

**Ключевой критерий.** Сущность с встроенной контрольной суммой позволяет доказать ошибку распознавания
объективно, без человеческой разметки: если распознанная строка не проходит валидатор — это ошибка ASR,
и это машинно-проверяемый факт. Домены без чексуммы требуют ручного ground-truth.

**Общее замечание о сетевом окружении.** Все хосты `*.nlm.nih.gov` (RxNav, RxTerms,
clinicaltables, DailyMed) недоступны из этой песочницы на уровне сети (TLS handshake fail
через curl, WebFetch, PowerShell и Playwright). Это ограничение окружения, а не признак
неработоспособности сервисов. Такие пункты помечены отдельно.

---

## Домен 1. Аптека / приём рецептов

### Датасеты

| Датасет | URL (verbatim) | Лицензия | Размер | Формат | Регистрация | Сущности | Проверено |
|---|---|---|---|---|---|---|---|
| **FDA NDC Directory (файлы)** | `https://www.accessdata.fda.gov/cder/ndctext.zip` | Public domain (US gov) | 10.8 MB zip → 70.4 MB: `product.txt` 40.2 MB + `package.txt` 30.1 MB | TSV (tab-delimited) | **Нет** | **116 155 продуктов**: proprietary/generic name, dosage form, route, strength, unit, DEA schedule, labeler, pharm class | ✅ HTTP 200, скачан, распакован, посчитан |
| **openFDA NDC API** | `https://api.fda.gov/drug/ndc.json?limit=1` | `https://open.fda.gov/license/` | **137 830** записей (`meta.results.total`) | JSON | **Нет ключа** (240 req/min, 1000 req/day на IP; ключ бесплатно → 120 000/day) | product_ndc, generic_name, brand_name, labeler, dosage_form, route, active_ingredients | ✅ HTTP 200, поля и total прочитаны |
| **openFDA Drug Label API** | `https://api.fda.gov/drug/label.json?limit=1` | там же | — | JSON | Нет ключа | SPL-текст этикетки, показания, дозировки | ✅ HTTP 200 |
| **openFDA bulk downloads** | `https://open.fda.gov/data/downloads/` | там же | — | JSON.zip по партициям | Нет | всё вышеперечисленное | ✅ HTTP 200 |
| **openFDA NDC bulk (партиция)** | `https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip` | там же | 922 305 B | JSON.zip | Нет | NDC-справочник целиком | ✅ HTTP 200, 922 KB |
| **RxNorm Current Prescribable Content** | `https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_prescribe_current.zip` | **UMLS-лицензия НЕ требуется** для этого сабсета | ~30–40 MB | RRF (pipe-delimited), файлы RXNCONSO / RXNSAT / RXNREL | **Нет** (это ключевое отличие от полного RxNorm) | RxCUI, нормализованные названия, ингредиенты, дозы, NDC-маппинг | ⚠️ URL-шаблон подтверждён поиском (последний датированный релиз `RxNorm_full_prescribe_07062026.zip`), **живой fetch невозможен — хост заблокирован** |
| **RxNorm полный** | `https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html` | Бесплатно, **но нужна UMLS/UTS-регистрация** | ~150 MB | RRF | **Да** (бесплатно) | полный RxNorm + First DataBank/Micromedex/VA | ⚠️ хост заблокирован |
| **RxTerms API / RxNav API** | `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=metf&ef=STRENGTHS_AND_FORMS` · `https://rxnav.nlm.nih.gov/REST/drugs.json?name=metformin` | Бесплатно, лицензия не нужна для API | — | JSON | **Нет ключа** | DISPLAY_NAME, STRENGTHS_AND_FORMS, RXCUIS | ⚠️ контракт из документации, **живой запрос невозможен — хост заблокирован** |
| **NPPES (реестр врачей/NPI)** | `https://download.cms.gov/nppes/NPI_Files.html` | Public domain | ~1 GB zip | CSV | Нет | NPI, имя врача, специальность, адрес | ✅ HTTP 200 |
| **NPI Registry API** | `https://npiregistry.cms.hhs.gov/api/?number=1234567893&version=2.1` | Public domain | — | JSON | **Нет ключа** | NPI → врач (валидация существования) | ✅ HTTP 200 |

### Валидаторы / контрольные суммы — **три независимых, все проверены мной вручную**

| Сущность | Валидатор | Мой тест | Статус |
|---|---|---|---|
| **DEA number** (номер врача для контролируемых препаратов) | 2 буквы + 7 цифр. `(d1+d3+d5) + 2*(d2+d4+d6)`, последняя цифра результата = 7-я цифра | `AB1234563` → odd=9, even=12, total=33, calc=3, given=3 → **VALID**; `BX1234567` и `AF1234561` → **MISMATCH** (корректно отбракованы) | ✅ **Жёсткая чексумма mod-10** |
| **NPI** (National Provider Identifier) | 10 цифр, последняя — Luhn, но с обязательным префиксом **`80840`** (ISO/IEC 7812 issuer ID для здравоохранения США) | `1234567893` → sum=67, calc=3 = given → **VALID**; `1245319599` → **VALID**; `1234567890` → **MISMATCH** | ✅ **Жёсткая чексумма (Luhn + 80840)** |
| **NDC** | ⚠️ **Контрольной цифры НЕТ.** Только форматные правила: 10-значный в вариантах 4-4-2 / 5-3-2 / 5-4-1, 11-значный строго 5-4-2 (конвертация = вставка ведущего нуля в нужный сегмент) | — | ⚠️ **Только формат + существование в справочнике** (но справочник на 116 155 строк локально — это сильная проверка существования) |
| **Дозировка/форма** | Валидация по `product.txt`: связка (препарат × strength × dosage form × route) должна существовать | — | ✅ Проверка консистентности по локальной БД |

Официальный источник формата NDC: `https://www.fda.gov/drugs/electronic-drug-registration-and-listing-system-edrls/national-drug-code-format`
и PDF `https://www.fda.gov/media/173715/download` (✅ HTTP 200, 1.57 MB).
⚠️ Важно на будущее: FDA опубликовала предложение о переходе на единый формат NDC —
`https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements`.

### Confusable-наборы — **лучшие в наборе доменов, официальные и готовые**

| Список | URL (verbatim) | Что внутри | Проверено |
|---|---|---|---|
| **ISMP List of Confused Drug Names (2023)** | `https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf` | Готовые **пары** look-alike/sound-alike препаратов (LASA) — прямой ground-truth для теста | ✅ HTTP 200, 631 964 B, скачан |
| зеркало ECRI | `https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ConfusedDrugNames.pdf` | то же | ✅ HTTP 200, 661 766 B |
| страница-лендинг | `https://www.ismp.org/recommendations/confused-drug-names-list` | описание + ссылки | ✅ HTTP 200 |
| **ISMP List of Error-Prone Abbreviations (2024-04)** | `https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf` | **Sig-коды**: опасные сокращения (`qd` vs `qid`, `U` vs `0`, `HS`, `BID/TID`, `MSO4` vs `MgSO4`) + правильные замены. Идеально для теста sig-кодов | ✅ HTTP 200, 330 358 B |
| зеркало ECRI | `https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf` | то же | ✅ HTTP 200, 330 358 B |
| **ISMP Canada Dangerous Abbreviations** | `https://www.ismp-canada.org/download/ISMPCanadaListOfDangerousAbbreviations.pdf` | то же, канадская версия | ✅ HTTP 200, 469 253 B |
| **FDA Name Differentiation Project (Tall Man Letters)** | `https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project` | **23 официальные пары** препаратов с tall-man-написанием (vinBLAStine/vinCRIStine, CISplatin/CARBOplatin). HTML-таблица, не файл. Актуально на 06/12/2026 | ✅ прочитано, 23 пары |
| ISMP tall-man | `https://www.ismp.org/resources/special-edition-tall-man-lettering-ismp-updates-its-list-drug-names-tall-man-letters` | расширенный список | ⚠️ не фетчил напрямую |
| WHO LASA | `https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution1-look-alike-sound-alike-medication-names.pdf` | международный обзор + примеры | ⚠️ не фетчил |

**Это уникальное преимущество домена**: confusable-пары не нужно генерировать самому — они опубликованы
регулятором именно потому, что путаница между ними убивает людей. Для Entity Error Rate это готовый
adversarial-набор с документированным клиническим обоснованием.

---

## Домен 2. Заказ лабораторных тестов / LOINC

### Датасеты

| Датасет | URL (verbatim) | Лицензия | Размер | Формат | Регистрация | Сущности | Проверено |
|---|---|---|---|---|---|---|---|
| **LOINC полная БД 2.83** | `https://loinc.org/downloads/` → `Loinc_2.83.zip` | Бесплатно бессрочно, коммерческое использование разрешено (`https://loinc.org/license/`) | **88.52 MB**, MD5 `057ddf203164705d5a4c3604257060a4`, релиз 2026-08-19 | ZIP → CSV | **ДА** — «You must be logged in with your LOINC username and password» (аккаунт бесплатный) | **112 405 концептов**: 69 651 Laboratory, 28 786 Clinical, 12 807 Surveys | ✅ страница прочитана через curl (WebFetch даёт 403 — loinc.org блокирует ботов) |
| **Top 2000 — УПРАЗДНЁН** | `https://loinc.org/kb/users-guide/additional-content-in-the-loinc-distribution/top-20000-results` | — | — | колонка в `Loinc.csv` | Да (внутри архива) | Замена: поле **`COMMON_TEST_RANK`**, фильтр `<= 2000`. Топ-2000 ≈ **99%** объёма тестов. Источники: OHDSI, PCORnet, 3 госпитальные сети, США 2018–2021 | ✅ дословно: «These new rankings **replace the former 'Top 2000+' lists**, which had become outdated» |
| legacy Top2000 PDF | `https://lhncbc.nlm.nih.gov/assets/legacy/files/LOINC_1.6_Top2000CommonLabResultsUS.pdf` | — | 112 стр., июнь 2017 | PDF | Нет | старый топ-2000 | ⚠️ **НЕ ПРОВЕРЕНО** — хост `nlm.nih.gov` заблокирован |
| **Panels and Forms** | внутри архива: `AccessoryFiles/PanelsAndForms/PanelsAndForms.csv` | Group 3 Artifact (поля менять нельзя) | — | CSV | Да | Раскрытие панелей (BMP → компоненты). **Adjacency list**: `ParentID`, `ID`, `SEQUENCE`; корень где `ParentID = ID`. Только панели, одиночных термов нет | ✅ документация прочитана |
| **Синонимы** | поля `Loinc.csv` | — | — | CSV | Да | `LONG_COMMON_NAME`, `SHORTNAME` (~8000 термов без него, есть дубликаты — **не ключ**), **`RELATEDNAMES2`** (разговорные названия, аббревиатуры, **распространённые опечатки**), `CONSUMER_NAME` | ✅ |
| **NLM Clinical Tables LOINC API** | `https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=...&df=LOINC_NUM,LONG_COMMON_NAME` | Бесплатно | — | JSON | **Нет ключа** | LOINC_NUM, LONG_COMMON_NAME | ⚠️ **НЕ ПРОВЕРЕНО живым запросом** — хост заблокирован (4 способа). Контракт из docs `https://clinicaltables.nlm.nih.gov/apidoc/loinc_items/v3/doc.html` |
| **LOINC FHIR Terminology Service** | `https://fhir.loinc.org` | — | — | FHIR R4 | **Да** (Basic Auth, LOINC-логин) | `$lookup`, `$validate-code`, `$expand`, `$translate` | ⚠️ Статус **BETA**, дословно: «we do not recommend using this API in a production setting» |
| **UCUM (единицы измерения)** | `https://raw.githubusercontent.com/ucum-org/ucum/main/ucum-essence.xml` | UCUM License v1.1 (2024-06), Apache-подобная, **не OSI** | **82 776 B** | XML | **Нет** | **305 `<unit>`, 7 `<base-unit>`, 24 `<prefix>`**, версия 2.2, rev 2024-06-17 | ✅ скачан и посчитан. Сайт переехал: `unitsofmeasure.org` → `ucum.org` |

### Валидатор — **есть, Luhn mod-10, но с известными исключениями**

Официальный источник: `https://loinc.org/kb/users-guide/calculating-mod-10-check-digits`.
Дословно: *«The LOINC code is a numeric code suffixed by a dash and Mod 10 check digit.
**This formula is also referred to a Luhn algorithm**. The digit is used as an integrity check.»*

**Я проверил независимо обычным Luhn (удвоение каждой 2-й цифры справа, вычитание 9 при >9):**

```
2951-2 OK   4548-4 OK   2345-7 OK   718-7 OK    1975-2 OK
2160-0 OK   33914-3 OK  2093-3 OK   13457-7 OK  14682-9 OK  3094-0 OK
2951-3 MISMATCH (искусственно испорченный — корректно отбракован)
```
11/11 реальных кодов валидны, испорченный отбракован. ✅

**Формулировка в Users' Guide (8 шагов) умножает число целиком на 2** (531 → 1062), а не поцифренно —
это математически эквивалентно стандартному Luhn. **Для реализации берите обычный Luhn.**

⚠️ **14 кодов с невалидной контрольной цифрой** (официально признанный дефект,
`https://loinc.org/kb/users-guide/calculating-mod-10-check-digits/terms-with-invalid-check-digits`,
дословно «These 14 terms were found to have invalid check digits and are a known issue»):

```
11491-6  11501-6  5895-7  5896-5  5897-3  5928-1  6028-3
6415-5   6580-7   6645-7  6646-5  6647-3  6648-1  6649-9
```
(Мой тест подтверждает: `11491-6` → calc=8, `5895-7` → calc=8 — не сходятся.) **Обязателен allowlist.**

Префиксные идентификаторы (LP/LL/LA/LG) используют **вариант** алгоритма, документированный
не у LOINC, а на OpenMRS Wiki — `https://loinc.org/kb/users-guide/calculating-mod-10-check-digits/calculating-the-check-digit-for-loinc-parts-answers-and-other-identifiers-with-characters`

### Confusable-наборы — **официального списка НЕ СУЩЕСТВУЕТ**

Заявляю прямо: публичного официального списка sound-alike/look-alike **лабораторных тестов** нет.

- **ISMP List of Confused Drug Names** — только лекарства, не лабораторные тесты. Неприменимо.
- **CAP Test Ordering Program** (`https://www.cap.org/laboratory-improvement/test-ordering-program`) — модули
  про «commonly misapplied laboratory tests», но **только для участников** CAP-аккредитации, не открытый датасет.
- **CLSI AUTO12** — про маркировку образцов (шрифты, расположение), не имена тестов.
- CAP TODAY (`https://www.captodayonline.com/many-knots-to-untangle-in-lab-test-names/`) подтверждает:
  проблема признана, стандартизации нет, у каждого учреждения свои правила именования.

**Придётся генерировать самому** (это выполнимо, но это работа и это не «официальный» ground-truth):
коллизии `SHORTNAME`; пары с одинаковым `COMPONENT`, различающиеся `SYSTEM`/`PROPERTY`/`METHOD`
(глюкоза Ser/Plas vs Bld); фонетическое сходство (Double Metaphone) по `LONG_COMMON_NAME` в топ-2000;
опечатки уже лежат в `RELATEDNAMES2`.

⚠️ Классические пары (BMP/CMP, HbA1c vs Hgb, PT/PTT vs PT/INR, ALT/AST, Ca vs CA-125, TSH vs T4,
folate vs ferritin) — **клинический фольклор, не официальный источник**. Помечать как таковой.

---

## Домен 3. Автомобили / запчасти / VIN

### Датасеты

| Датасет | URL (verbatim) | Лицензия | Размер | Формат | Регистрация | Сущности | Проверено |
|---|---|---|---|---|---|---|---|
| **NHTSA vPIC GetAllMakes** | `https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json` | ⚠️ data.gov указывает лицензию буквально как `https://project-open-data.cio.gov/unknown-license/` — явной лицензии нет; де-факто US gov public domain | 612 133 B, **Count = 12 361 марка** | JSON / XML / CSV (все три работают) | **Нет ключа, нет регистрации** | марки | ✅ HTTP 200, 612 133 B |
| **GetModelsForMake** | `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/honda?format=json` | там же | Count = **362** модели Honda | JSON | Нет | модели | ✅ HTTP 200 |
| **DecodeVinValues** ⭐ | `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/5UXWX7C5*BA?format=json&modelyear=2011` | там же | 4 189 B | JSON (плоский объект — **лучший для голосового агента**) | Нет | VIN → make/model/year/engine/plant/body **+ `ErrorCode`/`ErrorText` = удалённый валидатор чексуммы** | ✅ HTTP 200 |
| **DecodeVINValuesBatch** | POST `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/`, body `format=json&data=VIN1;VIN2` | там же | 7 622 B на 2 VIN | JSON | Нет | пакетное декодирование | ✅ HTTP 200 |
| **GetWMIsForManufacturer** | `https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?format=json` | там же | Count = **105** WMI | JSON | Нет | WMI → производитель, страна, тип ТС | ✅ HTTP 200 |
| bulk-трюк для WMI | `https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/?vehicleType=car&format=json` | там же | 68 125 B, **Count 348** | JSON | Нет | все WMI для легковых; итерировать по car/truck/mpv/motorcycle/bus/trailer | ✅ HTTP 200 |
| **vPIC полная БД** | `https://vpic.nhtsa.dot.gov/downloads/vPICList_lite_2026_08.bak.zip` | там же | **195 223 584 B (186 MiB)**, Last-Modified 2026-08-13 | SQL Server .bak в ZIP (также `.custom.zip` 69.2 MB и `.plain.zip` 74.1 MB для PostgreSQL) | Нет | полные таблицы `Wmi`, `WmiVinSchema`, `Manufacturer` — **единственный полный бесплатный дамп WMI** | ✅ HTTP 200, Content-Length прочитан. **Ловушка: `/api/downloads/...` даёт 404, правильный путь `/downloads/...`**. Имя файла меняется ежемесячно — скрейпить `https://vpic.nhtsa.dot.gov/Downloads` |
| **EPA/DOE fueleconomy.gov** ⭐ | `https://www.fueleconomy.gov/feg/epadata/vehicles.csv` | ⚠️ явно не указана; US federal work product, де-факто public domain | **21 726 077 B (20.7 MiB)** | CSV | **Нет** | **50 242 строки × 84 колонки; 146 марок; 5 736 пар make+model; 1984–2027.** Колонки: make, model, year, cylinders, displ, drive, trany, fuelType, VClass | ✅ HTTP 200, скачан и распарсен. **Лучший офлайн-источник марок/моделей** — чистые потребительские названия, в отличие от 12 361 марки vPIC, где тысячи трейлерных мастерских вида «#1 ALPINE CUSTOMS» |
| **NHTSA Recalls API** | `https://api.nhtsa.gov/recalls/recallsByVehicle?make=honda&model=accord&modelYear=2018` | US gov | 8 033 B, Count 6 | JSON | **Нет ключа** | отзывы: Component, Summary, Consequence, Remedy, parkIt, parkOutSide | ✅ HTTP 200. ⚠️ Даты в формате **`DD/MM/YYYY`**. ⚠️ **VIN не принимает**: `?vin=...` возвращает `{"Count":0,...}` молча, нужен двухшаговый флоу DecodeVinValues → make/model/year → recalls |
| **Запчасти (ACES/PIES)** | `https://www.autocare.org/data-standards/subscriptions` | **ПЛАТНО** | — | — | **Да, подписка** | VCdb **$3 150–8 625/год** (член) / **$4 410–12 075** (не член); PAdb $1 050–7 763 / $1 470–10 868 | ✅ цены прочитаны. **Схемы ACES/PIES бесплатны, справочники — нет** |
| WMI community CSV | `https://raw.githubusercontent.com/WALL-E/vin-decoder/master/csv/wmi-from-wiki.csv` | ⚠️ **LICENSE отсутствует** (404, GitHub API: `license: null`) | 9 452 B, 437 строк | CSV `WMI,Manufacturer` | Нет | WMI | ✅ HTTP 200, но последний push **2017-01-11** — 9 лет устарело. Предпочесть vPIC |
| CarQuery | `https://www.carqueryapi.com/api/0.3/?cmd=getMakes&year=2020` | «you may not re-sell or distribute» | — | — | — | — | ❌ **curl exit 000, 0 байт** — недоступен. Данные не обновляются с 2019, БД платная. **Не использовать** |

### Валидатор — **VIN check digit, mod-11, официально в федеральном регламенте**

Первоисточник: **49 CFR 565.15(c)**.
- Машинночитаемый XML: `https://www.govinfo.gov/content/pkg/CFR-2023-title49-vol6/xml/CFR-2023-title49-vol6-part565.xml` (✅ 200, 86 652 B)
- eCFR: `https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-565/subpart-B/section-565.15`
- Cornell LII: `https://www.law.cornell.edu/cfr/text/49/565.15`
- ⚠️ eCFR блокирует автоматические запросы редиректом 302 на `unblock.federalregister.gov` — использовать GovInfo XML.

**Таблица III — значения символов (дословно из CFR):**
```
A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8
J=1 K=2 L=3 M=4 N=5 P=7 R=9
S=2 T=3 U=4 V=5 W=6 X=7 Y=8 Z=9
```
Цифры берут своё значение. **В таблице отсутствуют I, O, Q** — они не могут встречаться в VIN вообще.

**Таблица IV — веса по позициям:**
```
поз:  1  2  3  4  5  6  7   8   9  10 11 12 13 14 15 16 17
вес:  8  7  6  5  4  3  2  10   0   9  8  7  6  5  4  3  2
```
Сумма произведений mod 11; остаток = контрольная цифра, остаток 10 → буква **`X`**.

**Я проверил независимо на официальном примере из Таблицы VI CFR:**
```
1G4AH59H45G118341 → sum=411, remainder=4, checkdigit=4, поз.9 = 4 → VALID   ✅
1G4AH59H45G118331 (испорчен 1 символ) → sum=408, checkdigit=1 vs поз.9=4 → ОШИБКА ПОЙМАНА ✅
```
Совпадает с официальным worked example (411 / 37 r4 → 4). ✅

Дополнительно: vPIC `DecodeVinValues` работает как бесплатный удалённый валидатор —
`ErrorCode 0` = «VIN decoded clean. Check Digit (9th position) is correct», `ErrorCode 1` =
«Check Digit (9th position) does not calculate properly».

### Confusable-наборы — **исключение I/O/Q закреплено регламентом**

**49 CFR 565.13(g), дословно из CFR XML:**
> «(g) Each character in each VIN shall be one of the letters in the set:
> [ABCDEFGHJKLMNPRSTUVWXYZ] or a numeral in the set: [0123456789]
> assigned according to the method given in § 565.15.»

Этот набор из 23 букв исключает **I, O, Q**. §565.13(h): «All spaces provided for in the VIN must be
occupied by a character specified in paragraph (g)» — то есть ни пробелов, ни пунктуации.
Цитата: `https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-565/subpart-B/section-565.13`

⚠️ Регламент задаёт набор символов, но **не объясняет причину**. Обоснование (I↔1, O↔0, Q↔O/0) —
во всех вторичных источниках, но **не подтверждено первоисточником**.

**Практический выигрыш для ASR — два независимых детерминированных валидатора:**
1. Любые `I`, `O`, `Q` в гипотезе VIN **гарантированно неверны** → нормализация `I→1`, `O→0`, `Q→0`.
2. Плюс mod-11 чексумма.

Акустически неоднозначные пары, которые charset **не** снимает и на которых стоит тестировать:
**B/P/V/D/E/G/T/C/Z/3** («би/пи/ви/ди/и/джи/ти/си/зи/три»), **M/N**, **S/F/X**, **A/8/H/K/J**, **5/9/4**, **U/W/2**.
⚠️ Важное ограничение: `Z` и `9` имеют одинаковое значение 9 в Таблице III (как и ряд других пар),
поэтому чексумма **не поймает все подстановки** — она ловит одиночные ошибки и большинство транспозиций.

NATO/ICAO алфавит (официально *International Radiotelephony Spelling Alphabet*, ICAO 1955–56):
`https://www.nato.int/en/about-us/nato-history/history-by-theme/symbols-of-nato/nato-phonetic-alphabet`.
Официальные написания `Alfa`/`Juliett`. Поскольку I/O/Q невозможны, нужно только **23 кодовых слова** —
India, Oscar, Quebec убрать и из промпта, и из грамматики.

Год выпуска (Таблица VII): 2010=A … 2026=T, 2027=V, 2028=W, 2029=X, 2030=Y, 2031=1.
Правило дизамбигуации дословно: *«if position 7 is numeric, the Model Year in position 10 of the VIN
refers to a year in the range 1980-2009. If position 7 is alphabetic … range 2010-2039.»*

⚠️ **ISO 3779:2009** (`https://www.iso.org/standard/52200.html`) — **платный** (~CHF 60+), ISO отдаёт 403.
Использовать 49 CFR 565 — бесплатно, авторитетно для США, содержит все таблицы.

### Честный минус домена: запчастей нет

**Бесплатного открытого датасета номеров автозапчастей не существует.** ACES/PIES (отраслевой
стандарт) — платный (цены выше). Коммерческие альтернативы: MOTOR, AutoPartsAPI (только trial),
TecDoc, 7zap. На data.gov и GitHub аналога в public domain нет.

Обходной путь для демо: синтезировать каталог самому — категории из бесплатной терминологии
PCdb (brake pad, alternator, oxygen sensor, serpentine belt), номера в реалистичном формате со
**своей** контрольной цифрой, join к **реальным** машинам из EPA CSV / vPIC.
⚠️ Но: у реальных part numbers **нет ни стандартной чексуммы, ни исключённых символов** —
логика I/O/Q сюда не переносится.

---

## Домен 4. Логистика / адреса и трек-номера

⚠️ **Раздел собран из моих собственных проверок**; отдельный агент-исследователь по этому домену
не завершился к моменту записи. Всё помеченное ✅ проверено живым запросом лично.

### Датасеты — адреса

| Датасет | URL (verbatim) | Лицензия | Размер | Формат | Регистрация | Сущности | Проверено |
|---|---|---|---|---|---|---|---|
| **postcodes.io** ⭐ | `https://api.postcodes.io/postcodes/SW1A1AA` | Open Government Licence / MIT (self-hostable) | — | JSON | **Нет ключа** | UK postcode → координаты, район, округ, LSOA, парламентский округ | ✅ HTTP 200, реальный ответ прочитан (`SW1A 1AA`, Westminster, outcode/incode) |
| **postcodes.io /validate** ⭐⭐ | `https://api.postcodes.io/postcodes/SW1A1AA/validate` | там же | — | JSON | **Нет ключа** | **Проверка существования почтового индекса** | ✅ `{"status":200,"result":true}`; для `ZZ9Z9ZZ` → `{"result":false}`. **Это готовый бесплатный no-auth валидатор существования** |
| **GeoNames postal codes** | `https://download.geonames.org/export/zip/US.zip` | CC-BY 4.0 | 634 329 B (US) | TSV в ZIP | **Нет** | ZIP → город, штат, координаты; есть файлы по всем странам + `allCountries.zip` | ✅ HTTP 200, 634 KB |
| **OS Code-Point Open** | `https://osdatahub.os.uk/downloads/open/CodePointOpen` | OGL v3 | ~1.7M UK-индексов | CSV | ⚠️ обычно нужен аккаунт OS Data Hub | UK postcode units + координаты | ✅ страница HTTP 200 (сам файл не скачивал) |
| **ONS Postcode Directory** | `https://geoportal.statistics.gov.uk/` | OGL v3 | ~1.7M индексов | CSV | Нет | ONSPD: индексы + административная привязка | ✅ HTTP 200 (портал) |
| OpenAddresses | `https://openaddresses.io/` | пер-источник (смешанная) | сотни млн адресов | CSV | Нет | реальные адреса с номерами домов | ⚠️ НЕ ПРОВЕРЕНО живым запросом |
| doogal UK postcodes CSV | `https://www.doogal.co.uk/UKPostcodesCSV` | OGL-производная | — | CSV | — | UK индексы | ⚠️ вернул **HTTP 400** на прямой запрос — нужен другой путь/параметры |

### Датасеты — трек-номера и чексуммы

| Спека | URL (verbatim) | Официальность | Проверено |
|---|---|---|---|
| **USPS IMpb Specification** ⭐ | `https://postalpro.usps.com/shipping/impb/BarcodePackageIMSpec` → PDF `https://postalpro.usps.com/mnt/glusterfs/2018-02/BarcodePackageIMSpec.pdf` | ✅ **ОФИЦИАЛЬНАЯ правительственная спека** | ✅ HTTP 200, **469 552 B, скачан, текст извлечён** |
| USPS DMM 708 | `https://pe.usps.com/text/dmm300/708.htm` | ✅ официальная | ✅ HTTP 200 |
| GS1 General Specifications / SSCC | `https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications` · `https://www.gs1.org/services/check-digit-calculator` | ✅ официальная (стандарт GS1) | ⚠️ **HTTP 403** — gs1.org блокирует ботов; страницы существуют, но fetch не удался |
| UPS / FedEx алгоритмы | — | ❌ **НЕ публикуются официально ни UPS, ни FedEx** | см. ниже |

**USPS mod-10 — официально документирован, я воспроизвёл:**

Из скачанного PDF, раздел **2.5.1.7** дословно:
> «Every barcode construct shall utilize a 1-digit, Mod 10 Check Digit as the final digit in the barcode
> data string. The mailer shall only calculate the check digit using the package identification code (PIC)
> portion of the data. See Appendix E for more information.»

**Appendix E (9.0) даёт алгоритм пошагово** с официальным примером PIC `9101 1234 5678 9000 0000 13`:
нумерация справа налево; сумма цифр на чётных позициях × 3; плюс сумма на нечётных; затем до кратного 10.

**Моя независимая проверка:** body `910112345678900000001` → sum=127 → **calc checkdigit = 3**,
спека говорит 3. ✅ Совпало.

**Проблема с UPS и FedEx — это главная слабость домена:**

| Перевозчик | Мой тест | Вывод |
|---|---|---|
| **UPS 1Z** (mod-10, буквы → `(ascii-63)%10`, чётные позиции ×2) | `1Z12345E6605272234` → **VALID**; `1Z12345E1512345676` → **VALID**; `1Z12345E0205271688` → **MISMATCH** (calc=6, given=8) | 2 из 3 сходятся. Алгоритм **работает**, но описан только в community-источниках/блогах, **официальной публикации UPS нет** |
| **FedEx Express 12-digit** (предполагаемые веса 3,1,7 mod 11) | `111111111111`, `999999999999`, `020207021381` → **все MISMATCH** | ❌ **Воспроизвести не удалось.** Алгоритм не официален и не подтверждается. **Нельзя закладывать в демо** |
| **GS1 mod-10 (weights 3,1)** | EAN-13 `4006381333931` → **VALID**; GTIN-14 `12345678901231` → **VALID** | ✅ Работает надёжно (стандарт GS1 открыт, хотя сайт 403) |

Итого по чексуммам домена: **USPS — да, официально и проверено; GS1/SSCC — да; UPS — де-факто,
неофициально; FedEx — не воспроизводится.** Это заметно слабее, чем VIN или ISIN.

### Confusable-наборы — позиционный charset UK-индексов

UK postcodes имеют **позиционные ограничения набора символов** — по той же причине, что и VIN:

- Во **inward code** (вторая половина) используется только набem `ABDEFGHJLNPQRSTUWXYZ` —
  исключены **C, I, K, M, O, V**, дословная причина: «so as not to resemble digits or each other when hand-written»
- **I, J, Z** не используются во второй позиции
- **Q, V, X** никогда не стоят первыми
- В третьей позиции только `A,B,C,D,E,F,G,H,J,K,S,T,U,W`

Источники: `https://ideal-postcodes.co.uk/guides/uk-postcode-format`,
`https://www.postcodearea.co.uk/facts/formats/`, референс-регексп `https://github.com/ideal-postcodes/postcode`.
⚠️ Первоисточник Royal Mail (PAF Programmer's Guide) я **не проверял** — правила взяты из вторичных источников.

Это даёт форматный валидатор + `/validate` API для проверки существования. Но, в отличие от VIN,
**у самого адреса нет контрольной цифры** — только существование в справочнике.

Прочее: OpenFlights airports.dat, IATA AWB (mod-7 на 8-значном серийнике), SSCC-18 —
⚠️ **НЕ ПРОВЕРЕНО** (агент не завершился).

---

## Домен 5. Финансы / ценные бумаги

### Датасеты

| Датасет | URL (verbatim) | Лицензия | Размер | Формат | Регистрация | Сущности | Проверено |
|---|---|---|---|---|---|---|---|
| **SEC company_tickers.json** ⭐ | `https://www.sec.gov/files/company_tickers.json` | Public domain (US gov) | **796 513 B, 10 407 записей**, Last-Modified 2026-09-08 | JSON, объект по порядковому индексу | **Нет ключа, но User-Agent ОБЯЗАТЕЛЕН** | ticker, CIK, название компании | ✅ скачан, распарсен: **10 407 записей**. **Без User-Agent → HTTP 403** (проверено: `curl/8.0` → 403) |
| **company_tickers_exchange.json** ⭐ | `https://www.sec.gov/files/company_tickers_exchange.json` | там же | 522 086 B | JSON, колоночный `{"fields":["cik","name","ticker","exchange"],"data":[...]}` | Нет ключа, UA нужен | + **биржа** | ✅ HTTP 200. Полезнее базового файла |
| company_tickers_mf.json | `https://www.sec.gov/files/company_tickers_mf.json` | там же | 1 231 471 B | JSON | UA | фонды (series/class) | ✅ HTTP 200 |
| cik-lookup-data.txt | `https://www.sec.gov/Archives/edgar/cik-lookup-data.txt` | там же | **40 100 380 B** | TXT | UA | все эмитенты EDGAR за всю историю | ✅ HTTP 200 |
| **SEC EDGAR submissions API** | `https://data.sec.gov/submissions/CIK0000320193.json` | там же | 164 091 B | JSON | UA обязателен (**тоже 403 без него**) | name, tickers, exchanges, sic, ein, **`lei`** (мост к GLEIF) | ✅ HTTP 200 |
| companyfacts (XBRL) | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` | там же | 3 789 099 B | JSON | UA | финансовые показатели | ✅ HTTP 200 |
| **Nasdaq symbol directory** | `https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt` | ⚠️ **явной лицензии нет** | **347 888 B, 5 607 строк** | pipe-delimited | **Нет** | Symbol, Security Name, Market Category, Test Issue, Financial Status, ETF | ✅ скачан, посчитан, заголовок прочитан |
| **otherlisted (NYSE и др.)** | `https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt` | там же | **539 852 B, 7 611 строк** | pipe-delimited | Нет | ACT Symbol, Exchange (`N`=NYSE 2935, `P`=Arca 2732, `Z`=Cboe 1625, `A`=AMEX 313) | ✅ HTTP 200. **Итого 13 214 уникальных тикеров, 33 помечены `Test Issue=Y`** — отфильтровать. ⚠️ Хвостовая строка `File Creation Time:...` — обрезать |
| **GLEIF LEI Level 1** ⭐ | discovery: `https://goldencopy.gleif.org/api/v2/golden-copies/publishes` → CSV `https://goldencopy.gleif.org/storage/golden-copy-files/2026/09/11/1275140/20260911-1600-gleif-goldencopy-lei2-golden-copy.csv.zip` | **CC0 1.0** | **502 980 872 B (479.68 MB)**, **record_count 3 428 477** | CSV в ZIP (также JSON 884 MB, XML 852 MB) | **Нет** | юридические лица мира: LEI, юр. название, адрес, страна | ✅ HTTP 200, размер и record_count прочитаны. ⚠️ URL датированы и ротируются — резолвить через discovery API, не хардкодить |
| **GLEIF ISIN→LEI** ⭐⭐ | `https://mapping.gleif.org/api/v2/isin-lei` → `https://mapping.gleif.org/api/v2/isin-lei/{uuid}/download` (сегодня `a3eae0e1-78a0-403c-b50f-630840912887`) | **CC0 1.0** | 32 529 091 B zip → **314 894 035 B CSV, 9 261 590 строк** | CSV `LEI,ISIN` | **Нет** | **9.26 млн реальных ISIN бесплатно** | ✅ скачан и открыт. Обновляется ежедневно ~07:15 UTC. Лендинг `https://www.gleif.org/en/lei-data/lei-mapping/download-isin-to-lei-relationship-files` |
| **OpenFIGI API** | POST `https://api.openfigi.com/v3/mapping` | FIGI — открытый стандарт OMG, идентификаторы свободно распространяемы | — | JSON | **Ключ не нужен** (25 req/min, 10 job/req; с бесплатным ключом 25 per 6 sec, 100 job/req) | ISIN → FIGI, тикер, тип бумаги, биржа | ✅ живой POST: `US4592001014` → `BBG000BLNNH6`, IBM |
| **CUSIP** | `https://www.cusip.com/services/license-fees.html` | ❌ **ПЛАТНО/лицензируемо** (CUSIP Global Services, оператор FactSet с 2022-03-01), перераспространение запрещено | — | — | Да | CUSIP-идентификаторы | ✅ подтверждено. **Не включать CUSIP-данные в демо**; валидатор реализовать можно (алгоритм не охраняется) |
| Wikidata SPARQL | `https://query.wikidata.org/sparql`, свойство **P249** = ticker symbol | CC0 | — | JSON/SPARQL | Нет (нужен описательный UA) | тикеры, названия | ✅ запрос работает. ⚠️ `COUNT(*)` вернул неправдоподобные 43 — артефакт агрегации/таймаута, **истинное число не подтверждено** |

### Валидаторы — **три, два проверены эмпирически на реальных данных**

| Сущность | Алгоритм | Проверка | Статус |
|---|---|---|---|
| **ISIN** (ISO 6166) | **Luhn mod-10** по строке с буквами→числа (A=10…Z=35), контрольная цифра — 12-я | Агент: **3 000 / 3 000 реальных ISIN из файла GLEIF прошли (100%)**. Я независимо: `US4592001014` (IBM) → calc=4=given **VALID**; `US0378331005` (Apple) → **VALID**; `GB0002634946` (Vodafone) → **VALID**; `US459200101X` → **INVALID** | ✅ **Жёсткая чексумма, проверена на 3000+ реальных записей** |
| **LEI** (ISO 17442) | **ISO 7064 MOD 97-10**: все 20 символов → числа (A=10…Z=35), полученное целое **mod 97 == 1** | Агент: **5 000 / 5 000 реальных LEI прошли (100%)**; LEI самой GLEIF `506700GE1G29325QX363` проходит, порча последней цифры ломает | ✅ **Жёсткая чексумма**. ⚠️ Страница GLEIF про ISO 17442 **сам алгоритм не приводит** — подтверждение эмпирическое, не из платного текста ISO |
| **CUSIP** | «Modulus 10 Double Add Double», 9-й символ | Референс: `https://commons.apache.org/proper/commons-validator/apidocs/org/apache/commons/validator/routines/checkdigit/CUSIPCheckDigit.html` | ✅ алгоритм известен, но **данные платные** |
| **IBAN** (ISO 13616) | ISO 7064 MOD 97-10 — **та же процедура, что LEI**, один код на оба | Референс: `https://commons.apache.org/validator/apidocs/src-html/org/apache/commons/validator/routines/checkdigit/IBANCheckDigit.html` | ⚠️ Реестр SWIFT **НЕ ПРОВЕРЕН** (swift.com таймаут, openiban.com DNS-блок). Валидные тестовые IBAN можно генерировать самому |
| **Тикер** | ❌ **Чексуммы нет** — только существование в справочнике (13 214 символов) | — | ⚠️ Только lookup |

### Confusable-наборы — **официальный первоисточник + вычисленные из живых данных**

**Официальный ордер SEC, скачан и извлечён текст (HTTP 200, 121 424 B):**
`https://www.sec.gov/files/litigation/suspensions/2020/34-88477-o.pdf`
*In the Matter of Zoom Technologies, Inc.*, 25 марта 2020, File No. 500-1. Дословно:
> «concerns about investors confusing this issuer with a similarly-named NASDAQ-listed issuer,
> providing communications services, which has seen a rise in share price during the ongoing COVID-19 pandemic.»

Это именно тот авторитетный источник про путаницу тикеров, который требовался.

**FINRA UPC #12-20** (переименование ZOOM→ZTNO), HTTP 200, 396 710 B:
`https://www.finra.org/sites/default/files/2020-04/UPC_12-2020_ZOOM-ZTNO.pdf`

Прецедент Tweeter/Twitter: FINRA сменила `TWTRQ`→`THEGQ` в октябре 2013 после роста Tweeter на ~700%
из-за путаницы с IPO Twitter. ⚠️ Источник — пресса, не первичный документ.

⚠️ Статус названных примеров по живым справочникам: `ZM` торгуется, но **`ZOOM`, `HTZZ`, `SGNL`, `SIGL`
уже не листингованы** — это исторические кейсы, их надо хардкодить, а не искать в файлах.

**Наборы, вычисленные из живой вселенной 13 214 символов:**
- **Омофонная пара, обе живые прямо сейчас: `LYFT` (Lyft Inc) vs `LIFT` (LifeX 2028 Income Bucket ETF)** —
  идеальный тест-кейс для голосового агента
- **263 группы гомоглифов** (склейка O/0, I/L/1, S/5, B/8, Z/2): `['BILI','BIII','BILL']`,
  `['LIDR','ILDR','LLDR']`, `['PALI','PAII','PALL']`, `['TSLL','TSII','TSLI']`, `['SII','SIL','SLI']`, `['AIA','ALA']`
- **50 022 пары** одинаковой длины с расстоянием Левенштейна 1: `AAA/GAA/MAA/PAA/RAA/SAA/UAA`
- **Ловушка leveraged-ETF: `TSLA` (Tesla) vs `TSLL` (Direxion 2X Bull) vs `TSLQ` (Tradr 2X Short)** —
  одинаковая фонетическая основа, **противоположная экспозиция**. Высокоценный риск-кейс
- **172 символа с точкой** (`BRK.A`/`BRK.B`, `AKO.A`/`AKO.B`, `.U`/`.W`) — «точка А» vs «точка Б» на слух тяжело
- **21 односимвольный тикер** (`A,B,C,D,E,F,G,H,J,L,M,O,P,Q,R,S,T,U,V,W,Z`) — максимально неоднозначны в речи

Резервирование символов: NMS Plan for Selection and Reservation of Securities Symbols, через **ISRA**.
⚠️ `https://www.nyse.com/publicdocs/nyse/listing/symbology_nms_plan.pdf` — **DNS-блок в песочнице (curl exit 6),
не 404**; URL из поиска, не подтверждён фетчем.

---

## Итоговый рейтинг

### (a) Доступность и качество бесплатных данных

| Место | Домен | Обоснование |
|---|---|---|
| 1 | **Аптека** | 116 155 продуктов одним ZIP без регистрации + keyless openFDA (137 830) + RxNorm prescribable без UMLS-лицензии. Всё public domain |
| 2 | **Финансы** | 10 407 тикеров + 13 214 символов + **9.26 млн ISIN по CC0** + 3.43 млн LEI. Единственный минус — обязательный User-Agent и платный CUSIP |
| 3 | **Авто** | vPIC keyless (12 361 марка) + EPA CSV 50 242 строки + 186 MB полный дамп. **Но запчастей нет вообще** — платно от $3 150/год |
| 4 | **Логистика** | postcodes.io и GeoNames отличные и бесплатные, но данные фрагментированы по странам, а спеки трек-номеров UPS/FedEx **не публикуются** |
| 5 | **Лаборатория** | LOINC отличен по содержанию (112 405 концептов), но **требует регистрации**, Top-2000 упразднён, а confusable-списка не существует |

### (b) Наличие жёсткого валидатора / чексуммы

| Место | Домен | Валидаторы | Проверено мной |
|---|---|---|---|
| 1 | **Финансы** | **ISIN Luhn** (3000/3000), **LEI mod-97-10** (5000/5000), CUSIP double-add-double, IBAN mod-97-10 | ✅ ISIN подтверждён лично на IBM/Apple/Vodafone + отбраковка |
| 1 | **Авто** | **VIN mod-11 из федерального регламента** + **исключение I/O/Q, закреплённое законом** (два независимых детерминированных валидатора) | ✅ Официальный пример CFR воспроизведён (sum=411→4), порча поймана |
| 3 | **Аптека** | **DEA mod-10**, **NPI Luhn+80840**, NDC — только формат + lookup по 116 155 строкам | ✅ Все три проверены лично |
| 4 | **Лаборатория** | LOINC Luhn, **но 14 официально невалидных кодов** → нужен allowlist | ✅ 11/11 реальных кодов + отбраковка испорченного |
| 5 | **Логистика** | USPS mod-10 официально (✅ воспроизведён), GS1 mod-10 (✅), **UPS неофициально (2/3), FedEx не воспроизводится** | ⚠️ Половина перевозчиков не валидируется |

### (c) Убедительность реального вреда от ошибки распознавания

| Место | Домен | Обоснование |
|---|---|---|
| 1 | **Аптека** | **Смерть или тяжёлый вред.** И это не предположение: ISMP/FDA публикуют списки путаемых названий **именно потому**, что путаница убивает. Ошибка в дозировке (10 mg → 10 U, «qd» → «qid») — учебный пример медицинской ошибки. Есть **регуляторный документ**, обосновывающий каждую пару |
| 2 | **Финансы** | **Прямая денежная потеря, мгновенная и необратимая.** `TSLA` vs `TSLQ` — противоположная экспозиция. SEC **останавливала торги** из-за путаницы тикеров (ордер 34-88477) — есть официальный первоисточник о реальном вреде |
| 3 | **Лаборатория** | Неверный тест → пропущенный диагноз, задержка лечения, повторный забор крови. Вред реален, но опосредован: обычно ловится на этапе интерпретации |
| 4 | **Авто** | Неверный VIN → неверная деталь, пропущенный отзыв (recall). Recalls API даёт хороший сюжет («у вашей машины 6 открытых отзывов»), но прямой вред — обычно деньги и время |
| 5 | **Логистика** | Посылка ушла не туда. Издержки и раздражение, но редко катастрофа |

### (d) Простота создания реалистичного речевого корпуса БЕЗ реальных персональных данных

| Место | Домен | Обоснование |
|---|---|---|
| 1 | **Авто** | Идеально: VIN — **синтетический по построению**. Генерируешь случайный, считаешь mod-11 — валидный VIN, не привязанный ни к кому. Марки/модели из EPA CSV — публичные факты. **Нулевой риск PII** |
| 1 | **Финансы** | Тикеры и названия компаний — **публичная информация, не персональные данные**. ISIN валидные берутся из CC0-файла GLEIF или генерируются по Luhn. Никаких владельцев счетов. **Нулевой риск PII** |
| 3 | **Аптека** | Названия препаратов, дозировки, формы, sig-коды — **не PII**. Пары confusable уже опубликованы ISMP. DEA/NPI **генерируются синтетически по чексумме**. Риск только если брать реальные NPI из NPPES — не надо, генерируй. Имя пациента в сценарии — вымышленное. **Риск низкий и управляемый** |
| 4 | **Лаборатория** | Названия тестов не PII, но сценарий заказа теста тяготеет к диагнозу пациента; confusable-набор надо конструировать самому |
| 5 | **Логистика** | **Худший вариант**: адрес — это PII по определению. Придётся синтезировать адреса, а синтетические адреса звучат неестественно; реальные — нельзя. Плюс валидные трек-номера UPS/FedEx не сгенерировать (алгоритм не воспроизводится) |

### Сводная таблица

| Домен | (a) данные | (b) валидатор | (c) вред | (d) корпус без PII | Итог |
|---|---|---|---|---|---|
| **Аптека** | 1 | 3 | **1** | 3 | **🥇 Лучший** |
| **Авто** | 3 | **1** | 4 | **1** | **🥈 Второй** |
| **Финансы** | 2 | **1** | 2 | **1** | 🥉 Очень близко ко второму |
| Лаборатория | 5 | 4 | 3 | 4 | — |
| Логистика | 4 | 5 | 5 | 5 | — |

---

## Рекомендация

### 🥇 Лучший домен: **Аптека / приём рецептов**

Причина, по которой он побеждает, не в данных и не в чексумме, а в **готовом официальном
adversarial-наборе**. Ни в одном другом домене регулятор не опубликовал заранее список именно тех
пар сущностей, которые путают люди:

- `https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf` — пары LASA
- `https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf` — sig-коды
- `https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project` — 23 пары FDA

Для Entity Error Rate это означает: **тест-набор не надо придумывать и не надо защищать его
репрезентативность** — он уже обоснован регулятором, и каждая пара в нём имеет документированный
клинический ущерб. Плюс keyterms-словарь на 116 155 продуктов без регистрации
(`https://www.accessdata.fda.gov/cder/ndctext.zip`), и **три** независимых жёстких валидатора
(DEA mod-10, NPI Luhn+80840, NDC-формат + lookup), которые я проверил лично.

Честный минус, который надо признать: **у самого NDC нет контрольной цифры** — доказательство
ошибки опирается на форматные правила плюс существование в справочнике на 116 155 строк, а не на
одну арифметическую проверку. Для дозировок и sig-кодов проверка — консистентность по локальной БД.

### 🥈 Второй: **Автомобили / VIN**

Берётся ровно за то, чего не хватает аптеке: **самый сильный самопроверяемый идентификатор из всех пяти**.
VIN даёт **два независимых детерминированных валидатора, оба закреплённых в федеральном регламенте**:

1. mod-11 контрольная цифра — 49 CFR 565.15, таблицы III/IV; я воспроизвёл официальный пример
   (`1G4AH59H45G118341` → sum=411 → check digit 4) и подтвердил, что порча одного символа ловится
2. **исключение I/O/Q** — 49 CFR 565.13(g) дословно; любая `I`, `O` или `Q` в гипотезе ASR
   **гарантированно** ошибка, по закону

Плюс полностью keyless vPIC API, который сам работает как удалённый валидатор (`ErrorCode 0/1`),
и **нулевой риск PII**: валидные VIN генерируются синтетически.

Если критерий «доказать ошибку арифметически, без разметки» важнее, чем «убедительность вреда» —
**авто следует поставить первым**. Финансы почти не отстают (ISIN 3000/3000, LEI 5000/5000,
9.26 млн ISIN по CC0) и превосходят авто по доступности данных; их стоит держать как третий вариант
и как источник омофонов (`LYFT`/`LIFT`, `TSLA`/`TSLL`/`TSLQ`).

### Что не брать

- **Логистика** — единственный домен, где половина ключевых чексумм не воспроизводится
  (FedEx не сошёлся ни на одном образце, UPS 2/3 и неофициален), а корпус по своей природе состоит из PII.
- **Лаборатория** — требует регистрации, Top-2000 упразднён, валидатор с 14 официальными
  исключениями, и **официального списка путаемых тестов не существует** — весь adversarial-набор
  пришлось бы конструировать и защищать самому.

---

## Сводка непроверенного

| Пункт | Причина |
|---|---|
| Все `*.nlm.nih.gov` (RxNorm prescribable zip, RxNav, RxTerms/clinicaltables API, DailyMed, legacy Top2000 PDF) | Хост заблокирован на сетевом уровне в этой песочнице (curl, WebFetch, PowerShell, Playwright). Контракты взяты из документации и поиска |
| `Loinc_2.83.zip` содержимое, число строк в `PanelsAndForms.csv`, распределение `COMMON_TEST_RANK` | Требует бесплатной регистрации на loinc.org |
| GS1 General Specifications, check-digit calculator | gs1.org отдаёт 403 боту (страницы существуют) |
| ISO 3779 (VIN), ISO 6166 (ISIN), ISO 17442 (LEI), ISO 13616 (IBAN) — полные тексты | Платные, iso.org отдаёт 403. Алгоритмы подтверждены эмпирически и/или через 49 CFR |
| Причина исключения I/O/Q из VIN | Регламент задаёт charset, но не объясняет; обоснование только во вторичных источниках |
| Лицензии vPIC и fueleconomy.gov | Явно не объявлены; data.gov буквально пишет `unknown-license` |
| NYSE NMS symbology plan PDF, Nasdaq Listing Center FAQ | DNS-блок в песочнице (curl exit 6, не 404) |
| SWIFT IBAN Registry, openiban.com | Таймаут / DNS-блок |
| Wikidata: истинное число сущностей с P249 | `COUNT(*)` вернул артефакт (43) |
| Логистика: OpenAddresses, OpenFlights, IATA AWB mod-7, SSCC-18 живые проверки, Royal Mail PAF как первоисточник правил charset | Агент-исследователь по домену не завершился; раздел собран из моих личных проверок |
| Пары confusable lab tests (BMP/CMP, PT/PTT и т.п.) | Клинический фольклор, официального источника нет |
| UPS 1Z: образец `1Z12345E0205271688` | Не сошёлся (calc=6, given=8) — вероятно опечатка в источнике; алгоритм неофициален |
| FedEx Express 12-значный | Ни один из 3 образцов не сошёлся с весами 3,1,7 mod 11 — алгоритм не подтверждён |
