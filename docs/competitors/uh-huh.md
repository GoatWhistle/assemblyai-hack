# Uh-Huh: A Voice Agent for Busy-Handed Workers

**Тир:** B — Крепкие  
**Чем силён:** Лучшая доказательная дисциплина: 66/66 тестов, live receipts, keyless офлайн-демо за 60 с. Нашёл реальный баг модели («uh-huh» → «Aha»)  
**Где пробивается:** Не использует Voice Agent API вообще. Windows-only TTS. Клиент — по сути клип. 2 коммита. Демо не отвечает

[← все конкуренты](../competitors.md)

---
`anhminhzui-dev/uh-huh` · Gnomon · **2 коммита** · demo: uh-huh-demo.onrender.com

**1. Что построено**

Инверсия обычного голосового агента: ИИ разговаривает **не с клиентом, а с работником**. Клиент (в демо — предзаписанный клип) звонит и говорит нормально; агент вытаскивает заявку и задаёт работнику короткие вопросы в наушник, а тот отвечает **одним слогом** — «uh-huh/yeah/yes» = да, «nope/no/nah» = нет, «later» = перезвонить, «who» = повтори. Агент ведёт бронирование по слотам (услуга → день/время → адрес → цена + финальное «book it?») и на выходе даёт booking card, черновик SMS клиенту от имени работника и счётчик «money kept». Подтверждение только на реальный YES на финальный вопрос: «there is no auto-confirm».

**2. Как использован AssemblyAI**

**Streaming Speech-to-Text (Universal-Streaming WebSocket API)** — и всё. Никакого Voice Agent API, никакого LLM от AssemblyAI, никакого LeMUR: «No LLM/LeMUR call is made, by design». Свой клиент `src/uhhuh/streaming_client.py`, параметры подключения ограничены задокументированными: `sample_rate`, `encoding`, `speech_model`, `terminate_timeout`. Замечательно то, **как** они отказались от keyterms: «No keyterms/word-boost is passed to AssemblyAI's streaming call, on purpose… as documented in `docs/LIVE_MIC.md` and re-checked live against https://www.assemblyai.com/docs/speech-to-text/universal-streaming on 2026-09-09, only documents `sample_rate`, `encoding`, `speech_model`, and `terminate_timeout`… no `keyterms_prompt`, `word_boost`, or vocabulary-biasing parameter is documented there. `streaming_client.py` does not invent one.» Вместо биасинга сделана пост-коррекция в `intent.py`. TTS — **не AssemblyAI**: `speak.py` использует Windows `System.Speech` через PowerShell, и фикстуры синтезированы тем же способом.

**3. Архитектура и стек**

Чистый Python ≥3.11, единственная runtime-зависимость — `websockets>=12`; `sounddevice` опционален (extras `mic`), `pytest` в dev. Пакет `uhhuh` с CLI-энтрипойнтом (`uhhuh demo`, `uhhuh run`). Модули: `caller.py` (rule-based извлечение заявки), `intent.py` (классификатор одного слога), `dialog.py` (слотовая машина), `confirmation`, `speak.py` (TTS), `streaming_client.py`, `audio_capture.py`, `keyring.py`. Веб-демо — Gradio (`webdemo/app.py` + `webdemo/serve.py`, тонкая обёртка, биндящая `0.0.0.0` и `$PORT`), деплой одним кликом на Render (`render.yaml`, free Python service). Ключ читается из `ASSEMBLYAI_API_KEY` или из файла по `ASSEMBLYAI_KEY_FILE` (дефолт `~/.config/uhhuh/assemblyai.key`), «never printed, never checked in». Есть каталоги `receipts/`, `tests/`, `docs/`, `scripts/`.

**4. Настоящая инженерная суть**

Настоящая инженерия здесь есть, и она в неожиданных местах:

(а) **Классификатор одного слога с реальной ASR-находкой.** `intent.py` — точный лексикон + difflib-фаззи-фоллбэк с **cutoff 0.72**, и в нём зафиксирован эмпирический факт из живого прогона: «AssemblyAI's real-time model transcribes a spoken "uh-huh" as **"Aha"**, not any spelling of "uh-huh" — found and fixed live, see `receipts/LIVE_RECEIPT.md` Call 1/2». Единственное место среди разобранных, где кто-то **обнаружил конкретное поведение модели в проде, исправил под него код и задокументировал обе стороны**. При UNKNOWN — переспрос, `MAX_RETRIES_PER_SLOT = 3` до сдачи звонка.

