import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import BlnkService from '../../../services/blnk';
import SMSService from '../../../services/sms';

const router = Router();

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize services
let blnkService: BlnkService;
let smsService: SMSService;

function initServices(container: any) {
  if (!blnkService) {
    blnkService = new BlnkService(container);
  }
  if (!smsService) {
    smsService = new SMSService();
  }
}

// ==================== REWARDS CONSTANTS ====================

// Gas rewards: 12% of profit when profit >= 1000 RWF
const REWARDS_CONFIG = {
  GAS_REWARD_PERCENTAGE: 0.12, // 12% of profit
  MIN_PROFIT_FOR_REWARD: 1000, // Minimum 1000 RWF profit to earn rewards
  GAS_COST_PER_UNIT: 100, // Cost price per gas unit (RWF)
  GAS_PRICE_PER_UNIT: 120, // Selling price per gas unit (RWF)
  PROFIT_PER_UNIT: 20, // Profit per gas unit (RWF)
  REFERRAL_REWARD: 500, // Reward for referring new customer (RWF)
  SIGNUP_BONUS: 200, // Bonus for new customer signup (RWF)
  LOYALTY_TIERS: {
    BRONZE: { minPoints: 0, multiplier: 1.0, name: 'Bronze' },
    SILVER: { minPoints: 1000, multiplier: 1.25, name: 'Silver' },
    GOLD: { minPoints: 5000, multiplier: 1.5, name: 'Gold' },
    PLATINUM: { minPoints: 15000, multiplier: 2.0, name: 'Platinum' },
  },
};

// ==================== CUSTOMER REWARDS ENDPOINTS ====================

/**
 * GET /rewards/balance
 * Get customer's rewards balance and tier
 */
router.get('/balance', wrapHandler(async (req: any, res) => {
  const customerId = req.user?.customer?.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  initServices(req.scope);

  try {
    // Get rewards balance
    const balanceResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed,
        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as total_expired
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1
    `, [customerId]);

    const { total_earned, total_redeemed, total_expired } = balanceResult.rows[0];
    const availablePoints = Number(total_earned) - Number(total_redeemed) - Number(total_expired);

    // Determine tier
    const tier = determineTier(availablePoints);

    // Get pending rewards (not yet credited)
    const pendingResult = await db.query(`
      SELECT COALESCE(SUM(points), 0) as pending
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1 AND status = 'pending'
    `, [customerId]);

    // Get lifetime stats
    const statsResult = await db.query(`
      SELECT
        COUNT(DISTINCT transaction_ref) as total_transactions,
        COALESCE(SUM(CASE WHEN source = 'gas_purchase' THEN points ELSE 0 END), 0) as gas_rewards,
        COALESCE(SUM(CASE WHEN source = 'referral' THEN points ELSE 0 END), 0) as referral_rewards,
        COALESCE(SUM(CASE WHEN source = 'bonus' THEN points ELSE 0 END), 0) as bonus_rewards
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1 AND type = 'earned'
    `, [customerId]);

    res.json({
      success: true,
      balance: {
        available: availablePoints,
        pending: Number(pendingResult.rows[0].pending),
        totalEarned: Number(total_earned),
        totalRedeemed: Number(total_redeemed),
        totalExpired: Number(total_expired),
      },
      tier: {
        name: tier.name,
        multiplier: tier.multiplier,
        nextTier: getNextTier(availablePoints),
        pointsToNextTier: getPointsToNextTier(availablePoints),
      },
      stats: {
        totalTransactions: Number(statsResult.rows[0].total_transactions),
        gasRewards: Number(statsResult.rows[0].gas_rewards),
        referralRewards: Number(statsResult.rows[0].referral_rewards),
        bonusRewards: Number(statsResult.rows[0].bonus_rewards),
      },
      // Rewards value in RWF (1 point = 1 RWF)
      valueRwf: availablePoints,
    });
  } catch (error: any) {
    console.error('Error getting rewards balance:', error);
    res.status(500).json({ error: 'Failed to get rewards balance' });
  }
}));

/**
 * GET /rewards/history
 * Get rewards transaction history
 */
router.get('/history', wrapHandler(async (req: any, res) => {
  const customerId = req.user?.customer?.id;
  const { limit = 50, offset = 0, type } = req.query;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let query = `
      SELECT
        id, type, source, points, description, transaction_ref,
        status, created_at, expires_at
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1
    `;
    const params: any[] = [customerId];

    if (type && ['earned', 'redeemed', 'expired'].includes(type as string)) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const result = await db.query(query, params);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.rewards_ledger WHERE user_id = $1
    `, [customerId]);

    res.json({
      success: true,
      transactions: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        source: row.source,
        points: row.points,
        description: row.description,
        transactionRef: row.transaction_ref,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      })),
      pagination: {
        total: Number(countResult.rows[0].total),
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error: any) {
    console.error('Error getting rewards history:', error);
    res.status(500).json({ error: 'Failed to get rewards history' });
  }
}));

