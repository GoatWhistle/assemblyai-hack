NODE_IMAGE := node:22-alpine
HAVE_NODE  := $(shell command -v node 2>/dev/null)

ifeq ($(HAVE_NODE),)
RUN := MSYS_NO_PATHCONV=1 docker run --rm -v "$(CURDIR):/src" -w /src $(NODE_IMAGE) sh -c
else
RUN := sh -c
endif

.DEFAULT_GOAL := help

VERIFY_STEPS := lint typecheck test file-length package-size import-cycles package-subject \
	ascii tokens token-refs colocation css-dead server-only confidence-language contrast \
	touch-targets smoke latency-budget secrets keyterms-purity heldout-seal \
	gate-invariant gate-mutation

.PHONY: help $(VERIFY_STEPS) verify \
	install dev build data agent fixtures corpus \
	lint format typecheck test e2e \
	honest audit-checksums audit-catalog coverage-matrix calibration rarity \
	ab-gate doctor spend live-runs measure \
	eval eval-control eval-native16 eval-keyterms eval-heldout eval-repeat eval-units \
	baseline seal-heldout clean

help:
	@echo ""
	@echo "  Readback   a voice agent that proves it did not mishear"
	@echo ""
	@printf "  \033[1m%s\033[0m\n" "Start here"
	@printf "    \033[36m%-16s\033[0m %s\n" "install" "Install dependencies"
	@printf "    \033[36m%-16s\033[0m %s\n" "dev" "Run the development server"
	@printf "    \033[36m%-16s\033[0m %s\n" "data" "Build the NDC catalogue and the LASA table into data/"
	@printf "    \033[36m%-16s\033[0m %s\n" "agent" "Create the stored agent once and print its id"
	@echo ""
	@printf "  \033[1m%s\033[0m\n" "Before a task counts as done"
	@printf "    \033[36m%-16s\033[0m %s\n" "verify" "Every check that must pass. VERIFY_STEPS in this file is the list"
	@printf "    \033[36m%-16s\033[0m %s\n" "lint" "Biome over sources and tests"
	@printf "    \033[36m%-16s\033[0m %s\n" "format" "Apply formatting and linter autofixes"
	@printf "    \033[36m%-16s\033[0m %s\n" "typecheck" "Type check"
	@printf "    \033[36m%-16s\033[0m %s\n" "test" "Tests, serialized because the ratchet controls edit the tree"
	@printf "    \033[36m%-16s\033[0m %s\n" "e2e" "Playwright against a preview deployment with a fake microphone"
	@printf "    %-16s \033[2m%s\033[0m\n" "" "every verify step is its own target: make secrets, make gate-mutation"
	@echo ""
	@printf "  \033[1m%s\033[0m\n" "Evidence. No API key, no cost"
	@printf "    \033[36m%-16s\033[0m %s\n" "honest" "Reproduce every offline figure, each with the command behind it"
	@printf "    \033[36m%-16s\033[0m %s\n" "smoke" "Replay the recorded fixtures through the server pipeline"
	@printf "    \033[36m%-16s\033[0m %s\n" "audit-checksums" "Exhaustive coverage of the NPI and DEA checksums"
	@printf "    \033[36m%-16s\033[0m %s\n" "audit-catalog" "Our own skeleton detector, pointed at the catalogue we ship"
	@printf "    \033[36m%-16s\033[0m %s\n" "coverage-matrix" "Which mechanism catches which error, and its cost in false asks"
	@printf "    \033[36m%-16s\033[0m %s\n" "calibration" "Observed accuracy per reported-confidence bin"
	@printf "    \033[36m%-16s\033[0m %s\n" "rarity" "Entity error rate stratified by how established the drug is"
	@printf "    \033[36m%-16s\033[0m %s\n" "ab-gate" "Scenario success and false-ask rate, gate on against gate off"
	@printf "    \033[36m%-16s\033[0m %s\n" "measure" "Gate decision latency over fixtures. Its live path is not implemented"
	@printf "    \033[36m%-16s\033[0m %s\n" "doctor" "The stored agent and its tool webhooks answer. Opens no socket"
	@printf "    \033[36m%-16s\033[0m %s\n" "spend" "What the paid API has cost, from the recorded run ledger"
	@printf "    \033[36m%-16s\033[0m %s\n" "live-runs" "How many paid runs happened, including the discarded ones"
	@echo ""
	@printf "  \033[31m%s\033[0m\n" "These open real recognizer sockets and bill"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval" "Entity Error Rate on the development corpus of LASA terms"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-control" "The same, on the safe-drug control corpus"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-native16" "The same, on audio synthesised natively at 16 kHz"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-keyterms" "The development corpus with identity keyterms sent"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-heldout" "The sealed held-out set, opened once against a pre-registered rule"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-repeat" "A second run of the development set, recorded beside the first"
	@printf "    \033[36m%-16s\033[0m %s\n" "eval-units" "Whether milligrams survive recognition, a thousandfold error"
	@echo ""
	@printf "  \033[1m%s\033[0m\n" "Occasional"
	@printf "    \033[36m%-16s\033[0m %s\n" "build" "Build the production bundle"
	@printf "    \033[36m%-16s\033[0m %s\n" "fixtures" "Rebuild the socket fixtures the offline checks replay"
	@printf "    \033[36m%-16s\033[0m %s\n" "corpus" "Build the audio corpora and the control term list"
	@printf "    \033[36m%-16s\033[0m %s\n" "baseline" "Rewrite every ratchet baseline"
	@printf "    \033[36m%-16s\033[0m %s\n" "seal-heldout" "Seal the held-out set once, after labelling it"
	@printf "    \033[36m%-16s\033[0m %s\n" "clean" "Remove build artefacts"
	@echo ""

