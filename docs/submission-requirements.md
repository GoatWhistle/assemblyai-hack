# Требования и правила: проверка 15 сентября

Проверено 15.09.2026. Источники сняты через Playwright (весь lablab.ai рендерится JS — WebFetch на этих страницах возвращает пустую оболочку, поэтому любые прошлые данные, полученные через WebFetch, недостоверны).

Снятые страницы:
- https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon (обзор, 27 479 симв.)
- https://lablab.ai/hackathon-rules — «Lablab.ai Hackathon Rule Book»
- https://lablab.ai/terms-of-use#16-participation-terms (+ раздел 17 «Prize Money Payout Policy»)
- https://lablab.ai/getting-started-guide
- https://lablab.ai/delivering-your-hackathon-solution — «Submission Guidelines» (полный чек-лист, на него ссылается Rule Book)

Статус события на 15.09: `LIVE · SUBMISSIONS OPEN`, участников 3 083, команд 840, сабмишенов 63, черновиков 45.

---

## Что обязательно сдать (exact list, mark optional vs mandatory)

Со страницы хакатона, раздел **WHAT TO SUBMIT** (дословно):

> 📋 Basic information
> Project title
> Short description
> Long description
> Technology & category tags
> 📸 Cover image and presentation
> Cover image
> Video presentation
> Slide presentation
> 💻 App hosting and repository
> Public GitHub repository
> Demo application platform
> Application URL

Ни один пункт не помечен как необязательный. Rule Book усиливает формулировки:

> «Cover Image: Use PNG or JPG format with 16:9 aspect ratio.»
> «Video and Slide Presentation: MP4 and PDF formats are **mandatory**.»
> «Public GitHub Repository: **Mandatory** for storing your code.»
> «Demo Application Platform: Use Streamlit, Replit, or Vercel.»
> «Application URL: **Required** for interactive evaluation.»

И общее предупреждение:

> «Failure to adhere to submission guidelines may result in a lower score or exclusion from the hackathon.»

### Сводная таблица

| Артефакт | Статус | Точные ограничения (verbatim) |
|---|---|---|
| Project title | Обязательно | «Must be clear and descriptive.» Guidelines: «max 50 characters» |
| Short description | Обязательно | «A concise summary (up to 255 characters)» |
| Long description | Обязательно | «Detailed write-up (at least 100 words)» |
| Technology & category tags | Обязательно | «Proper categorization is essential.» |
| Cover image | Обязательно | «Format: PNG or JPG.» / «Aspect Ratio: Recommended 16:9.» |
| Video presentation | Обязательно (MP4) | «A maximum 5-minute video in MP4 format.» + из Hackathon Guidelines: «ensure it's under 300MB and within 5 minutes duration» |
| **Slide presentation (PDF)** | **Обязательно** | «Summarize your project in a PDF format slide presentation.» Лимита по числу слайдов НЕТ; есть рекомендация: «Brevity is Key: Keep slides succinct; limit to 2-3 sentences each.» |
| Public GitHub repository | Обязательно, **публичный** | «If you submit a private repository, judges won't be able to fully review your work, which may lower your overall score.» |
| Demo application platform | Обязательно | «Opt for Streamlit (for Python web apps), Replit (for online code execution), or Vercel (to host web apps).» |
| Application URL | Обязательно | «Provide a link that allows interaction with your prototype.» |

Рекомендованная структура видео (дословно): «Begin with an introduction, discuss your PDF presentation, then showcase your project's functionalities.»

Официальный чек-лист (раздел 6 Submission Guidelines) — 8 пунктов: Project Title; Short and Long Descriptions; Technology and Category Tags; Cover Image; Video Presentation; Slide Presentation; GitHub Repository; Application URL.

Способ сдачи: «submit your project via the dedicated button on your team's dashboard within the lablab.ai platform».

Аварийный клапан (дословно):

> «Manual submission is available for 6 hours post-hackathon for those with valid reasons and prior approval from organizers or mentors.»

Это НЕ автоматическая отсрочка: нужна и уважительная причина, и предварительное согласование.

---

## Критерии судейства (verbatim wording)

Со страницы хакатона, раздел **JUDGING CRITERIA**, дословно и в порядке, указанном на странице:

> **Application of Technology**
> How effectively the chosen model(s) are integrated into the solution.
>
> **Presentation**
> The clarity and effectiveness of the project presentation.
>
> **Business Value**
> The impact and practical value, considering how well it fits into business areas.
>
> **Originality**
> The uniqueness and creativity of the solution, highlighting approaches and ability to demonstrate behaviors.

