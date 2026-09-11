# Liora — Voice & Physical Memory Assistant

**Тир:** C — Слабые при хорошей идее  
**Чем силён:** Паттерн draft_change как обязательный шаг подтверждения. Хорошая презентация со скриншотами  
**Где пробивается:** README указывает legacy v2/realtime/ws, который не отдаёт ни tool calls, ни TTS — прямое противоречие заявке. localStorage как единственное хранилище. Инструмент get_creator_info в продуктовом наборе

[← все конкуренты](../competitors.md)

---
Репо: `faysaliqbal007/Liora` · **9 коммитов** · 0 звёзд · демо `https://liora-0w0l.onrender.com` · слайды есть, видео нет.

**1. Что построено**

Голосовой ассистент физической памяти: один раз произносишь, куда положил вещь («I packed my laptop charger inside the blue tech pouch»), потом спрашиваешь голосом «Where is my charger?» или «Who currently has my camera?». Ведётся инвентарь с четырьмя состояниями (`stored`, `packed`, `lent`, `borrowed`), журнал займов с атрибуцией контрагента («With Sarah», «Borrowed from Adam») и дедлайнами возврата, хронологический audit trail всех перемещений и дашборд с живыми счётчиками и фильтрами по локациям («Bedroom desk top drawer», «Key hook by entrance», «Work desk laptop stand»). Все данные — только в `localStorage` браузера (`liora_items_v1`), без удалённой БД.

**2. Как использован AssemblyAI**

Заявлено: «AssemblyAI's Realtime Voice Agent API» — STT, intent classification, LLM tool orchestration и streaming TTS (24 kHz linear PCM). Реально описанное: **function calling с четырьмя инструментами** — `find_item(item)`, `list_items(status, detail)`, `draft_change(item, action, detail, due_date)` и `get_creator_info(topic)`. В README приведён полный JSON-Schema `draft_change` с `enum: ["move","pack","lend","borrow","return"]` и описанием «Draft a change to an item's location or status. Never commit without user confirmation» — единственный проект разобранных проектов, показавший буквальный текст tool-спеки.

**И здесь же главная техническая улика.** README дважды называет upstream-эндпоинт: `wss://api.assemblyai.com/v2/realtime/ws`. Это **legacy Realtime STT** эндпоинт AssemblyAI, а не Voice Agent API (агентский трафик идёт на `agents.assemblyai.com` / streaming-домен — сравните с Readdy AI, где честно указан `wss://agents.assemblyai.com/v1/ws`). Одновременно заявлять `v2/realtime/ws` и «Intent Classification & LLM Tool Orchestration + streaming TTS 24kHz» внутри одного и того же соединения — противоречие: legacy realtime endpoint не отдаёт ни tool calls, ни TTS. Вход при этом описан как **16 000 Hz**, а выход как 24 kHz — типично именно для смеси старого STT и отдельного синтеза. Вывод: либо диаграмма устарела относительно кода, либо часть «LLM + TTS» делается не тем, чем заявлено. Теги сабмита это подкрепляют: «AI/ML API, **Anthropic Claude, OpenAI**» — в контуре есть чужие LLM, которых README не упоминает. Модель AssemblyAI не названа нигде; LeMUR, LLM Gateway, speaker labels, turn detection не используются.

**3. Архитектура и стек**

Максимально простой и виден целиком: 8 файлов в корне — `index.html`, `app.js`, `styles.css`, `pcm-processor.js`, `server.mjs`, `package.json`, `.env.example`, `LICENSE`. `package.json` — **без единой зависимости**, единственный скрипт `"start": "node server.mjs"`. То есть WebSocket-прокси написан на нативных модулях Node, фронтенд — ванильный JS без сборки. Хостинг — Render (бесплатный тариф, судя по `onrender.com`).

Поток аудио: `AudioContext` на 16 000 Hz → `AudioWorkletProcessor` в `pcm-processor.js` конвертирует Float32 → Int16 PCM в отдельном аудиопотоке → бинарный WebSocket в `server.mjs` → upstream в AssemblyAI; обратно 24 kHz PCM и транскрипты в браузер. Состояние — `localStorage`, сервер объявлен «zero-knowledge»: «No item titles, storage locations, or user queries are logged to disk».

**4. Настоящая инженерная суть**

Нетривиальных решений два, и оба продуктовые, а не системные:

- **`draft_change` как обязательный шаг подтверждения.** «Voice assistants should never modify physical records silently. Liora drafts changes on-screen and asks for confirmation before committing». Агент не мутирует состояние сам, он эмитит структурированный draft-event, UI рисует карточку «Move Passport to Office Cabinet?», и только явное подтверждение записывает в `liora_items_v1` и в историю. Правильный паттерн human-in-the-loop для голоса, где ошибка распознавания = порча данных, и он реализован как архитектурное ограничение, а не как просьба в промпте. Лучшая идея проекта.
- **AudioWorklet вместо `ScriptProcessorNode`** с внятным обоснованием: «Standard web audio implementations often rely on `ScriptProcessorNode`, which runs on the main browser thread and drops audio frames whenever the DOM renders new chat bubbles or items». Верно, но это стандартная практика и то, что делает стартер-кит AssemblyAI — не отличительная черта (Brand Studio, Readdy AI и Radio Universe делают то же самое).