(б) **Разделение демо-ледгера и продового.** `uhhuh run` (единственный реальный путь) пишет в `state/money_ledger.json`; любой `uhhuh demo`, включая `--live`, пишет в `state/demo_money_ledger.json`; счётчик веб-демо только в памяти браузера. Репетиция или запись видео физически не может подделать реальный финансовый счётчик. Дисциплина уровня «я думал про аудит», редчайшая на хакатоне.

(в) **Таблица «какие пути живые, какие фикстурные»** — построчно, с колонкой «Network / AssemblyAI call»: `uhhuh demo` = none/keyless, `demo --live` = real streaming, `run --worker-wav` = real, `run --worker-mic` = real + sounddevice, webdemo offline = none, webdemo LIVE = real, четыре кнопки = «button label through the real `intent.classify()`», микрофон = real. Ни один другой проект среди разобранных не раскрывает, что именно в демо настоящее.

(г) **Отказ инвертировать API.** Решение не передавать `keyterms_prompt`, потому что он не задокументирован для Universal-Streaming, с датой пере-проверки — инженерная честность, за которую обычно не голосуют, но которую уважают.

Что здесь **не** сложно и это признано: «Rule-based extraction, not NLU» — `caller.py` это регекспы/ключевые слова, и авторы сами называют конкретный баг: «Its address regex has a fallback (`at <digits>`) that can misread "come at 9" as an address». Никакого LLM в системе нет вообще.

**5. Метрики и доказательства**

**Лучшая доказательная база среди разобранных — и единственная реально проверяемая.**

- **66 тестов, 66 проходят**: «`tests/test_intent.py`, `test_dialog.py`, `test_confirmation.py`, `test_caller.py`, `test_speak.py`, `test_webdemo.py`, `test_cli_demo.py` — 66 of 66 passing (`python -m pytest -q`), pure Python, no audio/network».
- **`receipts/LIVE_RECEIPT.md`** — записанные реальные прогоны через AssemblyAI streaming, с номерами звонков (Call 1/2), из которых взята находка «uh-huh → Aha».
- **Воспроизводимость с нуля за 60 секунд без ключа**: `pip install -e .` → `python scripts/make_fixtures.py` (синтез трёх тестовых WAV через System.Speech, ключ не нужен) → `pytest -q` → `uhhuh demo` «fully OFFLINE — no key, no network… and always exits 0».
- Конкретные числа: cutoff 0.72, `MAX_RETRIES_PER_SLOT = 3`, `--avg-job-value` по умолчанию $120, 4 слота, 66 тестов.
- Бизнес-обоснование единственное среди разобранных **с источниками и датами**: «$250-$2,100/month» за человека на телефоне (Smith.ai, Ruby.com), «one plumbing company recovered $1.33M in a year, $200K in one month» (ServiceTitan / Brothers Plumbing, 2025-2026), «unanswered 10-11 hours», вьетнамские курьеры (tuoitre.vn, 2024-04-17). Это не «TAM $50B», а цитируемые цифры.

Чего нет: **замеров латентности** (ни одного) и метрик точности классификатора (accuracy на разных акцентах не измерена — только признано, что «a worker with a different accent or vocabulary may still classify as UNKNOWN»).

**6. Сильные стороны**

**Самая оригинальная идея всего набора.** Инверсия «ИИ говорит с работником, а клиент всегда слышит живого человека» — не вариация на тему, а другая постановка задачи, и авторы прямо называют, чем бьют рынок: «The twist against every incumbent found — ServiceTitan, Goodcall, Rosie, Smith.ai, Canary — is that all of them put the AI on the phone with the customer. Uh-Huh never does… Not a better bot voice, but no bot voice at all on the customer's side». Готовый слайд-убийца. Плюс лучшая в наборе инженерная гигиена: 66 тестов, live receipts, раздельные ледгеры, keyless офлайн-демо, отсутствие auto-confirm, честный раздел лимитов, кредиты скопированным модулям. По Business Value — единственный с цитируемыми деньгами. Стек минималистичен до предела (одна зависимость).