**Весов/процентов нет ни на одной из проверенных страниц.** Все четыре критерия перечислены без весовых коэффициентов — считаем равновесными, это допущение, а не подтверждённый факт.

Порядок критериев в разных источниках отличается (сам по себе приоритета не задаёт):
- Страница хакатона: Application of Technology → Presentation → Business Value → Originality
- Rule Book: «1. Presentation / 2. Business value / 3. Application of technology / 4. Originality» (автор раздела указан: «by Walaa Nasr»)
- Submission Guidelines: Presentation → Business Value → Application of Technology → Originality

Формулировки критериев в Submission Guidelines короче и слегка иные:

> «Presentation: How effectively you convey your project.»
> «Business Value: Commercial potential and value proposition.»
> «Application of Technology: The technologies applied and their relevance.»
> «Originality: How unique and innovative your idea is.»

«Business Value» трактуется как коммерческий потенциал: Pro Tips прямо требуют TAM/SAM, потоки выручки, анализ конкурентов и USP:

> «Discuss Market Scope: Include Total Addressable Market (TAM) and Serviceable Addressable Market (SAM).»
> «Revenue Streams: Highlight potential revenue sources.»
> «Analyze Competitors: Delve into strengths and weaknesses, emphasizing your Unique Selling Proposition.»
> «Talk About Future Prospects: Share scalability and impact potentials.»

### Кто судит, голосование сообщества, анонс результатов

Судей и менторов на странице **26 человек**, включая от AssemblyAI: Dylan Fox (Founder & CEO), Luka Chkhetiani (Head of Realtime, Principal Researcher), Dan Ince (Product Manager), Craig Bruder (Forward Deployed Engineer), Harnoor Signh (Developer Relations); плюс Andrea Marazzi (Founder & CEO, NativelyAI) и отраслевые инженеры (Meta, Amazon, Amex, Zocdoc, Prudential и др.). Список «Speakers, Mentors & Judges» единый — кто именно из них судит, не разделено.

Кодекс судей (дословно):

> «Confidentiality of all submissions.
> Abstaining from judging in case of a conflict of interest.
> Declaring any affiliations that might compromise impartiality.
> Not copying, retaining, or sharing any entry materials.»

> «Organizers are welcome to participate but are not eligible for prizes. If mentors or organizers participate, they cannot serve as judges.»

**Голосование сообщества:** на `/live` есть блок `TOP SUBMISSIONS` / `By community vote` с числом голосов. При этом на дашборде указано: «Points do not affect submission evaluation.» — это про очки лидерборда. **Влияет ли community vote на итог — прямого утверждения нет ни на одной странице (НЕ ВЕРИФИЦИРОВАНО).**

Что удалось выяснить дополнительно: гайд «How to Win an AI Hackathon» описывает механику однозначно как судейскую — «Judges at lablab.ai score across four dimensions», без упоминания веса голосов сообщества. На других хакатонах lablab.ai голоса сообщества обычно формируют **отдельную** номинацию community-choice — но в нашем хакатоне такой номинации НЕТ: заявлены только 5 равных победителей. Рабочая гипотеза: голоса на итог не влияют напрямую (возможна роль в предварительном отборе/видимости). Косвенный контраргумент: Rule Book относит «gaming the voting system» к основаниям немедленной дисквалификации, т.е. механизм считается значимым. **Уточнить в Discord #faq.** Практический вывод: голоса собирать стоит (дешево, potentially upside), но ставку делать на 4 критерия.

**Дата анонса результатов НЕ УКАЗАНА нигде.** Известно только, что выплаты идут «within a 90-day period following the announcement of the winners» — т.е. дата анонса существует, но не опубликована.

---

## Ограничения, которые мы могли пропустить

### 1. Лицензия: не только MIT — обязателен OPEN SOURCE

Мы записывали «submissions must be original and MIT-compliant». Формулировка на странице призов совпадает дословно:

> «Submissions must be original and MIT-compliant.»

Но полная формулировка в Terms of Use §16 строже — добавлено **open source**:

> «All submissions by participants must be original work, **open source**, and compliant with the MIT License unless specified otherwise.»

Практически: репозиторий публичный + файл `LICENSE` с MIT. Оговорка «unless specified otherwise» существует, но для этого хакатона иного не указано.