Всё остальное — CRUD над `localStorage` и очень аккуратный UI. Прокси на сотню строк, четыре инструмента, никакой БД, никакого мультиустройства, никакой синхронизации, никакого разрешения конфликтов.

**5. Метрики и доказательства**

Цифр практически нет, а те, что есть, неподтверждённые. «sub-second latency» в разделе архитектуры и «receive instant, **sub-second** spoken audio answers» в питче — **ни одного замера, ни p50, ни p95, ни методики**. Для продукта, чья единственная техническая претензия — низкая задержка, это голое утверждение. «Every year, people spend **dozens of hours** searching for misplaced passports» — цифра без источника, придуманная для питча. Тестов нет вообще: в дереве репозитория (8 файлов) нет ни `tests/`, ни тестового фреймворка, ни CI. WER и точность распознавания названий предметов не измерены — а это критично: «blue tech pouch» и подобные редкие существительные ломают STT чаще всего, и весь продукт держится на точном совпадении названия предмета при поиске.

Что есть в доказательствах — **скриншоты**: шесть размеченных изображений в `docs/images/` (`01-dashboard-overview.png`, `02-voice-agent-chat.png`, `03-lent-borrowed.png`, `04-organized-storage.png`, `05-activity-history.png`, `06-add-item-modal.png`) плюс баннер `liora-banner.png`. Для Presentation это работает — README самый «продуктовый» среди разобранных. Живое демо на Render есть, с оговоркой: free tier засыпает, у судьи первый запрос упадёт в cold start.

**6. Сильные стороны**

Presentation — сильнейшая среди разобранныхпо оформлению: баннер, бейджи, навигационные ссылки, интерфейсный тур со скриншотами, ASCII-диаграмма архитектуры, реальная JSON-спека инструмента. Business Value понятна мгновенно, аргумент против конкурентов точный и правдивый: «Traditional home inventory apps fail because their data entry friction is too high… Because the entry friction is high, people stop maintaining them after two days». Приватность как фича («100% Client Privacy», zero-remote-database) — хороший дифференциатор и одновременно оправдание отсутствия бэкенда. Паттерн подтверждения перед мутацией — то, о чём можно говорить с судьёй как о зрелом дизайне.

**7. Слабые места и уязвимости**

- **Расхождение между заявленным API и указанным эндпоинтом.** `wss://api.assemblyai.com/v2/realtime/ws` — legacy Realtime STT, он не выдаёт ни tool calls, ни TTS, которые нарисованы на той же диаграмме. Судья-инженер из AssemblyAI заметит это мгновенно: либо проект использует не Voice Agent API (и тогда он вне духа хакатона), либо документация врёт. Теги сабмита с «Anthropic Claude, OpenAI» усиливают подозрение, что LLM-оркестрация делается не AssemblyAI.
- **«Sub-second» без замеров** — заявка, которую легко опровергнуть живьём на Render free tier.
- **Ноль тестов, 9 коммитов, 8 файлов.** Самый маленький проект разобранных проектов по объёму кода. При README на ~14 000 символов соотношение «слова / код» худшее из разобранных.
- **`localStorage` как единственное хранилище — одновременно фича и приговор продукту.** Инвентарь физических вещей нужен на телефоне в прихожей, а не в том же браузере на том же ноутбуке. Ни мультиустройства, ни бэкапа: очистка данных сайта = потеря всего инвентаря. «Non-Destructive Memory» в README звучит смешно рядом с `localStorage`.
- **`get_creator_info(topic)` — «Returns verified information about creator M M Faysal Iqbal and the project background»** — инструмент саморекламы, вшитый в продуктовый tool-набор. Судья прочитает это как то, чем оно является: попытку заставить агента рассказывать об авторе. В серьёзном продукте такого инструмента быть не должно.
- Раздел про безопасность переоформлен относительно содержания: «Hardened HTTP Headers: `nosniff`, `SAMEORIGIN`» — три строки заголовков, поданные как слой защиты. «Zero-Knowledge Backend» — просто отсутствие логирования, не криптографическое свойство.
- Видео нет. Ниша («голосовой ассистент-напоминалка») одна из самых заезженных, Originality низкая.
- Один участник, демо на спящем free-tier.

**8. Чем это можно побить**

Liora бьётся легче всех пяти, потому что её претензии не подтверждены. Три хода. Первый и решающий: **показать корректный Voice Agent API endpoint и назвать модель** — если мы явно демонстрируем агентский протокол (`tool.call` / `tool.result`, barge-in, end-of-turn) и говорим «Universal-3, Voice Agent API», то на фоне их `v2/realtime/ws` мы выглядим как единственные, кто действительно использовал продукт хакатона. Второй: **побить их «sub-second» числами** — таблица time-to-first-audio p50/p95 на 30 прогонах закрывает вопрос, который они только заявили. Третий, продуктовый: их слабость — `localStorage` (нет телефона, нет синхронизации, нет бэкапа). Если наше решение работает на нескольких устройствах с сохранением приватности (или хотя бы показывает экспорт и восстановление), их «фича приватности» сразу читается как отсутствие бэкенда. Плюс бесплатный удар: их tool-набор содержит `get_creator_info` — на Q&A достаточно спросить, зачем продуктовому агенту инструмент, рассказывающий об авторе.

---