/**
 * POST /rewards/redeem
 * Redeem rewards points for wallet credit
 */
router.post('/redeem', wrapHandler(async (req: any, res) => {
  const customerId = req.user?.customer?.id;
  const { points } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!points || points < 100) {
    return res.status(400).json({ error: 'Minimum redemption is 100 points' });
  }

  initServices(req.scope);

  try {
    // Get available balance
    const balanceResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' AND status = 'credited' THEN points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as available
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1
    `, [customerId]);

    const available = Number(balanceResult.rows[0].available);

    if (points > available) {
      return res.status(400).json({
        error: `Insufficient points. Available: ${available}`,
        available,
      });
    }

    // Start transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create redemption record
      const redemptionRef = `REDEEM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      await client.query(`
        INSERT INTO bigcompany.rewards_ledger
        (user_id, type, source, points, description, transaction_ref, status)
        VALUES ($1, 'redeemed', 'wallet_credit', $2, $3, $4, 'credited')
      `, [
        customerId,
        points,
        `Redeemed ${points} points for ${points} RWF wallet credit`,
        redemptionRef,
      ]);

      // Credit wallet via Blnk
      await blnkService.creditCustomerWallet(
        customerId,
        points, // 1 point = 1 RWF
        redemptionRef,
        'Rewards redemption'
      );

      await client.query('COMMIT');

      // Get customer phone for SMS
      const customerResult = await db.query(
        "SELECT phone, metadata FROM customer WHERE id = $1",
        [customerId]
      );
      const phone = customerResult.rows[0]?.phone || customerResult.rows[0]?.metadata?.phone;

      if (phone) {
        await smsService.send({
          to: phone,
          message: `BIG: You've redeemed ${points} reward points for ${points} RWF wallet credit! Ref: ${redemptionRef}`,
        });
      }

      res.json({
        success: true,
        redemption: {
          points,
          valueRwf: points,
          reference: redemptionRef,
          newBalance: available - points,
        },
        message: `Successfully redeemed ${points} points for ${points} RWF`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error redeeming rewards:', error);
    res.status(500).json({ error: 'Failed to redeem rewards' });
  }
}));

/**
 * GET /rewards/referral-code
 * Get or generate referral code
 */
router.get('/referral-code', wrapHandler(async (req: any, res) => {
  const customerId = req.user?.customer?.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Check if user already has a referral code
    const existingResult = await db.query(`
      SELECT referral_code FROM bigcompany.user_referrals WHERE user_id = $1
    `, [customerId]);

    let referralCode = existingResult.rows[0]?.referral_code;

    if (!referralCode) {
      // Generate new referral code
      referralCode = generateReferralCode();

      await db.query(`
        INSERT INTO bigcompany.user_referrals (user_id, referral_code)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET referral_code = $2
      `, [customerId, referralCode]);
    }

    // Get referral stats
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN is_converted THEN 1 END) as converted_referrals,
        COALESCE(SUM(reward_paid), 0) as total_rewards_earned
      FROM bigcompany.referral_tracking
      WHERE referrer_id = $1
    `, [customerId]);

    res.json({
      success: true,
      referralCode,
      shareLink: `https://big.rw/r/${referralCode}`,
      ussdCode: `*939*REF*${referralCode}#`,
      rewardPerReferral: REWARDS_CONFIG.REFERRAL_REWARD,
      stats: {
        totalReferrals: Number(statsResult.rows[0].total_referrals),
        convertedReferrals: Number(statsResult.rows[0].converted_referrals),
        totalRewardsEarned: Number(statsResult.rows[0].total_rewards_earned),
      },
    });
  } catch (error: any) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
}));

