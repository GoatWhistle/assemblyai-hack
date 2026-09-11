# Radio Universe: Radio You Can Talk To

**Тир:** A — Сильные  
**Чем силён:** Технически крепкий: Cloudflare Durable Object, jitter-буферы 280/120 мс, монотонные часы. Единственный, где голос — сам продукт  
**Где пробивается:** 5 коммитов. Нет Business Value (сам пишет про «next validation targets»). Нет замеров end-to-end. Нет модерации эфира

[← все конкуренты](../competitors.md)

---
Репо: `viktor-silakov/radio-universe` · **5 коммитов** · 0 звёзд · демо `https://radio-universe.pages.dev` · видео 2:16 · слайды 6 страниц.

**1. Что построено**

Непрерывная AI-радиостанция: двое ведущих (Alex и Sam) ведут живой эфир, третий голос (Riley) читает новостные бюллетени по RSS BBC, между разговорами играют 74 оригинальные сгенерированные песни, а слушатель может **позвонить в студию с микрофона и попасть в эфир**. Есть полная семидневная сетка — «91 blocks» — от «Morning Orbit» (новости) до «Midnight Theatre», включая **14 оригинальных детективных / хоррор-пьес** с двумя повторяющимися ролями, шестью сюжетными вехами, двумя актами и запланированным финалом. Всё крутится автономно на Cloudflare: «no local computer needs to stay on».

**2. Как использован AssemblyAI**

Voice Agent API — и на вход, и на выход, для всех голосов, а не только для звонков: «Live microphone calls use AssemblyAI Voice Agent API: streaming recognition, responses, voice output and barge-in». Голоса ведущих задаются переменными `ASSEMBLYAI_HOST1_VOICE` (по умолчанию `george`, «warm slot») и `ASSEMBLYAI_HOST2_VOICE` (`eve`, «bright slot»). Критически важная фраза: «**Only one AssemblyAI API key is required. Gemini and ElevenLabs are no longer dependencies of the voice pipeline**» — то есть автор осознанно выпилил сторонние TTS/LLM и оставил единственного вендора. Для хакатона AssemblyAI это идеальный нарратив.

Протокольная дисциплина видна: «Every upstream connection ends explicitly with `session.end`»; отдельный модуль `src/server/voice-agent.ts — AssemblyAI protocol and session lifecycle`. Модель (Universal-3 / 3.5) в README не названа — единственный заметный пробел в описании API. LeMUR / LLM Gateway не используются, но здесь это оправдано: продукт — реалтайм-эфир, не постобработка.

**3. Архитектура и стек**

Самая серьёзная архитектура разобранных проектов. TypeScript строгий (`tsc` для трёх целей: сервер, web, cloudflare), React 19 + Vite 7, `assemblyai@^4.9.0`, `zod`, `ws`, `rss-parser`. Прод: **React/Vite на Cloudflare Pages → same-origin proxy → TypeScript Worker → один SQLite-backed Durable Object → AssemblyAI Voice Agent API**. Durable Object держит все студии, гостевые сессии, настройки, память программ и дневной счётчик голосовых запросов; «One-minute alarms and cron restore it after runtime restarts» — то есть продумано восстановление после рестартов рантайма. Локально — Node ≥22.13 с SQLite-адаптером (`src/server/store.ts` против `cloudflare/store.ts` — чистая абстракция хранилища).

Аудиотракт: AudioWorklets, 24 kHz mono PCM по WebSocket, **bounded adaptive jitter buffer: 280 ms для программного аудио и 120 ms для релея звонящего**, плюс «a monotonic server clock compensates delayed callbacks instead of losing audio time». Все слушатели получают один и тот же server-mixed поток; звонящий не слышит собственный микрофон обратно. Музыка: `scripts/music-library/prepare-radio.py` проверяет хеши MP3 и пишет 24 kHz mono PCM + каталог; в облаке PCM тянется из отдельного каталога (`MUSIC_ORIGIN`, `radio-universe-audio.pages.dev/catalog.json`) с bounded-кешем.

**4. Настоящая инженерная суть**

Здесь настоящей инженерии больше, чем у остальных четырёх вместе. Обёрткой над API является ровно один слой — сам вызов Voice Agent; всё остальное собственная работа:

- **Непрерывный эфир без тишины.** «A complete conversation block is prepared during songs with ordered conversation context; shorter replies stay connected without waiting for generation between speakers» — предгенерация блока диалога под музыку, пополнение во время разговора, реплики звонящего стримятся немедленно. Плюс аккуратный хендофф: «A ready host enters over the final three seconds: the return sting plays inside this overlap and the song ducks smoothly under speech», и recovery-кейс: «if a song ends with no speech ready, another song covers recovery and fades once the buffer is ready». Классическая задача радиоавтоматизации, решённая честно.
- **Очередь звонков с семантикой программы.** «During drama scenes, calls queue until the interval at :24 or the curtain call at :54… One caller is admitted at a time, with up to five waiting and a two-minute call limit», `RADIO_DRAMA_CALLS=anytime` как аварийный обход. Это не «подключи микрофон», это диспетчеризация с доменной логикой.
- **Отмена и устаревание речи.** «Changes wait for the current spoken turn or active two-minute call to finish; unplayed old speech is discarded» + «discards stale speech after interruptions». Ровно та проблема, которую в голосовых системах решают последней.
- **Бюджетирование.** `MAX_LLM_REQUESTS_PER_DAY` (cloud 900, persisted per UTC day; local 2000) с явной оговоркой, что это «not a currency cap and does not count individual replies inside a call». Честная дисциплина по стоимости.
- **Антигаллюцинационный контур для новостей:** «News facts come only from supplied RSS headlines and summaries», у бюллетеней есть source links.
- **Непрерывность нарратива в пьесах:** «Story milestones and the last 20 completed turns preserve continuity, with recent dialogue stored in SQLite for restarts within the same programme. The public guide does not contain plot endings» (вехи server-only, `src/server/stories.ts`).

