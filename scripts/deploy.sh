#!/usr/bin/env bash
set -euo pipefail

echo "==> Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "==> Building static bundle..."
docker compose -f docker-compose.prod.yml build

echo "==> Publishing to nginx volume..."
docker compose -f docker-compose.prod.yml run --rm web-assets

echo "==> Reloading nginx..."
docker exec infra-nginx nginx -s reload

echo "==> Health check..."
for i in 1 2 3 4 5; do
  if docker exec infra-nginx curl -sf http://localhost/ -H "Host: observe-ai.samantafluture.com" > /dev/null 2>&1; then
    echo "    Site is responding!"
    break
  fi
  echo "    Attempt $i/5 — waiting..."
  sleep 2
done

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deploy complete! https://observe-ai.samantafluture.com"
