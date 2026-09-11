# Live-дашборд: цифры, стек, лидерборд

Источник: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/live
Снимок: 11 сентября 2026, 20:43 MSK

## Воронка

| Метрика | Значение | +за день |
|---|---|---|
| Участники | 2 765 | +72 |
| Команды | 720 | +24 |
| Сабмишены | 45 | +6 |
| Черновики | 33 | +4 |

Ключевой вывод по воронке: 720 команд → 45 сдавших = **конверсия ~6,2%**. Даже если все 33 черновика дойдут, будет ~78 сабмишенов из 720 команд (~11%). При 5 призовых местах шанс попасть в топ у дошедшего до конца проекта — порядка 1 к 15, а не 1 к 550. Главный фильтр здесь — просто доделать и сдать.

## Технологии этого раунда (20 инструментов, по числу проектов)

| Технология | Использований |
|---|---|
| AI/ML API | 26 |
| Assistants API | 17 |
| Anthropic Claude | 15 |
| Antigravity | 15 |
| Claude Code | 12 |
| Vercel | 11 |
| AgentOps | 11 |
| Gemini AI | 9 |
| ChatGPT | 9 |
| rest api | 8 |
| OpenAI | 7 |
| Codex | 6 |
| AIML | 5 |
| Groq | 5 |
| Redis | 5 |
| Gemini 3 Flash | 5 |
| Github Copilot | 5 |
| AMD Developer Cloud | 4 |
| AWS | 4 |
| AI Studio | 4 |

Замечания:
- Теги считаются по всем участникам раунда (включая черновики), поэтому суммы больше 45.
- AssemblyAI в списке не фигурирует — он обязателен для всех, поэтому не различает проекты.
- Claude/Claude Code/Codex/Copilot/Antigravity — это в основном инструменты разработки, а не рантайм. Это показывает, что бóльшая часть поля собрана AI-кодогенерацией.
- Реально «продуктовых» инфраструктурных тегов мало: Redis (5), MongoDB, ClickHouse, Cloudflare Workers AI, n8n, Telnyx — в единичных проектах. Это зона, где легко выделиться.

## Топ-10 сабмишенов по голосам сообщества

| # | Проект | Команда | Голоса |
|---|---|---|---|
| 01 | SAUTI AI: Voice-to-Action | KISII UNVERSITY CODE UNION | 11 |
| 02 | Siberia Voice Agent | Frantal Company | 8 |
| 03 | MockMate — AI Voice Interview Coach | Twin MASTERS | 5 |
| 04 | EchoExaminer: Real-Time AI Voice Mock Examiner | Sahariar-Dev | 4 |
| 05 | KiaOra Dispatch | shinydatatech | 3 |
| 06 | FarmVoice - AI Voice Agent | FarmVoice AI | 3 |
| 07 | STICK | Ninjas | 2 |
| 08 | SmartLink Voice: Autonomous Analytics Voice Agent | smart link | 1 |
| 09 | Interview Lab | Interview Lab | 1 |
| 10 | Tourist translator AI | FirstChoice | 1 |

Голоса низкие и почти ничего не решают: лидер — 11 голосов, у 10-го места — 1. Голосование не входит в критерии судейства. Это значит, что «раскрутка» даёт мало, а качество сабмишена — всё.

## Лидерборд билдеров по очкам

| # | Билдер | Команда / проект | Уровень | Очки |
|---|---|---|---|---|
| 01 | HYACINTH ONCHANGU | KISII UNVERSITY CODE UNION · SAUTI AI | NOVICE | 175 |
| 02 | Frantiesco Lucas | Frantal Company · Siberia Voice Agent | CONTRIBUTOR | 169 |
| 03 | Jayant Kumar | Twin MASTERS · MockMate | NOVICE | 163 |
| 04 | Sahariar Hossain | Sahariar-Dev · EchoExaminer | CONTRIBUTOR | 161 |
| 05 | Wei Liu | shinydatatech · KiaOra Dispatch | CONTRIBUTOR | 159 |
| 06 | ugyenrinzin158 | FarmVoice AI · FarmVoice | NOVICE | 159 |
| 07 | Oussema Toumi | VoxSales AI Voice Agent | CONTRIBUTOR | 157 |
| 08 | Naman Anand | Ninjas · STICK | CONTRIBUTOR | 157 |
| 09 | Hakim Gh | primehack security team · KT — The AI Tutor | HACKER | 155 |
| 10 | xbrtoufik58015 | Atomix · Readdy AI | NOVICE | 155 |

Очки лидерборда на оценку сабмишена не влияют (прямая оговорка на странице).

## Топ рефереров

Rithish Reddy (9 приглашённых), Muhammad Taha Bin Zaeem (7), Mariam Habib (6), далее по 5: Muhammad Ammar Zia, Owais Ali, Muhammad Rohan Sohail, Abhijeet Kangane, MDABUL HOSSAIN, Anshul Sargoach, Siddharth Jadhav. Ни один из топ-рефереров не сдал проект (0 submitted) — реферальная активность и сборка продукта в этом хакатоне никак не пересекаются.

## Команды, которые ещё ищут людей (незавершённые заявки)

- **Himaless** — IncidentBridge AI: evidence-backed voice incident commander. Транскрибирует живые инцидент-коллы через AssemblyAI, вытаскивает решения, риски, action items, вмешивается, если у критичной задачи нет владельца/дедлайна или она конфликтует с предыдущим решением. Каждый инсайт привязан к спикеру и таймстемпу. Ищут 1–2 человека (real-time web, Python/FastAPI, TS/Next.js, UX, voice AI). Статус: LOOKING FOR MEMBERS.
- **crazyxyz** — реалтайм voice AI агент, фокус на практической автоматизации.
- **VertexVoice** — разговорный ассистент на AssemblyAI, транскрипция + автоматизированные воркфлоу.
- **shoe** — hands-free ассистент на реалтайм-стеке AssemblyAI, tool calling вместо просто чата.

Обратите внимание: концепция Himaless (IncidentBridge AI) почти полностью совпадает с уже сданными OpsVoice AI, AuraCommand и VerbaTrace AI. Ниша «voice incident commander» на этом хакатоне уже перегружена.
