#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => { console.log('PostgreSQL is ready!'); client.end(); process.exit(0); })
  .catch(() => { console.log('Waiting...'); process.exit(1); });
" 2>/dev/null; do
  sleep 2
done

echo "Running Medusa migrations..."
npm run migrations:run || echo "Migrations may already be applied"

echo "Patching TypeORM 0.3.x compatibility issues..."
# Fix empty criteria update issues in all provider services - handle ALL patterns
# The issue is TypeORM 0.3.x doesn't support .update({}, ...) with empty criteria

for service_file in /app/node_modules/@medusajs/medusa/dist/services/*.js; do
  # Check if file has any update({}, { is_installed: false }) pattern with any variable name
  if grep -q '\.update({}, { is_installed: false })' "$service_file" 2>/dev/null; then
    # Replace ANY variable name followed by .update({}, { is_installed: false })
    sed -i 's/\.update({}, { is_installed: false })/\.update({ is_installed: true }, { is_installed: false })/g' "$service_file"
    echo "Patched: $service_file"
  fi
done

echo "Patches applied."

echo "Starting Medusa server in development mode (for TypeScript transpilation)..."
exec npm run dev