.env.local:
	@cp .env.example .env.local
	@echo ".env.local created from .env.example"

install:
	$(RUN) "npm ci"

dev: .env.local
	$(RUN) "npm run dev"

build:
	$(RUN) "npm run build"

data:
	$(RUN) "npx tsx scripts/build/ndc.ts && npx tsx scripts/build/lasa.ts && npx tsx scripts/build/stitch-lasa.ts"

agent:
	$(RUN) "npx tsx scripts/report/create-agent.ts"

fixtures:
	$(RUN) "npx tsx scripts/build/fixtures.ts"

corpus:
	$(RUN) "npx tsx scripts/build/control-set.ts"
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build/eer-audio.ps1
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build/eer-audio.ps1 -OutDir eval/control/audio -Manifest eval/control/manifest.json -TermsFile eval/control/terms.json

lint:
	$(RUN) "npx biome check src app tests scripts"

format:
	$(RUN) "npx biome check --write src app tests scripts"

typecheck:
	$(RUN) "npx tsc --noEmit"

test:
	$(RUN) "npx vitest run --no-file-parallelism"

e2e:
	$(RUN) "npx playwright test"

file-length:
	@bash scripts/checks/file-length.sh

package-size:
	@bash scripts/checks/package-size.sh

import-cycles:
	@bash scripts/checks/import-cycles.sh

package-subject:
	@bash scripts/checks/package-subject.sh

ascii:
	@bash scripts/checks/ascii.sh

tokens:
	@node scripts/checks/tokens.mjs

token-refs:
	$(RUN) "node scripts/checks/token-refs.mjs"

colocation:
	$(RUN) "node scripts/checks/colocation.mjs"

css-dead:
	$(RUN) "node scripts/checks/css-dead.mjs"

server-only:
	$(RUN) "node scripts/checks/server-only.mjs"

confidence-language:
	$(RUN) "node scripts/checks/confidence-language.mjs"

contrast:
	$(RUN) "node scripts/checks/contrast.mjs"

touch-targets:
	$(RUN) "node scripts/checks/touch-targets.mjs"

smoke:
	$(RUN) "npx tsx scripts/report/smoke-fixtures.ts"

latency-budget:
	$(RUN) "npx tsx scripts/measure/latency-budget.ts"

secrets:
	@bash scripts/checks/secrets.sh

keyterms-purity:
	$(RUN) "npx vitest run tests/lasa/keyterms-purity.test.ts"

heldout-seal:
	@bash scripts/checks/heldout-seal.sh

gate-invariant:
	@bash scripts/checks/gate-invariant.sh

gate-mutation:
	@bash scripts/checks/gate-mutation.sh

verify: $(VERIFY_STEPS)

honest:
	$(RUN) "npx tsx scripts/report/honest.ts"

audit-checksums:
	$(RUN) "npx tsx scripts/measure/audit-checksums.ts 200"

audit-catalog:
	$(RUN) "npx tsx scripts/measure/audit-catalog.ts"

coverage-matrix:
	$(RUN) "npx tsx scripts/measure/coverage-matrix.ts"

calibration:
	$(RUN) "npx tsx scripts/measure/analyse-calibration.ts"

rarity:
	$(RUN) "npx tsx scripts/measure/analyse-rarity.ts"

ab-gate:
	$(RUN) "npx tsx scripts/measure/ab-gate.ts"

measure:
	$(RUN) "npx tsx scripts/measure/measure-latency.ts --runs 30"

doctor:
	$(RUN) "npx tsx scripts/report/doctor.ts"

spend:
	$(RUN) "npx tsx scripts/report/spend-report.ts"

live-runs:
	$(RUN) "npx tsx scripts/report/live-run-count.ts"

eval:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/dev"

eval-control:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/control"

eval-native16:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/native16"

eval-keyterms:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/dev --keyterms"

eval-heldout:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/heldout"

eval-repeat:
	$(RUN) "npx tsx scripts/measure/measure-eer.ts --set eval/dev --repeat 2"

eval-units:
	$(RUN) "npx tsx scripts/build/unit-set.ts"
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build/unit-audio.ps1
	$(RUN) "npx tsx scripts/measure/measure-units.ts"

baseline:
	@bash scripts/checks/file-length.sh --update
	@bash scripts/checks/package-size.sh --update
	@bash scripts/checks/ascii.sh --update

seal-heldout:
	@bash scripts/checks/heldout-seal.sh --seal

clean:
	@rm -rf .next coverage test-results playwright-report node_modules/.cache
