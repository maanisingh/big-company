import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';

const router = Router();

/**
 * Get available loan products
 * GET /store/loans/products
 */
router.get('/products', wrapHandler(async (req, res) => {
  try {
    const manager = req.scope.resolve('manager');
    const products = await manager.query(`
      SELECT * FROM bigcompany.loan_products
      WHERE is_active = true
      ORDER BY min_amount ASC
    `);

    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get customer's loans
 * GET /store/loans
 */
router.get('/', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');
    const loans = await manager.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1
      ORDER BY l.created_at DESC
    `, [customerId]);

    res.json({ loans });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Apply for a loan
 * POST /store/loans/apply
 */
router.post('/apply', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { loan_product_id, amount } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');

    // Get loan product
    const products = await manager.query(`
      SELECT * FROM bigcompany.loan_products WHERE id = $1 AND is_active = true
    `, [loan_product_id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Loan product not found' });
    }

    const product = products[0];

    // Validate amount
    if (amount < product.min_amount || amount > product.max_amount) {
      return res.status(400).json({
        error: 'Invalid loan amount',
        min_amount: product.min_amount,
        max_amount: product.max_amount,
      });
    }

    // Check for existing active loans
    const existingLoans = await manager.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')
    `, [customerId]);

    if (existingLoans.length > 0) {
      return res.status(400).json({
        error: 'You already have an active loan. Please repay it before applying for a new one.',
        existing_loan: existingLoans[0],
      });
    }

    // Generate loan number
    const loanNumber = `LN-${Date.now().toString(36).toUpperCase()}`;

    // Calculate total repayment (for food loans, interest is 0)
    const totalRepayment = amount * (1 + product.interest_rate);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + product.term_days);

    // Create loan
    const result = await manager.query(`
      INSERT INTO bigcompany.loans (
        loan_number, borrower_id, loan_product_id, principal,
        interest_rate, total_repayment, outstanding_balance,
        currency, status, due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', 'pending', $8)
      RETURNING *
    `, [
      loanNumber,
      customerId,
      loan_product_id,
      amount,
      product.interest_rate,
      totalRepayment,
      totalRepayment, // Outstanding = total at start
      dueDate.toISOString().split('T')[0],
    ]);

    res.json({
      success: true,
      message: 'Loan application submitted successfully. Awaiting approval.',
      loan: {
        ...result[0],
        product_name: product.name,
        loan_type: product.loan_type,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get loan details
 * GET /store/loans/:id
 */
router.get('/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const loanId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');

    const loans = await manager.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.id = $1 AND l.borrower_id = $2
    `, [loanId, customerId]);

    if (loans.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Get repayment history
    const repayments = await manager.query(`
      SELECT * FROM bigcompany.loan_repayments
      WHERE loan_id = $1
      ORDER BY paid_at DESC
    `, [loanId]);

    res.json({
      loan: loans[0],
      repayments,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Make loan repayment
 * POST /store/loans/:id/repay
 */
router.post('/:id/repay', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const customerId = req.user?.customer_id;
  const loanId = req.params.id;
  const { amount, payment_method } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');

    // Get loan
    const loans = await manager.query(`
      SELECT * FROM bigcompany.loans
      WHERE id = $1 AND borrower_id = $2 AND status IN ('disbursed', 'active')
    `, [loanId, customerId]);

    if (loans.length === 0) {
      return res.status(404).json({ error: 'Active loan not found' });
    }

    const loan = loans[0];

    // Validate amount
    if (amount <= 0 || amount > loan.outstanding_balance) {
      return res.status(400).json({
        error: 'Invalid repayment amount',
        outstanding_balance: loan.outstanding_balance,
      });
    }

    // Check wallet balance if paying from wallet
    if (payment_method === 'wallet') {
      const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');
      if (balance < amount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          balance,
          required: amount,
        });
      }
    }

    // Process repayment
    const newOutstanding = loan.outstanding_balance - amount;
    const newStatus = newOutstanding <= 0 ? 'paid' : 'active';

    // Update loan
    await manager.query(`
      UPDATE bigcompany.loans
      SET outstanding_balance = $1, status = $2, updated_at = NOW()
      WHERE id = $3
    `, [newOutstanding, newStatus, loanId]);

    // Record repayment
    const repaymentResult = await manager.query(`
      INSERT INTO bigcompany.loan_repayments (loan_id, amount, payment_method)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [loanId, amount, payment_method]);

    // TODO: Deduct from wallet if payment_method === 'wallet'

    res.json({
      success: true,
      message: newStatus === 'paid'
        ? 'Loan fully repaid! Thank you.'
        : `Repayment of ${amount.toLocaleString()} RWF recorded.`,
      repayment: repaymentResult[0],
      new_outstanding: newOutstanding,
      loan_status: newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

export default router;
