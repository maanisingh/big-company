import { Pool } from 'pg';
import GasService from './gas';
import SMSService from './sms';

interface GasReward {
  id: string;
  userId: string;
  orderId: string;
  profitAmount: number;
  rewardPercentage: number;
  rewardAmount: number;
  meterId?: string;
  status: 'pending' | 'credited' | 'failed';
  creditedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface RewardConfig {
  minProfitThreshold: number;
  rewardPercentage: number;
}

interface RewardCalculation {
  eligible: boolean;
  profitAmount: number;
  rewardAmount: number;
  reason?: string;
}

class RewardsService {
  private db: Pool;
  private gasService: GasService;
  private smsService: SMSService;
  private config: RewardConfig;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.gasService = new GasService();
    this.smsService = new SMSService();
    this.config = {
      minProfitThreshold: 1000, // Minimum profit in RWF to trigger reward
      rewardPercentage: 12, // 12% of profit as gas reward
    };
    this.loadConfig();
  }

  /**
   * Load reward configuration from database
   */
  private async loadConfig(): Promise<void> {
    try {
      const threshold = await this.db.query(
        "SELECT value FROM bigcompany.system_settings WHERE category = 'gas_rewards' AND key = 'min_profit_threshold'"
      );
      const percentage = await this.db.query(
        "SELECT value FROM bigcompany.system_settings WHERE category = 'gas_rewards' AND key = 'reward_percentage'"
      );

      if (threshold.rows[0]) {
        this.config.minProfitThreshold = parseInt(threshold.rows[0].value);
      }
      if (percentage.rows[0]) {
        this.config.rewardPercentage = parseFloat(percentage.rows[0].value);
      }
    } catch (error) {
      console.log('Using default reward config');
    }
  }

  /**
   * Update reward configuration (admin)
   */
  async updateConfig(updates: Partial<RewardConfig>): Promise<RewardConfig> {
    if (updates.minProfitThreshold !== undefined) {
      await this.db.query(`
        INSERT INTO bigcompany.system_settings (category, key, value, description)
        VALUES ('gas_rewards', 'min_profit_threshold', $1, 'Minimum profit to trigger reward')
        ON CONFLICT (category, key) DO UPDATE SET value = $1, updated_at = NOW()
      `, [updates.minProfitThreshold.toString()]);
      this.config.minProfitThreshold = updates.minProfitThreshold;
    }

    if (updates.rewardPercentage !== undefined) {
      await this.db.query(`
        INSERT INTO bigcompany.system_settings (category, key, value, description)
        VALUES ('gas_rewards', 'reward_percentage', $1, 'Percentage of profit as reward')
        ON CONFLICT (category, key) DO UPDATE SET value = $1, updated_at = NOW()
      `, [updates.rewardPercentage.toString()]);
      this.config.rewardPercentage = updates.rewardPercentage;
    }

    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): RewardConfig {
    return { ...this.config };
  }

  /**
   * Calculate reward for an order
   */
  async calculateReward(orderId: string, profitAmount: number): Promise<RewardCalculation> {
    if (profitAmount < this.config.minProfitThreshold) {
      return {
        eligible: false,
        profitAmount,
        rewardAmount: 0,
        reason: `Profit (${profitAmount.toLocaleString()} RWF) below threshold (${this.config.minProfitThreshold.toLocaleString()} RWF)`,
      };
    }

    const rewardAmount = Math.floor((profitAmount * this.config.rewardPercentage) / 100);

    return {
      eligible: true,
      profitAmount,
      rewardAmount,
    };
  }