/**
 * POST /rewards/apply-referral
 * Apply a referral code (for new users)
 */
router.post('/apply-referral', wrapHandler(async (req: any, res) => {
  const customerId = req.user?.customer?.id;
  const { referralCode } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!referralCode) {
    return res.status(400).json({ error: 'Referral code is required' });
  }

  initServices(req.scope);

  try {
    // Check if user already used a referral code
    const existingResult = await db.query(`
      SELECT id FROM bigcompany.referral_tracking WHERE referred_id = $1
    `, [customerId]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    // Find referrer
    const referrerResult = await db.query(`
      SELECT user_id FROM bigcompany.user_referrals WHERE referral_code = $1
    `, [referralCode.toUpperCase()]);

    if (referrerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrerId = referrerResult.rows[0].user_id;

    // Can't refer yourself
    if (referrerId === customerId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record referral
      await client.query(`
        INSERT INTO bigcompany.referral_tracking
        (referrer_id, referred_id, referral_code, is_converted, reward_paid)
        VALUES ($1, $2, $3, true, $4)
      `, [referrerId, customerId, referralCode.toUpperCase(), REWARDS_CONFIG.REFERRAL_REWARD]);

      // Award referrer
      const referrerRef = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO bigcompany.rewards_ledger
        (user_id, type, source, points, description, transaction_ref, status)
        VALUES ($1, 'earned', 'referral', $2, $3, $4, 'credited')
      `, [
        referrerId,
        REWARDS_CONFIG.REFERRAL_REWARD,
        `Referral bonus for inviting new customer`,
        referrerRef,
      ]);

      // Award new user (signup bonus)
      const signupRef = `SIGNUP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO bigcompany.rewards_ledger
        (user_id, type, source, points, description, transaction_ref, status)
        VALUES ($1, 'earned', 'bonus', $2, $3, $4, 'credited')
      `, [
        customerId,
        REWARDS_CONFIG.SIGNUP_BONUS,
        `Welcome bonus for joining via referral`,
        signupRef,
      ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Referral code applied! You received ${REWARDS_CONFIG.SIGNUP_BONUS} bonus points.`,
        bonusAwarded: REWARDS_CONFIG.SIGNUP_BONUS,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error applying referral:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
}));

/**
 * GET /rewards/leaderboard
 * Get rewards leaderboard
 */
router.get('/leaderboard', wrapHandler(async (req: any, res) => {
  const { period = 'month', limit = 10 } = req.query;

  try {
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '365 days'";
    }

    const result = await db.query(`
      SELECT
        r.user_id,
        c.first_name,
        c.last_name,
        SUM(CASE WHEN r.type = 'earned' THEN r.points ELSE 0 END) as total_earned
      FROM bigcompany.rewards_ledger r
      JOIN customer c ON r.user_id = c.id
      WHERE r.type = 'earned' ${dateFilter}
      GROUP BY r.user_id, c.first_name, c.last_name
      ORDER BY total_earned DESC
      LIMIT $1
    `, [Number(limit)]);

    res.json({
      success: true,
      period,
      leaderboard: result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Anonymous',
        totalEarned: Number(row.total_earned),
        tier: determineTier(Number(row.total_earned)).name,
      })),
    });
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
}));