### 2. Призы выплачиваются ФИЗЛИЦАМ, а не команде

Terms of Use §17, дословно:

> «Prizes are awarded only to individuals, not to teams or legal entities.»

Как $1 000 делится внутри команды из 6 человек — правилами не описано (НЕ ВЕРИФИЦИРОВАНО). Это стоит решить внутри команды заранее.

### 3. KYC, налоги, жёсткий дедлайн 90 дней на документы

Все требования (§17) — обязательные условия выплаты:
- «Completed Prize Payout Form», «A valid, signed IRS tax form (W-9 or W-8BEN)», «A government-issued photo ID», «Bank account verification in the winner's name»
- Для не-резидентов США: «A standard **30% U.S. federal tax will be withheld** unless: A valid tax treaty applies, and A U.S. TIN is provided via Form W-8BEN»
- «All required documents must be submitted within **90 calendar days** of the email notification.» / «Failure to submit within this period will result in automatic forfeiture of the prize.»
- «No exceptions: No late submissions, corrections, appeals, or payment requests will be accepted after the deadline.»
- «The prize amount communicated to winners is the gross value. Actual payment may be lower due to taxes and bank processing fees.»
- Выплаты в USD, ACH (США) или SWIFT (остальные). Контакт: prize@lablab.ai
- «lablab.ai and its partners reserve the right to distribute all prizes within a 90-day period following the announcement of the winners.»

Для РФ: налоговое соглашение РФ-США приостановлено, поэтому по умолчанию — удержание 30%. Плюс вопрос проходимости SWIFT-перевода. Это риск исполнения, а не участия (НЕ ВЕРИФИЦИРОВАНО правилами — правила лишь описывают механику).

### 4. Регистрация в Discord обязательна

> «The hackathon takes place online on the lablab.ai platform and the lablab.ai Discord server. Please register for both in order to participate.»

Getting Started Guide это подтверждает: «you'll need to complete your registration on both our lablab.ai platform and Discord server».

### 5. Платформа демо ограничена списком

«Streamlit, Replit, or Vercel» — формулировки «Use ...» (Rule Book) и «Opt for ...» (Guidelines). Строгость неоднозначна; если деплой не на этих платформах, безопаснее иметь Vercel-фронт как канонический Application URL.

### 6. Этика и дисквалификация

> «Unethical behavior, such as plagiarism or gaming the voting system, will lead to immediate disqualification. If lablab.ai or its event partners determine that a participant has acted in a way that undermines the fairness or proper functioning of a hackathon—such as cheating, tampering with systems, using unauthorized automation, engaging in fraudulent behaviour, or in any other manner we consider grounds for disqualification—the participant may be removed from the event.»

### 7. Правила могут измениться в любой момент

> «We reserve the right to make amendments, modifications, or cancellations to any part of the hackathon (including full cancellation of the event itself), including prizes and terms of participation, at our sole discretion.»

Т.е. эту проверку нужно повторить ближе к 30.09.

### 8. Мусорный пункт в Submission Guidelines (важно не выполнять буквально)

В разделе 3 Submission Guidelines висит требование от другого хакатона:

> «⚠️ Public GitHub Repository & IBM Bob Report: ... be sure to include the exported IBM Bob report of all relevant tasks/sessions used for your project.»

К AssemblyAI-хакатону это не относится (IBM Bob — инструмент другого спонсора). Показательно другое: **это единственное на всём сайте место, где вообще требуется отчёт об использовании AI-ассистента.** См. ниже.

### 8-бис. История коммитов: судьи смотрят на неё (важно при раннем старте)

Гайд «How to Win an AI Hackathon» в списке типовых ошибок, дословно:

> «Skipping the GitHub commits — judges check your repo; an empty repo with one final push raises red flags»

> «Building without deploying — a working local demo that can't be accessed by judges scores as if it doesn't work»

Формального правила про окно написания кода нет (см. п.9), но фактически одиночный финальный пуш выглядит подозрительно. Вывод: коммитить инкрементально в течение сентября, а не заливать всё 30-го одним коммитом. Это единственное реальное ограничение, косвенно затрагивающее «когда писать код».

Оттуда же — полезное для видео и демо:

> «Judges reward clarity over production value. A 4-minute video that explains the problem, shows the solution working, and articulates the business case beats a polished 5-minute video that buries the demo.»

