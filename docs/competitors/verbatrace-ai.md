# VerbaTrace AI - Voice-to-Evidence Agent

**Тир:** B — Крепкие  
**Чем силён:** Эксплуатационная зрелость: 5 условий перед выдачей токена, Durable Object как источник правды, resume после refresh  
**Где пробивается:** Только Streaming STT, нет Voice Agent API и TTS. README противоречит заявке. 1,6 MB бандлов в репо

[← все конкуренты](../competitors.md)

---
`datsecretsauce/verbatrace` · Blue River Technology · 11 коммитов · demo: verbatrace.sngricky.workers.dev + verbatrace.blueriver.cc

**1. Что построено**

Голосовой «модератор совещаний» для регулируемых процессов (compliance review, due diligence, requirements workshop): слушает ответы в реальном времени, задаёт адаптивные доп-вопросы там, где ответ слабо обоснован, и на выходе даёт структурированный evidence pack — decisions / risks / actions / owners / evidence gaps. Вся система — один Cloudflare Worker (`src/index.js`), внутри которого и API, и встроенное веб-приложение; состояние сессии живёт в Durable Object `InterviewSessionDO` на SQLite-бэкенде.

**2. Как использован AssemblyAI**

Заявлен **Universal-3.5 Pro Realtime** (streaming STT) — не Voice Agent API. То есть AssemblyAI здесь закрывает только вход: «live partial transcription and end-of-turn handling». Есть корректная работа с безопасностью: «Short-lived AssemblyAI browser tokens minted by the Worker», «The permanent `ASSEMBLYAI_API_KEY` is stored only as a Cloudflare Worker secret and is never shipped to the browser», токены «expire quickly and request a maximum streaming duration». Мозги и голос — **не AssemblyAI**: LLM это Cloudflare Workers AI с «deterministic fallback», а TTS в README вообще не упомянут; вместо него заявлен «Browser speech-recognition fallback» (Web Speech API) как дублирующий STT. Обратите внимание на расхождение: в тексте заявки на lablab написано, что AssemblyAI используется для «agent responses and tool-driven actions» — в README этого нет ни строчкой. Ни `speaker_labels`, ни `keyterms`, ни LeMUR, ни LLM Gateway, ни tool calling через AssemblyAI не заявлены.

**3. Архитектура и стек**

Vanilla JS/HTML/CSS без сборки; Cloudflare Workers как единственный бэкенд; Durable Objects (SQLite) для персистентности транскрипта и состояния; Workers AI для извлечения структуры; Web Audio для захвата. Поток: браузер → микрофон → напрямую WebSocket в AssemblyAI Universal-3.5 Pro (токен получен от Worker) → транскрипт возвращается в браузер → браузер POST-ит ответ в session answer API → moderation + evidence engine → Workers AI или детерминированный fallback → запись в DO. Деплой декларативный: `wrangler.jsonc` объявляет биндинг `MODERATOR_SESSION → InterviewSessionDO`, SQLite-хранилище, Workers AI, rate-limit биндинги и отключённые preview URL. Есть `prepare-deploy.ps1` (Windows-хелпер) и `verify.mjs`.

**4. Настоящая инженерная суть**

Реально сильная часть — не голос, а **эксплуатационная зрелость**. Три вещи нетривиальны:

(а) публичная демо-безопасность: перед выдачей временного токена Worker требует пять условий одновременно — same-origin POST, secure HttpOnly demo-browser identity, активная DO-сессия, per-browser rate limit, глобальный лимит ёмкости токенов AssemblyAI. Это уровень «мы правда открыли это в интернет», а не «вот мой ключ в .env.example».

(б) Durable Object как источник правды, позволяющий демонстрировать resume после refresh — судья увидит это вживую по пункту 8 их demo flow.

(в) `/api/health` с явным списком сигналов (`assemblyAiStreaming: true`, `publicVoiceDemoReady: true`, `assemblyAiGlobalRateLimiter: true`) — судья может сам проверить состояние прода в один клик.

