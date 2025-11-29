#!/bin/sh
set -e

echo "Starting BIG Company Backend..."

# Quick health endpoint during startup
echo "Setting up temporary health endpoint..."

# Wait for PostgreSQL with timeout
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => { console.log('PostgreSQL is ready!'); client.end(); process.exit(0); })
  .catch(() => { console.log('Waiting...'); process.exit(1); });
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "PostgreSQL connection timeout - continuing anyway"
    break
  fi
  sleep 2
done

echo "Running Medusa migrations..."
npm run migrations:run || echo "Migrations may already be applied"

echo "Patching TypeORM 0.3.x compatibility issues..."
for service_file in /app/node_modules/@medusajs/medusa/dist/services/*.js; do
  if grep -q '\.update({}, { is_installed: false })' "$service_file" 2>/dev/null; then
    sed -i 's/\.update({}, { is_installed: false })/\.update({ is_installed: true }, { is_installed: false })/g' "$service_file"
    echo "Patched: $service_file"
  fi
done

echo "Patches applied."

# Use production start for faster startup
echo "Starting Medusa server..."
exec npm run start