> «The demo must be understandable in 30 seconds — if a judge can't grasp the value proposition from the opening screen, you've already lost points»

> «Build the "golden path" judges will follow. This is not the full product — it is the specific sequence of screens and interactions you will show in the demo video. Fix every bug on that path. Do not fix bugs off the path yet.»

Про критерий Application of Technology, дословно: «This is scored on: does the demo work, is the GitHub repo real, and is the AI meaningfully integrated (not just a chatbot wrapper).»

### 9. Чего в правилах НЕТ (проверено, отсутствует — важные «разрешения по умолчанию»)

- **Когда можно писать код.** Ни на одной из 5 страниц нет требования, что код должен быть написан внутри окна хакатона, и нет запрета на предсуществующий код. Требование только одно — «original work». Более того, страница прямо поощряет подготовку заранее: «Before the kickoff, browse the AI Tech and tutorials pages to read up on the available technologies and **get a head start on your project**.» **НЕ ВЕРИФИЦИРОВАНО как явное разрешение** — это отсутствие запрета, а не разрешение. Единственный формальный барьер — «original work».
- **Правила использования AI-инструментов кодирования.** Запретов нет вообще. На `/live` в блоке `TECHNOLOGIES / Being used this round` открыто фигурируют Claude Code (16), Antigravity (17), Codex (12), Github Copilot (6), ChatGPT (13) — т.е. это норма, а не нарушение. Требования раскрывать использование AI для этого хакатона нет (пункт про IBM Bob относится к другому событию).
- **Лимит числа сабмишенов от одной команды.** Не указан.
- **Запрет на подачу того же проекта на другие хакатоны.** Не указан.
- **Веса критериев судейства.** Не указаны.
- **Дата анонса победителей.** Не указана.
- **Географические ограничения участия.** Не указаны; заявлено обратное: «Fully online hackathon. Join and build from anywhere in the world.» Ограничения появляются только на этапе выплаты (см. п.3).

### 10. Противоречие в таймзоне дедлайна — ТРЕБУЕТ УТОЧНЕНИЯ

Плашка вверху страницы: **«Submission deadline / Sep 30, 6:00 PM MST»**

Раздел Event Schedule на той же странице: **«Sep 30 6:00 PM Moscow Standard Time / End of Submissions!»**

Заголовок события: «Tuesday, September 1 2026 - 6:00 PM Moscow Standard Time».

Разница критична: MST (Mountain Standard Time, UTC-7) = 30.09 в 04:00 МСК **1 октября**... точнее, 18:00 MST = 03:00 МСК 1 октября, т.е. +9 часов к московскому дедлайну. Если же MST — это опечатка/сокращение от Moscow Standard Time, дедлайн = 30.09 18:00 МСК.

Наше значение (30.09 18:00 МСК) совпадает с двумя из трёх указаний на странице и является **более ранним**, то есть безопасным. Планировать по 18:00 МСК 30 сентября, любой запас трактовать как бонус. Уточнить в Discord #faq.

---

## Расхождения с нашим пониманием на 11 сентября

| Пункт | Было записано 11.09 | Факт на 15.09 | Вердикт |
|---|---|---|---|
| Лицензия | «submissions must be original and MIT-compliant» | Фраза подтверждена дословно на странице призов, НО в Terms §16 полнее: «original work, **open source**, and compliant with the MIT License» | **ДОПОЛНЕНИЕ** (не противоречие): добавлено обязательное open source |
| Слайды PDF | (не отмечено как обязательное) | «MP4 and PDF formats are mandatory» | **ПРОТИВОРЕЧИЕ/ПРОБЕЛ**, если мы считали слайды опциональными |
| Дедлайн | 30.09 18:00 МСК | Schedule: «Sep 30 6:00 PM Moscow Standard Time» ✔, но плашка: «Sep 30, 6:00 PM MST» | **ПРОТИВОРЕЧИЕ ВНУТРИ САМОГО САЙТА**; наше значение безопаснее |
| Получатель призов | (предполагалось — команда) | «Prizes are awarded only to individuals, not to teams or legal entities» | **НОВОЕ** |
| Структура призов | — | 5 равных победителей × ($1 000 cash + $1 000 credits) = $10 000. Мест/рангов нет | Подтверждено, иерархии призов НЕТ |
| Команда | — | «Teams consist of 1-6 people»; соло разрешено: «individual participation is also welcome» | Подтверждено |
| Критерии | 4 критерия | 4 критерия подтверждены дословно, весов нет, порядок в источниках разный | Подтверждено |
| Окно написания кода | — | Требований нет нигде; есть поощрение «get a head start on your project» | **НОВОЕ (отсутствие ограничения)** |