  /**
   * Process reward for completed order
   */
  async processOrderReward(
    userId: string,
    orderId: string,
    profitAmount: number,
    meterId?: string
  ): Promise<{ success: boolean; reward?: GasReward; error?: string }> {
    // Calculate reward
    const calculation = await this.calculateReward(orderId, profitAmount);

    if (!calculation.eligible) {
      return { success: false, error: calculation.reason };
    }

    // Check for duplicate
    const existing = await this.db.query(
      'SELECT * FROM bigcompany.gas_rewards WHERE order_id = $1',
      [orderId]
    );

    if (existing.rows.length > 0) {
      return { success: false, error: 'Reward already processed for this order' };
    }

    // Get user's default meter if not specified
    let targetMeterId = meterId;
    if (!targetMeterId) {
      const defaultMeter = await this.db.query(`
        SELECT id FROM bigcompany.utility_meters
        WHERE user_id = $1 AND meter_type = 'gas' AND is_verified = true
        ORDER BY created_at ASC
        LIMIT 1
      `, [userId]);

      if (defaultMeter.rows.length > 0) {
        targetMeterId = defaultMeter.rows[0].id;
      }
    }

    // Create pending reward
    const result = await this.db.query(`
      INSERT INTO bigcompany.gas_rewards
      (user_id, order_id, profit_amount, reward_percentage, reward_amount, meter_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [
      userId,
      orderId,
      profitAmount,
      this.config.rewardPercentage,
      calculation.rewardAmount,
      targetMeterId,
    ]);

    const reward = this.mapReward(result.rows[0]);

    // If meter is specified, auto-credit
    if (targetMeterId) {
      return this.creditReward(reward.id);
    }

    return { success: true, reward };
  }

  /**
   * Credit pending reward to meter
   */
  async creditReward(rewardId: string, meterId?: string): Promise<{ success: boolean; reward?: GasReward; error?: string }> {
    const reward = await this.db.query(
      'SELECT * FROM bigcompany.gas_rewards WHERE id = $1',
      [rewardId]
    );

    if (reward.rows.length === 0) {
      return { success: false, error: 'Reward not found' };
    }

    const rewardData = reward.rows[0];

    if (rewardData.status === 'credited') {
      return { success: false, error: 'Reward already credited' };
    }

    const targetMeterId = meterId || rewardData.meter_id;

    if (!targetMeterId) {
      return { success: false, error: 'No meter specified for reward' };
    }

    // Get meter details
    const meter = await this.db.query(
      'SELECT * FROM bigcompany.utility_meters WHERE id = $1',
      [targetMeterId]
    );

    if (meter.rows.length === 0) {
      return { success: false, error: 'Meter not found' };
    }

    try {
      // Top up gas meter with reward amount
      const gasResult = await this.gasService.purchaseUnits({
        meterNumber: meter.rows[0].meter_number,
        amount: rewardData.reward_amount,
        customerId: rewardData.user_id,
        phone: '', // Will be looked up by gas service
      });

      if (!gasResult.success) {
        // Mark as failed
        await this.db.query(`
          UPDATE bigcompany.gas_rewards
          SET status = 'failed', metadata = metadata || $1
          WHERE id = $2
        `, [JSON.stringify({ error: gasResult.error }), rewardId]);

        return { success: false, error: gasResult.error };
      }

      // Mark as credited
      const updated = await this.db.query(`
        UPDATE bigcompany.gas_rewards
        SET status = 'credited', credited_at = NOW(), meter_id = $1,
            metadata = metadata || $2
        WHERE id = $3
        RETURNING *
      `, [
        targetMeterId,
        JSON.stringify({
          gas_token: gasResult.token,
          gas_units: gasResult.units,
          gas_transaction_id: gasResult.transactionId,
        }),
        rewardId,
      ]);

      // Notify user
      const customer = await this.db.query(
        "SELECT phone FROM customer WHERE id = $1",
        [rewardData.user_id]
      );

      if (customer.rows[0]?.phone) {
        await this.smsService.sendGasTopupConfirmation(
          customer.rows[0].phone,
          meter.rows[0].meter_number,
          rewardData.reward_amount,
          gasResult.units || 0,
          gasResult.token || ''
        );
      }

      return { success: true, reward: this.mapReward(updated.rows[0]) };
    } catch (error: any) {
      console.error('Reward credit error:', error);

      await this.db.query(`
        UPDATE bigcompany.gas_rewards
        SET status = 'failed', metadata = metadata || $1
        WHERE id = $2
      `, [JSON.stringify({ error: error.message }), rewardId]);

      return { success: false, error: 'Failed to credit reward' };
    }
  }

  /**
   * Get user's rewards
   */
  async getUserRewards(userId: string, limit: number = 20): Promise<GasReward[]> {
    const result = await this.db.query(`
      SELECT r.*, m.meter_number, m.alias as meter_alias
      FROM bigcompany.gas_rewards r
      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows.map(this.mapReward);
  }

  /**
   * Get user's total rewards
   */
  async getUserRewardTotals(userId: string): Promise<{
    totalRewards: number;
    totalCredited: number;
    totalPending: number;
    rewardCount: number;
  }> {
    const result = await this.db.query(`
      SELECT
        COALESCE(SUM(reward_amount), 0) as total_rewards,
        COALESCE(SUM(CASE WHEN status = 'credited' THEN reward_amount ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) as total_pending,
        COUNT(*) as reward_count
      FROM bigcompany.gas_rewards
      WHERE user_id = $1
    `, [userId]);

    const data = result.rows[0];

    return {
      totalRewards: parseFloat(data.total_rewards) || 0,
      totalCredited: parseFloat(data.total_credited) || 0,
      totalPending: parseFloat(data.total_pending) || 0,
      rewardCount: parseInt(data.reward_count) || 0,
    };
  }

  /**
   * Get pending rewards (admin)
   */
  async getPendingRewards(): Promise<GasReward[]> {
    const result = await this.db.query(`
      SELECT r.*, m.meter_number, m.alias as meter_alias,
             c.first_name, c.last_name, c.email
      FROM bigcompany.gas_rewards r
      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id
      LEFT JOIN customer c ON r.user_id = c.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `);

    return result.rows.map(this.mapReward);
  }

  /**
   * Get failed rewards (admin)
   */
  async getFailedRewards(): Promise<GasReward[]> {
    const result = await this.db.query(`
      SELECT r.*, m.meter_number, m.alias as meter_alias,
             c.first_name, c.last_name, c.email
      FROM bigcompany.gas_rewards r
      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id
      LEFT JOIN customer c ON r.user_id = c.id
      WHERE r.status = 'failed'
      ORDER BY r.created_at DESC
    `);

    return result.rows.map(this.mapReward);
  }

  /**
   * Retry failed reward (admin)
   */
  async retryFailedReward(rewardId: string): Promise<{ success: boolean; reward?: GasReward; error?: string }> {
    // Reset status to pending first
    await this.db.query(`
      UPDATE bigcompany.gas_rewards
      SET status = 'pending', metadata = metadata || '{"retry": true}'
      WHERE id = $1 AND status = 'failed'
    `, [rewardId]);

    return this.creditReward(rewardId);
  }

  /**
   * Manual reward adjustment (admin)
   */
  async adjustReward(
    rewardId: string,
    adminId: string,
    newAmount: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const reward = await this.db.query(
      'SELECT * FROM bigcompany.gas_rewards WHERE id = $1',
      [rewardId]
    );

    if (reward.rows.length === 0) {
      return { success: false, error: 'Reward not found' };
    }

    if (reward.rows[0].status === 'credited') {
      return { success: false, error: 'Cannot adjust already credited reward' };
    }

    const oldAmount = reward.rows[0].reward_amount;

    await this.db.query(`
      UPDATE bigcompany.gas_rewards
      SET reward_amount = $1, metadata = metadata || $2
      WHERE id = $3
    `, [
      newAmount,
      JSON.stringify({
        adjustment: {
          old_amount: oldAmount,
          new_amount: newAmount,
          adjusted_by: adminId,
          reason,
          adjusted_at: new Date(),
        },
      }),
      rewardId,
    ]);

    // Log audit
    await this.db.query(`
      INSERT INTO bigcompany.audit_logs
      (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1, 'reward_adjustment', 'gas_reward', $2, $3, $4)
    `, [
      adminId,
      rewardId,
      JSON.stringify({ reward_amount: oldAmount }),
      JSON.stringify({ reward_amount: newAmount, reason }),
    ]);

    return { success: true };
  }

  /**
   * Get reward statistics (admin)
   */
  async getRewardStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalRewardsGenerated: number;
    totalRewardsCredited: number;
    totalRewardsPending: number;
    totalRewardsFailed: number;
    rewardCount: number;
    avgRewardAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
  }> {
    let dateCondition = '';
    const params: any[] = [];

    if (fromDate) {
      params.push(fromDate);
      dateCondition += ` AND created_at >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      dateCondition += ` AND created_at <= $${params.length}`;
    }

    const stats = await this.db.query(`
      SELECT
        COALESCE(SUM(reward_amount), 0) as total_generated,
        COALESCE(SUM(CASE WHEN status = 'credited' THEN reward_amount ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN reward_amount ELSE 0 END), 0) as total_failed,
        COUNT(*) as reward_count,
        AVG(reward_amount) as avg_amount
      FROM bigcompany.gas_rewards
      WHERE 1=1 ${dateCondition}
    `, params);

    const byStatus = await this.db.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as amount
      FROM bigcompany.gas_rewards
      WHERE 1=1 ${dateCondition}
      GROUP BY status
    `, params);

    const statusMap: Record<string, { count: number; amount: number }> = {};
    byStatus.rows.forEach(row => {
      statusMap[row.status] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
      };
    });

