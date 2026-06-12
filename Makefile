# IfacGalaxy — tutto via Docker: non serve Node installato in locale.
# Uso tipico:  make serve   → build + app servita su http://localhost:8080

COMPOSE  := docker compose
NODE_RUN := $(COMPOSE) run --rm node

.DEFAULT_GOAL := help

.PHONY: help install data build test dev serve up down restart logs status clean distclean

help: ## mostra questo aiuto
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## installa le dipendenze npm (nel container)
	$(NODE_RUN) npm ci

data: ## rigenera i dataset (NASA, HYG, costellazioni)
	$(NODE_RUN) npm run data:build

build: ## compila l'app in dist/ (single-file + dati)
	$(NODE_RUN) npm run build

test: ## esegue gli unit test (Keplero, coordinate, effemeridi)
	$(NODE_RUN) npm test

dev: ## server di sviluppo Vite su http://localhost:5173
	$(COMPOSE) run --rm --service-ports node npm run dev -- --host 0.0.0.0

serve: build up ## build + serve su http://localhost:8080

up: ## avvia nginx (serve dist/ già compilata)
	$(COMPOSE) up -d web
	@echo "→ http://localhost:$${WEB_PORT:-8080}"

down: ## ferma e rimuove i container
	$(COMPOSE) down

restart: down up ## riavvia il web server

logs: ## log di nginx
	$(COMPOSE) logs -f web

status: ## stato dei container
	$(COMPOSE) ps

clean: ## rimuove la build
	rm -rf dist

distclean: clean down ## rimuove anche node_modules e cache dati
	rm -rf node_modules tools/cache