Отдельно: **всё, что мы могли собрать 11.09 через WebFetch по lablab.ai, недостоверно** — сайт полностью JS-рендерится, WebFetch возвращает только «LabLab - The #1 Ecosystem for AI Builders». Проверено сегодня на `/hackathon-rules` и `/delivering-your-hackathon-solution`. Если 11.09 использовался WebFetch, данные по правилам были пустыми или галлюцинированными.

Также: URL `https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon` при первом заходе может отдать `/live` (Live Dashboard) вместо обзора — на дашборде нет ни правил, ни критериев, ни призовой разбивки. Легко принять за «страницу обновили и всё удалили».

---

## Новое от AssemblyAI (10-15 сентября)

<!-- BLOG_SECTION -->

---

## Что это меняет в плане

1. **Слайды PDF — обязательный артефакт.** Если в плане их не было, добавить. Формат: PDF, по 2-3 предложения на слайд, с TAM/SAM, потоками выручки, конкурентами и USP — это прямо кормит критерий Business Value.
2. **Добавить `LICENSE` (MIT) в репозиторий** и убедиться, что репо публичный к моменту сдачи. Требование — «original work, open source, MIT».
3. **Видео: ровно ≤5 минут, MP4, <300 МБ.** Структура по гайду: интро → прогон по PDF → демо функциональности. Экранная запись живого взаимодействия отмечена как «impactful».
4. **Нужен живой Application URL** на Streamlit/Replit/Vercel. Приватное репо или мёртвый URL прямо снижают балл — «judges won't be able to fully review your work».
5. **Планировать дедлайн как 30.09 18:00 МСК** (безопасная трактовка). 6-часовое ручное окно после дедлайна существует, но требует предварительного согласования — не закладывать в план.
6. **Ранний старт кода легален** — запрета нет, есть поощрение. Ограничение только «original work». НО: коммитить инкрементально — «an empty repo with one final push raises red flags».
7. **AI-инструменты (Claude Code и пр.) разрешены**, раскрывать не требуется. Требования про IBM Bob Report в общем гайде к нашему хакатону не относятся.
8. **Заранее решить дробление приза** внутри команды: платят физлицам, не команде.
9. **Подготовить KYC-пакет** (паспорт, W-8BEN, банк на имя победителя) — окно 90 дней, без исключений, по умолчанию −30% для не-резидентов США.
10. **Зарегистрироваться в Discord** (обязательно) и там же уточнить два вопроса: таймзона дедлайна (MST vs МСК) и влияет ли community vote на оценку.
11. **Перепроверить правила ~28-29 сентября** — организатор оставляет за собой право менять правила и призы «at our sole discretion».
12. Конкуренция на 15.09: 63 сабмишена при 5 равных призах. Заметная доля топа по голосам — клиент-фронтенды к Voice Agent API; дифференциация через глубину интеграции (критерий Application of Technology) и доказуемую бизнес-ценность.

---

## Ресурсные ссылки (verbatim URL со страницы)

Технические:
- docs — https://www.assemblyai.com/docs
- voice agent api — https://www.assemblyai.com/products/voice-agent-api
- realtime speech-to-text api — https://www.assemblyai.com/products/streaming-speech-to-text
- **Sign up for an API account (кредиты хакатона)** — https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=lablab_virtual_hackathon
- Voice Agent API docs — https://www.assemblyai.com/docs/voice-agents/voice-agent-api
- Realtime STT docs — https://www.assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio
- LLM Gateway docs — https://www.assemblyai.com/docs/llm-gateway/quickstart
- GitHub — quickstart guides — https://github.com/AssemblyAI
- YouTube playlist — https://www.youtube.com/playlist?list=PLcWfeUsAys2m3vvl2lcBGuqJBC3-FcoHa

Важно про кредиты (дословно): «Sign up using this link to claim your free credits. Please make sure to accept cookies during sign-up. If you already have an account, log out first, then use the link above to log back in and activate your credits.»

