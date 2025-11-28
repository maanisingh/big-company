// Export all queues and workers
export * from './queue';
export * from './workers';

// Initialize workers when this module is imported
import { startWorkers } from './workers';

// Start workers if running as main process (not in test)
if (process.env.NODE_ENV !== 'test') {
  startWorkers();
}
