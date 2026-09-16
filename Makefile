NODE_IMAGE := node:22-alpine
HAVE_NODE  := $(shell command -v node 2>/dev/null)

ifeq ($(HAVE_NODE),)
RUN := MSYS_NO_PATHCONV=1 docker run --rm -v "$(CURDIR):/src" -w /src $(NODE_IMAGE) sh -c
else
RUN := sh -c
endif

.PHONY: help dev build data agent install lint format typecheck test test-cover e2e \
	file-length package-size import-cycles package-subject ascii tokens secrets \
	keyterms-purity contrast token-refs colocation gate-invariant gate-mutation heldout-seal seal-heldout \n	verify measure eval ab-gate \
	baseline-file-length baseline-package-size baseline-ascii clean

.DEFAULT_GOAL := help

help:
	@grep -hE '^[a-z][a-z0-9-]*:.*?## ' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.env.local:
	@cp .env.example .env.local
	@echo ".env.local created from .env.example"

install: ## Install dependencies
	$(RUN) "npm ci"

dev: .env.local ## Run the Next.js development server
	$(RUN) "npm run dev"

build: ## Build the production bundle
	$(RUN) "npm run build"

data: ## Build the NDC catalogue and the LASA table into data/
	$(RUN) "npx tsx scripts/build-ndc.ts && npx tsx scripts/build-lasa.ts && npx tsx scripts/stitch-lasa.ts"

agent: ## Create the stored agent once and print its id
	$(RUN) "npx tsx scripts/create-agent.ts"

lint: ## Biome over sources and tests
	$(RUN) "npx biome check src app tests scripts"

format: ## Fix formatting and apply linter autofixes
	$(RUN) "npx biome check --write src app tests scripts"

typecheck: ## Type check
	$(RUN) "npx tsc --noEmit"

test: ## Unit and integration tests
	$(RUN) "npx vitest run"

test-cover: ## Tests with coverage against the threshold
	$(RUN) "npx vitest run --coverage"

e2e: ## Playwright against a preview deployment with a fake microphone
	$(RUN) "npx playwright test"

file-length: ## 250-line limit for hand-written code (ratchet)
	@bash scripts/check-file-length.sh

package-size: ## File-count limit per directory (ratchet)
	@bash scripts/check-package-size.sh

import-cycles: ## No import cycles, test imports included
	@bash scripts/check-import-cycles.sh

package-subject: ## Every directory is named by its subject
	@bash scripts/check-package-subject.sh

ascii: ## Code is English only (ratchet)
	@bash scripts/check-ascii.sh

tokens: ## No raw hex outside the token files
	@bash scripts/check-tokens.sh

secrets: ## The API key never leaves the server routes
	@bash scripts/check-secrets.sh

keyterms-purity: ## No LASA-checked drug name may enter keyterms
	$(RUN) "npx vitest run tests/lasa/keyterms-purity.test.ts"

colocation: ## A component with styles owns its folder: index.tsx + styles.module.css
	$(RUN) "node scripts/check-colocation.mjs"

token-refs: ## Every var() resolves to a defined token
	$(RUN) "node scripts/check-token-refs.mjs"

contrast: ## Body text reaches 4.5:1 against its surface
	$(RUN) "node scripts/check-contrast.mjs"

heldout-seal: ## The held-out set has not changed since it was sealed
	@bash scripts/check-heldout-seal.sh

seal-heldout: ## Seal the held-out set once, after labelling it
	@bash scripts/check-heldout-seal.sh --seal

gate-invariant: ## ConfirmedValue is constructible only inside the gate
	@bash scripts/check-gate-invariant.sh

gate-mutation: ## Break each gate branch, the matching test must fail by name
	@bash scripts/check-gate-mutation.sh

measure: ## Latency percentiles over N runs against the real API
	$(RUN) "npx tsx scripts/measure-latency.ts --runs 30"

ab-gate: ## Scenario success and false-ask rate, gate on against gate off
	$(RUN) "npx tsx scripts/ab-gate.ts"

eval: ## Entity Error Rate on the sealed held-out set
	$(RUN) "npx tsx scripts/measure-eer.ts --set eval/heldout"

VERIFY_STEPS := lint typecheck test file-length package-size import-cycles \
	package-subject ascii tokens token-refs colocation contrast secrets keyterms-purity heldout-seal \n	gate-invariant gate-mutation

verify: $(VERIFY_STEPS) ## Everything that must pass before a task counts as done

baseline-file-length: ## Rewrite the line-limit baseline
	@bash scripts/check-file-length.sh --update

baseline-package-size: ## Rewrite the directory file-count baseline
	@bash scripts/check-package-size.sh --update

baseline-ascii: ## Rewrite the language-check baseline
	@bash scripts/check-ascii.sh --update

clean: ## Remove build artefacts
	@rm -rf .next coverage test-results playwright-report node_modules/.cache
