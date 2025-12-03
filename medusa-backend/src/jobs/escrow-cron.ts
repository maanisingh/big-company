import cron from 'node-cron';
import { EscrowService } from '../services/escrow';
import { Logger } from '@medusajs/medusa';

/**
 * Escrow System Cron Jobs
 *
 * 1. Auto-Release Job: Releases escrows past their auto_release_at date (Daily at 2 AM)
 * 2. Auto-Deduct Job: Deducts repayments from retailer wallets (Daily at 11 PM)
 */

export class EscrowCronJobs {
  private container: any;
  private logger: Logger;
  private autoReleaseJob: cron.ScheduledTask | null = null;
  private autoDeductJob: cron.ScheduledTask | null = null;

  constructor(container: any) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  /**
   * Lazy load escrow service (only resolve when needed)
   */
  private getEscrowService(): EscrowService {
    return this.container.resolve('escrowService');
  }

  /**
   * Initialize and start all cron jobs
   */
  startAll(): void {
    this.startAutoReleaseJob();
    this.startAutoDeductJob();
    this.logger.info('✅ Escrow cron jobs started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    if (this.autoReleaseJob) {
      this.autoReleaseJob.stop();
      this.logger.info('⏹️  Auto-release cron job stopped');
    }
    if (this.autoDeductJob) {
      this.autoDeductJob.stop();
      this.logger.info('⏹️  Auto-deduct cron job stopped');
    }
  }

  /**
   * Auto-Release Job
   * Schedule: Daily at 2:00 AM (East Africa Time / UTC+3)
   * Purpose: Release escrows that have passed their auto_release_at date
   */
  private startAutoReleaseJob(): void {
    // Cron pattern: 0 2 * * * (minute hour day month weekday)
    // Run at 2:00 AM every day
    this.autoReleaseJob = cron.schedule('0 2 * * *', async () => {
      const startTime = Date.now();
      this.logger.info('🔄 [CRON] Auto-release job started');

      try {
        const releasedCount = await this.getEscrowService().processAutoReleases();

        const duration = Date.now() - startTime;
        this.logger.info(
          `✅ [CRON] Auto-release job completed: ${releasedCount} escrows released in ${duration}ms`
        );

        // Log to monitoring/metrics system if available
        this.logMetric('escrow.auto_release.count', releasedCount);
        this.logMetric('escrow.auto_release.duration_ms', duration);

      } catch (error) {
        this.logger.error('❌ [CRON] Auto-release job failed:', error);

        // Send alert to admin (email/Slack/etc)
        await this.sendAlert('auto_release_failure', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }, {
      timezone: 'Africa/Kigali', // Rwanda timezone (EAT)
    });

    this.logger.info('⏰ Auto-release cron job scheduled: Daily at 2:00 AM EAT');
  }

  /**
   * Auto-Deduct Job
   * Schedule: Daily at 11:00 PM (after end-of-day sales reconciliation)
   * Purpose: Deduct repayments from retailer wallets based on daily sales
   */
  private startAutoDeductJob(): void {
    // Cron pattern: 0 23 * * * (minute hour day month weekday)
    // Run at 11:00 PM every day
    this.autoDeductJob = cron.schedule('0 23 * * *', async () => {
      const startTime = Date.now();
      this.logger.info('🔄 [CRON] Auto-deduct job started');

      try {
        const result = await this.getEscrowService().processAutoDeductions();

        const duration = Date.now() - startTime;
        this.logger.info(
          `✅ [CRON] Auto-deduct job completed: ${result.processed} retailers processed, ` +
          `${result.total_amount} RWF deducted in ${duration}ms`
        );

        // Log metrics
        this.logMetric('escrow.auto_deduct.retailers_processed', result.processed);
        this.logMetric('escrow.auto_deduct.total_amount_rwf', result.total_amount);
        this.logMetric('escrow.auto_deduct.duration_ms', duration);

      } catch (error) {
        this.logger.error('❌ [CRON] Auto-deduct job failed:', error);

        // Send alert to admin
        await this.sendAlert('auto_deduct_failure', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }, {
      timezone: 'Africa/Kigali',
    });

    this.logger.info('⏰ Auto-deduct cron job scheduled: Daily at 11:00 PM EAT');
  }

  /**
   * Manual trigger for auto-release (for testing or manual execution)
   */
  async triggerAutoRelease(): Promise<{ success: boolean; released_count: number; error?: string }> {
    try {
      this.logger.info('🔧 [MANUAL] Triggering auto-release job');
      const releasedCount = await this.getEscrowService().processAutoReleases();
      return { success: true, released_count: releasedCount };
    } catch (error) {
      this.logger.error('❌ [MANUAL] Auto-release trigger failed:', error);
      return { success: false, released_count: 0, error: error.message };
    }
  }

  /**
   * Manual trigger for auto-deduct (for testing or manual execution)
   */
  async triggerAutoDeduct(): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      this.logger.info('🔧 [MANUAL] Triggering auto-deduct job');
      const result = await this.getEscrowService().processAutoDeductions();
      return { success: true, result };
    } catch (error) {
      this.logger.error('❌ [MANUAL] Auto-deduct trigger failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cron job status
   */
  getStatus(): {
    auto_release: { running: boolean; schedule: string };
    auto_deduct: { running: boolean; schedule: string };
  } {
    return {
      auto_release: {
        running: this.autoReleaseJob !== null && this.autoReleaseJob.getStatus() === 'scheduled',
        schedule: 'Daily at 2:00 AM EAT',
      },
      auto_deduct: {
        running: this.autoDeductJob !== null && this.autoDeductJob.getStatus() === 'scheduled',
        schedule: 'Daily at 11:00 PM EAT',
      },
    };
  }

  /**
   * Log metric to monitoring system (placeholder)
   */
  private logMetric(metricName: string, value: number): void {
    // TODO: Integrate with monitoring system (Prometheus, DataDog, etc.)
    this.logger.debug(`📊 Metric: ${metricName} = ${value}`);
  }

  /**
   * Send alert to admin (placeholder)
   */
  private async sendAlert(alertType: string, data: any): Promise<void> {
    // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
    this.logger.warn(`🚨 ALERT [${alertType}]:`, JSON.stringify(data));

    // Example: Send email
    // await this.emailService.send({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `Escrow System Alert: ${alertType}`,
    //   body: JSON.stringify(data, null, 2),
    // });
  }
}

export default EscrowCronJobs;
