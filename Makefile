.PHONY: up down build logs shell-backend shell-frontend test-backend test-frontend seed migrate fresh

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

test-backend:
	docker compose exec backend php artisan test --parallel

test-frontend:
	docker compose exec frontend npm run test

migrate:
	docker compose exec backend php artisan migrate

fresh:
	docker compose exec backend php artisan migrate:fresh --seed

seed:
	docker compose exec backend php artisan db:seed

key:
	docker compose exec backend php artisan key:generate

ps:
	docker compose ps
