# Проверка нейминга: voice-AI prescription intake (hackathon demo)

Дата проверки: 2026-09-15. Метод: WebSearch + прямые HTTP-запросы к github.com, registry.npmjs.org, pypi.org, доменам.

---

## Термин read-back в авиации и медицине

**Главный вывод: «read-back» — не выдуманное слово, а официальный термин процедуры безопасности в обеих отраслях. Именно эту процедуру автоматизирует продукт. Это сильнейший нейминговый аргумент во всём списке.**

### Авиация (ICAO)

Определение read-back:

> "A readback is a procedure whereby the receiving station repeats a received message or an appropriate part thereof back to the transmitting station so as to obtain confirmation of correct reception."

Обязанность контролёра прослушать повтор (это и есть **hear-back**, вторая половина петли):

> "The controller must listen to the read-back to ascertain that the clearance or instruction has been correctly acknowledged by the flight crew and shall take immediate action to correct any discrepancies revealed by the read-back."

Элементы, которые экипаж обязан повторять **всегда**:

> "ATC route clearances; clearances and instructions to enter, land on, take off from, hold short of, cross or backtrack on any runway; and runway-in-use, altimeter settings, SSR codes, level instructions, heading and speed instructions and transition levels."

> "Other clearances or instructions, including conditional clearances, must be read back or acknowledged in a manner to clearly indicate that they have been understood and will be complied with."

Пара **read-back / hear-back** — устойчивый термин: ошибка называется «readback/hearback error», в отрасли есть отдельная таксономия таких инцидентов.

Источники:
- SKYbrary, «Read-back or Hear-back»: https://skybrary.aero/articles/read-back-or-hear-back (ссылается на ICAO Annex 11, Chapter 3, para 3.7.3)
- ICAO APAC ATM/SG/13 IP/06, «Importance of ATC Readback and Hearback» (2025): https://www.icao.int/sites/default/files/APAC/Meetings/2025/2025%20ATMSG13/04-Information%20Papers/IP06%20Importance%20of%20ATC%20Readback%20and%20Hearback%20%20.pdf
- ICAO Annex 10 (Aeronautical Telecommunications), Vol II: https://skybrary.aero/sites/default/files/bookshelf/2279.pdf
- ICAO Phraseology Reference Guide: https://skybrary.aero/bookshelf/books/115.pdf
- NASA ASRS Directline, разбор readback/hearback-ошибок: https://asrs.arc.nasa.gov/publications/directline/dl1_read.htm
- IVAO, «Readback»: https://wiki.ivao.aero/en/home/training/documentation/Readback

*Не удалось верифицировать напрямую:* точный номер параграфа ICAO Doc 4444 (PANS-ATM) — SKYbrary и ICAO возвращают 403 при автоматическом фетче. SKYbrary ссылается на **Annex 11, para 3.7.3** (подтверждено снипетом поиска). Формулировка «Doc 4444 4.5.7.5.1» в поиске фигурировала, но первоисточником не подтверждена.

### Клиническая практика (Joint Commission)

Read-back — прямое требование **National Patient Safety Goals**, впервые введённое в **2003 году** (NPSG по коммуникации; исторический номер — NPSG.02.02.01 / goal 2A в редакциях 2005–2009).

Формулировка требования:

> "For verbal or telephone orders or for telephonic reporting of critical test results, verify the complete order or test result by having the person receiving the order or test result read-back the complete order or test result."

Процедура (три шага замкнутой петли):

> "The individual receiving the information writes down the complete order or test result or enters it into a computer. The individual receiving the information reads back the complete order or test result, and the individual who gave the order or test result confirms the information that was read back."

Цель:

> "...to reduce or eliminate error caused by oral miscommunication of a medication to be administered and assure that critical test results have appropriate actions taken to protect the patient."

Критические результаты тестов покрывают:

> "...all diagnostic tests including imaging studies, electrocardiograms, and laboratory tests."

Отраслевой термин в медицине тоже парный — **readback/hearback**, и он прямо позаимствован из авиации:

> "Readback/hearback is the fundamental mechanism of closed-loop communication, an essential ground rule for communication among members of small groups managing complex, high-consequence processes."

AHRQ TeamSTEPPS называет тот же паттерн **check-back** (closed-loop communication), а версию для пациента — **teach-back**.

