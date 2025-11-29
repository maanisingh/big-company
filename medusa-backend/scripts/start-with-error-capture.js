#!/usr/bin/env node
/**
 * Start Medusa with error capture
 * This directly runs Medusa in the same process to capture all errors
 */

// IMPORTANT: Capture errors before anything else runs
process.on('uncaughtException', (error) => {
  console.error('=========================================');
  console.error('[UNCAUGHT EXCEPTION]');
  console.error('Message:', error.message);
  console.error('Name:', error.name);
  console.error('Stack:', error.stack);
  console.error('=========================================');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=========================================');
  console.error('[UNHANDLED REJECTION]');
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  console.error('=========================================');
  process.exit(1);
});

// Enable source maps and warnings
process.env.NODE_OPTIONS = '--enable-source-maps --trace-warnings';

console.log('[start-wrapper] Starting Medusa with error capture...');
console.log('[start-wrapper] Working directory:', process.cwd());
console.log('[start-wrapper] Node version:', process.version);

// Wrap the entire startup in a try-catch
async function start() {
  try {
    // Use the Medusa CLI directly via require
    // This keeps everything in the same process so we catch all errors
    const { execSync } = require('child_process');

    // Run medusa start synchronously to capture any exit codes
    execSync('npx medusa start', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--enable-source-maps --trace-warnings'
      }
    });
  } catch (error) {
    console.error('=========================================');
    console.error('[STARTUP ERROR]');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Signal:', error.signal);
    if (error.stderr) {
      console.error('Stderr:', error.stderr.toString());
    }
    if (error.stdout) {
      console.error('Stdout:', error.stdout.toString());
    }
    console.error('=========================================');
    process.exit(error.status || 1);
  }
}

start();
