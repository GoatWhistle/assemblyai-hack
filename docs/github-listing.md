# Описание и теги для GitHub

Всё, что идёт в настройки репозитория и в поля сабмишена на lablab. Тексты на английском — по правилу из [CLAUDE.md](../CLAUDE.md), русский только здесь, в пояснениях.

## Description (About репозитория)

Рекомендуемый вариант, 146 символов:

```
A voice agent for prescription intake that proves it did not mishear: per-field provenance, confidence, and a gate that refuses unverified values.
```

Почему так: первое предложение должно отвечать «что это» до двоеточия и «чем отличается» после. Слово «proves» несёт главную мысль продукта, «gate» — механику. GitHub допускает 350 символов, но в списке репозиториев и в поиске длинное описание обрезается, поэтому смысл упакован в первые 150.

Альтернативы, если захочется другого акцента:

| Акцент | Текст |
|---|---|
| На регуляторике | `Automates the read-back step that ICAO and the Joint Commission require: a voice agent that re-asks whenever a drug name is on a published confused-names list.` |
| На технике | `Voice agent with word-level provenance: every field links to the spoken words that produced it, their confidence, and an independent validator verdict.` |
| Короткий | `Voice prescription intake that refuses to write a value it cannot prove.` |

Не использовать: «AI-powered», «revolutionary», «next-generation» — в этом поле у 63 конкурирующих проектов и так избыток таких слов, и они не сообщают ничего.

## Website

Ссылка на живое демо (Application URL из сабмишена). Заполнять обязательно: правила прямо предупреждают, что без рабочей ссылки «judges won't be able to fully review your work, which may lower your overall score».

## Topics (теги)

GitHub разрешает до 20 тегов; берём 18. Только строчные буквы, дефисы вместо пробелов.

```
voice-agent
assemblyai
speech-to-text
realtime
voice-ai
prescription
healthcare
patient-safety
medication-safety
read-back
closed-loop-communication
provenance
validation
checksum
nextjs
typescript
vercel
hackathon
```

Логика подбора по четырём группам, чтобы теги находили нас разные аудитории:

| Группа | Теги | Кого приводит |
|---|---|---|
| Технология | `voice-agent`, `assemblyai`, `speech-to-text`, `realtime`, `voice-ai` | тех, кто ищет примеры на этом стеке; судьи от AssemblyAI |
| Домен | `prescription`, `healthcare`, `patient-safety`, `medication-safety` | клинический контекст, отраслевые судьи |
| Идея | `read-back`, `closed-loop-communication`, `provenance`, `validation`, `checksum` | то, чем мы отличаемся; `read-back` и `closed-loop-communication` — настоящие отраслевые термины, не выдумка |
| Реализация | `nextjs`, `typescript`, `vercel`, `hackathon` | поиск по стеку |

Сознательно не включено:

- `llm`, `ai`, `machine-learning`, `openai` — слишком общие, тонут в шуме
- `medical-device` — мы не медицинское устройство, и тег был бы ложным заявлением
- `lasa` — аббревиатура, которую ищут единицы; смысл несут `medication-safety` и `patient-safety`
- `websocket`, `audio` — техническая мелочь, место в 20 тегах дороже

## Поля сабмишена на lablab

Ограничения дословно из Rule Book, проверены 15 сентября ([submission-requirements.md](submission-requirements.md)).

### Project title (максимум 50 символов)

```
Readback — prescription intake that proves it
```
44 символа. Если тире вызывает проблемы с кодировкой, запасной вариант: `Readback: voice intake that proves it heard` (43).

### Short description (до 255 символов)

```
A voice agent takes prescription orders and proves it did not mishear. Each field shows the spoken words that produced it, the recognizer confidence, and a validator verdict. A drug name on the ISMP confused-names list is re-asked even at confidence 1.0.
```
250 символов. Последнее предложение — самое важное: оно называет то, чего не делает никто в поле.

### Technology tags

`AssemblyAI` обязателен. Дальше — только то, что реально используется: `Next.js`, `TypeScript`, `Vercel`. Ставить теги популярных инструментов, которых нет в коде, — ровно та ошибка, на которой поймали двух конкурентов: у одного теги заявки не подтверждаются `package.json`, у другого в README нет даже слова AssemblyAI.

### Category tags

`Voice Assistant`, `Healthcare`, `Developer Tools`. Первые два очевидны; третий — потому что механика шлюза и пословного провенанса переносится на любой приём данных голосом, и это стоит сказать.

## Cover image

PNG или JPG, 16:9. Содержание: экран с карточкой поля, где видны подсвеченный спан слов, значение confidence и статус переспроса по причине LASA. Обложка должна показывать механику, а не логотип: судья видит её в списке до того, как откроет что-либо ещё.
