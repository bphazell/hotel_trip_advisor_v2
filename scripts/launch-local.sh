#!/usr/bin/env bash
# Start Postgres and the Flask API locally via Docker Compose.
# Optionally start PgAdmin with: PROFILES="--profile tools" ./scripts/launch-local.sh
#
# Requires Docker Desktop (or another Docker engine) to be running.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p data/initdb
mkdir -p flask/hotel_tripadvisor/migrations/versions

echo "Building and starting containers..."
docker compose ${PROFILES:-} up -d --build

echo "Waiting for hotel_app container to be running..."
for i in $(seq 1 30); do
  if docker inspect -f '{{.State.Running}}' hoteltripadvisor 2>/dev/null | grep -q true; then
    break
  fi
  sleep 1
done

if ! docker exec pg_container psql -U postgres -tAc \
     "SELECT 1 FROM pg_database WHERE datname='hotel_trip_advisor'" | grep -q 1; then
  echo "Creating database hotel_trip_advisor..."
  docker exec pg_container psql -U postgres -c 'CREATE DATABASE hotel_trip_advisor;'
fi

shopt -s nullglob
revs=(flask/hotel_tripadvisor/migrations/versions/*.py)
shopt -u nullglob

if ((${#revs[@]} == 0)); then
  echo "Generating initial Alembic migration..."
  docker exec hoteltripadvisor flask db migrate -m "initial"
fi

echo "Applying migrations..."
docker exec hoteltripadvisor flask db upgrade

echo ""
echo "Checking health..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:5002/health >/dev/null 2>&1; then
    echo "API is healthy!"
    break
  fi
  sleep 1
done

echo ""
echo "========================================="
echo "  API:      http://localhost:5002/"
echo "  Health:   http://localhost:5002/health"
echo "  PgAdmin:  run with PROFILES=\"--profile tools\" to enable (port 5433)"
echo "  Stop:     docker compose down"
echo "========================================="
