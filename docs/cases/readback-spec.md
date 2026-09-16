# Readback — инженерная спецификация

Углубление разделов 4, 5, 6 кейс-документа [readback.md](readback.md). Протокольные детали — по [assemblyai-api.md](../reference/assemblyai-api.md), источники данных и валидаторы — по [domain-data-sources.md](../reference/domain-data-sources.md).

Стек: FastAPI (Python 3.12) + React/TypeScript. Дедлайн: 30 сентября 2026.

**Дисциплина чисел в этом документе.** Ни одного измеренного значения здесь нет — мы ещё ничего не мерили. Все пороги, тайминги и лимиты помечены как `ГИПОТЕЗА` или `НАЧАЛЬНОЕ ЗНАЧЕНИЕ` и подлежат тюнингу на held-out-наборе начиная с дня 11 (см. план в [readback.md](readback.md), раздел 9). Числа AssemblyAI (15,31% EER, 43,6% → 79,1%) — это их публикации, не наши замеры, и в наших отчётах всегда идут с атрибуцией.

---

## 1. Модель данных

Модели живут в `backend/app/models.py`. Pydantic v2 для всего, что ходит по сети (валидация входящих `tool.call`-аргументов и исходящих карточек в UI), `@dataclass(frozen=True)` — для `ConfirmedValue`, потому что там нужен именно неизменяемый объект с инвариантом в `__post_init__`, а не сетевая схема.

### 1.1 Перечисления

```python
from __future__ import annotations

import uuid
from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated, Final, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class FieldName(StrEnum):
    DRUG_NAME = "drug_name"
    STRENGTH = "strength"
    DOSAGE_FORM = "dosage_form"
    ROUTE = "route"
    QUANTITY = "quantity"
    SIG = "sig"
    PRESCRIBER_NPI = "prescriber_npi"
    PRESCRIBER_DEA = "prescriber_dea"
    PATIENT_NAME = "patient_name"
    REFILLS = "refills"
    DAYS_SUPPLY = "days_supply"


class Criticality(StrEnum):
    CRITICAL = "critical"
    IMPORTANT = "important"
    LOW = "low"


class VerdictOutcome(StrEnum):
    PASSED = "passed"
    FAILED_CHECKSUM = "failed_checksum"
    NOT_IN_CATALOG = "not_in_catalog"
    FORMAT_INVALID = "format_invalid"
    INCONSISTENT_COMBO = "inconsistent_combo"
    NOT_APPLICABLE = "not_applicable"


class CandidateStatus(StrEnum):
    PROPOSED = "proposed"
    GATE_REJECTED = "gate_rejected"
    READ_BACK_PENDING = "read_back_pending"
    CONFIRMED_BY_VOICE = "confirmed_by_voice"
    AUTO_ACCEPTED = "auto_accepted"
    ABANDONED = "abandoned"


class ConfirmationMode(StrEnum):
    VALIDATOR = "validator"
    READ_BACK = "read_back"
    SPELL_OUT = "spell_out"
    HUMAN_OVERRIDE = "human_override"
```

`NOT_APPLICABLE` в `VerdictOutcome` нужен честно и отдельно: у `patient_name` валидатора нет вообще, и подменять это на `PASSED` — значит соврать в аудите. Поле, у которого валидатор неприменим, обязано проходить read-back (см. раздел 2).

### 1.2 `WordSpan` — единица происхождения

```python
class WordSpan(BaseModel):
    """Одно слово из words[] сообщения Turn (Streaming STT v3)."""

    model_config = ConfigDict(frozen=True)

    text: str
    start_ms: Annotated[int, Field(ge=0)]
    end_ms: Annotated[int, Field(ge=0)]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    speaker: str | None = None
    word_is_final: bool = True

    @model_validator(mode="after")
    def _check_interval(self) -> WordSpan:
        if self.end_ms < self.start_ms:
            raise ValueError(f"end_ms {self.end_ms} < start_ms {self.start_ms}")
        return self

    @classmethod
    def from_turn_word(cls, w: dict) -> WordSpan:
        return cls(
            text=w["text"],
            start_ms=int(w["start"]),
            end_ms=int(w["end"]),
            confidence=float(w["confidence"]),
            speaker=w.get("speaker"),
            word_is_final=bool(w.get("word_is_final", True)),
        )
```

`from_turn_word` — единственное место, где протокольные имена `start`/`end` превращаются в наши `start_ms`/`end_ms`. Тайминги в `Turn` приходят в миллисекундах — переименование фиксирует единицу измерения в самом типе, чтобы никто ниже по коду не делил на 1000 «на всякий случай».

### 1.3 `Provenance` — происхождение значения

```python
class Provenance(BaseModel):
    model_config = ConfigDict(frozen=True)

    words: Annotated[list[WordSpan], Field(min_length=1)]
    turn_order: Annotated[int, Field(ge=0)]
    transcript_slice: str
    session_id: str
    stt_turn_is_formatted: bool = False

    @computed_field
    @property
    def min_confidence(self) -> float:
        return min(w.confidence for w in self.words)

    @computed_field
    @property
    def mean_confidence(self) -> float:
        return sum(w.confidence for w in self.words) / len(self.words)

    @computed_field
    @property
    def start_ms(self) -> int:
        return min(w.start_ms for w in self.words)

    @computed_field
    @property
    def end_ms(self) -> int:
        return max(w.end_ms for w in self.words)

    @computed_field
    @property
    def spoken_text(self) -> str:
        return " ".join(w.text for w in self.words)
```

`min_length=1` — не косметика: значение без хотя бы одного слова-источника не имеет происхождения, значит не имеет права на существование. Это первая линия инварианта, ещё до шлюза.

Для порогов используется **`min_confidence`, а не `mean`**. Средняя маскирует ровно тот случай, который нас интересует: «Lisinopril ten milligrams» с confidence `[0.42, 0.99, 0.99]` даёт mean 0.80 при провале на единственном слове, которое и есть название препарата. Минимум по спану — консервативная агрегация, и это сознательный выбор в сторону лишних переспросов.

`transcript_slice` хранится отдельно от `spoken_text`, потому что при `format_turns=true` форматированный транскрипт отличается от конкатенации `words[]` (пунктуация, кастинг чисел). Для подсветки в UI нужны `words[]`, для показа человеку — срез транскрипта. Храним оба и не выбираем.

### 1.4 `ValidatorVerdict` — вердикт независимой проверки

```python
class ValidatorVerdict(BaseModel):
    model_config = ConfigDict(frozen=True)

    outcome: VerdictOutcome
    validator_name: str
    rule_cited: str
    detail: str
    checked_value: str
    evidence: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def ok(self) -> bool:
        return self.outcome is VerdictOutcome.PASSED
```

`rule_cited` — обязательное поле со ссылкой на конкретное правило, а не на «валидатор сказал нет». Значения, которые должны появляться в базе буквально:

| `validator_name` | `rule_cited` |
|---|---|
| `npi_luhn` | `Luhn mod-10 over "80840" + first 9 digits (ISO/IEC 7812 issuer ID 80840)` |
| `dea_mod10` | `(d1+d3+d5) + 2*(d2+d4+d6); last digit of result == d7` |
| `ndc_format` | `FDA NDC format: 10-digit 4-4-2/5-3-2/5-4-1 or 11-digit strictly 5-4-2` |
| `ndc_catalog` | `product.txt lookup: proprietary_name or nonproprietary_name exact match` |
| `combo_consistency` | `product.txt: (drug x strength x dosage_form x route) tuple must exist` |
| `sig_abbrev` | `ISMP Error-Prone Abbreviations 2024-04: abbreviation is on the do-not-use list` |
| `none` | `no independent validator exists for this field` |

Это то, что показывается судье в карточке поля и пишется в `gate_decisions`. «Не сошлось» без цитаты правила — не доказательство.

Пример заполненного вердикта для DEA (числа — из проверенного вручную примера в [domain-data-sources.md](../reference/domain-data-sources.md)):

```python
ValidatorVerdict(
    outcome=VerdictOutcome.PASSED,
    validator_name="dea_mod10",
    rule_cited="(d1+d3+d5) + 2*(d2+d4+d6); last digit of result == d7",
    detail="odd=9, even=12, total=33, computed check digit 3, given 3",
    checked_value="AB1234563",
    evidence={"odd_sum": 9, "even_sum": 12, "total": 33, "computed": 3, "given": 3},
)
```

### 1.5 `LasaRisk` — риск гомофонии

```python
class LasaRisk(BaseModel):
    model_config = ConfigDict(frozen=True)

    hit: bool
    matched_term: str | None = None
    confusable_with: tuple[str, ...] = ()
    source: Literal["ISMP-2023", "FDA-NameDiff", "none"] = "none"
    source_row: str | None = None

    @classmethod
    def clean(cls) -> LasaRisk:
        return cls(hit=False)
```

`confusable_with` — tuple, а не list: объект иммутабелен, и пара из списка ISMP не должна мутировать между проверкой и вердиктом. `source_row` хранит исходную строку PDF или HTML-таблицы FDA, чтобы в UI показать, откуда взялась пара, а не просто утверждать её.

### 1.6 `FieldCandidate` — предложение, ещё не значение

```python
class FieldCandidate(BaseModel):
    model_config = ConfigDict(frozen=True)

    candidate_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field: FieldName
    raw_value: str
    normalized_value: str | int | None
    provenance: Provenance
    verdict: ValidatorVerdict
    lasa: LasaRisk = Field(default_factory=LasaRisk.clean)
    status: CandidateStatus = CandidateStatus.PROPOSED
    attempt: Annotated[int, Field(ge=1)] = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

`raw_value` — то, что услышал распознаватель («ten milligrams»). `normalized_value` — то, что пойдёт в заказ (`"10 mg"`). `None` в `normalized_value` означает, что нормализатор не справился, и это само по себе повод для переспроса (код `E_NORMALIZE_FAILED` в разделе 3).

`attempt` считает попытки по одному и тому же полю в рамках сессии, и именно по нему шлюз решает, переходить ли в spell-out и когда эскалировать к человеку.

Обратите внимание: у `FieldCandidate` нет ни одного метода, возвращающего `ConfirmedValue`. Кандидат не умеет превращать себя в подтверждённое значение — превратить его может только модуль шлюза.

### 1.7 `ConfirmedValue` — единственный тип, который принимает заказ

Это ядро продукта. Требование: объект нельзя собрать, не пройдя шлюз, причём не «по договорённости с разработчиком», а механически.

Питон не даёт настоящих приватных конструкторов, поэтому используем связку из трёх независимых механизмов, каждый из которых ловит свой класс ошибки:

1. **Инвариант в `__post_init__`** — ловит прямой вызов `ConfirmedValue(...)` из прикладного кода.
2. **Модуль-левел токен** — конструктор требует объект-ключ, который создаётся один раз внутри `gate.py` и оттуда не экспортируется.
3. **Единственная фабрика** `confirm()`, вызываемая только из шлюза; на неё же навешен AST-тест, проверяющий, что во всём проекте нет других точек входа.

```python
# backend/app/gate.py

from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from typing import Final

from .models import (
    CandidateStatus,
    ConfirmationMode,
    Criticality,
    FieldCandidate,
    FieldName,
    Provenance,
    ValidatorVerdict,
    VerdictOutcome,
)


class _GateToken:
    """Ключ от шлюза. Существует ровно один экземпляр, и он не экспортируется."""

    __slots__ = ()

    def __repr__(self) -> str:
        return "<gate-token>"


_TOKEN: Final[_GateToken] = _GateToken()


class GateViolation(RuntimeError):
    """Попытка собрать ConfirmedValue в обход шлюза."""


@dataclass(frozen=True, slots=True)
class ConfirmedValue:
    field: FieldName
    value: str | int
    raw_value: str
    provenance: Provenance
    verdict: ValidatorVerdict
    confirmation_mode: ConfirmationMode
    candidate_id: str
    attempt: int
    confirmed_at: datetime
    read_back_utterance: str | None
    _token: _GateToken | None = dc_field(default=None, repr=False, compare=False)

    def __post_init__(self) -> None:
        if self._token is not _TOKEN:
            raise GateViolation(
                f"ConfirmedValue for {self.field!r} constructed outside the gate. "
                "The only legal entry point is gate.confirm()."
            )
        if self.confirmation_mode is ConfirmationMode.VALIDATOR:
            if self.verdict.outcome is not VerdictOutcome.PASSED:
                raise GateViolation(
                    f"{self.field!r}: confirmation_mode=VALIDATOR requires "
                    f"verdict.outcome=PASSED, got {self.verdict.outcome!r}"
                )
        elif self.confirmation_mode in (
            ConfirmationMode.READ_BACK,
            ConfirmationMode.SPELL_OUT,
            ConfirmationMode.HUMAN_OVERRIDE,
        ):
            if not self.read_back_utterance:
                raise GateViolation(
                    f"{self.field!r}: confirmation_mode={self.confirmation_mode!r} "
                    "requires the exact utterance that was confirmed aloud"
                )
        if not self.provenance.words:
            raise GateViolation(f"{self.field!r}: value without provenance")
        object.__setattr__(self, "_token", None)
```

Последняя строка `__post_init__` — `object.__setattr__(self, "_token", None)` — важна отдельно. После проверки ключ из объекта стирается, поэтому подсмотреть его через уже существующий `ConfirmedValue` (`some_value._token`) и переиспользовать нельзя: там будет `None`, а `None is not _TOKEN`. Ключ живёт только в замыкании модуля `gate.py`, и единственный путь к нему — `confirm()`.

`compare=False` на `_token` нужно, чтобы стёртый ключ не мешал сравнению и хешированию объектов в тестах.

```python
def confirm(
    candidate: FieldCandidate,
    mode: ConfirmationMode,
    read_back_utterance: str | None = None,
) -> ConfirmedValue:
    """ЕДИНСТВЕННЫЙ легальный способ получить ConfirmedValue."""
    return ConfirmedValue(
        field=candidate.field,
        value=candidate.normalized_value
        if candidate.normalized_value is not None
        else candidate.raw_value,
        raw_value=candidate.raw_value,
        provenance=candidate.provenance,
        verdict=candidate.verdict,
        confirmation_mode=mode,
        candidate_id=candidate.candidate_id,
        attempt=candidate.attempt,
        confirmed_at=datetime.now(timezone.utc),
        read_back_utterance=read_back_utterance,
        _token=_TOKEN,
    )