**5. Метрики и доказательства**

Единственный проект разобранных проектов, где цифры конкретны и проверяемы:

- Буферы: **280 ms / 120 ms**, jitter-буфер адаптивный и bounded.
- Библиотека: **74 двухминутные песни — 71 английская, 3 русские**; «Decoded broadcast audio occupies about **426 MB** locally; source MP3s occupy about **214 MB**».
- Сетка: **91 блок**, 7 дней, **14 пьес**, сцены на :00/:08/:16/:30/:38/:46, звонки в :24–:30 и :54–:00.
- Диалоговые кванты: «four turns in Quiet Hours, ten in debates, eight in drama scenes and six elsewhere», три песни за перерыв в Quiet Hours.
- Имиджинг: «Idents play at eligible breaks roughly every **15 minutes**… music stings have **90-second cooldowns**».
- Лимиты: 1 звонящий + до 5 в очереди, лимит звонка **2 минуты**, `MAX_STATIONS=5` в проде, 900 запросов/сутки.
- Наблюдаемость: «`/api/health` exposes server clock counters and the browser emits `radio-audio-health` diagnostics» — телеметрия аудиотракта встроена.
- Тесты: `npm test` через `tsx --test tests/*.test.ts`, важная оговорка — «Automated tests use local fixtures and temporary databases, **not billable providers**». Плюс `npm run typecheck` на server+web и `cloud:typecheck` через `wrangler types`.
- Стоимость: «A participant account was verified with **$150 total credits on September 5**».
- Демо-видео 2:16, статус «published and submitted» на 6 сентября.

**6. Сильные стороны**

Application of Technology: Cloudflare Durable Object как единственный источник правды для мультислушательского микшера, монотонные часы, адаптивные буферы, предгенерация и отмена — уровень выше хакатона. Originality: «радио, в которое можно позвонить» не встречается в стандартном наборе сюжетов, а 14 оригинальных пьес и 74 своих песни создают ощущение продукта, а не демо. Presentation: живая публичная ссылка, которая работает без автора, видео, слайды, `ARCHITECTURE.md` и `IMPLEMENTATION_PLAN.md`. Плюс «one vendor, one key» — нарратив, который организатор хакатона любит.

**7. Слабые места и уязвимости**

- **Пять коммитов.** Весь объём (Durable Object, микшер, музыкальный конвейер, 14 пьес, React-плеер) выложен пятью коммитами — скептичный судья прочитает это как squash перед дедлайном и заподозрит, что репо собрано снаружи. Истории разработки, по которой можно оценить вклад за период хакатона, нет.
- **Business Value — самая слабая часть.** Автор сам признаёт: «The opportunity is participatory audio for communities… retention and call participation are the **next validation targets**». Метрик удержания нет, монетизации нет, есть только гипотеза. Против «тренажёра интервью для выпускников» это проигрывает по денежному критерию.
- **Ничего не измерено там, где важнее всего**: ни одной цифры латентности голосового ответа (time-to-first-audio, задержка barge-in), хотя вся архитектура именно про это. Буферы 280/120 мс — это конфигурация, а не измеренная задержка end-to-end.
- **Качество контента не проверено, и автор пишет это прямо**: «Plays are improvised against authored outlines, not prerecorded hour-long productions; **sustained narrative quality still needs listening tests**». Судья может послушать 30 секунд эфира и попасть на бессвязный диалог — риск живой демонстрации максимальный.
- Прототип с оговорками: «It remains a desktop hackathon prototype; production **moderation** and scaling are future work». Модерации нет — а в эфир пускают живой микрофон незнакомцев. Реальная репутационная дыра, и судья может ткнуть именно сюда.
- Ограничения масштаба: одна станция на гостя, `MAX_STATIONS=5`, 900 генераций в сутки — очевидно, что нагрузку в десятки слушателей никто не проверял.
- Гигиена: дублированные записи в листинге (`ARCHITECTURE.md` и `ARCHITECTURE.md\`, `.env.example\`, `wrangler.jsonc\`) — артефакты Windows-коммита. Часовой пояс по умолчанию `Asia/Tbilisi` выдаёт, что «станция» настроена под одного человека.
- Модель AssemblyAI не названа, LeMUR / LLM Gateway не задействованы — по «широте использования платформы» Brand Studio его формально обходит.

**8. Чем это можно побить**

Самый опасный конкурент разобранных проектов по технологии — бить его в лоб по аудиоинженерии не нужно, там он сильнее. Бить надо по двум дырам. Первая — **Business Value**: у них честно нет метрик и монетизации. Наше решение должно выйти с конкретным адресатом, цифрой готовности платить и хотя бы 5–10 реальными пользователями / сессиями с логами. Вторая — **измеренная латентность**: они не привели ни одного числа end-to-end. Таблица «time-to-first-audio p50/p95, задержка barge-in, WER на нашем домене» на N прогонах забирает Application of Technology у проекта с лучшей архитектурой, но без замеров. Третий, тактический ход: **модерация живого голоса в эфире** — у них её нет по признанию. Даже простой контур «классификация реплики звонящего до вывода в эфир + kill-switch» — то, чем можно публично придавить их на Q&A.

---
