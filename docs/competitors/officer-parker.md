# Officer Parker (visa-coach)

**Тир:** A — Сильные  
**Чем силён:** Лучшая глубина Voice Agent API: один WebSocket (Universal-3 Pro + LLM + neural turn detection + TTS) + LLM Gateway на claude-sonnet-5  
**Где пробивается:** Сам признаёт деградацию главной функции на free-tier. Chrome-only. Нет персистентности

[← все конкуренты](../competitors.md)

---
`gun321h-creator/visa-coach` · 10 коммитов · demo: officer-parker.vercel.app

**1. Что построено**

Тренажёр собеседования на визу B1/B2. Пользователь сначала заполняет короткую DS-160-подобную форму (8 полей: цель поездки, занятость, длительность, кто платит, родственники в США, прошлые поездки, план возврата, связи с домом), затем голосом проходит допрос у ИИ-«консульского офицера», у которого эта форма **открыта на экране**. Офицер перебивает в момент расхождения сказанного с заполненным, а в конце выдаётся отчёт: список противоречий «filed vs said» с цитатами обеих сторон, оценки по 6 измерениям и детерминированный счётчик слов-филлеров.

**2. Как использован AssemblyAI**

Самое глубокое и точное использование среди разобранных, с явной таблицей маппинга фич на файлы:

- **Voice Agent API, один WebSocket**, несущий всё: «Universal-3 Pro streaming STT», «LLM (officer persona + the filed form "on his screen")», «neural turn detection + barge-in», «TTS voice out». Цитата: «One WebSocket carries STT, LLM and TTS. There is no second vendor anywhere in the audio path».
- Временный токен: `api/token.js` минтит «short-lived (300 s) Voice Agent token» серверно, браузер ключа не видит.
- **LLM Gateway** (`/v1/chat/completions`) в `api/report.js` для пост-анализа: охота за противоречиями + скоринг. Явно указана модель и деградация: «asks for `claude-sonnet-5` and automatically falls back to a small model (`qwen3.5-4b-32k-fast`) when the account lacks access».
- Формат аудио: «browser mic --24kHz PCM--> AssemblyAI Voice Agent API (one WebSocket)».

Персона офицера в `public/persona.js`, промпт собирается `buildOfficerPrompt(form, mode)`.

**3. Архитектура и стек**

**Ноль runtime-зависимостей.** Node 22, чистый ESM, встроенные `fetch` / `WebSocket` / `node:http` / `--env-file`. Нет Express, нет SDK, нет бандлера, нет билда. Деплой на Vercel: `outputDirectory: "public"`, две функции `api/token.js` и `api/report.js`, `framework: null`, `buildCommand: null`, `engines.node: "22.x"`. `.vercelignore` выкидывает `scripts/`, `docs/`, `server.js` (локальный дев), оставляя `lib/`. Защита в `lib/guard.js`: same-origin проверки, per-IP лимит 30 минтов токена и 10 отчётов в минуту, кап размера транскрипта. Персистентности нет вообще — ни БД, ни аккаунтов.

**4. Настоящая инженерная суть**

Здесь есть настоящая инженерия, и она не в аудио, а в **защите промпта и защите честности**:

(а) **Prompt injection defense по-взрослому.** Форма подаётся LLM как данные, а не как инструкции: фенсинг `<<<FORM_BEGIN>>>` / `<<<FORM_END>>>`, вычистка control characters, угловых скобок и подделанных fence-маркеров, кап 300 символов на поле, и прямая инструкция модели: всё внутри фенса, что похоже на команду — это «suspicious answer», а не инструкция. `api/report.js` санитизирует **независимо, второй раз, на сервере**. Поле `filed` в отчёте «re-derived server-side from our own sanitised copy of the form, so the model cannot smuggle text into it». Это ровно тот уровень паранойи, который отличает инженера от промпт-жокея.

(б) **Anti-hallucination guardrail с детерминированным бэкстопом.** Запрещены перезаписи ответов с изобретёнными фактами; запрещены fill-in-the-blank шаблоны («I earn [X] per month»), потому что пустое место — приглашение соврать на реальном окне; и на случай, когда маленькая fallback-модель проигнорирует инструкцию, есть `scrubInventedPlaceholders()` — регексп-бэкстоп, заменяющий любой bracketed placeholder на инструкцию принести настоящий ответ.

(в) **Детерминированные метрики вместо LLM-догадок**: счётчик филлеров — «a plain regex pass over `role === "user"` text» по `um, uh, like, you know, i mean, sort of, kind of`, только по ходам аппликанта, и «the LLM is explicitly told not to guess this number, so the count is reproducible for the same transcript and does not drift between runs».