**7. Слабые места и уязвимости**

Проект проиграет **не по качеству, а по форме подачи**, и вот где ткнёт судья:

- **2 коммита.** Абсолютный минимум. При 66 тестах и receipts это значит «разработка велась вне git, залито двумя пушами» — истории работы нет.
- **Не Voice Agent API.** На хакатоне *Voice Agent* использовано только Streaming STT, LLM отсутствует «by design», TTS — Windows System.Speech. По Application of Technology против Officer Parker / MockMate / Siberia с полным агентным стеком это тяжёлый удар. Формально агентности (turn detection, barge-in, tool calling) в AssemblyAI-смысле нет вообще.
- **Windows-only.** «Windows-only (`System.Speech` via PowerShell for TTS; fixtures are also synthesized the same way)». Судья на Mac или Linux не получит голоса; работает только Gradio-демо на Render.
- **Клиент — предзаписанный клип, не живой звонящий.** Половина заявленного сценария в демо не существует; авторы признают («no real trades business's phone line was wired in during the build window»), но признание не превращает клип в продукт.
- **Микрофонные пути не проверены живьём.** Их формулировка: «The CLI's `--worker-mic` path… and the webdemo's microphone path are still unproven against the real API in this repo's own testing». То есть основной UX работника — грунт в наушник — не подтверждён на реальном железе. Они аргументируют, что код ниже точки «yield PCM16LE bytes at real-time pace» общий и что это «a narrow, named gap» — аргумент честный и убедительный, но судья прочитает слово «unproven».
- **Rule-based извлечение с признанным багом** (адресный регексп путает «come at 9» с адресом). На демо это сломается на первом нестандартном звонящем.
- **Цена не считается**: `--avg-job-value` $120 подставляется как есть и одновременно служит множителем «money kept» — то есть главный бизнес-счётчик проекта это константа × число бронирований, а не измеренная выручка. Судья вправе назвать «money kept» декорацией.
- **Английский только**, при том что мотивирующая история — вьетнамские курьеры; вьетнамский streaming помечен MISSING честно, но разрыв между историей и продуктом остаётся.
- **Скопированные модули из соседнего репо** (`streaming_client.py`, `audio_capture.py`, `docs/LIVE_MIC.md` из `voice-honesty-gate`) — задокументировано образцово, но даёт повод спросить, сколько кода написано на этом хакатоне. Плюс: «Neither source file carried a license header to preserve».
- Слот цены и подтверждения склеены в один вопрос, хотя спецификация фикстуры предполагает четыре слота — сами признают расхождение.

**8. Чем это можно побить**

Парадокс: у Uh-Huh лучшие доказательства и слабейшее использование AssemblyAI. Бить надо ровно по этому.

Ход 1: **забрать их дисциплину и добавить агентность.** Формула «66 тестов + live receipts + keyless офлайн-демо» — то, что нам надо скопировать как стандарт документации. Но поверх неё выставить полный Voice Agent API loop (STT+LLM+TTS в одном WebSocket, tool calling, turn detection). Тогда у нас их доказательная база *и* их провал в технологии закрыт — прямое превосходство по Application of Technology при равном Presentation.

Ход 2: **заменить rule-based NLU на structured output и измерить разницу.** У них `caller.py` — регекспы с признанным багом. Если мы делаем то же извлечение слотов через LLM с JSON-схемой и публикуем accuracy на наборе из 30 реплик (включая их провальный кейс «come at 9»), это точечное, наглядное, воспроизводимое превосходство.

Ход 3: **живой путь целиком.** Их главная уязвимость — «клиент это клип» + «микрофон unproven». Показать сквозной живой прогон (живой микрофон → живой агент → живой результат) с записью и с замером латентности. Против «unproven» ставится «вот receipt живого прогона с p95».

Ход 4: **посчитать деньги по-настоящему.** Их «money kept» = $120 × N. Прайсинг по услуге/времени (или хотя бы диапазон с источником) превращает декоративный счётчик в метрику и забирает их сильнейший бизнес-аргумент, оставаясь в их же логике цитируемых цифр.

---
