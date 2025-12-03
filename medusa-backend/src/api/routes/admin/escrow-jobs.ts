import { Router, Request, Response } from 'express';
import { EscrowCronJobs } from '../../../jobs/escrow-cron';

/**
 * Admin API for managing escrow cron jobs
 * All endpoints require admin authentication
 */

const router = Router();

// Middleware to ensure admin role
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /admin/escrow-jobs/status
 * Get status of all escrow cron jobs
 */
router.get('/escrow-jobs/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const escrowCronJobs: EscrowCronJobs = req.scope.resolve('escrowCronJobs');
    const status = escrowCronJobs.getStatus();

    res.json({
      status: 'ok',
      jobs: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cron job status', details: error.message });
  }
});

/**
 * POST /admin/escrow-jobs/trigger-auto-release
 * Manually trigger auto-release job (for testing or emergency)
 */
router.post('/escrow-jobs/trigger-auto-release', requireAdmin, async (req: Request, res: Response) => {
  try {
    const escrowCronJobs: EscrowCronJobs = req.scope.resolve('escrowCronJobs');
    const result = await escrowCronJobs.triggerAutoRelease();

    if (result.success) {
      res.json({
        message: 'Auto-release job executed successfully',
        released_count: result.released_count,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'Auto-release job failed',
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger auto-release', details: error.message });
  }
});

/**
 * POST /admin/escrow-jobs/trigger-auto-deduct
 * Manually trigger auto-deduct job (for testing or emergency)
 */
router.post('/escrow-jobs/trigger-auto-deduct', requireAdmin, async (req: Request, res: Response) => {
  try {
    const escrowCronJobs: EscrowCronJobs = req.scope.resolve('escrowCronJobs');
    const result = await escrowCronJobs.triggerAutoDeduct();

    if (result.success) {
      res.json({
        message: 'Auto-deduct job executed successfully',
        processed: result.result.processed,
        total_amount: result.result.total_amount,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'Auto-deduct job failed',
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger auto-deduct', details: error.message });
  }
});

/**
 * GET /admin/escrow-jobs/next-run-times
 * Get next scheduled run times for cron jobs
 */
router.get('/escrow-jobs/next-run-times', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Calculate next run times based on current time
    const now = new Date();
    const nextAutoRelease = new Date(now);
    nextAutoRelease.setHours(2, 0, 0, 0);
    if (nextAutoRelease <= now) {
      nextAutoRelease.setDate(nextAutoRelease.getDate() + 1);
    }

    const nextAutoDeduct = new Date(now);
    nextAutoDeduct.setHours(23, 0, 0, 0);
    if (nextAutoDeduct <= now) {
      nextAutoDeduct.setDate(nextAutoDeduct.getDate() + 1);
    }

    res.json({
      auto_release: {
        next_run: nextAutoRelease.toISOString(),
        schedule: 'Daily at 2:00 AM EAT',
      },
      auto_deduct: {
        next_run: nextAutoDeduct.toISOString(),
        schedule: 'Daily at 11:00 PM EAT',
      },
      current_time: now.toISOString(),
      timezone: 'Africa/Kigali (EAT)',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate next run times', details: error.message });
  }
});

export default router;