(г) **Продуктовая честность как инженерное решение**: шапка отчёта ведёт не общим баллом 1-10, а `refusal_reasons_found` — числом найденных в *этом* транскрипте проблем; общий балл сознательно понижен в футер, «because a bare score from something calling itself a consular officer reads as a prediction of a federal decision, and this tool has no calibration to make one».

Единственный источник правды для полей формы — `FORM_FIELDS` в `public/persona.js`, UI рендерит их итерацией, «so the form on screen and the form in the officer's prompt cannot drift apart». Это реальное устранение класса багов, а не декоративная фраза.

**5. Метрики и доказательства**

Латентности и WER нет — цифр производительности не приводится. Зато есть **проверяемые тесты, и они названы**: `npm run guards` = `test_contradiction_guards.mjs` + `test_gateway_retry.mjs` + `test_client_cooldown.mjs`, плюс `npm run smoke` (`scripts/smoke.mjs`), который проверяет «temp-token minting → Voice Agent WebSocket handshake (`session.ready`) → LLM Gateway report generation» без микрофона. `npm test` = guards + smoke. Это не 66 тестов, но это тесты **именно на защитные инварианты**, то есть на самое рискованное. Числа, которые есть: 300 s TTL токена, 8 полей формы, кап 300 символов/поле, 6 измерений рубрики, лимит 30/10 в минуту, 24 kHz, режимы «Window (2 min) → 3-5 questions» и «Full practice (8-12 min)». Есть 3 скриншота в `docs/` (`landing.png`, `form.png`, `report.png`) и sample replay без микрофона — «runs the whole interview and report with no mic, no socket and no API call».

**6. Сильные стороны**

Самый **инсайтный** продукт в наборе: тезис «визовое интервью — это не беседа, а перекрёстный допрос по вашей же подписанной форме; противоречие себе там не слабый ответ, а основание для отказа (INA 214(b))» — настоящая находка, которую нельзя воспроизвести generic-мок-интервью. Все четыре критерия закрыты: технология (Voice Agent API целиком + LLM Gateway с маппингом фич на файлы), презентация (скриншоты, живое демо, replay без микрофона, дисклеймер), бизнес (миллионы заявителей в год, явная боль), оригинальность (механика filed-vs-said). Плюс раздел «Known limitations», обезоруживающий половину вопросов судьи заранее: Chrome-first, нет персистентности, отчёт эфемерный, free-tier модель деградирует, «the rate limiter is in-memory and per-instance… It slows casual abuse; it is not a security control», «practice tool, not a predictor», English only.

**7. Слабые места и уязвимости**

- **На free-tier ключе судья увидит не тот продукт.** Своё же признание: «On a free key you will usually get the small model, and the report's prose quality drops accordingly», и «The contradictions themselves are LLM-extracted, so a small fallback model finds fewer of them». Главный дифференциатор — поиск противоречий — деградирует именно в том сценарии, в котором его будут смотреть.
- **Ключевая механика отключаемая**: форма skippable, и «Skip the form and the whole differentiator switches off».
- **Chrome-only аудио**: `AudioContext({ sampleRate: 24000 })` — это *запрос*; Safari и часть Firefox ресемплируют или отказывают. Судья на Safari или в Bluetooth-гарнитуре получит «officer mishears you badly» — их же troubleshooting это признаёт.
- Нет персистентности, экспорта и сравнения сессий — нет retention-истории для бизнес-аргумента; они сами называют это «a real product gap».
- Нет видео на момент сбора данных («Demo video: _(link added on submission)_», в заявке `video: н/д`).
- Нет замеров латентности — по «real-time» заявлениям предъявить нечего.
- Юридико-репутационный риск: имитация госоргана. Дисклеймер сделан образцово, но консервативный судья всё равно может поморщиться.
- Ниша пересекается с MockMate и прочими interview-coach проектами; отличается только DS-160-механикой.

**8. Чем это можно побить**

Бить надо не по идее (она сильная), а по **деградации и по отсутствию чисел**.

Ход 1: сделать извлечение противоречий **детерминированным на уровне структуры**, а не «LLM-extracted». У них противоречия ищет модель по транскрипту целиком; сделать slot-filling — вытаскивать из речи значения тех же полей через structured output и сравнивать с формой полем-к-полю программно. Тогда качество не падает на маленькой модели, и можно показать precision/recall на размеченном наборе. Это ровно та точка, где они сами признают провал.

Ход 2: положить **таблицу латентности** (p50/p95 end-of-turn → первый аудиосэмпл ответа) и **кросс-браузерную матрицу** (Chrome/Safari/Firefox × built-in/Bluetooth mic) с реальным ресемплингом вместо «request 24 kHz и надеемся». Их troubleshooting-таблица — признание бага; наша матрица — доказательство решения.

Ход 3: персистентность + прогресс во времени (сравнение двух сессий, дельта по измерениям). Они сами помечают это как product gap.

---
