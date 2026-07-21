#!/bin/bash
set -e

# Wait for DB
until pg_isready -h edge-zero-db -U edge_zero; do
  echo "Waiting for database..."
  sleep 2
done

# Run migrations
alembic upgrade head

# Ensure admin user exists
python create_admin.py

# Start app
uvicorn app.main:app --host 0.0.0.0 --port 7000 --reload