Источники:
- Joint Commission NPSG: https://www.jointcommission.org/standards/national-patient-safety-goals/ (403 при автофетче; содержание подтверждено вторичными источниками ниже)
- «Complying with JCAHO's read-back requirement», AHC Media, 2004: https://www.clinician.com/articles/3840-complying-with-jcaho-8217-s-read-back-requirement
- Joint Commission 2005 NPSG (полный текст goal 2A): https://www.clinician.com/articles/1628-joint-commission-2005-national-patient-safety-goals
- Accreditation Program: Hospital NPSG 2009 (PDF): https://www.hillrom.ca/content/dam/hillrom-aem/us/en/marketing/products/acuitylink-clinician-notifier/documents/2009-National-Patient-Safety-Goals_Reference.pdf
- Barenfanger et al., «Closing the Communication Loop: Using Readback/Hearback to Support Patient Safety», Jt Comm J Qual Saf: https://www.sciencedirect.com/science/article/abs/pii/S1549374104300535
- AHRQ TeamSTEPPS, Closed-Loop Communication: https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/loop.html
- AHRQ TeamSTEPPS, Teach-Back: https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/teachback.html
- ISMP, «Despite technology, verbal orders persist, read back not widespread»: https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf
- PA Patient Safety Advisory, «Improving the Safety of Telephone or Verbal Orders»: https://patientsafety.pa.gov/ADVISORIES/Pages/200606_01b.aspx

**Нейминговый вывод:** название Readback мгновенно понятно клиницисту и фармацевту — оно описывает ровно тот регуляторно обязательный шаг, который продукт автоматизирует. Это не метафора, а точный термин. Есть даже патенты на автоматическое детектирование readback/hearback-ошибок в авиации (EP 2874133 A1, US 2016/0155435) — подтверждает, что «автоматизация read-back» — признанная инженерная задача.

---

## Таблица кандидатов