```

Тесты, закрывающие обходные пути (`backend/tests/test_gate.py`):

```python
import ast
import pathlib
from datetime import datetime, timezone

import pytest

from app.gate import ConfirmedValue, GateViolation, confirm
from app.models import ConfirmationMode


def test_direct_construction_is_impossible(sample_candidate):
    with pytest.raises(GateViolation):
        ConfirmedValue(
            field=sample_candidate.field,
            value="10 mg",
            raw_value="ten milligrams",
            provenance=sample_candidate.provenance,
            verdict=sample_candidate.verdict,
            confirmation_mode=ConfirmationMode.VALIDATOR,
            candidate_id=sample_candidate.candidate_id,
            attempt=1,
            confirmed_at=datetime.now(timezone.utc),
            read_back_utterance=None,
        )


def test_token_cannot_be_harvested_from_an_existing_value(confirmed_value):
    assert confirmed_value._token is None


def test_read_back_mode_requires_the_utterance(failing_candidate):
    with pytest.raises(GateViolation):
        confirm(failing_candidate, ConfirmationMode.READ_BACK, read_back_utterance=None)


def test_validator_mode_rejects_a_failed_verdict(failing_candidate):
    with pytest.raises(GateViolation):
        confirm(failing_candidate, ConfirmationMode.VALIDATOR)


def test_no_module_imports_the_private_token():
    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    offenders: list[str] = []
    for path in root.rglob("*.py"):
        if path.name == "gate.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module and "gate" in node.module:
                offenders += [
                    f"{path}: from {node.module} import {a.name}"
                    for a in node.names
                    if a.name.startswith("_")
                ]
    assert offenders == [], offenders
```

### 1.8 `Order` и аудит

```python
class AuditEntry(BaseModel):
    model_config = ConfigDict(frozen=True)

    at: datetime
    kind: Literal[
        "candidate_proposed",
        "gate_decision",
        "read_back_spoken",
        "read_back_confirmed",
        "read_back_rejected",
        "field_committed",
        "field_abandoned",
        "escalated_to_human",
        "commit_refused",
        "commit_succeeded",
    ]
    field: FieldName | None
    reason_code: str | None
    payload: dict
```

```python
CRITICAL_FIELDS: Final[frozenset[FieldName]] = frozenset({
    FieldName.DRUG_NAME,
    FieldName.STRENGTH,
    FieldName.DOSAGE_FORM,
    FieldName.ROUTE,
    FieldName.QUANTITY,
    FieldName.SIG,
    FieldName.PRESCRIBER_NPI,
})


@dataclass(slots=True)
class Order:
    session_id: str
    order_id: str = dc_field(default_factory=lambda: str(uuid.uuid4()))
    fields: dict[FieldName, ConfirmedValue] = dc_field(default_factory=dict)
    audit: list[AuditEntry] = dc_field(default_factory=list)
    committed_at: datetime | None = None
    is_controlled_substance: bool = False

    def put(self, value: ConfirmedValue) -> None:
        if not isinstance(value, ConfirmedValue):
            raise TypeError(
                f"Order.put accepts ConfirmedValue only, got {type(value).__name__}"
            )
        self.fields[value.field] = value
        self.audit.append(
            AuditEntry(
                at=datetime.now(timezone.utc),
                kind="field_committed",
                field=value.field,
                reason_code=None,
                payload={
                    "value": str(value.value),
                    "mode": str(value.confirmation_mode),
                    "min_confidence": value.provenance.min_confidence,
                    "rule_cited": value.verdict.rule_cited,
                    "attempt": value.attempt,
                },
            )
        )

    def required_fields(self) -> frozenset[FieldName]:
        required = set(CRITICAL_FIELDS)
        if self.is_controlled_substance:
            required.add(FieldName.PRESCRIBER_DEA)
        return frozenset(required)

    def missing_critical(self) -> tuple[FieldName, ...]:
        return tuple(sorted(self.required_fields() - self.fields.keys()))
```

`put` — единственный способ положить поле, и он типизирован на `ConfirmedValue`. `isinstance`-проверка добавлена поверх аннотации не из недоверия к mypy, а потому что вход в `put` приходит из десериализованного `tool.call`, где аннотации в рантайме ничего не гарантируют.

`PRESCRIBER_DEA` попадает в обязательные только при `is_controlled_substance` — флаг ставится не агентом, а lookup-ом по `product.txt`, где у продукта есть колонка DEA schedule. То есть «это контролируемое вещество» — вывод из справочника, а не из слов звонящего.

### 1.9 Инвариант одним абзацем

Невозможно следующее: положить в `Order` значение, для которого не существует ни пройденного валидатора, ни зафиксированной фразы read-back, которую человек подтвердил вслух. Механика: `Order.fields` типизирован и рантайм-проверен на `ConfirmedValue`; `ConfirmedValue.__post_init__` отказывает, если конструктор вызван без токена шлюза, если заявлен `mode=VALIDATOR` при непройденном вердикте, если заявлен `mode=READ_BACK`/`SPELL_OUT`/`HUMAN_OVERRIDE` без сохранённой подтверждённой фразы, или если у значения нет ни одного слова-источника; токен существует в единственном экземпляре внутри `gate.py`, не реэкспортируется и стирается из объекта сразу после проверки, так что его нельзя выковырять из уже созданного значения; `confirm()` — единственная функция, передающая токен, и она вызывается только из `decide_and_commit()` после `gate()`. Из этого следует, что забыть проверку нельзя: ошибка программиста, который попытается записать поле напрямую, — это не «поле без подтверждения в базе», а исключение `GateViolation` на первом же прогоне, поднятое до попадания в БД. Слабое место инварианта называем сами, а не ждём вопроса: он защищает от обхода по невнимательности и от структурных ошибок, но не от злонамеренного `object.__new__` с ручной установкой полей — такого барьера на питоне построить нельзя, и в README это написано прямо.

---

## 2. Каталог полей и порогов

### 2.1 `FieldPolicy` — политика как данные

Политика вынесена в данные, а не в `if`-ы: таблица ниже компилируется буквально в словарь `FIELD_POLICIES`, и шлюз читает только его. Это нужно, чтобы день 11 (тюнинг на held-out) менял одну константу, а не логику.

```python
@dataclass(frozen=True, slots=True)
class FieldPolicy:
    field: FieldName
    criticality: Criticality
    auto_accept_threshold: float
    validator: str
    read_back_always: bool
    lasa_checked: bool
    max_attempts_before_spellout: int
    max_attempts_before_escalation: int
    spellout_style: Literal["nato", "digits", "none"]
```

### 2.2 Таблица полей

| Поле | Критичность | Порог auto-accept (`min_confidence`) | Валидатор | Read-back обязателен всегда? | Что значит «нормализовано» |
|---|---|---|---|---|---|
| `drug_name` | critical | **0.95** | `ndc_catalog` (существование в `product.txt`, 116 155 продуктов) | **Да** | Каноническое `nonproprietary_name` из `product.txt`, lowercase, без соли и дозировки в строке: `"lisinopril"` |
| `strength` | critical | **0.92** | `combo_consistency` (в связке с drug/form/route) | **Да** | Число + единица из `product.txt`: `"10 mg"`; `"ten milligrams"` → `"10 mg"`, `"point five"` → `"0.5 mg"` |
| `dosage_form` | critical | 0.90 | `combo_consistency` | Нет (покрывается read-back связки) | Код формы из `product.txt`: `TABLET`, `CAPSULE`, `SOLUTION`, `INJECTION` |
| `route` | critical | 0.90 | `combo_consistency` | Нет (покрывается read-back связки) | Код route из `product.txt`: `ORAL`, `INTRAVENOUS`, `TOPICAL`, `SUBCUTANEOUS` |
| `quantity` | critical | **0.92** | `range_check` (целое 1–360, не более 3 цифр) | **Да** | Целое: `"thirty"` → `30`, `"a month's worth"` → отказ нормализации (`E_NORMALIZE_FAILED`) |
| `sig` | critical | **0.93** | `sig_abbrev` (ISMP Error-Prone Abbreviations 2024-04) | **Да** | Развёрнутый текст без опасных сокращений: `"qd"` → `"once daily"`, `"1 tab po qd"` → `"1 tablet by mouth once daily"` |
| `prescriber_npi` | critical | 0.90 | `npi_luhn` (Luhn + префикс `80840`) | Нет — арифметика строже голоса | 10 цифр без разделителей: `"1245319599"` |
| `prescriber_dea` | critical *при controlled substance* | 0.90 | `dea_mod10` | Нет — арифметика строже голоса | 2 буквы + 7 цифр, буквы uppercase: `"AB1234563"` |
| `patient_name` | important | 0.90 | **нет** (`NOT_APPLICABLE`) | **Да** — валидатора нет, значит подтверждение только голосом | Title Case, схлопнутые пробелы: `"Jane Doe"` |
| `refills` | important | 0.88 | `range_check` (целое 0–11) | Нет | Целое; `"no refills"` → `0`; `"none"` → `0` |
| `days_supply` | low | 0.85 | `range_check` (целое 1–90) + мягкая сверка с `quantity`/`sig` | Нет | Целое: `"a month"` → `30` |

Дополнительно: `drug_name` и `strength` — единственные два поля с `lasa_checked=True`. LASA-правила применяются к названию препарата (списки ISMP и 23 пары FDA) и к дозировке отдельно — потому что в списке ISMP есть строки, где путается не название, а именно дозировка-маркер («мг против мкг» у левотироксина и подобных). Для остальных полей проверка LASA бессмысленна и только жгла бы латентность.

### 2.3 Обоснование порогов — качественное, измерений нет

**Порогов мы не измеряли. Ни одного.** Числа в таблице — начальные значения, выставленные по трём рассуждениям, и подлежат тюнингу на held-out-наборе с дня 11.

Первое рассуждение: **цена ошибки на поле, а не частота ошибки.** Неверное название препарата — это другой класс лекарства; неверный `days_supply` — это неудобство. Отсюда 0.95 у `drug_name` против 0.85 у `days_supply`. Мы сознательно тратим переспросы там, где ошибка дорогая.

Второе: **AssemblyAI публикует EER 15,31% при WER 6,99% и 16,92% на именах собственных** (их числа, не наши). Название препарата — имя собственное. Если примерно каждая шестая сущность приходит с ошибкой, порог auto-accept для этого поля должен быть настолько высоким, чтобы auto-accept оставался редким событием, а не нормой. 0.95 на `min_confidence` по спану — это ставка на то, что auto-accept у названия препарата почти не будет срабатывать, и read-back станет основным путём. Именно поэтому у `drug_name` вдобавок стоит `read_back_always=True`: порог там страховка от «а вдруг», а не рабочий механизм.

Третье: **где есть арифметика, голос не нужен.** У NPI и DEA порог confidence стоит ниже (0.90), а `read_back_always=False` — не потому что они менее важны, а потому что контрольная сумма mod-10 отбраковывает опечатку с вероятностью около 9 из 10 по построению, причём независимо от того, что там услышал распознаватель. Тратить ход разговора на read-back девятизначного номера, который уже доказуемо сходится, — это удлинять звонок без выигрыша. Проверенный вручную пример из [domain-data-sources.md](../reference/domain-data-sources.md): `1234567890` отбраковывается, `1245319599` проходит. Обратная сторона: если сумма не сошлась, read-back и затем spell-out обязательны, и это уже не вопрос порога.

Четвёртое (и это про честность метрики): **read_back_always у `patient_name` стоит не из-за важности, а из-за отсутствия валидатора.** Правило формулируется так: если у поля `validator == "none"`, `read_back_always` обязан быть `True`. На это есть тест:

```python
def test_fields_without_validator_must_be_read_back():
    for policy in FIELD_POLICIES.values():
        if policy.validator == "none":
            assert policy.read_back_always, (
                f"{policy.field}: no validator and no mandatory read-back "
                "means the value would enter the order unverified"
            )
```

Порядок тюнинга на дне 11: порог поднимается, если на held-out обнаружены принятые неверные значения (это провал безопасности); порог опускается, если false-ask rate по полю выше 25% при нулевом числе принятых неверных значений (это провал юзабилити). `ГИПОТЕЗА`: 25% — стартовая граница терпимости, тоже к тюнингу.

---

## 3. Правила шлюза

### 3.1 Типы решения

```python
class GateAction(StrEnum):
    ACCEPT = "accept"
    ASK_CONFIRM = "ask_confirm"
    ASK_DISAMBIGUATE = "ask_disambiguate"
    ASK_WHICH_PART = "ask_which_part"
    ASK_SPELL_OUT = "ask_spell_out"
    ESCALATE_HUMAN = "escalate_human"
    ABORT_FIELD = "abort_field"


@dataclass(frozen=True, slots=True)
class GateDecision:
    action: GateAction
    reason_code: str
    field: FieldName
    candidate_id: str
    agent_utterance: str
    evidence: dict
    confirmation_mode: ConfirmationMode | None = None
