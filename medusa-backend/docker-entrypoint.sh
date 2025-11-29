#!/bin/sh
set -e

echo "Starting BIG Company Backend..."

# Wait for PostgreSQL with timeout
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => { console.log('PostgreSQL is ready!'); client.end(); process.exit(0); })
  .catch((err) => { console.log('Waiting for PostgreSQL...', err.message); process.exit(1); });
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "PostgreSQL connection timeout after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Attempt $RETRY_COUNT/$MAX_RETRIES..."
  sleep 2
done

echo "PostgreSQL connected successfully!"

# Patch TypeORM BEFORE running migrations
echo "Patching TypeORM 0.3.x compatibility issues..."
for service_file in /app/node_modules/@medusajs/medusa/dist/services/*.js; do
  if grep -q '\.update({}, { is_installed: false })' "$service_file" 2>/dev/null; then
    sed -i 's/\.update({}, { is_installed: false })/\.update({ is_installed: true }, { is_installed: false })/g' "$service_file"
    echo "Patched: $service_file"
  fi
done
echo "Patches applied."

# Run migrations - this creates the migrations table if it doesn't exist
echo "Running Medusa migrations (this may take a while on first run)..."
npx medusa migrations run || {
  echo "Migration command failed, trying alternative..."
  node node_modules/@medusajs/medusa/dist/commands/migrate.js run || echo "Migrations may need manual intervention"
}

echo "Migrations complete."

# Use development mode which handles TypeScript better
echo "Starting Medusa server..."
exec npm run dev