| Имя | Коллизии | Риск в медицине/voice | Товарный знак | Смысл/благозвучие | github.com/&lt;name&gt; | Вердикт |
|---|---|---|---|---|---|---|
| **Readback** | npm `readback` (alpha 0.0.0-alpha.10, «Transcribes ATC transmissions into readable text» — авиация + voice); PyPI `readback` 0.1.0 (echo-confirmation validation, микропакет); домен readback.com занят | **Средний-высокий.** readback.com = **ReadBack Medical Imaging**, активная компания, AI для радиологии/PACS. Медицина, но другой сегмент (imaging, не voice/pharmacy). В voice-AI для рецептов коллизий **не найдено** | Отдельного известного бренда нет; слово — общеотраслевой термин (generic/descriptive): ослабляет чужие притязания, но и свой ТЗ получить трудно | Идеально: точный термин ICAO + Joint Commission. Легко произносится и пишется | **404 — свободен** | **Лучший выбор.** Термин работает на продукт |
| **ReadBack** | То же (регистр не создаёт нового имени); readback.com официально пишется именно «ReadBack» | То же + **точное совпадение написания** с ReadBack Medical Imaging | То же | То же | 404 (GitHub регистронезависим) | Писать **Readback**, не ReadBack — так дальше от medical-imaging-компании |
| **Teachback** | github.com/teachback — **организация «TeachBack»** (1 репо); teachback.ai отвечает 200 (содержимое не верифицировано); npm/PyPI свободны | **Высокий концептуальный.** «Teach-back» — официальный термин AHRQ, но про **обучение пациента**, а не про подтверждение рецепта. Семантически неверно | Нет известного бренда | Благозвучно, но смысл сдвинут | **200 — занят** | Отклонить: неверная семантика + GitHub занят |
| **Attest** | npm `attest` (a11y-библиотека); PyPI `attest` 0.5.3 (unit testing); github.com/attest — **организация Attest, 19 репо** | Низкий в медицине | **Высокий. Attest** — Series B SaaS (consumer insights), London/NY, ~$10–25M ARR, ~119 сотрудников, инвестор NEA, askattest.com | Ясное, юридический оттенок, но родовое | **200 — занят** | Отклонить: сильный живой бренд + занятые npm/PyPI/GitHub |
| **Provenance** (voice) | npm `provenance`; PyPI `provenance` 0.14.1; github.com/provenance — организация | Низкий в медицине | **Высокий. Provenance (provenance.org)** — B Corp, supply-chain transparency, осн. 2013, ~$5.8M funding. Также термин в software supply chain (SLSA/JFrog) | Красивое, но длинное, трудно для не-носителей, прочно = supply chain/blockchain | **200 — занят** | Отклонить: занято по всем осям, смысл уводит в блокчейн |
| **Spanwise** | npm `spanwise` 0.2.2 (активен, сентябрь 2026, a11y); github.com/spanwise — **организация «Spanwise — Wise observability»** | Низкий | Нет известного | «По размаху крыла» / «по span'ам трейсинга» — читается как observability-инструмент | **200 — занят** | Отклонить: занято + семантика про observability |
| **Wordproof** | github.com/wordproof — **организация WordProof, 12 репо**; wordproof.com — активный продукт | Низкий в медицине | **Очень высокий. WordProof** (Амстердам, осн. Sebastiaan van der Lans) — blockchain timestamping для контента, победитель EU «Blockchains for Social Good» (€1M), инвестор Yoast SEO | Ок, но «-proof» уводит в блокчейн/копирайт | **200 — занят** | Отклонить: прямой живой бренд |
| **Verbatim** (voice) | npm `verbatim`; **PyPI `verbatim` 1.3.6 — «high quality multi-lingual speech to text»** — прямая коллизия в voice AI; github.com/verbatim — пользователь | **Высокий в voice.** PyPI-пакет verbatim — это именно STT-библиотека; продукт будет выглядеть производным | **Высокий. Verbatim Corporation** — известный бренд носителей данных (осн. 1969, Kodak → Mitsubishi → CMC Magnetics, 2020) | Смысл хороший («дословно»), но имя перегружено | **200 — занят** | Отклонить: двойная коллизия — voice-AI пакет + потребительский бренд |
| **Sayback** | npm/PyPI свободны; sayback.ai не отвечает (домен, вероятно, свободен); github.com/sayback — **организация, 0 репо** (squat) | Коллизий в медицине/voice не найдено | Нет | Понятно, разговорно, дружелюбно. Но «say back» — не отраслевой термин, звучит по-детски | **200 — занят** | Возможный fallback; семантически бледнее Readback |
| **Confirm Loop / ConfirmLoop** | npm 404, PyPI 404; confirmloop.ai не отвечает; продуктовых коллизий не найдено | Не найдено. Концептуально близко к «closed-loop communication» (AHRQ) — плюс | Нет | Точно описывает механику. Минус: два корня, звучит как B2B-фича, а не продукт | **404 — свободен** | **Сильный №2.** Полностью чистый + верная семантика |
| **Chainofcustody** | npm/PyPI свободны как одно слово; «chain of custody» — родовой юридический/форензик-термин, десятки продуктов (SAFE by Tracker Products, LabVantage Forensic Navigator) | Термин из forensics/лабораторий, не из фармации; будет читаться как evidence management | Родовой термин, ТЗ не получить | Слитно нечитаемо. Смысл = «вещдоки / уголовное дело» — неуютная ассоциация для пациента | **404 — свободен** | Отклонить: неблагозвучно + неверная ассоциация |
| **Heardwell** | github.com/heardwell — 404; npm/PyPI свободны; **heardwell.com занят** (301 → instagram.com/heardwell) | Низкий в медицине/voice | **Средний. Heard Well** — американский музыкальный лейбл, осн. 2015 (Connor Franta, Jeremy Wineberg, Andrew Graham), дистрибуция через Sony RED. Пишется в два слова | Мягко, «услышан хорошо» — уместный тон для health, но звучит как wellness-бренд, не safety-tool | **404 — свободен** | Слабый: .com занят, лейбл-коллизия, смысл размыт |
| **Soundproof** | npm/PyPI свободны; github.com/soundproof — **пользователь, 1 репо** | Низкий | **Средний.** «SOUNDPROOF» — зарегистрированный ТЗ (Trademarkia 75609385); Trademark Soundproofing Inc. (рег. 5486491) — акустические материалы | **Смысл инвертирован: «soundproof» = «не пропускающий звук»,** буквально антоним voice-продукта. Плюс есть академический Sound-Proof (2FA по звуку, ETH Zurich) | **200 — занят** | Отклонить: смысл противоположный |
| **Earshot** | npm свободен; **PyPI `earshot` 1.2.2 — «Ridiculously fast & accurate voice activity detection»** — коллизия в voice AI; github.com/earshot — пользователь, 0 репо | **Высокий в voice.** VAD-библиотека прямо в предметной области | Нет крупного бренда | Хорошо звучит, «в пределах слышимости». Минус: «-shot» читается как инъекция/выстрел | **200 — занят** | Отклонить: занятый voice-AI пакет на PyPI |
| **Audible Trail / AudibleTrail** | npm/PyPI свободны; github.com/audibletrail — 404 | Не найдено | **Высокий. Audible** (Amazon) — очень сильный ТЗ в аудио; любое «Audible*» в аудиосфере — зона риска | «Слышимый след» (audit trail + audio) — точно по смыслу, но два слова, громоздко | **404 — свободен** | Отклонить: Amazon/Audible слишком близко в аудио-домене |
| **Sicsic** (от мед. «sic») | npm/PyPI свободны; github.com/sicsic — пользователь, 0 репо | Не найдено | Нет | **Плохо.** Читается как «sick sick» — «больной, больной» для health-продукта. Латинское «sic» пользователь не распознает; в ряде языков — фамилия/посторонние ассоциации | **200 — занят** | Отклонить: неудачные коннотации в health-контексте |
| **Repeatback** | npm 404, PyPI 404; repeatback.ai не отвечает; продуктовых коллизий не найдено | Не найдено. В клинической литературе «repeat-back» — синоним read-back (плюс) | Нет | Понятно, но на слог тяжелее Readback и менее канонично | **404 — свободен** | **Сильный №3** / fallback |
| **Ledgerline** | npm `ledgerline` 0.1.3; **PyPI `ledgerline` 0.3.3** (personal finance + MCP); несколько компаний: LedgerLine Technologies, LedgerLine Accounting, Ledgerline LLC, Ledgerline (invoicing, itch.io) | Низкий в медицине | Нет одного доминирующего, но поле переполнено мелкими | Прочно = бухгалтерия/финансы; для рецептов вводит в заблуждение | **200 — занят** | Отклонить: переполненное поле + смысл = finance |

