# Escrow Cron Jobs Guide

## Overview

The escrow system includes two automated cron jobs that run daily to manage escrow releases and retailer repayments.

## Cron Jobs

### 1. Auto-Release Job

**Schedule:** Daily at 2:00 AM EAT (East Africa Time / UTC+3)
**Cron Pattern:** `0 2 * * *`

**Purpose:**
Automatically releases escrow funds to wholesalers when escrows pass their `auto_release_at` date (default 7 days after creation).

**Process:**
1. Query database for escrows with `status = 'held'` and `auto_release_at <= NOW()`
2. For each eligible escrow:
   - Update status to `expired`
   - Transfer funds to wholesaler via Blnk
   - Record the release transaction
   - Send notification to wholesaler
3. Log metrics: count of released escrows, total amount, duration

**Why 2 AM?**
- Low system load
- Before business hours start
- Minimizes impact on real-time operations

### 2. Auto-Deduct Job

**Schedule:** Daily at 11:00 PM EAT
**Cron Pattern:** `0 23 * * *`

**Purpose:**
Automatically deducts repayments from retailer wallets based on their daily sales and configured deduction percentage (default 30%).

**Process:**
1. Query all retailers with `auto_deduct.enabled = TRUE` and outstanding debt
2. For each retailer:
   - Calculate deduction amount (30% of outstanding debt, respecting max daily limit)
   - Check wallet balance meets minimum threshold (default 10,000 RWF)
   - Find oldest unpaid escrow
   - Deduct from wallet via Blnk
   - Record repayment in database
   - Send notification to retailer
3. Log metrics: retailers processed, total amount deducted, duration

**Why 11 PM?**
- After end-of-day sales reconciliation
- Ensures accurate daily sales data
- Before midnight for same-day accounting

## Files

### Core Cron Job Implementation
- **`src/jobs/escrow-cron.ts`** - EscrowCronJobs class with scheduling logic
- **`src/loaders/escrow-cron.ts`** - Loader to initialize cron jobs on server start
- **`src/api/routes/admin/escrow-jobs.ts`** - Admin API endpoints for manual triggers

### Testing & Scripts
- **`scripts/test-escrow-cron.js`** - Test script to verify cron job logic without waiting

## Admin API Endpoints

### Get Cron Job Status
```bash
GET /admin/escrow-jobs/status

Response:
{
  "status": "ok",
  "jobs": {
    "auto_release": {
      "running": true,
      "schedule": "Daily at 2:00 AM EAT"
    },
    "auto_deduct": {
      "running": true,
      "schedule": "Daily at 11:00 PM EAT"
    }
  },
  "timestamp": "2024-12-02T10:30:00Z"
}
```

### Manually Trigger Auto-Release
```bash
POST /admin/escrow-jobs/trigger-auto-release

Response:
{
  "message": "Auto-release job executed successfully",
  "released_count": 3,
  "timestamp": "2024-12-02T10:30:00Z"
}
```

### Manually Trigger Auto-Deduct
```bash
POST /admin/escrow-jobs/trigger-auto-deduct

Response:
{
  "message": "Auto-deduct job executed successfully",
  "processed": 15,
  "total_amount": 4500000,
  "timestamp": "2024-12-02T10:30:00Z"
}
```

### Get Next Run Times
```bash
GET /admin/escrow-jobs/next-run-times

Response:
{
  "auto_release": {
    "next_run": "2024-12-03T02:00:00Z",
    "schedule": "Daily at 2:00 AM EAT"
  },
  "auto_deduct": {
    "next_run": "2024-12-02T23:00:00Z",
    "schedule": "Daily at 11:00 PM EAT"
  },
  "current_time": "2024-12-02T10:30:00Z",
  "timezone": "Africa/Kigali (EAT)"
}
```

## Testing

### Run Test Script
```bash
# Check for escrows eligible for auto-release/deduct
node scripts/test-escrow-cron.js

# Create test data
node scripts/test-escrow-cron.js create-test-data

# Cleanup test data
node scripts/test-escrow-cron.js cleanup
```

### Test Output Example
```
📅 Cron Job Schedule:

   ⏰ Auto-Release: Daily at 2:00 AM EAT
      Purpose: Release escrows past their auto_release_at date
      Cron pattern: 0 2 * * *

   ⏰ Auto-Deduct: Daily at 11:00 PM EAT
      Purpose: Deduct repayments from retailer wallets
      Cron pattern: 0 23 * * *

🧪 Testing Auto-Release Job...

📊 Found 1 escrows eligible for auto-release:
   1. Order ORDER_12345: 100000.00 RWF (expired Mon Dec 01 2025)

🧪 Testing Auto-Deduct Job...

📊 Found 1 retailers with auto-deduct enabled:
   1. Retailer ret_001:
      Outstanding: 200000.00 RWF
      Deduction rate: 30.00%
      Would deduct: 60000.00 RWF (if wallet balance > 10000.00)
```

## Server Startup

The cron jobs are automatically initialized when the Medusa server starts via the loader:

```typescript
// src/loaders/escrow-cron.ts
export default async (container: MedusaContainer): Promise<void> => {
  const escrowCronJobs = new EscrowCronJobs(container);
  escrowCronJobs.startAll();
  // Jobs are now running in the background
};
```

You should see these logs on startup:
```
⏰ Initializing escrow cron jobs...
✅ Escrow cron jobs started successfully
   📅 Auto-release: Daily at 2:00 AM EAT (RUNNING)
   📅 Auto-deduct: Daily at 11:00 PM EAT (RUNNING)
```

## Configuration