    const data = stats.rows[0];

    return {
      totalRewardsGenerated: parseFloat(data.total_generated) || 0,
      totalRewardsCredited: parseFloat(data.total_credited) || 0,
      totalRewardsPending: parseFloat(data.total_pending) || 0,
      totalRewardsFailed: parseFloat(data.total_failed) || 0,
      rewardCount: parseInt(data.reward_count) || 0,
      avgRewardAmount: parseFloat(data.avg_amount) || 0,
      byStatus: statusMap,
    };
  }

  /**
   * Process batch rewards (cron job)
   */
  async processPendingRewards(batchSize: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pending = await this.db.query(`
      SELECT * FROM bigcompany.gas_rewards
      WHERE status = 'pending' AND meter_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT $1
    `, [batchSize]);

    let successful = 0;
    let failed = 0;

    for (const reward of pending.rows) {
      const result = await this.creditReward(reward.id);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      processed: pending.rows.length,
      successful,
      failed,
    };
  }

  // ==================== HELPERS ====================

  private mapReward(row: any): GasReward {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      profitAmount: parseFloat(row.profit_amount),
      rewardPercentage: parseFloat(row.reward_percentage),
      rewardAmount: parseFloat(row.reward_amount),
      meterId: row.meter_id,
      status: row.status,
      creditedAt: row.credited_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}

export default RewardsService;
