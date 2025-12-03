import { MedusaContainer } from '@medusajs/medusa/dist/types/global';
import { EscrowCronJobs } from '../jobs/escrow-cron';

/**
 * Escrow Cron Job Loader
 *
 * Initializes and starts escrow-related cron jobs when the Medusa server starts.
 * This loader is called during the application bootstrap process.
 */

export default async (container: MedusaContainer): Promise<void> => {
  const logger = container.resolve('logger');

  try {
    logger.info('⏰ Initializing escrow cron jobs...');

    // Register EscrowCronJobs as a singleton in the container
    if (!container.hasRegistration('escrowCronJobs')) {
      const escrowCronJobs = new EscrowCronJobs(container);
      container.register('escrowCronJobs', { resolve: () => escrowCronJobs });
    }

    // Get the registered instance and start jobs
    const escrowCronJobs: EscrowCronJobs = container.resolve('escrowCronJobs');
    escrowCronJobs.startAll();

    logger.info('✅ Escrow cron jobs initialized and started');

    // Log the schedule for visibility
    const status = escrowCronJobs.getStatus();
    logger.info(`   📅 Auto-release: ${status.auto_release.schedule} (${status.auto_release.running ? 'RUNNING' : 'STOPPED'})`);
    logger.info(`   📅 Auto-deduct: ${status.auto_deduct.schedule} (${status.auto_deduct.running ? 'RUNNING' : 'STOPPED'})`);

  } catch (error) {
    logger.error('❌ Failed to initialize escrow cron jobs:', error);
    // Don't throw - allow server to start even if cron jobs fail
    // Admin can manually trigger jobs via API if needed
  }
};
