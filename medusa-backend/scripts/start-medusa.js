#!/usr/bin/env node
/**
 * Start Medusa with comprehensive error capturing
 */

const { spawn } = require('child_process');

// Capture unhandled errors globally
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Reason:', reason);
  process.exit(1);
});

console.log('[start-medusa] Starting Medusa with error capturing...');
console.log('[start-medusa] Node version:', process.version);
console.log('[start-medusa] PORT:', process.env.PORT || 9000);

// Run medusa start with full output
const medusa = spawn('npx', ['medusa', 'start'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_OPTIONS: '--enable-source-maps --trace-warnings --trace-uncaught'
  }
});

// Capture stdout
medusa.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Capture stderr - this is where errors usually go
medusa.stderr.on('data', (data) => {
  const message = data.toString();
  console.error('[STDERR]', message);
});

medusa.on('error', (error) => {
  console.error('[start-medusa] Failed to start:', error.message);
  process.exit(1);
});

medusa.on('close', (code) => {
  console.log(`[start-medusa] Medusa exited with code ${code}`);
  if (code !== 0) {
    console.error('[start-medusa] Medusa failed to start properly');
  }
  process.exit(code);
});

// Handle signals
process.on('SIGTERM', () => {
  console.log('[start-medusa] Received SIGTERM');
  medusa.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('[start-medusa] Received SIGINT');
  medusa.kill('SIGINT');
});