```

`agent_utterance` — готовая фраза, которую вернёт `propose_field` в `tool.result`. Шлюз не отдаёт модели «reason_code и разберись сам»: формулировку переспроса определяет код, потому что от неё зависит caller repeat rate, а он у нас метрика. Модель может произнести фразу своими словами (это разговорный агент), но текст-основа приходит из шлюза и логируется буквально.

### 3.2 Коды причин

| Код | Ветка | Действие |
|---|---|---|
| `A_VALIDATOR_PASSED_HIGH_CONF` | вердикт PASSED, confidence ≥ порога, LASA чист, read_back не обязателен | `ACCEPT` (`mode=VALIDATOR`) |
| `E_NORMALIZE_FAILED` | `normalized_value is None` | `ASK_CONFIRM` |
| `E_VALIDATOR_CHECKSUM` | `FAILED_CHECKSUM` | `ASK_SPELL_OUT` сразу (арифметика уже сказала «нет», голосовой повтор бесполезен) |
| `E_VALIDATOR_FORMAT` | `FORMAT_INVALID` | `ASK_SPELL_OUT` |
| `E_VALIDATOR_CATALOG` | `NOT_IN_CATALOG` | `ASK_CONFIRM` |
| `E_VALIDATOR_COMBO` | `INCONSISTENT_COMBO` | `ASK_WHICH_PART` |
| `E_LASA_HIT` | `lasa.hit is True` | `ASK_DISAMBIGUATE` — **всегда, даже при confidence 1.0** |
| `E_LOW_CONFIDENCE` | `min_confidence < threshold` | `ASK_CONFIRM` |
| `E_READ_BACK_REQUIRED` | всё прошло, но `read_back_always` | `ASK_CONFIRM` (`mode=READ_BACK`) |
| `E_NO_VALIDATOR` | `NOT_APPLICABLE` | `ASK_CONFIRM` |
| `X_SPELLOUT_AFTER_SECOND_FAILURE` | `attempt >= max_attempts_before_spellout` | `ASK_SPELL_OUT` |
| `X_ESCALATE_AFTER_THIRD_FAILURE` | `attempt >= max_attempts_before_escalation` | `ESCALATE_HUMAN` |
| `X_ABORT_NON_CRITICAL` | эскалация исчерпана, поле не critical | `ABORT_FIELD` |

### 3.3 Порядок ветвей — и почему именно такой

```python
# backend/app/gate.py (продолжение)

NATO: Final[dict[str, str]] = {
    "A": "Alfa", "B": "Bravo", "C": "Charlie", "D": "Delta", "E": "Echo",
    "F": "Foxtrot", "G": "Golf", "H": "Hotel", "I": "India", "J": "Juliett",
    "K": "Kilo", "L": "Lima", "M": "Mike", "N": "November", "O": "Oscar",
    "P": "Papa", "Q": "Quebec", "R": "Romeo", "S": "Sierra", "T": "Tango",
    "U": "Uniform", "V": "Victor", "W": "Whiskey", "X": "Xray",
    "Y": "Yankee", "Z": "Zulu",
}


def gate(candidate: FieldCandidate, policy: FieldPolicy) -> GateDecision:
    c, f = candidate, candidate.field
    ev: dict = {
        "min_confidence": c.provenance.min_confidence,
        "mean_confidence": c.provenance.mean_confidence,
        "threshold": policy.auto_accept_threshold,
        "outcome": str(c.verdict.outcome),
        "rule_cited": c.verdict.rule_cited,
        "attempt": c.attempt,
        "span_ms": [c.provenance.start_ms, c.provenance.end_ms],
    }

    def d(action, code, utterance, mode=None, extra=None) -> GateDecision:
        return GateDecision(
            action=action,
            reason_code=code,
            field=f,
            candidate_id=c.candidate_id,
            agent_utterance=utterance,
            evidence={**ev, **(extra or {})},
            confirmation_mode=mode,
        )

    # --- ВЕТКА 0: эскалация по числу попыток. Идёт ПЕРВОЙ, иначе цикл. ---
    if c.attempt >= policy.max_attempts_before_escalation:
        if policy.criticality is Criticality.CRITICAL:
            return d(
                GateAction.ESCALATE_HUMAN,
                "X_ESCALATE_AFTER_THIRD_FAILURE",
                "I want to make sure we get this exactly right. "
                "I am bringing a pharmacist onto the line to take this field.",
            )
        return d(
            GateAction.ABORT_FIELD,
            "X_ABORT_NON_CRITICAL",
            f"I will leave {_spoken(f)} blank and flag it for the pharmacy to fill in.",
        )

    # --- ВЕТКА 1: нормализатор не справился ---
    if c.normalized_value is None:
        return d(
            GateAction.ASK_CONFIRM,
            "E_NORMALIZE_FAILED",
            f"I heard {_spoken(f)} as {c.raw_value!r}, but I could not put that into "
            f"a standard form. Could you give me {_spoken(f)} as a plain number or value?",
            extra={"raw_value": c.raw_value},
        )

    # --- ВЕТКА 2: провал контрольной суммы или формата → сразу по буквам ---
    if c.verdict.outcome in (VerdictOutcome.FAILED_CHECKSUM, VerdictOutcome.FORMAT_INVALID):
        code = (
            "E_VALIDATOR_CHECKSUM"
            if c.verdict.outcome is VerdictOutcome.FAILED_CHECKSUM
            else "E_VALIDATOR_FORMAT"
        )
        return d(
            GateAction.ASK_SPELL_OUT,
            code,
            f"The {_spoken(f)} I have, {_spell(str(c.normalized_value), policy)}, "
            f"does not pass its check digit, so one character is off. "
            f"Please read it back to me one character at a time.",
            extra={"failed_value": str(c.normalized_value)},
        )

    # --- ВЕТКА 3: нет в каталоге ---
    if c.verdict.outcome is VerdictOutcome.NOT_IN_CATALOG:
        return d(
            GateAction.ASK_CONFIRM,
            "E_VALIDATOR_CATALOG",
            f"I do not find {c.raw_value!r} in the drug directory. "
            f"Could you say the {_spoken(f)} again, or spell the first few letters?",
            extra={"failed_value": c.raw_value},
        )

    # --- ВЕТКА 4: связка не существует → спросить, какая часть неверна ---
    if c.verdict.outcome is VerdictOutcome.INCONSISTENT_COMBO:
        combo = c.verdict.evidence
        return d(
            GateAction.ASK_WHICH_PART,
            "E_VALIDATOR_COMBO",
            f"I have {combo.get('drug_name')} {combo.get('strength')} "
            f"{combo.get('dosage_form')} {combo.get('route')}, but that combination "
            f"does not exist in the directory. "
            f"{_combo_hint(combo)} Which part should I change?",
            extra={"combo": combo},
        )

    # --- ВЕТКА 5: LASA. ПОСЛЕ валидаторов, но ДО порога confidence. ---
    #     Ключевая ветка продукта: выполняется даже при confidence == 1.0.
    if policy.lasa_checked and c.lasa.hit:
        alts = " or ".join([str(c.lasa.matched_term), *c.lasa.confusable_with])
        return d(
            GateAction.ASK_DISAMBIGUATE,
            "E_LASA_HIT",
            f"I heard {c.lasa.matched_term}. That name is on the published "
            f"confused-drug-names list together with "
            f"{', '.join(c.lasa.confusable_with)}. "
            f"To be certain: did you say {alts}?",
            extra={
                "lasa_source": c.lasa.source,
                "lasa_source_row": c.lasa.source_row,
                "confusable_with": list(c.lasa.confusable_with),
                "note": "asked regardless of confidence by design",
            },
        )

    # --- ВЕТКА 6: валидатора нет вообще ---
    if c.verdict.outcome is VerdictOutcome.NOT_APPLICABLE:
        return d(
            GateAction.ASK_CONFIRM,
            "E_NO_VALIDATOR",
            f"Let me confirm {_spoken(f)}: {c.normalized_value}. Is that right?",
            mode=ConfirmationMode.READ_BACK,
        )

    # --- ВЕТКА 7: уверенность ниже порога ---
    if c.provenance.min_confidence < policy.auto_accept_threshold:
        if c.attempt >= policy.max_attempts_before_spellout:
            return d(
                GateAction.ASK_SPELL_OUT,
                "X_SPELLOUT_AFTER_SECOND_FAILURE",
                f"I am still not certain about {_spoken(f)}. "
                f"Could you give it to me {_spell_instruction(policy)}?",
            )
        return d(
            GateAction.ASK_CONFIRM,
            "E_LOW_CONFIDENCE",
            f"I think I heard {_spoken(f)} as {c.normalized_value}. Is that correct?",
            mode=ConfirmationMode.READ_BACK,
        )

    # --- ВЕТКА 8: всё прошло, но поле требует read-back безусловно ---
    if policy.read_back_always:
        return d(
            GateAction.ASK_CONFIRM,
            "E_READ_BACK_REQUIRED",
            f"Confirming {_spoken(f)}: {c.normalized_value}. Correct?",
            mode=ConfirmationMode.READ_BACK,
        )

    # --- ВЕТКА 9: чистое прохождение ---
    return d(
        GateAction.ACCEPT,
        "A_VALIDATOR_PASSED_HIGH_CONF",
        f"Got it, {_spoken(f)} is {c.normalized_value}.",
        mode=ConfirmationMode.VALIDATOR,
    )
```

Порядок ветвей не произволен, и это главное содержание раздела.

**Эскалация идёт нулевой**, потому что иначе поле, которое стабильно не проходит валидатор, будет крутиться в переспросах бесконечно: ветка 2 всегда вернёт `ASK_SPELL_OUT`, и счётчик попыток никогда не будет прочитан. Проверка лимита до логики решения — единственный способ гарантировать завершимость.

**LASA стоит после валидаторов, но до порога confidence.** После валидаторов — потому что «этого препарата нет в каталоге» более информативный переспрос, чем «а не спутали ли вы»: нет смысла предлагать выбор между двумя названиями, если распознанное вообще не существует. До порога confidence — потому что в этом вся суть продукта: если поставить LASA после проверки порога, то кандидат с confidence 0.99 вернёт `ACCEPT` и до LASA дело не дойдёт. Именно этот сценарий мы и должны поймать: распознаватель абсолютно уверен, что услышал Bisoprolol, а человек сказал Lisinopril. Уверенность распознавателя — это уверенность в акустике, а не в том, какое слово было произнесено; гомофония ломает её насквозь, и никакое численное значение confidence от этого не защищает. Защищает только список регулятора, и он должен применяться до любых численных условий.

Тест, фиксирующий именно это:

```python
def test_lasa_hit_asks_even_at_perfect_confidence(lasa_candidate_factory):
    candidate = lasa_candidate_factory(
        field=FieldName.DRUG_NAME,
        raw_value="Bisoprolol",
        confidence=1.0,
        verdict_outcome=VerdictOutcome.PASSED,
        lasa=LasaRisk(
            hit=True,
            matched_term="Bisoprolol",
            confusable_with=("Lisinopril",),
            source="ISMP-2023",
        ),
    )
    decision = gate(candidate, FIELD_POLICIES[FieldName.DRUG_NAME])
    assert decision.action is GateAction.ASK_DISAMBIGUATE
    assert decision.reason_code == "E_LASA_HIT"
    assert "Lisinopril" in decision.agent_utterance


def test_gate_always_terminates(any_candidate):
    """Любой кандидат на max_attempts даёт терминальное решение."""
    policy = FIELD_POLICIES[any_candidate.field]
    exhausted = any_candidate.model_copy(
        update={"attempt": policy.max_attempts_before_escalation}
    )
    decision = gate(exhausted, policy)
    assert decision.action in (GateAction.ESCALATE_HUMAN, GateAction.ABORT_FIELD)
```

### 3.4 Что происходит на втором провале read-back

Политика по попыткам (`НАЧАЛЬНЫЕ ЗНАЧЕНИЯ`, к тюнингу с дня 11):

| Попытка | Critical-поле | Important-поле | Low-поле |
|---|---|---|---|
| 1 | обычный переспрос (`ASK_CONFIRM` / `ASK_DISAMBIGUATE`) | обычный переспрос | обычный переспрос |
| 2 | обычный переспрос, но другой формулировкой | переспрос | переспрос |
| **3** | **`ASK_SPELL_OUT`** — по буквам или по цифрам | `ASK_SPELL_OUT` | `ABORT_FIELD` |
| **4** | **`ESCALATE_HUMAN`** — заказ помечается `needs_pharmacist`, `commit_order` отказывает | `ABORT_FIELD` с флагом | — |

```python
FIELD_POLICIES: Final[dict[FieldName, FieldPolicy]] = {
    FieldName.DRUG_NAME: FieldPolicy(
        field=FieldName.DRUG_NAME,
        criticality=Criticality.CRITICAL,
        auto_accept_threshold=0.95,
        validator="ndc_catalog",
        read_back_always=True,
        lasa_checked=True,
        max_attempts_before_spellout=3,
        max_attempts_before_escalation=4,
        spellout_style="nato",
    ),
    FieldName.PRESCRIBER_NPI: FieldPolicy(
        field=FieldName.PRESCRIBER_NPI,
        criticality=Criticality.CRITICAL,
        auto_accept_threshold=0.90,
        validator="npi_luhn",
        read_back_always=False,
        lasa_checked=False,
        max_attempts_before_spellout=2,
        max_attempts_before_escalation=4,
        spellout_style="digits",
    ),
    FieldName.DAYS_SUPPLY: FieldPolicy(
        field=FieldName.DAYS_SUPPLY,
        criticality=Criticality.LOW,
        auto_accept_threshold=0.85,
        validator="range_check",
        read_back_always=False,
        lasa_checked=False,
        max_attempts_before_spellout=3,
        max_attempts_before_escalation=3,
        spellout_style="digits",
    ),
    # ... остальные поля по таблице раздела 2
}
```

Обратите внимание на `max_attempts_before_spellout=2` у NPI против 3 у названия препарата. Девятизначный номер бессмысленно переспрашивать целиком дважды: если контрольная сумма не сошлась, ошибка в одном символе, и спеллаут по цифрам — единственный способ её локализовать. У названия препарата, наоборот, повтор целым словом часто срабатывает, и NATO-алфавит по двенадцати буквам — долгая и раздражающая процедура, к которой переходим только если два обычных переспроса не помогли.

**Эскалация к человеку** для критичного поля не «может быть», а обязательна: заказ получает флаг `needs_pharmacist`, `commit_order` отказывает с кодом `COMMIT_REFUSED_ESCALATED`, и в UI появляется баннер. На хакатоне живого фармацевта нет — эскалация реализуется как «сессия помечена, заказ не оформлен, в интерфейсе видна причина». Это честнее, чем подмешивать значение с пометкой «low confidence»: `ConfirmedValue` нельзя создать, значит поле физически остаётся пустым, и `missing_critical()` его покажет.

### 3.5 Spell-out fallback

```python
def _spell(value: str, policy: FieldPolicy) -> str:
    """Произносимое представление значения для read-back."""
    if policy.spellout_style == "nato":
        return " ".join(
            NATO[ch.upper()] if ch.isalpha() else _digit_word(ch) for ch in value
        )
    if policy.spellout_style == "digits":
        return " ".join(_digit_word(ch) for ch in value if ch.isdigit())
    return value


