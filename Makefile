# Makefile — shortcuts para JSH Dashboard

.PHONY: dev prod build-frontend logs ps stop clean

# ── Desarrollo
dev:
	docker compose up -d

# ── Producción
build-frontend:
	docker compose -f docker-compose.prod.yml \
	  --profile build run --rm frontend

prod: build-frontend
	docker compose -f docker-compose.prod.yml up -d

stop:
	docker compose -f docker-compose.prod.yml down

logs:
	docker compose -f docker-compose.prod.yml logs -f --tail=100

ps:
	docker compose -f docker-compose.prod.yml ps

# ── Limpieza
clean:
	docker compose -f docker-compose.prod.yml down -v --remove-orphans

# ── Tests
test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

test-all: test-backend test-frontend
