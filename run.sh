#!/usr/bin/env bash
# What can one signed-in person reach that belongs to another?
#
#   ./run.sh
#
# Needs Docker and Node 22. The backend is destroyed and rebuilt every run.
set -euo pipefail
cd "$(dirname "$0")"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d >/dev/null
docker compose restart parse >/dev/null          # it races mongo on a cold volume
node run.mjs