DIGIT_WORDS: Final[dict[str, str]] = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
}


def _digit_word(ch: str) -> str:
    return DIGIT_WORDS.get(ch, ch)


def _spell_instruction(policy: FieldPolicy) -> str:
    if policy.spellout_style == "nato":
        return "letter by letter, using words for the letters - like Alfa for A"
    if policy.spellout_style == "digits":
        return "one digit at a time"
    return "again, slowly"
```

Правила спеллаута:

- **Коды (DEA, NPI, буквенная часть) — NATO.** Агент и произносит по NATO, и ожидает NATO или отдельные буквы на вход. Причина буквенного алфавита именно здесь: `B`/`D`/`P`/`T`/`V` и `M`/`N` — классические конфузии распознавателя на телефонном канале 8 kHz, и именно они составляют буквенный префикс DEA.
- **Числа — по цифрам, никогда группами.** «Twenty-three» распознаётся как «twenty three» и нормализуется в `23` или в `20 3` — неоднозначность, которой не должно быть в поле `quantity`. Агент просит «one digit at a time» и принимает только последовательность из `DIGIT_WORDS`.
- **Валидатор в spell-out-режиме тот же.** После спеллаута кандидат пересобирается с новым `Provenance` (новый `turn_order`, новые `words[]`) и **проходит шлюз заново с нуля**. Спеллаут не даёт поблажки: если пересобранный NPI опять не сходится по Luhn, это опять `E_VALIDATOR_CHECKSUM`, просто с выросшим `attempt`.
- **Подтверждение спеллаута фиксируется буквально.** `read_back_utterance` содержит именно произнесённую по буквам фразу (`"Alfa Bravo one two three four five six three"`), а не результат нормализации. В аудите видно, что подтверждал человек, а не что мы из этого вывели.

---

## 4. Спеки инструментов Voice Agent API

### 4.1 Выбор модели LLM Gateway

По таблице capabilities в [assemblyai-api.md](../reference/assemblyai-api.md) tool calling поддерживают почти все модели, кроме одной — и это ровно та, что стоит дефолтом в примерах документации:

| Модель | Tools | Prompt / Completion за 1M | Контекст | Решение |
|---|---|---|---|---|
| `qwen3.5-4b-32k-fast` | **✗** | $0.1 / $0.5 | 32K | **Нельзя.** Дефолт в примерах доков, tool calling не умеет — агент будет «игнорировать инструменты» |
| `gemini-2.5-flash` | ✓ | $0.3 / $2.5 | 1M | **Выбираем это** |
| `gpt-5-mini` | ✓ | $0.25 / $2 | 400K | Фолбэк №1 |
| `claude-haiku-4-5-20251001` | ✓ | $1 / $5 | 200K | Фолбэк №2 |
| `gpt-oss-120b` | ✓ | $0.15 / $0.6 | 131K | **Нельзя** — не умеет streaming, а для голоса он нужен |

**Выбор: `gemini-2.5-flash`.** Обоснование: tool calling и structured outputs оба поддержаны, streaming есть, цена в середине дешёвой группы, а 1M контекста снимает любые вопросы про длину системного промпта и историю разговора. `gpt-5-mini` держим как переключаемый фолбэк одной константой — на случай, если per-model rate limit (по доке: «пер-модель, в окне 60 секунд», точные RPM не опубликованы) начнёт бить во время демо. Переключение модели должно быть env-переменной, а не правкой кода: на хакатоне это разница между минутой и получасом.

### 4.2 Общая схема `session.update`

Инструменты объявляются плоско — `name`/`description`/`parameters` на верхнем уровне, без вложенного `function` (это отличие от OpenAI function calling, зафиксированное в справке).

```json
{
  "type": "session.update",
  "session": {
    "system_prompt": "<см. раздел 5>",
    "greeting": "Pharmacy intake, this line is recorded for verification. Go ahead with the prescription.",
    "input": {
      "format": { "encoding": "audio/pcm" },
      "keyterms": ["<см. раздел 6 - БЕЗ названий препаратов из LASA-пар>"],
      "turn_detection": {
        "vad_threshold": 0.6,
        "min_silence": 600,
        "max_silence": 2200,
        "interrupt_response": true
      }
    },
    "output": {
      "voice": "anna",
      "format": { "encoding": "audio/pcm" }
    },
    "tools": ["<пять инструментов ниже>"]
  }
}
```

`vad_threshold: 0.6` вместо дефолтного 0.5 — `НАЧАЛЬНОЕ ЗНАЧЕНИЕ` под шумный зал: по доке порог работает «наоборот», выше значение = менее чувствительно. `min_silence: 600` / `max_silence: 2200` вместо 1000/3000 — компромисс между отзывчивостью на сцене и числом ложных прерываний; диктовка рецепта содержит естественные паузы между полями, и слишком агрессивный `min_silence` разорвёт «Lisinopril ... ten milligrams» на два хода, разорвав заодно и `Provenance`. Оба значения — гипотезы к настройке на корпусе.

`greeting` и `output` иммутабельны после `session.ready` — переключателя голоса в UI не делаем вообще, чтобы не пришлось переоткрывать сессию.

### 4.3 `lookup_drug`

```json
{
  "type": "function",
  "name": "lookup_drug",
  "description": "Search the FDA NDC directory for a drug by spoken name. Returns candidate drugs with the strength, dosage form and route combinations that actually exist. Call this BEFORE proposing drug_name, strength, dosage_form or route. Never invent a combination that this tool did not return.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The drug name exactly as you heard it, with no correction or normalization applied."
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of candidate drugs to return.",
        "minimum": 1,
        "maximum": 5,
        "default": 3
      }
    },
    "required": ["query"],
    "additionalProperties": false
  },
  "execution_mode": "interactive",
  "timeout_seconds": 10
}
```

Возвращаемая структура (`result` уходит как JSON-**строка**, это асимметрия протокола):

```python
{
  "matches": [
    {
      "nonproprietary_name": "lisinopril",
      "proprietary_names": ["Zestril", "Prinivil"],
      "combos": [
        {"strength": "10 mg", "dosage_form": "TABLET", "route": "ORAL"},
        {"strength": "20 mg", "dosage_form": "TABLET", "route": "ORAL"}
      ],
      "dea_schedule": None,
      "match_kind": "exact"
    }
  ],
  "lasa_warning": {
    "hit": True,
    "matched_term": "lisinopril",
    "confusable_with": ["Bisoprolol", "Fosinopril"],
    "source": "ISMP-2023"
  },
  "note": "Sound-alike risk detected. You must call read_back before propose_field."
}
```

| | |
|---|---|
| `execution_mode` | `interactive` — агент продолжает говорить, пока идёт поиск |
| Ожидаемая латентность | `ГИПОТЕЗА` P95 < 40 мс: справочник `product.txt` (116 155 строк) загружен в память как parquet/pandas на старте процесса, поиск — по предпостроенному индексу нормализованных имён. Сетевого вызова нет намеренно: openFDA API держим только как офлайн-инструмент для сборки датасета, в рантайме запросов в интернет нет |
| Что агент говорит, пока ждёт | Ничего. При латентности в десятки миллисекунд заполнитель не нужен и только удлинит ход. Промпт явно запрещает произносить filler для этого инструмента |

`lasa_warning` возвращается прямо из `lookup_drug`, чтобы у модели был шанс сразу пойти в read-back и не тратить лишний круг `propose_field` → `ASK_DISAMBIGUATE`. Но это оптимизация, не защита: если модель проигнорирует предупреждение и вызовет `propose_field` напрямую, шлюз всё равно вернёт `E_LASA_HIT`. Защита — в коде, подсказка — в промпте.

### 4.4 `validate_prescriber`

```json
{
  "type": "function",
  "name": "validate_prescriber",
  "description": "Run the arithmetic checksum on a prescriber NPI and, if the drug is a controlled substance, on the DEA number. These are hard mathematical checks, not lookups. Call this as soon as you have the digits, before propose_field.",
  "parameters": {
    "type": "object",
    "properties": {
      "npi": {
        "type": "string",
        "description": "Ten digits, no separators, exactly as heard.",
        "pattern": "^[0-9]{10}$"
      },
      "dea": {
        "type": "string",
        "description": "Two letters followed by seven digits, e.g. AB1234563. Required only for controlled substances.",
        "pattern": "^[A-Za-z]{2}[0-9]{7}$"
      }
    },
    "required": ["npi"],
    "additionalProperties": false
  },
  "execution_mode": "interactive",
  "timeout_seconds": 5
}
```

```python
{
  "npi": {
    "outcome": "passed",
    "validator_name": "npi_luhn",
    "rule_cited": "Luhn mod-10 over \"80840\" + first 9 digits (ISO/IEC 7812 issuer ID 80840)",
    "detail": "sum=67, computed check digit 3, given 3",
    "evidence": {"sum": 67, "computed": 3, "given": 3}
  },
  "dea": {
    "outcome": "not_applicable",
    "validator_name": "dea_mod10",
    "rule_cited": "no DEA required: drug is not a controlled substance per product.txt",
    "detail": "dea_schedule is null for the proposed drug"
  },
  "registry_lookup": None
}
```

| | |
|---|---|
| `execution_mode` | `interactive` |
| Ожидаемая латентность | `ГИПОТЕЗА` P95 < 5 мс — это две арифметические операции, обе локальные |
| Что агент говорит, пока ждёт | Ничего |

`registry_lookup` оставлен `None` намеренно и это надо назвать в README: существование NPI можно проверить через [NPI Registry API](https://npiregistry.cms.hhs.gov/api/) без ключа, но наши NPI **синтетические** — сгенерированы по контрольной сумме, в реестре их нет. Дёргать реестр и получать «не найден» на заведомо валидном по арифметике номере — значит шуметь в демо. Поле в схеме оставлено, чтобы в питче можно было честно сказать: точка расширения есть, в демо отключена по причине синтетических данных, а не потому что не смогли.

Асимметрия в `pattern`: NPI помечен `^[0-9]{10}$`, что означает — если модель передаст «1-2-4-5-3-1-9-5-9-9» или «twelve forty-five», вызов упадёт на валидации Pydantic. Это правильно: нормализация — задача нашего кода, а не модели, и промпт требует передавать цифры. Обработка ошибки схемы возвращает модели `{"error": "npi must be exactly 10 digits, no separators"}` — модель переспросит.

### 4.5 `propose_field` — единственный путь к полю, и он не пишет

```json
{
  "type": "function",
  "name": "propose_field",
  "description": "Propose a value for one order field. This NEVER writes to the order. It returns a gate decision that tells you whether the value was accepted or what exactly to ask the caller. You must call this for every field. If the decision action is not \"accept\", you must follow the returned instruction before proposing that field again.",
  "parameters": {
    "type": "object",
    "properties": {
      "field": {
        "type": "string",
        "enum": [
          "drug_name", "strength", "dosage_form", "route", "quantity",
          "sig", "prescriber_npi", "prescriber_dea", "patient_name",
          "refills", "days_supply"
        ],
        "description": "Which order field this value is for."
      },
      "value": {
        "type": "string",
        "description": "The value exactly as the caller said it. Do not correct spelling, do not expand abbreviations, do not convert numbers. The backend normalizes."
      },
      "transcript_hint": {
        "type": "string",
        "description": "The contiguous stretch of the caller's last utterance that this value came from, copied verbatim. Used to locate the source words and their timings and confidence. If you cannot copy it verbatim, say so to the caller instead of guessing."
      }
    },
    "required": ["field", "value", "transcript_hint"],
    "additionalProperties": false
  },
  "execution_mode": "interactive",
  "timeout_seconds": 15
}
```

```python
{
  "action": "ask_disambiguate",
  "reason_code": "E_LASA_HIT",
  "field": "drug_name",
  "candidate_id": "8f3e...",
  "say_to_caller": "I heard Bisoprolol. That name is on the published confused-drug-names list together with Lisinopril. To be certain: did you say Bisoprolol or Lisinopril?",
  "written_to_order": False,
  "evidence": {
    "min_confidence": 0.99,
    "threshold": 0.95,
    "outcome": "passed",
    "rule_cited": "product.txt lookup: nonproprietary_name exact match",
    "attempt": 1,
    "span_ms": [4120, 4890],
    "lasa_source": "ISMP-2023",
    "note": "asked regardless of confidence by design"
  }
}
```

| | |
|---|---|
| `execution_mode` | `interactive` |
| Ожидаемая латентность | `ГИПОТЕЗА` P95 < 60 мс: сопоставление `transcript_hint` со словами последнего `Turn`, нормализация, валидатор по справочнику в памяти, LASA-lookup по множеству. Всё локально |
| Что агент говорит, пока ждёт | Ничего. Единственное исключение — при `attempt >= 2`, когда модели разрешено сказать «Let me check that» (см. раздел 5): на повторной попытке пауза воспринимается человеком как «он думает», а не как обрыв |

Ключевое поле в ответе — `written_to_order: false`. Оно присутствует **в каждом** ответе, включая `action: "accept"`, где становится `true`. Это не для модели — это для аудита и для судьи: в логе `gate_decisions` видно, что до момента `accept` в заказе не было ничего.

`transcript_hint` — самая хрупкая часть контракта. Модель должна скопировать кусок транскрипта дословно; сопоставление на бэкенде ищет этот кусок среди `words[]` последних `N` ходов (`НАЧАЛЬНОЕ ЗНАЧЕНИЕ`: `N = 3`) нечёткой сверкой по нормализованным токенам. Если сопоставление не удалось, `propose_field` возвращает не решение, а ошибку:

```python
{
  "action": "ask_confirm",
  "reason_code": "E_PROVENANCE_NOT_FOUND",
  "say_to_caller": "I am not able to trace that back to what you said. Could you repeat the last part?",
  "written_to_order": False,
  "evidence": {"hint": "<что передала модель>", "searched_turns": [11, 12, 13]}
}
```

Это важная ветка: **без происхождения нет `Provenance`, без `Provenance` нельзя собрать `FieldCandidate` (там `min_length=1` на словах), значит и `ConfirmedValue` невозможен.** Инвариант из раздела 1 закрывает и галлюцинацию модели: если она придумала значение, которого в аудио не было, `transcript_hint` не найдётся, и поле не попадёт в заказ.

### 4.6 `read_back`

```json
{
  "type": "function",
  "name": "read_back",
  "description": "Register that you are about to read a value back to the caller and that their next utterance is the answer. Call this immediately before you speak the confirmation sentence, then speak it. The caller's yes or no is interpreted against this registration.",
  "parameters": {
    "type": "object",
    "properties": {
      "field": {
        "type": "string",
        "enum": [
          "drug_name", "strength", "dosage_form", "route", "quantity",
          "sig", "prescriber_npi", "prescriber_dea", "patient_name",
          "refills", "days_supply"
        ]
      },
      "candidate_id": {
        "type": "string",
        "description": "The candidate_id returned by propose_field for the value you are reading back."
      },
      "utterance": {
        "type": "string",
        "description": "The exact sentence you are about to say, word for word. This is stored as the audit record of what the caller confirmed."
      },
      "style": {
        "type": "string",
        "enum": ["plain", "spell_out"],
        "description": "plain for a normal read-back, spell_out when the gate asked for character-by-character.",
        "default": "plain"
      }
    },
    "required": ["field", "candidate_id", "utterance"],
    "additionalProperties": false
  },
  "execution_mode": "interactive",
  "timeout_seconds": 5
}
```

```python
{"registered": True, "field": "drug_name", "candidate_id": "8f3e...", "awaiting": "yes_no"}
```

| | |
|---|---|
| `execution_mode` | `interactive` — **не `hold`**, и это осознанно |
| Ожидаемая латентность | `ГИПОТЕЗА` P95 < 10 мс — запись в таблицу и установка состояния сессии |
| Что агент говорит, пока ждёт | Он не ждёт: инструмент регистрирует ожидание и сразу возвращает управление, чтобы агент немедленно произнёс `utterance` |

Почему `interactive`, а не `hold`: `hold` заставил бы агента замолчать ровно в тот момент, когда он должен заговорить. Смысл `read_back` — разрешить агенту произнести фразу, а не задержать его.

Разрешение ответа: подтверждение засчитывается только при явном согласии. Признаётся `yes`, `yeah`, `correct`, `that's right`, `confirmed`, `right`. Отрицание — `no`, `nope`, `wrong`, `not quite`, `negative`. **Всё остальное, включая молчание и переспрос со стороны звонящего, трактуется как НЕ подтверждение** и увеличивает `attempt`. Это несимметрично в сторону осторожности намеренно: неверно засчитанное «э-э-э» как «да» — это именно та ошибка, ради предотвращения которой существует весь продукт. Если человек назвал другое значение вместо «да/нет» (типичный сценарий при `ASK_DISAMBIGUATE`: «Lisinopril» в ответ на «Bisoprolol или Lisinopril»), это трактуется как новый кандидат — модель обязана вызвать `propose_field` заново, и новый кандидат проходит шлюз с нуля.