---

## Рекомендация

### 1. Readback — лучший выбор

Почему:
- **Название = термин процедуры, которую продукт автоматизирует.** Read-back обязателен по ICAO для экипажей и по Joint Commission NPSG (с 2003) для verbal orders и critical test results. Клиницист и фармацевт поймут название без объяснений. Для питча это готовый нарратив: «мы автоматизируем read-back — регуляторно обязательный шаг, который люди на практике пропускают» (подтверждено ISMP).
- **github.com/readback свободен** (404) — доступны и org, и репо.
- **В voice AI для фармации/рецептов коллизий не обнаружено** — целевой сегмент чист.

Риски (принять осознанно):
- **readback.com = ReadBack Medical Imaging** — живая компания в радиологии/PACS. Медицина, но другой сегмент. Для хакатон-демо приемлемо; для коммерческого запуска нужна юридическая проверка и другой домен.
- npm `readback` занят alpha-пакетом, который сам про ATC-транскрипцию; PyPI `readback` — микропакет 0.1.0. Оба слабые; при необходимости брать `@readback/...` или `readback-ai`.
- Домены: `readback.ai` отвечает 200 — **занят он или припаркован, верифицировать не удалось, проверить вручную**. Альтернативы: `readback.dev` (404, вероятно свободен), `getreadback.com`, `readbackhealth.com`.
- Как descriptive-термин слово почти нерегистрируемо как ТЗ «в чистом виде» — это защита от чужих претензий, но и невозможность защитить своё. Для хакатона — плюс.

Писать как **Readback** (одно слово, один капитал) — дальше от «ReadBack Medical Imaging».

### 2. ConfirmLoop — самый чистый по рискам

Полностью свободен: npm 404, PyPI 404, **github.com/confirmloop 404**, confirmloop.ai не отвечает, продуктовых и ТЗ-коллизий не найдено. Семантика верная — прямая отсылка к closed-loop communication (AHRQ). Минус: два корня, звучит как B2B-фича; узнаваемости «read-back» не даёт. Брать, если приоритет — юридическая чистота, а не отраслевая узнаваемость.

### 3. Repeatback — компромисс

Свободен по всем осям: npm, PyPI, **github.com/repeatback 404**, repeatback.ai не отвечает, коллизий нет. «Repeat-back» — реальный синоним read-back в клинической литературе, отраслевой смысл сохраняется. Минус: менее канонично и на слог длиннее.

### Что отклонить сразу
Attest, Provenance, Wordproof, Verbatim (живые бренды и/или занятые voice-AI пакеты) · Earshot (PyPI VAD-библиотека) · Soundproof (смысл инвертирован + ТЗ) · Sicsic («sick sick») · AudibleTrail (Amazon/Audible) · Ledgerline, Chainofcustody, Spanwise, Teachback, Heardwell, Sayback (занято, не та семантика или слабо).

---

## Что верифицировать не удалось

- Точный параграф **ICAO Doc 4444 (PANS-ATM)** — доступ к первоисточнику заблокирован (403). Подтверждена ссылка на **Annex 11, para 3.7.3**.
- Актуальный номер NPSG у Joint Commission на 2026 год — jointcommission.org отдаёт 403. Требование подтверждено по редакциям 2005/2008/2009 и вторичным источникам.
- Содержимое **readback.ai** и **teachback.ai** (HTTP 200, но HTML не извлёкся) — открыть вручную в браузере перед решением о домене.
- Полноценный поиск по реестрам товарных знаков (USPTO TESS, EUIPO) **не проводился** — только веб-поиск. Перед коммерческим использованием нужна отдельная проверка.
