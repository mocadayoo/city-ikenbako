#!/usr/bin/env bash

set -euo pipefail

container_name="city-ikenbako-postgres-verify"
db_user="city_ikenbako_verify"
db_password="local-only-password"
db_name="city_ikenbako_verify"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

cleanup
docker run --detach --rm \
  --name "$container_name" \
  --env "POSTGRES_USER=$db_user" \
  --env "POSTGRES_PASSWORD=$db_password" \
  --env "POSTGRES_DB=$db_name" \
  --publish 127.0.0.1::5432 \
  postgres:16-alpine >/dev/null

for _ in $(seq 1 30); do
  if docker exec "$container_name" pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "$container_name" pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
  echo "PostgreSQL container did not become ready." >&2
  exit 1
fi

host_port="$(docker port "$container_name" 5432/tcp | sed -E 's/.*://')"
database_url="postgresql://$db_user:$db_password@127.0.0.1:$host_port/$db_name"

DATABASE_URL="$database_url" npm run db:migrate
DATABASE_URL="$database_url" npm run db:seed

echo "--- table checks ---"
docker exec "$container_name" psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -Atqc \
  "select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('opinions', 'opinion_events', 'councilor_sessions', 'opinion_access_sessions');"

echo "--- seed checks ---"
docker exec "$container_name" psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -Atqc \
  "select count(*) from councilor_accounts where email = 'dev-councilor@localhost';"

echo "--- constraint checks ---"
docker exec "$container_name" psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -Atqc \
  "select count(*) from pg_indexes where schemaname = 'public' and indexname in ('opinion_access_tokens_hash_uq', 'opinion_access_sessions_hash_uq', 'opinion_events_view_actor_uq', 'opinion_recipients_opinion_councilor_uq');"

echo "Local PostgreSQL migration, seed, and constraint checks passed."