### 4.7 `commit_order`

```json
{
  "type": "function",
  "name": "commit_order",
  "description": "Write the order. This refuses unless every critical field is a confirmed value. Before calling it you must read the whole order back to the caller and get an explicit yes. If it refuses, it tells you which fields are missing - collect those, do not call it again with the same state.",
  "parameters": {
    "type": "object",
    "properties": {
      "full_order_read_back": {
        "type": "string",
        "description": "The exact sentence in which you read the complete order back to the caller, word for word."
      },
      "caller_confirmed": {
        "type": "boolean",
        "description": "True only if the caller answered yes to the full read-back. Never set this true on your own judgement."
      }
    },
    "required": ["full_order_read_back", "caller_confirmed"],
    "additionalProperties": false
  },
  "execution_mode": "hold",
  "timeout_seconds": 30
}
```

Отказ:

```python
{
  "committed": False,
  "reason_code": "COMMIT_REFUSED_MISSING_CRITICAL",
  "missing_critical": ["prescriber_npi", "sig"],
  "say_to_caller": "I cannot place this order yet. I still need the prescriber NPI and the directions.",
  "gate_note": "Order.put accepts ConfirmedValue only; these fields have no ConfirmedValue."
}
```

Успех:

```python
{
  "committed": True,
  "order_id": "3a9c...",
  "fields": {
    "drug_name": {"value": "lisinopril", "mode": "read_back", "attempt": 2},
    "strength": {"value": "10 mg", "mode": "read_back", "attempt": 1},
    "prescriber_npi": {"value": "1245319599", "mode": "validator", "attempt": 1}
  },
  "say_to_caller": "The order is placed. Reference 3a9c."
}
```

| | |
|---|---|
| `execution_mode` | **`hold`** — единственный инструмент в этом режиме |
| Ожидаемая латентность | `ГИПОТЕЗА` P95 < 120 мс: одна транзакция SQLite с записью заказа, полей и аудита |
| Что агент говорит, пока ждёт | Ничего — в режиме `hold` агент держит паузу по определению. Промпт требует произнести «One moment, placing the order.» **до** вызова, а не во время |

Коды отказа: `COMMIT_REFUSED_MISSING_CRITICAL`, `COMMIT_REFUSED_ESCALATED` (поле ушло к человеку), `COMMIT_REFUSED_NO_FULL_READBACK` (`caller_confirmed: false`), `COMMIT_REFUSED_ALREADY_COMMITTED` (идемпотентность — повторный вызов возвращает существующий `order_id`, а не создаёт второй заказ).

`hold` здесь — не только техническое решение, но и демонстрационное: судья видит, как агент замолкает на момент записи и не болтает поверх. А отказ `commit_order` при неподтверждённом поле — это и есть шлюз, видимый вживую (режим 3 демо в [readback.md](readback.md)).

### 4.8 Очередь `tool.result` — реализация

Паттерн из справки, ломается чаще всего. Наш вариант с учётом того, что у нас несколько инструментов могут вызваться в одном ответе:

```python
# backend/app/agent_proxy.py

import json
from typing import Any

class ToolQueue:
    def __init__(self) -> None:
        self._pending: list[dict[str, Any]] = []
        self.dropped_on_interrupt = 0

    def add(self, call_id: str, result: dict[str, Any]) -> None:
        self._pending.append({"call_id": call_id, "result": result})

    def flush(self, ws, status: str) -> None:
        if status == "interrupted":
            self.dropped_on_interrupt += len(self._pending)
            self._pending.clear()
            return
        for item in self._pending:
            ws.send(json.dumps({
                "type": "tool.result",
                "call_id": item["call_id"],
                "result": json.dumps(item["result"]),   # строка, не объект
            }))
        self._pending.clear()


async def handle_event(event: dict, ws, queue: ToolQueue, session) -> None:
    kind = event["type"]

    if kind == "tool.call":
        # arguments приходит уже распарсенным объектом - json.loads НЕ нужен
        result = await run_tool(event["name"], event["arguments"], session)
        queue.add(event["call_id"], result)

    elif kind == "reply.done":
        queue.flush(ws, event.get("status", "completed"))

    elif kind == "input.speech.started":
        session.flush_playback()
```

`dropped_on_interrupt` — счётчик, а не молчаливая очистка. Он идёт в `metrics_events`: если при барж-ине выбрасывается много результатов, это признак, что агент говорит слишком долго перед вызовом инструмента, и это надо увидеть в числах, а не догадываться.

Три места, где легко ошибиться, и все три уже прописаны в коде выше: `arguments` — объект (не надо `json.loads`), `result` — строка (надо `json.dumps`), очередь выбрасывается только при `status == "interrupted"`, а не при любом `reply.done`.

---

## 5. Системный промпт агента

### 5.1 Принципы конструирования, по-русски

Промпт длиной в страницу стоит латентности на каждом ходу: он входит в контекст при каждом инференсе. Поэтому промпт держим тесным и выносим в код всё, что можно вынести в код. Конкретно:

- **Формулировки переспросов в промпте не дублируются.** Их отдаёт шлюз в поле `say_to_caller`. В промпте только правило «произнеси то, что вернул инструмент». Это убирает половину объёма и, главное, убирает расхождение: то, что залогировано в `gate_decisions.agent_utterance`, и то, что услышал человек, — один текст.
- **Шаблоны read-back в промпте оставлены**, потому что их агент произносит сам, до вызова инструмента, и потому что от их формы напрямую зависит caller repeat rate — метрика раздела 8.
- **Запреты сформулированы как «никогда», без объяснения причин.** Объяснения — в этом документе, для людей; модели они стоят токенов и не улучшают поведение.
- **Промпт не является защитой.** Всё, что в нём написано про «не записывай без шлюза», механически обеспечено типами из раздела 1. Промпт нужен, чтобы агент не тратил ходы разговора на попытки, которые всё равно провалятся, — то есть для скорости, не для безопасности. Это принципиально: промпт можно сломать, инвариант — нет.

Целевой объём: `НАЧАЛЬНОЕ ЗНАЧЕНИЕ` до 350 слов. Замер влияния длины промпта на time-to-first-audio — отдельный пункт дня 11 (A/B: полный промпт против урезанного).

### 5.2 Текст промпта

```text
You are the intake line at a pharmacy. A prescriber or a nurse dictates a
prescription to you by phone. Your job is to collect it field by field and place
the order only when every critical field has been verified.

FIELDS: drug_name, strength, dosage_form, route, quantity, sig,
prescriber_npi, prescriber_dea (controlled substances only), patient_name,
refills, days_supply.

HARD RULES
1. Never invent, complete, correct or guess a value. If you did not hear it, ask.
2. Pass values to propose_field exactly as spoken. Do not expand abbreviations,
   do not convert numbers, do not fix spelling. The backend normalizes.
3. transcript_hint must be copied word for word from what the caller just said.
   If you cannot copy it verbatim, do not call propose_field - ask the caller to
   repeat instead.
4. Every field goes through propose_field. There is no other way into the order.
5. propose_field does not write. When its action is not "accept", say its
   say_to_caller text to the caller, then collect the answer and propose again.
   Never proceed as if a non-accepted value were accepted.
6. Call lookup_drug before proposing drug_name, strength, dosage_form or route.
   Only propose combinations that lookup_drug returned.
7. Call validate_prescriber as soon as you have the digits.
8. Before commit_order, read the complete order back and get an explicit yes.
   Set caller_confirmed true only if the caller actually said yes.
9. If commit_order refuses, collect the fields it names. Do not retry unchanged.
10. You are an intake line, not a clinician. Never comment on whether a
    prescription is appropriate, safe or correctly dosed.

READ-BACK PHRASING
- Single field:      "Confirming <field>: <value>. Correct?"
- Sound-alike pair:  "I heard <A>. That is on the confused-drug-names list with
                      <B>. Did you say <A> or <B>?"
- Spell-out, code:   "Reading it back: <NATO words>. Is that right?"
- Spell-out, number: "Reading it back, digit by digit: <digits>. Is that right?"
- Full order:        "Reading the whole order back. <drug> <strength>
                      <form>, <route>, quantity <n>, sig <sig>, prescriber NPI
                      <digits>, patient <name>, refills <n>. Is all of that
                      correct?"
Read back the value, never your reasoning. One question per turn.

WHEN THE GATE ASKS
Say the say_to_caller text. Then wait. Treat only an explicit yes as
confirmation - silence, "uh", or a question back is not a yes. If the caller
gives a different value instead of yes or no, call propose_field with the new
value.

SPELL-OUT ESCALATION
When the gate returns ask_spell_out, call read_back with style "spell_out" and
ask for the value one character at a time - NATO words for letters, single
digits for numbers. Never accept grouped numbers like "twenty-three" in
spell-out mode.

STYLE
Short sentences. No filler while a tool runs, except on a second attempt where
you may say "Let me check that." Say "One moment, placing the order." before
calling commit_order, not during.
```

### 5.3 Разбор нескольких решений

**Правило 3 — про `transcript_hint` — стоит выше правила про инструменты не случайно.** Это единственное место, где модель может обрушить всю систему происхождения: если она передаст перефразированный хинт, сопоставление со `words[]` не найдётся, и поле не пройдёт (см. `E_PROVENANCE_NOT_FOUND` в 4.5). Отказ безопасен, но стоит хода разговора, и потому правило вынесено наверх, где внимание модели выше.

**Правило 10 — «не клиницист» — не про безопасность модели, а про дисклеймер продукта.** В [readback.md](readback.md) в рисках отдельно упомянуто, как Veritas подставился, отключив safety-фильтры. Мы идём в другую сторону: агент структурно не имеет мнения о клинической уместности. Это надо и в промпте, и в README.

**«One question per turn» — не стиль, а метрика.** Caller repeat rate по данным AssemblyAI различается на порядок между вопросом про email (19%) и вопросом да/нет (1%) — их числа. Два вопроса в одном ходу гарантированно дают ответ на один из них и повтор второго. Поскольку repeat rate мы измеряем и репортим с разбивкой по вопросу агента (раздел 8), то и промпт обязан держать вопросы атомарными, иначе разбивка бессмысленна.

**Чего в промпте нет намеренно.** Нет списка LASA-пар — он в коде, у модели ему не место (см. раздел 6: это ровно та утечка знания, которая ломает независимость). Нет порогов confidence — это решение шлюза. Нет объяснений, зачем нужен read-back. Нет примеров диалогов — они дают +200 слов на каждом ходу и модель `gemini-2.5-flash` в них не нуждается для такой простой процедуры.