Организационные:
- Enroll — https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon?enroll=true
- Live Dashboard — https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/live
- Discord (lablab.ai) — https://discord.gg/lablabai
- Hackathon Guidelines — https://lablab.ai/guide
- Getting Started Guide — https://lablab.ai/getting-started-guide
- Hackathon Rule Book — https://lablab.ai/hackathon-rules
- Submission Guidelines (полный чек-лист) — https://lablab.ai/delivering-your-hackathon-solution
- Terms of Use §16 («Full details» со страницы призов) — https://lablab.ai/terms-of-use#16-participation-terms
- Code of Conduct — https://lablab.ai/code-of-conduct
- Контакт по призам — prize@lablab.ai; общий — community@lablab.ai

AssemblyAI каналы: X https://x.com/AssemblyAI · Reddit https://reddit.com/r/assemblyai · LinkedIn https://www.linkedin.com/company/assemblyai/ · YouTube https://www.youtube.com/@AssemblyAI · Blog https://www.assemblyai.com/blog

---

## Полные verbatim-выдержки для справки

**Челлендж:**

> «Build voice AI agents on AssemblyAI
> Build a voice agent using AssemblyAI's real-time voice AI technology. Choose the approach that fits your idea and how much of the voice stack you want to build yourself.»

**CHOOSE YOUR PATH — Voice Agent API:**

> «Build an end-to-end voice agent through a single connection, with AssemblyAI handling the core voice interaction stack.
> Speech-to-text powered by Universal-3 Pro
> LLM routing and voice output
> Turn-taking and voice activity detection
> JSON-Schema tool calling
> Designed for fast, natural voice interactions»

**CHOOSE YOUR PATH — Realtime Speech-to-Text API:**

> «Use AssemblyAI's real-time speech-to-text API as the foundation of your voice agent, while bringing your own orchestration.
> Real-time speech-to-text over WebSocket
> Sub-second transcription
> Multilingual speech recognition
> Bring your own LLM and text-to-speech
> More control over your voice agent architecture»

**Призы:**

> «🏆 Total prize pool: $10,000
> 5 WINNERS · $1,000 CASH + $1,000 IN API CREDITS EACH
> Five winners will each receive $1,000 in cash and $1,000 in API credits.
> Please note: participation in lablab.ai hackathons is voluntary. Prizes and opportunities depend on eligibility, availability and third-party sponsors. Hackathon rules, prizes and terms may change or be canceled at our discretion. Submissions must be original and MIT-compliant. Prize distribution may take up to 90 days. Full details.»

**Расписание (дословно):**

> «Sep 1 6:00 PM Moscow Standard Time — Hackathon Kick-off
> Sep 1 6:05 PM Moscow Standard Time — lablab.ai Opening words
> Sep 1 6:10 PM Moscow Standard Time — AssemblyAI Opening words
> Sep 1 6:15 PM Moscow Standard Time — Introduction to the Challenge
> Sep 1 6:25 PM Moscow Standard Time — Hackathon Guide
> Sep 1 7:00 PM Moscow Standard Time — Discord Q&A session
> Sep 30 6:00 PM Moscow Standard Time — End of Submissions!»

Никаких промежуточных этапов (нет отдельной фазы судейства, нет даты анонса, нет демо-дня).

**Команды:**

> «Teams consist of 1-6 people. If you don't have a team, don't worry. You can connect with other participants from all over the world on the dashboard or on the Discord server, where you can also find teammates and bounce around ideas.»

Getting Started Guide: «Team Size: Please note that each team must not exceed a maximum of six participants.» / «Individual Participation: While we recommend team collaborations for a richer hackathon experience, individual participation is also welcome.»

**Участие / регистрация:**

> «The hackathon takes place online on the lablab.ai platform and the lablab.ai Discord server. Please register for both in order to participate. To join, click the Enroll button at the bottom of the page and read the Hackathon Guidelines, the Getting Started Guide and the lablab.ai Hackathon Rule Book.
> Everyone is welcome to participate, regardless of previous AI or coding experience.
> Before the kickoff, browse the AI Tech and tutorials pages to read up on the available technologies and get a head start on your project.»

**Про AssemblyAI (для слайда про технологию):**

> «Every project is built on AssemblyAI, the Voice AI infrastructure company for builders, whose speech-to-text, voice agent and speech understanding models sit behind products like Granola, HeyGen, Ashby and ClickUp.»

**Про корпоративный email (мягкая просьба, не требование):**

> «If you have a company email, we encourage you to use it when registering or submitting your project. It helps us better understand who's building with AssemblyAI and share relevant opportunities after the hackathon. Personal emails are absolutely welcome.»