### Environment Variables
```bash
# Database connection (required)
DATABASE_URL=postgresql://bigcompany_user:bigcompany_password@localhost:5435/bigcompany

# Blnk API (required for fund transfers)
BLNK_API_URL=http://localhost:5001
COMPANY_ESCROW_LEDGER_ID=<blnk_ledger_id>

# Cron job timezone (optional, defaults to Africa/Kigali)
CRON_TIMEZONE=Africa/Kigali

# Admin email for alerts (optional)
ADMIN_EMAIL=admin@bigcompany.rw
```

### Escrow Settings (Database)
These settings control cron job behavior and can be updated via the `escrow_settings` table:

```sql
-- Auto-release timeout (days)
UPDATE bigcompany.escrow_settings
SET setting_value = '10'
WHERE setting_key = 'auto_release_days';

-- Default deduction percentage
UPDATE bigcompany.escrow_settings
SET setting_value = '25'
WHERE setting_key = 'default_deduction_percentage';

-- Minimum wallet balance before deducting
UPDATE bigcompany.escrow_settings
SET setting_value = '5000'
WHERE setting_key = 'minimum_wallet_balance';
```

## Monitoring

### Key Metrics to Track

**Auto-Release Job:**
- `escrow.auto_release.count` - Number of escrows released
- `escrow.auto_release.duration_ms` - Job execution time
- `escrow.auto_release.failures` - Number of failures

**Auto-Deduct Job:**
- `escrow.auto_deduct.retailers_processed` - Number of retailers processed
- `escrow.auto_deduct.total_amount_rwf` - Total amount deducted
- `escrow.auto_deduct.duration_ms` - Job execution time
- `escrow.auto_deduct.failures` - Number of failures

### Alerts to Configure

1. **Job Failures** - Alert immediately if cron job throws error
2. **No Executions** - Alert if job hasn't run in 25 hours
3. **High Failure Rate** - Alert if >10% of auto-deduct attempts fail
4. **Long Duration** - Alert if job takes >5 minutes

### Logging

All cron job activity is logged with prefixes:
- `🔄 [CRON]` - Job started
- `✅ [CRON]` - Job completed successfully
- `❌ [CRON]` - Job failed
- `🔧 [MANUAL]` - Manual trigger via API

Example logs:
```
[2024-12-02 02:00:01] 🔄 [CRON] Auto-release job started
[2024-12-02 02:00:05] ✅ [CRON] Auto-release job completed: 3 escrows released in 4123ms
[2024-12-02 23:00:01] 🔄 [CRON] Auto-deduct job started
[2024-12-02 23:00:12] ✅ [CRON] Auto-deduct job completed: 15 retailers processed, 4500000 RWF deducted in 11234ms
```

## Troubleshooting

### Cron Jobs Not Running

**Check if jobs are registered:**
```bash
curl http://localhost:9000/admin/escrow-jobs/status
```

**Check server logs for initialization errors:**
```bash
grep "escrow cron" logs/server.log
```

**Verify node-cron is installed:**
```bash
npm list node-cron
```

### Auto-Release Not Working

1. Check for escrows past auto_release_at:
```sql
SELECT * FROM bigcompany.escrow_transactions
WHERE status = 'held' AND auto_release_at <= NOW();
```

2. Manually trigger the job:
```bash
curl -X POST http://localhost:9000/admin/escrow-jobs/trigger-auto-release
```

3. Check Blnk API connectivity:
```bash
curl http://localhost:5001/health
```

### Auto-Deduct Not Working

1. Check retailer settings:
```sql
SELECT * FROM bigcompany.escrow_auto_deductions
WHERE enabled = TRUE;
```

2. Check outstanding debt:
```sql
SELECT * FROM bigcompany.retailer_escrow_summary
WHERE outstanding_debt > 0;
```

3. Manually trigger the job:
```bash
curl -X POST http://localhost:9000/admin/escrow-jobs/trigger-auto-deduct
```

4. Check wallet balances meet minimum threshold

## Security Considerations

1. **Admin-Only Access** - All manual trigger endpoints require admin authentication
2. **Rate Limiting** - Manual triggers should be rate-limited to prevent abuse
3. **Audit Logging** - All cron job executions are logged with timestamps and results
4. **Idempotency** - Jobs are designed to be idempotent (safe to run multiple times)

## Production Deployment Checklist

- [ ] Verify `node-cron` is in `package.json` dependencies
- [ ] Configure `DATABASE_URL` environment variable
- [ ] Configure `BLNK_API_URL` and `COMPANY_ESCROW_LEDGER_ID`
- [ ] Test cron jobs with `scripts/test-escrow-cron.js`
- [ ] Verify jobs start on server boot (check logs)
- [ ] Set up monitoring for job failures
- [ ] Configure alert email/Slack webhook
- [ ] Test manual trigger endpoints with admin credentials
- [ ] Document cron job schedule in runbook
- [ ] Set up log retention and rotation

## FAQ

**Q: Can I change the cron schedule?**
A: Yes, edit the cron patterns in `src/jobs/escrow-cron.ts` (lines with `cron.schedule()`).

**Q: What happens if a job fails?**
A: The error is logged, an alert is sent to admins, and the server continues running. Jobs will retry at the next scheduled time.

**Q: Can I disable auto-deduct for specific retailers?**
A: Yes, update their record in `escrow_auto_deductions` table: `UPDATE ... SET enabled = FALSE WHERE retailer_id = '...'`

**Q: What if I need to run a job immediately?**
A: Use the manual trigger API: `POST /admin/escrow-jobs/trigger-auto-release` or `trigger-auto-deduct`

**Q: How do I test without waiting for scheduled times?**
A: Run `node scripts/test-escrow-cron.js` or use the manual trigger API endpoints.

---

**Last Updated:** 2024-12-02
**Status:** ✅ Production Ready