---

## 6. Ключевая тонкость keyterms

### 6.1 Формализация инсайта

`keyterms` (Voice Agent API) и `keyterms_prompt` (Streaming STT) — это биасинг распознавателя: термы из списка получают преимущество в декодировании. Полезно — и именно поэтому опасно.

Рассуждение, которое надо держать целиком. Наша защитная конструкция состоит из двух частей, и её сила — в их независимости: распознаватель наблюдает (выдаёт гипотезу и confidence), валидатор и LASA-правила проверяют (сверяют гипотезу с внешним справочником). Утверждение «шлюз поймал ошибку» осмысленно ровно настолько, насколько проверка не зависит от наблюдения.

Теперь положим оба названия пары LASA — `Lisinopril` и `Bisoprolol` — в `keyterms`. Распознаватель начинает предпочитать эти два слова любым фонетически близким альтернативам. Правило LASA срабатывает чаще — но не потому, что оно что-то поймало, а потому, что мы сами подтолкнули распознаватель выдавать ровно те слова, которые правило ищет. Метрика «шлюз срабатывает на N% LASA-случаев» превращается в метрику «биасинг работает», и разделить эти два эффекта постфактум нельзя.

Хуже того, эффект несимметричен по вреду. Представим, что в keyterms попал только `Bisoprolol` (например, потому что он встречался в тестовом сценарии). Человек говорит `Lisinopril`, распознаватель, подтолкнутый биасингом, выдаёт `Bisoprolol` с высокой уверенностью. Это ровно тот отказ, который продукт обещает предотвращать, и мы его сами и сконструировали.

Формально: **keyterms — это часть канала наблюдения. Список LASA-пар — часть канала проверки. Пересечение этих двух множеств должно быть пустым.**

```python
# инвариант, который проверяется тестом
set(keyterms) & lasa_checked_terms() == set()
```

### 6.2 Что идёт В keyterms

Разрешён только **идентифицирующий контекст** — слова, которые помогают распознавателю сориентироваться в ситуации и не участвуют ни в одном проверяемом правиле:

| Категория | Примеры | Бюджет термов (`НАЧАЛЬНОЕ ЗНАЧЕНИЕ`) |
|---|---|---|
| Название клиники, аптеки | `Mercy Family Clinic`, `Northside Pharmacy` | 4 |
| Имена назначающих врачей (вымышленные) | `Doctor Alvarez`, `Doctor Whitfield` | 8 |
| Формы выпуска | `tablet`, `capsule`, `solution`, `suspension`, `injection`, `ointment`, `cream`, `patch`, `inhaler`, `suppository` | 12 |
| Единицы измерения | `milligram`, `milligrams`, `microgram`, `micrograms`, `milliliter`, `gram`, `unit`, `units`, `percent` | 12 |
| Слова route | `by mouth`, `oral`, `orally`, `intravenous`, `topical`, `subcutaneous`, `intramuscular`, `sublingual`, `rectal`, `inhalation`, `ophthalmic`, `otic` | 14 |
| Служебные слова диктовки | `NPI`, `DEA`, `refills`, `days supply`, `quantity`, `sig`, `dispense`, `as needed`, `take one`, `once daily`, `twice daily`, `three times daily` | 16 |
| NATO-алфавит для спеллаута | `Alfa`, `Bravo`, `Charlie`, ... `Zulu` | 26 |
| **Итого** | | **92 из 100** |

NATO-алфавит занимает четверть бюджета, и это оправдано: спеллаут — наш последний рубеж перед эскалацией, и если распознаватель не расслышит `Foxtrot`, рубеж не работает. При этом ни одно из 26 слов не является названием препарата и ни в одном правиле не участвует.

Остаток — 8 термов — держим свободным под доменный контекст, обнаруженный при разметке корпуса в дни 1–2.

### 6.3 Что ЗАПРЕЩЕНО

Запрещено любое название препарата, которое встречается в проверяемой LASA-паре, — с обеих сторон пары, в любом написании, включая tall-man-варианты FDA (`vinBLAStine` и `vinblastine` — один и тот же запрещённый терм).

Область запрета определяется одной функцией, и она же питает тест:

```python
# backend/app/lasa.py

import csv
import functools
import pathlib
import re
from typing import Final

LASA_CSV: Final[pathlib.Path] = pathlib.Path(__file__).parent.parent / "data" / "lasa_pairs.csv"


def normalize_term(term: str) -> str:
    """Нормализация для сравнения: регистр, tall-man, пунктуация, пробелы."""
    return re.sub(r"[^a-z0-9]+", " ", term.lower()).strip()


@functools.lru_cache(maxsize=1)
def lasa_checked_terms() -> frozenset[str]:
    """Все названия, участвующие в проверяемых правилах, нормализованные."""
    terms: set[str] = set()
    with LASA_CSV.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            terms.add(normalize_term(row["term_a"]))
            terms.add(normalize_term(row["term_b"]))
    return frozenset(terms)
```

Сам список keyterms живёт в одном месте, отдельным модулем, чтобы тесту было что импортировать:

```python
# backend/app/keyterms.py

from typing import Final

CLINIC_TERMS: Final[tuple[str, ...]] = ("Mercy Family Clinic", "Northside Pharmacy")
PRESCRIBER_TERMS: Final[tuple[str, ...]] = ("Doctor Alvarez", "Doctor Whitfield")
FORM_TERMS: Final[tuple[str, ...]] = ("tablet", "capsule", "solution", "suspension", "injection")
UNIT_TERMS: Final[tuple[str, ...]] = ("milligram", "milligrams", "microgram", "micrograms", "milliliter")
ROUTE_TERMS: Final[tuple[str, ...]] = ("by mouth", "oral", "intravenous", "topical", "subcutaneous")
DICTATION_TERMS: Final[tuple[str, ...]] = ("NPI", "DEA", "refills", "days supply", "quantity", "sig")
NATO_TERMS: Final[tuple[str, ...]] = (
    "Alfa", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel",
    "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa",
    "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey",
    "Xray", "Yankee", "Zulu",
)

KEYTERMS_MAX: Final[int] = 100


def build_keyterms() -> list[str]:
    terms = [
        *CLINIC_TERMS, *PRESCRIBER_TERMS, *FORM_TERMS,
        *UNIT_TERMS, *ROUTE_TERMS, *DICTATION_TERMS, *NATO_TERMS,
    ]
    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        if t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out
```

### 6.4 Тест, который падает

`backend/tests/test_keyterms_purity.py` — этот файл попадает в CI и в README как содержательная находка про API:

```python
import pytest

from app.keyterms import KEYTERMS_MAX, build_keyterms
from app.lasa import lasa_checked_terms, normalize_term


def test_no_lasa_term_leaks_into_keyterms():
    """Название препарата из проверяемой LASA-пары в keyterms уничтожает
    независимость наблюдения от проверки. Этот тест - формализация инсайта."""
    keyterms = build_keyterms()
    forbidden = lasa_checked_terms()
    leaked = sorted(
        {t for t in keyterms if normalize_term(t) in forbidden}
    )
    assert leaked == [], (
        f"Forbidden drug names in keyterms: {leaked}. "
        "Biasing the recognizer toward the exact words the LASA rules look for "
        "makes the gate confirm what we suggested, not what was said. "
        "Remove them or remove the pair from lasa_pairs.csv - not both ways."
    )


def test_no_lasa_term_leaks_as_a_substring():
    """Ловит 'Lisinopril 10 mg' и 'take Bisoprolol' - многословные термы,
    в которых запрещённое название спрятано внутри."""
    forbidden = lasa_checked_terms()
    offenders: list[str] = []
    for term in build_keyterms():
        tokens = normalize_term(term).split()
        for n in (1, 2):
            for i in range(len(tokens) - n + 1):
                if " ".join(tokens[i : i + n]) in forbidden:
                    offenders.append(term)
    assert offenders == [], f"LASA terms hidden inside keyterms: {sorted(set(offenders))}"


def test_keyterms_fit_the_documented_limit():
    keyterms = build_keyterms()
    assert len(keyterms) <= KEYTERMS_MAX, (
        f"{len(keyterms)} terms; keyterms_prompt max is {KEYTERMS_MAX}. "
        "Terms beyond the limit are silently ignored - the recognizer will not error."
    )


def test_keyterms_are_unique_case_insensitively():
    keyterms = build_keyterms()
    lowered = [t.lower() for t in keyterms]
    assert len(set(lowered)) == len(lowered), "duplicate terms waste the 100-term budget"


def test_lasa_list_is_actually_loaded():
    """Страховка от ложно-зелёного теста: пустой lasa_pairs.csv сделал бы
    test_no_lasa_term_leaks_into_keyterms бессодержательным."""
    assert len(lasa_checked_terms()) >= 40, "lasa_pairs.csv looks empty or unparsed"
```

Последний тест — самый важный из четырёх, и его легко не написать. Без него достаточно сломать парсинг ISMP PDF, и главный тест позеленеет на пустом множестве запрещённых термов. Проверка «в списке LASA не меньше 40 термов» превращает зелёный цвет в утверждение.

### 6.5 Бюджет 100 термов

Ограничение из [справки по API](../reference/assemblyai-api.md): `keyterms_prompt` — массив, **максимум 100 терминов**. Отдельно: параметр `prompt` (доменный контекст) — максимум 1750 символов, это другой лимит и другой механизм.

Опасность лимита в том, что он, судя по документации, **не вызывает ошибку**: термы сверх сотни игнорируются молча. Поэтому проверка длины — тест, а не логирование: молчаливое усечение означает, что часть биасинга не работает, а мы этого не видим и приписываем деградацию распознаванию.

Правила бюджетирования:

1. **Фиксированный костяк — 92 терма** (таблица 6.2). Не трогается без правки теста.
2. **Свободный остаток — 8 термов** под то, что найдётся при разметке корпуса в дни 1–2.
3. **Приоритет при переполнении** (когда 8 свободных мест кончились): NATO > единицы > формы > route > служебные > имена врачей > название клиники. Рационал: NATO держит spell-out — последний рубеж перед эскалацией; единицы и формы участвуют в проверке связки и потому влияют на `E_VALIDATOR_COMBO`; название клиники не влияет ни на одно поле заказа и вылетает первым.
4. **Многословные термы считаются за один.** `"days supply"` — один терм, и это выгодно: две единицы биасинга по цене одной.
5. **Формы единственного и множественного числа считаются за два.** `milligram` и `milligrams` — два разных терма, и оба нужны, потому что в диктовке встречаются оба. Это дорого, но экономия здесь напрямую бьёт по `strength`, а это critical-поле.
6. **Названия препаратов в бюджет не входят никогда.** Ни одного слота. Даже препараты, которых нет ни в одной LASA-паре, в keyterms не идут: стоит появиться новой строке в `lasa_pairs.csv`, и тихо утратилась независимость. Правило «в keyterms нет названий препаратов вообще» проверяемо, а правило «нет названий из проверяемых пар» требует синхронной правки двух файлов. Берём первое.

Пункт 6 — это сознательная жертва качества распознавания названий препаратов. Мы отказываемся от биасинга ровно на том поле, где он дал бы наибольший выигрыш (и где AssemblyAI заявляет −43% ошибок на медтерминах от promptability). Вместо биасинга там работают `domain=medical-v1` и параметр `prompt` с доменным контекстом, не содержащим конкретных названий, а также lookup по справочнику на 116 155 продуктов. И это тоже измеряемая величина: A/B «keyterms с названиями против без» мы **не проводим как продуктовый выбор** — только как отдельный диагностический прогон с явной пометкой, что вариант с названиями невалиден методологически, и его цифра показывает размер жертвы, а не альтернативу.

---

## 7. Схема БД

SQLite, путь из `DATABASE_PATH` (в контейнере `/var/lib/readback/readback.db`; `data/` в репозитории отдан артефактам справочников и под БД не используется). Один файл, никакой ORM: на хакатоне `sqlite3` из стандартной библиотеки плюс явный DDL быстрее и отлаживается прозрачнее.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- sessions
CREATE TABLE sessions (
    session_id            TEXT PRIMARY KEY,
    started_at            TEXT NOT NULL,              -- ISO-8601 UTC
    ended_at              TEXT,
    mode                  TEXT NOT NULL,              -- live | judge_solo | catch_the_error | eval
    gate_enabled          INTEGER NOT NULL DEFAULT 1, -- 0 для A/B-прогона без шлюза
    stt_session_id        TEXT,                       -- id из Begin (Streaming STT)
    agent_session_id      TEXT,                       -- session_id из session.ready
    stt_config_json       TEXT NOT NULL,              -- полный набор query-параметров
    agent_config_json     TEXT NOT NULL,              -- session.update целиком
    keyterms_json         TEXT NOT NULL,              -- ровно то, что отправлено
    llm_model             TEXT NOT NULL,              -- gemini-2.5-flash
    close_code            INTEGER,                    -- 1000 | 3007 | 3008 | 3009 | ...
    close_reason          TEXT,                       -- из Error frame, не из обрезанной причины
    audio_ref             TEXT,                       -- путь к файлу ТОЛЬКО для mode='eval'
    corpus_item_id        TEXT,                       -- FK на held-out, только для mode='eval'
    git_sha               TEXT NOT NULL
);

CREATE INDEX idx_sessions_started ON sessions (started_at DESC);
CREATE INDEX idx_sessions_mode_gate ON sessions (mode, gate_enabled);

-- ------------------------------------------------------------------- turns
CREATE TABLE turns (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id            TEXT NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    turn_order            INTEGER NOT NULL,
    speaker               TEXT,                       -- speaker_label из Turn
    role                  TEXT NOT NULL,              -- caller | agent
    transcript            TEXT NOT NULL,
    turn_is_formatted     INTEGER NOT NULL DEFAULT 0,
    end_of_turn           INTEGER NOT NULL DEFAULT 0,
    end_of_turn_conf      REAL,
    words_json            TEXT NOT NULL,              -- words[] как есть: text/start/end/confidence/speaker
    start_ms              INTEGER NOT NULL,           -- денормализовано из words для индекса
    end_ms                INTEGER NOT NULL,
    min_word_confidence   REAL,
    received_at           TEXT NOT NULL,
    UNIQUE (session_id, turn_order, role, turn_is_formatted)
);