// ==================== GAS REWARDS PROCESSING ====================

/**
 * POST /rewards/process-gas-purchase
 * Process rewards for a gas purchase (called by gas service)
 */
router.post('/process-gas-purchase', wrapHandler(async (req: any, res) => {
  const { userId, transactionRef, amount, units, meterNumber } = req.body;

  // This endpoint should be called internally by the gas service
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!userId || !transactionRef || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Calculate profit and rewards
    // Profit = selling price - cost price
    const profit = Number(units) * REWARDS_CONFIG.PROFIT_PER_UNIT;

    // Check if profit meets minimum threshold
    if (profit < REWARDS_CONFIG.MIN_PROFIT_FOR_REWARD) {
      return res.json({
        success: true,
        rewardsAwarded: 0,
        reason: `Profit (${profit} RWF) below minimum threshold (${REWARDS_CONFIG.MIN_PROFIT_FOR_REWARD} RWF)`,
      });
    }

    // Get user's tier for multiplier
    const balanceResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance
      FROM bigcompany.rewards_ledger
      WHERE user_id = $1
    `, [userId]);

    const currentBalance = Number(balanceResult.rows[0].balance);
    const tier = determineTier(currentBalance);

    // Calculate rewards: 12% of profit * tier multiplier
    const baseReward = Math.floor(profit * REWARDS_CONFIG.GAS_REWARD_PERCENTAGE);
    const finalReward = Math.floor(baseReward * tier.multiplier);

    // Check for duplicate
    const existingResult = await db.query(`
      SELECT id FROM bigcompany.rewards_ledger
      WHERE user_id = $1 AND transaction_ref = $2
    `, [userId, transactionRef]);

    if (existingResult.rows.length > 0) {
      return res.json({
        success: true,
        rewardsAwarded: 0,
        reason: 'Rewards already processed for this transaction',
      });
    }

    // Award rewards
    await db.query(`
      INSERT INTO bigcompany.rewards_ledger
      (user_id, type, source, points, description, transaction_ref, status, metadata)
      VALUES ($1, 'earned', 'gas_purchase', $2, $3, $4, 'credited', $5)
    `, [
      userId,
      finalReward,
      `Gas rewards for ${units} units (${amount} RWF)`,
      transactionRef,
      JSON.stringify({
        meterNumber,
        amount,
        units,
        profit,
        baseReward,
        tierMultiplier: tier.multiplier,
        tierName: tier.name,
      }),
    ]);

    res.json({
      success: true,
      rewardsAwarded: finalReward,
      breakdown: {
        profit,
        baseReward,
        tierMultiplier: tier.multiplier,
        tierName: tier.name,
        finalReward,
      },
    });
  } catch (error: any) {
    console.error('Error processing gas rewards:', error);
    res.status(500).json({ error: 'Failed to process rewards' });
  }
}));

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /rewards/admin/stats
 * Get rewards program statistics (admin only)
 */
router.get('/admin/stats', wrapHandler(async (req: any, res) => {
  // Admin authentication check
  const adminId = req.user?.id;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    // Overall stats
    const overallResult = await db.query(`
      SELECT
        COUNT(DISTINCT user_id) as total_users,
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed,
        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as total_expired
      FROM bigcompany.rewards_ledger
    `);

    // By source breakdown
    const sourceResult = await db.query(`
      SELECT
        source,
        COUNT(*) as transaction_count,
        SUM(points) as total_points
      FROM bigcompany.rewards_ledger
      WHERE type = 'earned'
      GROUP BY source
    `);

    // Tier distribution
    const tierResult = await db.query(`
      WITH user_balances AS (
        SELECT
          user_id,
          COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance
        FROM bigcompany.rewards_ledger
        GROUP BY user_id
      )
      SELECT
        CASE
          WHEN balance >= 15000 THEN 'Platinum'
          WHEN balance >= 5000 THEN 'Gold'
          WHEN balance >= 1000 THEN 'Silver'
          ELSE 'Bronze'
        END as tier,
        COUNT(*) as user_count
      FROM user_balances
      GROUP BY tier
      ORDER BY user_count DESC
    `);

    // Recent activity (last 30 days)
    const recentResult = await db.query(`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as earned,
        SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as redeemed
      FROM bigcompany.rewards_ledger
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Referral stats
    const referralResult = await db.query(`
      SELECT
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN is_converted THEN 1 END) as converted,
        COALESCE(SUM(reward_paid), 0) as total_paid
      FROM bigcompany.referral_tracking
    `);

    const overall = overallResult.rows[0];
    const outstandingLiability = Number(overall.total_earned) - Number(overall.total_redeemed) - Number(overall.total_expired);

    res.json({
      success: true,
      stats: {
        overall: {
          totalUsers: Number(overall.total_users),
          totalEarned: Number(overall.total_earned),
          totalRedeemed: Number(overall.total_redeemed),
          totalExpired: Number(overall.total_expired),
          outstandingLiability,
          outstandingLiabilityRwf: outstandingLiability, // 1 point = 1 RWF
        },
        bySource: sourceResult.rows.map(row => ({
          source: row.source,
          transactionCount: Number(row.transaction_count),
          totalPoints: Number(row.total_points),
        })),
        tierDistribution: tierResult.rows.map(row => ({
          tier: row.tier,
          userCount: Number(row.user_count),
        })),
        dailyActivity: recentResult.rows.map(row => ({
          date: row.date,
          earned: Number(row.earned),
          redeemed: Number(row.redeemed),
        })),
        referrals: {
          total: Number(referralResult.rows[0].total_referrals),
          converted: Number(referralResult.rows[0].converted),
          totalPaid: Number(referralResult.rows[0].total_paid),
          conversionRate: referralResult.rows[0].total_referrals > 0
            ? (Number(referralResult.rows[0].converted) / Number(referralResult.rows[0].total_referrals) * 100).toFixed(1)
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
}));

/**
 * POST /rewards/admin/award
 * Manually award bonus points to a user (admin only)
 */
router.post('/admin/award', wrapHandler(async (req: any, res) => {
  const adminId = req.user?.id;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { userId, points, reason } = req.body;

  if (!userId || !points || points <= 0) {
    return res.status(400).json({ error: 'Valid userId and points are required' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required for manual awards' });
  }

  initServices(req.scope);

  try {
    // Verify user exists
    const userResult = await db.query(
      "SELECT id, phone, metadata FROM customer WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bonusRef = `BONUS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    await db.query(`
      INSERT INTO bigcompany.rewards_ledger
      (user_id, type, source, points, description, transaction_ref, status, metadata)
      VALUES ($1, 'earned', 'bonus', $2, $3, $4, 'credited', $5)
    `, [
      userId,
      points,
      reason,
      bonusRef,
      JSON.stringify({ awardedBy: adminId, reason }),
    ]);

    // Send SMS notification
    const phone = userResult.rows[0]?.phone || userResult.rows[0]?.metadata?.phone;
    if (phone) {
      await smsService.send({
        to: phone,
        message: `BIG: You received ${points} bonus reward points! Reason: ${reason}. Check your rewards balance in the app.`,
      });
    }

    // Log admin action
    await db.query(`
      INSERT INTO bigcompany.audit_logs
      (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'manual_reward_award', 'rewards', $2, $3)
    `, [adminId, bonusRef, JSON.stringify({ userId, points, reason })]);

    res.json({
      success: true,
      message: `Awarded ${points} points to user`,
      reference: bonusRef,
    });
  } catch (error: any) {
    console.error('Error awarding bonus:', error);
    res.status(500).json({ error: 'Failed to award bonus' });
  }
}));

/**
 * POST /rewards/admin/expire
 * Expire old unclaimed rewards (admin/cron job)
 */
router.post('/admin/expire', wrapHandler(async (req: any, res) => {
  const apiKey = req.headers['x-internal-api-key'] || req.headers['x-cron-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY && apiKey !== process.env.CRON_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { expiryDays = 365 } = req.body;

  try {
    // Find rewards older than expiry period that haven't been redeemed
    const result = await db.query(`
      WITH user_earned AS (
        SELECT
          user_id,
          SUM(points) as total_earned,
          MIN(created_at) as oldest_transaction
        FROM bigcompany.rewards_ledger
        WHERE type = 'earned' AND status = 'credited'
        AND created_at < NOW() - INTERVAL '1 day' * $1
        GROUP BY user_id
      ),
      user_used AS (
        SELECT
          user_id,
          SUM(points) as total_used
        FROM bigcompany.rewards_ledger
        WHERE type IN ('redeemed', 'expired')
        GROUP BY user_id
      )
      SELECT
        e.user_id,
        e.total_earned,
        COALESCE(u.total_used, 0) as total_used,
        e.total_earned - COALESCE(u.total_used, 0) as to_expire
      FROM user_earned e
      LEFT JOIN user_used u ON e.user_id = u.user_id
      WHERE e.total_earned > COALESCE(u.total_used, 0)
    `, [expiryDays]);

    let totalExpired = 0;
    let usersAffected = 0;

    for (const row of result.rows) {
      if (row.to_expire > 0) {
        await db.query(`
          INSERT INTO bigcompany.rewards_ledger
          (user_id, type, source, points, description, transaction_ref, status)
          VALUES ($1, 'expired', 'system', $2, $3, $4, 'processed')
        `, [
          row.user_id,
          row.to_expire,
          `Points expired after ${expiryDays} days`,
          `EXPIRE-${Date.now()}-${row.user_id.substring(0, 8)}`,
        ]);

        totalExpired += Number(row.to_expire);
        usersAffected++;
      }
    }

    res.json({
      success: true,
      expired: {
        totalPoints: totalExpired,
        usersAffected,
        expiryPeriodDays: expiryDays,
      },
    });
  } catch (error: any) {
    console.error('Error expiring rewards:', error);
    res.status(500).json({ error: 'Failed to expire rewards' });
  }
}));

// ==================== HELPER FUNCTIONS ====================

function determineTier(points: number): { name: string; multiplier: number; minPoints: number } {
  const tiers = REWARDS_CONFIG.LOYALTY_TIERS;

  if (points >= tiers.PLATINUM.minPoints) {
    return tiers.PLATINUM;
  } else if (points >= tiers.GOLD.minPoints) {
    return tiers.GOLD;
  } else if (points >= tiers.SILVER.minPoints) {
    return tiers.SILVER;
  }
  return tiers.BRONZE;
}

function getNextTier(points: number): string | null {
  const tiers = REWARDS_CONFIG.LOYALTY_TIERS;

  if (points >= tiers.PLATINUM.minPoints) {
    return null; // Already at highest tier
  } else if (points >= tiers.GOLD.minPoints) {
    return 'Platinum';
  } else if (points >= tiers.SILVER.minPoints) {
    return 'Gold';
  }
  return 'Silver';
}

function getPointsToNextTier(points: number): number | null {
  const tiers = REWARDS_CONFIG.LOYALTY_TIERS;

  if (points >= tiers.PLATINUM.minPoints) {
    return null; // Already at highest tier
  } else if (points >= tiers.GOLD.minPoints) {
    return tiers.PLATINUM.minPoints - points;
  } else if (points >= tiers.SILVER.minPoints) {
    return tiers.GOLD.minPoints - points;
  }
  return tiers.SILVER.minPoints - points;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
  let code = 'BIG';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default router;