А вот сам голосовой слой — обёртка: STT из коробки, собственной логики turn-taking нет, «adaptive moderation» — это промптинг Workers AI поверх текста. Всё в одном файле `src/index.js` (worker + весь фронтенд внутри) — анти-архитектура, но для Workers-демо терпимо.

**5. Метрики и доказательства**

**Численных метрик нет вообще.** Ни латентности, ни WER, ни бенчмарков, ни данных по точности извлечения решений/рисков. Нет unit-тестов; `verify.mjs` — это не тесты, а regression/security/smoke чек-лист: «JavaScript syntax», «Cloudflare Durable Object configuration», «public-demo rate-limit bindings», «AssemblyAI temporary-token protections», «active-session enforcement», «no exposure of the permanent AssemblyAI key», «embedded avatar asset integrity». То есть он проверяет конфиг и отсутствие утечки ключа, но не корректность диалога и не качество evidence-извлечения. Версия `4.3.3-public-voice-demo-hardening` при 11 коммитах — версия явно из внешнего процесса, а не из истории этого репозитория, что читается как перенос кода из приватного проекта. Заявка обещает «evidence scoring» — формул или порогов скоринга в README нет, проверить нельзя.

**6. Сильные стороны**

Единственный среди разобранных проект, который выглядит как *прод*, а не как демо: секрет-менеджмент, rate limiting в три уровня, health endpoint, CHANGELOG.md, SECURITY.md, verify-пайплайн, декларативный деплой. Бизнес-ниша лучшая по деньгам: compliance / due diligence — это регулируемый enterprise-бюджет, а не B2C-подписка. Persistent DO + resume — редкий и очень демонстрабельный трюк. 11 языков интерфейса и multi-persona panel mode дают вау-эффект в презентации.

**7. Слабые места и уязвимости**

- **AssemblyAI задействован минимально по глубине**: только streaming STT + временные токены. По Application of Technology это бьётся любым проектом, реально использующим Voice Agent API с tool calling. Хуже: наличие «Browser speech-recognition fallback» даёт судье законный вопрос «а насколько вам вообще нужен был AssemblyAI?».
- **Расхождение README и заявки**: в заявке «turn-taking, interruption handling, agent responses and tool-driven actions» через AssemblyAI; в README ничего из этого. Судья, читающий оба документа, поймает несоответствие.
- **Нет голоса на выходе.** Проект называется voice agent, но TTS-ветки в README нет — вероятно, агент отвечает текстом. Это ставит под сомнение соответствие теме хакатона.
- Ноль тестов и ноль цифр — нечего предъявить по точности.
- Один файл `src/index.js` с целым приложением внутри — судья-инженер сочтёт это несопровождаемым.
- Две разные демо-ссылки (`workers.dev` и `blueriver.cc`) — риск, что одна к моменту судейства мертва.
- «Workers AI / deterministic fallback»: если fallback срабатывает часто, evidence-извлечение деградирует до regex, и об этом нигде не сказано честно.

**8. Чем это можно побить**

Их слабое место — глубина AssemblyAI при сильной эксплуатации. Ход: взять их же enterprise-нишу (аудируемая запись разговора) и сделать то, что они не сделали, **внутри AssemblyAI**: полный Voice Agent API loop (STT+LLM+TTS в одном WebSocket) с **server-side HTTP tools**, которые пишут decision/risk/action в БД *во время* разговора, а не постфактум, плюс `speaker_labels` для атрибуции «кто что пообещал» (owner-атрибуция у них в списке фич есть, но без диаризации она может быть только выведена LLM-ом — прямая дырка). И добавить то, чего у них нет ни в каком виде: **числа**. Замерить p50/p95 задержки от конца речи до начала ответа агента, точность извлечения action items на 20 размеченных транскриптах, и положить это в README таблицей. Против «у нас есть health endpoint» ответ «у нас есть health endpoint и p95 = 780 мс на замере из 50 ходов» выигрывает.

---