CREATE INDEX idx_turns_session_order ON turns (session_id, turn_order);
CREATE INDEX idx_turns_span ON turns (session_id, start_ms, end_ms);

-- -------------------------------------------------------- field_candidates
CREATE TABLE field_candidates (
    candidate_id          TEXT PRIMARY KEY,
    session_id            TEXT NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    field                 TEXT NOT NULL,
    attempt               INTEGER NOT NULL,
    raw_value             TEXT NOT NULL,
    normalized_value      TEXT,                       -- NULL = нормализатор не справился
    turn_order            INTEGER NOT NULL,
    word_spans_json       TEXT NOT NULL,              -- слова-источники, срез words[]
    transcript_slice      TEXT NOT NULL,
    transcript_hint       TEXT NOT NULL,              -- что передала модель, дословно
    min_confidence        REAL NOT NULL,
    mean_confidence       REAL NOT NULL,
    span_start_ms         INTEGER NOT NULL,
    span_end_ms           INTEGER NOT NULL,
    verdict_outcome       TEXT NOT NULL,
    validator_name        TEXT NOT NULL,
    rule_cited            TEXT NOT NULL,
    verdict_detail        TEXT NOT NULL,
    verdict_evidence_json TEXT NOT NULL DEFAULT '{}',
    lasa_hit              INTEGER NOT NULL DEFAULT 0,
    lasa_matched_term     TEXT,
    lasa_confusable_json  TEXT,
    lasa_source           TEXT,
    lasa_source_row       TEXT,
    status                TEXT NOT NULL,
    created_at            TEXT NOT NULL
);

CREATE INDEX idx_cand_session_field ON field_candidates (session_id, field, attempt);
CREATE INDEX idx_cand_lasa ON field_candidates (lasa_hit) WHERE lasa_hit = 1;
CREATE INDEX idx_cand_outcome ON field_candidates (verdict_outcome);

-- ---------------------------------------------------------- gate_decisions
CREATE TABLE gate_decisions (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id          TEXT NOT NULL REFERENCES field_candidates (candidate_id) ON DELETE CASCADE,
    session_id            TEXT NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    field                 TEXT NOT NULL,
    action                TEXT NOT NULL,              -- accept | ask_confirm | ask_disambiguate | ...
    reason_code           TEXT NOT NULL,              -- A_* | E_* | X_*
    agent_utterance       TEXT NOT NULL,              -- ровно то, что вернул шлюз
    spoken_utterance      TEXT,                       -- что агент реально сказал (transcript.agent)
    confirmation_mode     TEXT,
    threshold_used        REAL NOT NULL,
    policy_version        TEXT NOT NULL,              -- чтобы тюнинг дня 11 не портил старые прогоны
    evidence_json         TEXT NOT NULL,
    written_to_order      INTEGER NOT NULL DEFAULT 0,
    decided_at            TEXT NOT NULL,
    decision_latency_ms   INTEGER NOT NULL
);

CREATE INDEX idx_gate_session ON gate_decisions (session_id, decided_at);
CREATE INDEX idx_gate_reason ON gate_decisions (reason_code);
CREATE INDEX idx_gate_field_action ON gate_decisions (field, action);

-- ------------------------------------------------------------------ orders
CREATE TABLE orders (
    order_id              TEXT PRIMARY KEY,
    session_id            TEXT NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    committed             INTEGER NOT NULL DEFAULT 0,
    committed_at          TEXT,
    refusal_reason_code   TEXT,                       -- COMMIT_REFUSED_*
    missing_critical_json TEXT,
    is_controlled_substance INTEGER NOT NULL DEFAULT 0,
    needs_pharmacist      INTEGER NOT NULL DEFAULT 0,
    full_read_back        TEXT,                       -- фраза полного read-back, дословно
    caller_confirmed      INTEGER NOT NULL DEFAULT 0,
    commit_attempts       INTEGER NOT NULL DEFAULT 0,
    audit_json            TEXT NOT NULL DEFAULT '[]'  -- список AuditEntry
);

CREATE INDEX idx_orders_session ON orders (session_id);
CREATE INDEX idx_orders_committed ON orders (committed, committed_at DESC);

-- ------------------------------------------------------------ order_fields
CREATE TABLE order_fields (
    order_id              TEXT NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    field                 TEXT NOT NULL,
    value                 TEXT NOT NULL,
    raw_value             TEXT NOT NULL,
    confirmation_mode     TEXT NOT NULL,              -- validator | read_back | spell_out | human_override
    candidate_id          TEXT NOT NULL REFERENCES field_candidates (candidate_id),
    attempt               INTEGER NOT NULL,
    read_back_utterance   TEXT,                       -- NULL допустим ТОЛЬКО при mode='validator'
    rule_cited            TEXT NOT NULL,
    min_confidence        REAL NOT NULL,
    confirmed_at          TEXT NOT NULL,
    PRIMARY KEY (order_id, field),
    CHECK (
        confirmation_mode = 'validator'
        OR (read_back_utterance IS NOT NULL AND length(read_back_utterance) > 0)
    )
);

CREATE INDEX idx_order_fields_candidate ON order_fields (candidate_id);

