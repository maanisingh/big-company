#!/usr/bin/env node
/**
 * Start Medusa with error capture
 * This wraps the Medusa startup to capture any uncaught errors
 */

// Capture all uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]');
  console.error('Message:', error.message);
  console.error('Name:', error.name);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Capture all unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]');
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  process.exit(1);
});

// Log startup
console.log('[start-wrapper] Starting Medusa with error capture...');

// Import and run Medusa
const { spawn } = require('child_process');

const medusa = spawn('npx', ['medusa', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--enable-source-maps --trace-warnings'
  }
});

medusa.on('error', (error) => {
  console.error('[SPAWN ERROR]');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
});

medusa.on('exit', (code, signal) => {
  console.log(`[start-wrapper] Medusa exited with code ${code}, signal ${signal}`);
  process.exit(code || 0);
});