-- --------------------------------------------------------- metrics_events
CREATE TABLE metrics_events (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id            TEXT NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    kind                  TEXT NOT NULL,              -- см. каталог в разделе 8
    at_ms                 INTEGER NOT NULL,           -- монотонные мс от начала сессии
    wall_at               TEXT NOT NULL,              -- ISO-8601 UTC, для сопоставления с логами
    turn_order            INTEGER,
    field                 TEXT,
    value_num             REAL,                       -- длительность, confidence, счётчик
    value_text            TEXT,
    payload_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_metrics_session_kind ON metrics_events (session_id, kind, at_ms);
CREATE INDEX idx_metrics_kind_num ON metrics_events (kind, value_num);

-- ------------------------------------------------------------ ground_truth
-- Разметка корпуса. Заполняется gen_corpus.py в дни 1-2 и с этого момента
-- неизменна (см. 8.8). Живые сессии в этой таблице не представлены вообще.
CREATE TABLE ground_truth (
    corpus_item_id        TEXT NOT NULL,
    field                 TEXT NOT NULL,
    expected_value        TEXT NOT NULL,
    expected_turn_order   INTEGER,                    -- для знаменателя EER_turn
    is_lasa_adversarial   INTEGER NOT NULL DEFAULT 0, -- пара из ISMP/FDA, оба направления
    audio_degradation     TEXT,                       -- clean | mulaw_8k | noise | fast | accent
    labelled_at           TEXT NOT NULL,
    PRIMARY KEY (corpus_item_id, field)
);

CREATE INDEX idx_gt_item ON ground_truth (corpus_item_id);
CREATE INDEX idx_gt_adversarial ON ground_truth (is_lasa_adversarial) WHERE is_lasa_adversarial = 1;
```

`CHECK` на `order_fields` — это тот же инвариант раздела 1, повторённый на уровне БД. Дублирование намеренное: инвариант в питоне защищает от ошибки в коде, `CHECK` — от ошибки в миграции или от ручного `INSERT` во время отладки. Если оба сработали, значит инвариант держится на двух независимых уровнях, и это ровно то, что мы показываем судье.

`policy_version` в `gate_decisions` нужен, потому что день 11 меняет пороги. Без него прогон до тюнинга и после будут выглядеть сравнимыми, хотя сравнивать их нельзя. Версия — хеш от сериализованного `FIELD_POLICIES`, вычисляется на старте процесса.

`ground_truth` живёт в той же базе, но намеренно не имеет foreign key ни на `sessions`, ни на `orders`: это разметка корпуса, а не данные прогона, и она обязана существовать независимо от того, прогоняли мы по ней что-нибудь или нет. Связь идёт через `sessions.corpus_item_id`, и только для `mode='eval'`. У живой сессии `corpus_item_id` равен `NULL`, поэтому join в метриках 8.2 и 8.7 просто не даёт строк — именно поэтому false-ask rate в живом режиме показывает «не определено», а не ноль.

`spoken_utterance` отдельно от `agent_utterance` — чтобы измерить расхождение между тем, что вернул шлюз, и тем, что произнесла модель. Промпт требует произносить `say_to_caller`; насколько модель это соблюдает, мы не знаем и хотим увидеть числом, а не предположением.

### 7.1 Что хранится и что сознательно не хранится

**Хранится:**

- `words[]` целиком, с `start`/`end`/`confidence`/`speaker` — это доказательная база происхождения, и без неё продукта нет.
- Все кандидаты, включая отвергнутые. Отвергнутые важнее принятых: по ним считается false-ask rate.
- Все решения шлюза с `reason_code`, `rule_cited`, `evidence_json` и порогом, который применялся.
- Фразы read-back дословно — `agent_utterance` от шлюза, `read_back_utterance` от подтверждения.
- Полные конфиги STT и агента, включая отправленный список keyterms, плюс `git_sha`. Без этого ни одна цифра из раздела 8 не воспроизводима.

**Сознательно НЕ хранится:**

- **Аудио в пути заказа.** В `sessions` для `mode` `live`, `judge_solo` и `catch_the_error` поле `audio_ref` остаётся `NULL`. Живой разговор не пишется на диск вообще. Причина прагматична и её надо назвать: если аудио живого звонка лежит в БД, продукт становится обработчиком записей разговоров со всеми вытекающими вопросами, а для нашего доказательства аудио не нужно — доказывают `words[]` с таймкодами. Аудио есть только у `mode='eval'`, где это синтетический корпус без PII, сгенерированный нами (см. `gen_corpus.py` в [readback.md](readback.md)).
- **Реальные PII.** По построению: имена пациентов вымышленные, NPI и DEA синтезированы по контрольной сумме. `redact_pii` в STT **не включаем** — он принудительно выставляет `include_partial_turns=false`, а нам нужны partials для замера латентности. Вместо редакции — синтетика на входе.
- **Pre-signed URL артефактов сессии Voice Agent API.** Храним только `agent_session_id`: по доке ссылки живут коротко, и закэшированный URL через час — мусор в базе, который выглядит как данные.
- **Сырое аудио агента (`reply.audio`).** Не пишется. Для метрики time-to-first-audio нужен только таймстемп первого чанка, а не сам чанк.
- **Текст системного промпта в каждой строке.** Он в `agent_config_json` один раз на сессию, а не на ход.

---

## 8. Метрики: точные определения

Каждая метрика ниже определена так, чтобы её можно было посчитать SQL-запросом из таблиц раздела 7, и каждая на странице `/metrics` сопровождается командой, которой получена. Числовых результатов здесь нет — их нет физически, мы ещё не мерили.

### 8.1 Каталог событий `metrics_events.kind`

Тайминги считаются только по этим событиям, и ни по каким другим:

| `kind` | Момент фиксации |
|---|---|
| `caller_speech_started` | `input.speech.started` (Voice Agent) |
| `caller_speech_stopped` | `input.speech.stopped` (Voice Agent) — **это точка отсчёта латентности** |
| `stt_partial_turn` | первый `Turn` с `end_of_turn=false` после начала реплики |
| `stt_final_turn` | `Turn` с `end_of_turn=true`, `turn_is_formatted=false` |
| `stt_formatted_turn` | `Turn` с `end_of_turn=true`, `turn_is_formatted=true` |
| `agent_reply_started` | `reply.started` |
| `agent_first_audio` | **первый** `reply.audio`-чанк этого `reply_id` — **это конечная точка латентности** |
| `agent_reply_done` | `reply.done`, в `value_text` кладём `status` |
| `tool_call_received` | `tool.call` |
| `tool_result_queued` | результат положен в очередь |
| `tool_result_sent` | `tool.result` ушёл на `reply.done` |
| `tool_results_dropped` | очередь выброшена по `interrupted`, `value_num` = сколько |
| `gate_decision` | решение принято, `value_text` = `reason_code` |
| `read_back_spoken` | `read_back` зарегистрирован |
| `read_back_answered` | получен ответ, `value_text` = `confirmed` \| `rejected` \| `unclear` |
| `ws_closed` | закрытие сокета, `value_num` = close code |

### 8.2 Entity Error Rate — по ходам с сущностями, не по словам

Знаменатель — **ходы, содержащие сущности**, а не слова и не сущности. Это отличие от WER принципиальное, и именно им EER отличается от WER в публикациях AssemblyAI (их 15,31% EER при 6,99% WER — их числа).

Определения:

- *Entity-bearing turn* — ход звонящего, для которого ground truth корпуса содержит хотя бы одно значение поля. Ходы без сущностей («hello», «yes», «go ahead») в знаменатель **не входят**: включение их разбавляет метрику и делает её несопоставимой.
- *Ход считается ошибочным*, если хотя бы одна сущность в нём извлечена неверно. Ход, а не сущность: два неверных поля в одном ходу — одна ошибка. Это консервативно в сторону меньшей цифры, и это надо сказать прямо; альтернативное определение (по сущностям) мы тоже считаем и репортим рядом.

```
EER_turn  = (# entity-bearing turns with >= 1 wrong entity) / (# entity-bearing turns)
EER_field = (# wrong entities) / (# ground-truth entities)
```

Оба репортим, оба помечаем формулой. «EER 12%» без указания знаменателя — цифра, которую нельзя сравнить ни с чем.

*Что значит «верно»* — определяется по полю и фиксируется до замеров, иначе появляется соблазн подвинуть определение под результат:

| Поле | Сравнение |
|---|---|
| `drug_name` | точное совпадение нормализованного `nonproprietary_name` |
| `strength` | равенство числового значения И единицы после нормализации; `10 mg` == `10.0 mg`, но `10 mg` != `10 mcg` |
| `dosage_form`, `route` | точное совпадение кода из `product.txt` |
| `quantity`, `refills`, `days_supply` | равенство целых |
| `prescriber_npi`, `prescriber_dea` | посимвольное равенство |
| `sig` | точное совпадение нормализованной формы; расхождение в порядке слов при том же смысле считается **ошибкой** (строгий вариант), и это оговаривается |
| `patient_name` | равенство после нормализации регистра и пробелов |

Точка замера — **до шлюза**: EER характеризует распознавание плюс извлечение, и шлюз на него влиять не должен. Считается по `field_candidates` с `attempt = 1`, потому что нас интересует качество первой гипотезы. Отдельно, как вторая цифра, — EER после шлюза (по `order_fields`), и разница между ними и есть работа шлюза.

```sql
-- EER_turn на held-out, до шлюза
WITH eb AS (
    SELECT DISTINCT c.session_id, c.turn_order
    FROM field_candidates c
    JOIN sessions s USING (session_id)
    WHERE s.mode = 'eval' AND c.attempt = 1
),
wrong AS (
    SELECT DISTINCT c.session_id, c.turn_order
    FROM field_candidates c
    JOIN ground_truth g
      ON g.corpus_item_id = (SELECT corpus_item_id FROM sessions WHERE session_id = c.session_id)
     AND g.field = c.field
    WHERE c.attempt = 1
      AND COALESCE(c.normalized_value, '') <> g.expected_value
)
SELECT
    (SELECT COUNT(*) FROM wrong) * 1.0 / (SELECT COUNT(*) FROM eb) AS eer_turn,
    (SELECT COUNT(*) FROM eb)                                       AS denominator_turns;
```

`denominator_turns` возвращается вместе с метрикой всегда. Процент без знаменателя на странице `/metrics` не показывается — это правило.

### 8.3 Caller repeat rate

*Повтор* — реплика звонящего, чей нормализованный текст совпадает с нормализованным текстом его же предыдущей реплики.

Правило нормализации, дословно и без вариантов:

```python
import re
import unicodedata

def normalize_for_repeat(text: str) -> str:
    """Пунктуация заменяется ПРОБЕЛОМ, не удаляется."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)   # замена, не удаление
    return " ".join(text.split())
```

Почему замена, а не удаление, — это не придирка. Удаление пунктуации склеивает токены: `"1245319599"` и `"12-45-31-95-99"` при удалении дефисов дают одну и ту же строку, и вторая реплика перестаёт считаться повтором, хотя человек именно повторил номер, разбив его. И наоборот: `"ten, twenty"` при удалении запятой даёт `"ten twenty"`, что может ложно совпасть с отдельной репликой `"ten twenty"`. Замена на пробел плюс схлопывание пробелов сохраняет границы токенов в обе стороны. Правило фиксируется тестом:

```python
def test_punctuation_is_replaced_not_deleted():
    assert normalize_for_repeat("12-45-31-95-99") == "12 45 31 95 99"
    assert normalize_for_repeat("12-45-31-95-99") != normalize_for_repeat("1245319599")
```

```
repeat_rate = (# caller turns that repeat the previous caller turn) / (# caller turns, excluding the first)
```

Первая реплика исключена из знаменателя: повторять ей нечего.

**Сегментация обязательна.** Общий repeat rate бесполезен — данные AssemblyAI показывают разброс от 1% на да/нет до 19% на email (их числа). Поэтому каждая реплика звонящего атрибутируется предыдущему вопросу агента через `gate_decisions.reason_code` и поле, и метрика репортится таблицей `(field, reason_code) → repeat_rate, n`. Клетки с `n < 10` помечаются как недостаточные, а не показываются процентом. `ГИПОТЕЗА`: 10 — стартовый минимум.

### 8.4 Time-to-first-audio

**От какого события до какого — точно, без вариантов:**

```
TTFA = metrics_events[kind='agent_first_audio'].at_ms
     - metrics_events[kind='caller_speech_stopped'].at_ms
```

То есть: **от `input.speech.stopped` Voice Agent API до первого чанка `reply.audio` того ответа, который последовал за этой репликой.** Не от `reply.started` (он раньше звука и льстит цифре), не от конца речи по VAD на клиенте (клиентский VAD — не то же, что серверный, и расхождение попадёт в метрику как шум), не до конца ответа.

Оба таймстемпа берутся на **бэкенде**, из монотонных часов (`time.monotonic_ns()`), в одном процессе, чтобы в измерение не попал рассинхрон часов и джиттер браузера. Отдельно и явно: сетевой участок бэкенд→браузер и время декодирования PCM в TTFA **не входят** — это оговаривается на странице `/metrics` одной строкой, потому что человек в наушниках услышит звук позже, чем показывает наша цифра.

Персентили: `P50`, `P95`, `P99`, плюс `n`, `min`, `max`. Метод — линейная интерполяция (`numpy.percentile` с `method="linear"`), зафиксирована в коде, потому что разные методы дают разные P99 на малых выборках. Минимум выборки — `N >= 30` ходов (как в [readback.md](readback.md)); при `n < 100` P99 помечается как ненадёжный, потому что один выброс его и определяет.

Компонентная разбивка, каждая — разность двух событий из 8.1:

| Компонент | От | До |
|---|---|---|
| Finalization delay | `caller_speech_stopped` | `stt_final_turn` |
| Formatting delay | `stt_final_turn` | `stt_formatted_turn` |
| LLM + tools | `stt_final_turn` | `agent_reply_started` |
| Tool time (per call) | `tool_call_received` | `tool_result_queued` |
| TTS lead-in | `agent_reply_started` | `agent_first_audio` |
| **TTFA (итог)** | `caller_speech_stopped` | `agent_first_audio` |

Сумма компонентов не обязана равняться TTFA: этапы частично параллельны (например, `interactive`-инструменты выполняются, пока агент говорит). Это оговаривается, а не замазывается подгонкой.

### 8.5 Finalization delay

```
finalization_delay = metrics_events[kind='stt_final_turn'].at_ms
                   - metrics_events[kind='caller_speech_stopped'].at_ms
```

Только `Turn` с `end_of_turn=true` и `turn_is_formatted=false`. Форматированный ход — отдельная метрика (formatting delay), потому что форматирование при `format_turns=true` приходит позже и смешивать их означает мерить два разных явления одной цифрой.

Эта метрика зависит от `min_turn_silence` / `max_turn_silence` / `end_of_turn_confidence_threshold` (дефолт 0.4 по доке), поэтому вместе с ней в отчёте **всегда** печатаются применённые значения этих параметров из `sessions.stt_config_json`. Finalization delay без конфигурации endpointing — цифра ни о чём.

### 8.6 Эффективность шлюза: A/B

Центральная метрика продукта. Воспроизводит эксперимент AssemblyAI (их числа: 43,6% → 79,1% при добавлении шагов подтверждения).

*Успех задачи* определяется до прогона: заказ считается успешным, если `orders.committed = 1` **и** все поля в `order_fields` совпадают с ground truth корпуса по правилам сравнения из 8.2. Незакрытый заказ — неуспех. Закрытый заказ с одним неверным полем — неуспех, а не «частичный успех»: в аптеке это неверное лекарство.

```
task_success(gate)  = (# eval sessions with committed order AND all fields correct)
                    / (# eval sessions attempted)
```

Два прогона на **одном и том же** наборе аудиофайлов: `gate_enabled = 1` и `gate_enabled = 0`. В режиме OFF шлюз обходится в одном месте — `propose_field` всегда возвращает `accept`, а `confirm()` вызывается с `mode=HUMAN_OVERRIDE` и служебной пометкой в `read_back_utterance` (`"gate disabled for A/B run"`). Инвариант при этом не ломается и обход не «оставляется в коде»: путь OFF доступен только при `sessions.gate_enabled = 0`, который выставляется CLI-флагом скрипта `ab_gate.py`, и HTTP-роуты его выставить не могут.

Репортится:

```
delta = task_success(ON) - task_success(OFF)
```

вместе с `n` каждого прогона и биномиальным доверительным интервалом (Wilson) на каждую долю. На выборке в 50 файлов интервал будет широким, и это надо показать, а не спрятать: разница в 30 процентных пунктов при `n=50` значима, разница в 5 — нет.

Вторичные разрезы: доля неуспехов, пойманных валидатором (`reason_code LIKE 'E_VALIDATOR%'`), пойманных LASA (`reason_code = 'E_LASA_HIT'`), пойманных порогом (`E_LOW_CONFIDENCE`). Это отвечает на вопрос «какая из трёх причин переспроса реально работает», и вполне возможно, что ответ будет неудобным — например, что LASA-ветка не сработала ни разу. Такой результат публикуем как есть; он содержательнее любой подогнанной цифры.

### 8.7 False-ask rate — сторона издержек

Это метрика, которую легко не показать, и именно поэтому она в спеке.

*False ask* — переспрос по полю, при котором значение, предложенное **до** переспроса, уже совпадало с ground truth. То есть шлюз потратил ход разговора, ничего не исправив.

```
false_ask_rate = (# gate decisions with action != 'accept' where the candidate value was already correct)
               / (# gate decisions with action != 'accept')
```

Знаменатель — **все переспросы**, а не все решения. Считается только на `mode='eval'`, потому что в живом разговоре ground truth неизвестен, и никакой оценки false-ask там быть не может — на странице `/metrics` в живом режиме эта клетка показывает «не определено», а не ноль.

```sql
SELECT
    g.reason_code,
    COUNT(*)                                                AS asks,
    SUM(CASE WHEN c.normalized_value = gt.expected_value
             THEN 1 ELSE 0 END)                             AS false_asks,
    SUM(CASE WHEN c.normalized_value = gt.expected_value
             THEN 1.0 ELSE 0.0 END) / COUNT(*)              AS false_ask_rate
FROM gate_decisions g
JOIN field_candidates c USING (candidate_id)
JOIN sessions s ON s.session_id = g.session_id
JOIN ground_truth gt
  ON gt.corpus_item_id = s.corpus_item_id AND gt.field = g.field
WHERE s.mode = 'eval' AND g.action <> 'accept'
GROUP BY g.reason_code
ORDER BY asks DESC;
```

Разбивка по `reason_code` обязательна, и вот почему это интересно, а не формально. У ветки `E_LASA_HIT` false-ask rate по построению будет **высоким**: правило спрашивает всегда при попадании в пару, включая случаи, когда распознаватель услышал правильно. Это не дефект реализации, это цена конструкции, и она должна быть названа числом. Формулировка для README и питча готовится заранее: «LASA-ветка переспрашивает в X% случаев, когда значение уже было верным; мы считаем эту цену оправданной, потому что альтернатива — пропустить гомофонию, от которой confidence не защищает». Показать X и назвать его ценой — сильнее, чем показать только task success и надеяться, что про издержки не спросят.

Рядом — две производные, обе из тех же данных:

- `asks_per_completed_order` = (все решения с `action != 'accept'`) / (закрытые заказы) — во сколько ходов обходится шлюз.
- `median_turns_to_order` с разбивкой ON/OFF — сколько дольше длится звонок.

### 8.8 Дисциплина held-out

Правила, которые важнее любой из метрик выше, потому что без них все цифры ничего не стоят:

1. **Корпус размечается в дни 1–2** и с этого момента лежит в `eval/heldout/` с файлом `MANIFEST.sha256`, покрывающим и аудио, и ground truth.
2. **Между днём 2 и финальной оценкой held-out не открывается ни разу.** Ни для отладки, ни для «посмотреть один файл», ни для тюнинга порогов.
3. **Для разработки и тюнинга — отдельный dev-набор**, сгенерированный тем же `gen_corpus.py` с другим сидом. Пороги дня 11+ настраиваются только на нём.
4. **Тест в CI**, падающий при изменении held-out:

```python
def test_heldout_is_sealed():
    manifest = pathlib.Path("eval/heldout/MANIFEST.sha256")
    for line in manifest.read_text(encoding="utf-8").splitlines():
        digest, name = line.split(maxsplit=1)
        actual = hashlib.sha256(
            (manifest.parent / name).read_bytes()
        ).hexdigest()
        assert actual == digest, f"held-out item changed: {name}"
```

5. **Финальная оценка — один прогон, один коммит.** Скрипт `measure_eer.py` пишет в `eval/REPORT.md` результат вместе с `git_sha`, `policy_version` и полными конфигами STT и агента. Второй прогон на held-out после правки кода — это уже не held-out, и если он понадобится, в REPORT.md появляется явная запись «прогон 2, held-out скомпрометирован» с обоими числами.
6. **Что мы этим покупаем**, говорим прямо: наша цифра почти наверняка будет численно хуже, чем у конкурента, тюнившего на своей же выборке (в [readback.md](readback.md) разобран случай Saakshi: precision 1.00 на 70 репликах, в которых 9 паттернов правились после расхождения с разметкой, и они сами назвали это «regression suite, not a generalisation estimate»). Худшая цифра с held-out означает больше, чем лучшая без него, и это утверждение должно стоять в README до цифр, а не после.

---

## Приложение: что не решено и требует выбора

| Открытый вопрос | Варианты | Предпочтение |
|---|---|---|
| Кто источник `Provenance` — Streaming STT или `transcript.user` Voice Agent | STT-сокет даёт `words[]` с confidence, у Voice Agent их нет; значит сопоставление хинта идёт по STT-ходам, но разговор ведёт агент, и хода могут разъехаться по `turn_order` | Сопоставлять по времени, а не по `turn_order`: `transcript.user` даёт текст, окно ищется среди STT-ходов, пересекающихся по `[start_ms, end_ms]`. Требует проверки на живом прогоне в дни 3–4 |
| Строгость сравнения `sig` в EER | точное совпадение нормализованной формы против семантической эквивалентности | Начать со строгого, репортить обе цифры, если расхождение велико |
| `spell_out` для `drug_name` через NATO | 12 букв по NATO — это долго и раздражает | Оставлено, но с `max_attempts_before_spellout=3`; возможно, стоит заменить на «first three letters only» |
| Эскалация к человеку без человека на хакатоне | флаг + баннер против имитации оператора | Флаг + баннер; имитация была бы неправдой в демо |
