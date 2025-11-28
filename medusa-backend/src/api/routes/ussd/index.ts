import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import BlnkService from '../../../services/blnk';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';
import GasService from '../../../services/gas';
import SMSService from '../../../services/sms';

const router = Router();

interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

interface USSDSession {
  state: string;
  data: Record<string, any>;
  userId?: string;
  phone?: string;
}

// Redis-backed session store for production, in-memory for dev
const sessions: Map<string, USSDSession> = new Map();

// Database pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Service instances
let blnkService: BlnkService;
let momoService: MTNMoMoService;
let airtelService: AirtelMoneyService;
let gasService: GasService;
let smsService: SMSService;

// Initialize services
function initServices(container?: any) {
  if (!blnkService) {
    blnkService = new BlnkService(container);
    momoService = new MTNMoMoService();
    airtelService = new AirtelMoneyService();
    gasService = new GasService();
    smsService = new SMSService();
  }
}

// Phone number helpers
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('250') && cleaned.length === 9) {
    cleaned = '250' + cleaned;
  }
  return cleaned;
}

function isMTNNumber(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  const prefix = cleaned.substring(3, 5);
  return ['78', '79'].includes(prefix);
}

function isAirtelNumber(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  const prefix = cleaned.substring(3, 5);
  return ['72', '73'].includes(prefix);
}

// Predefined amounts
const AMOUNTS: Record<string, number> = {
  '1': 300, '2': 500, '3': 1000,
  '4': 2000, '5': 5000, '6': 10000
};

/**
 * USSD Callback Handler - Africa's Talking
 * POST /ussd/callback
 *
 * Service Code: *939# (configured in Africa's Talking dashboard)
 */
router.post('/callback', wrapHandler(async (req, res) => {
  initServices(req.scope);

  const { sessionId, serviceCode, phoneNumber, text, networkCode } = req.body as USSDRequest;
  const normalizedPhone = normalizePhone(phoneNumber);

  // Get or create session
  let session = sessions.get(sessionId) || {
    state: 'main_menu',
    data: {},
    phone: normalizedPhone
  };

  // Parse user input
  const inputs = text.split('*').filter(i => i !== '');
  const lastInput = inputs.length > 0 ? inputs[inputs.length - 1] : '';

  let response = '';

  try {
    // Find user by phone number
    const userResult = await db.query(`
      SELECT c.id as customer_id, c.email, c.phone, c.first_name, c.last_name,
             c.metadata
      FROM customer c
      WHERE c.phone = $1 OR c.phone = $2 OR c.phone = $3
    `, [phoneNumber, normalizedPhone, '+' + normalizedPhone]);

    const user = userResult.rows[0];
    session.userId = user?.customer_id;

    // Log session start
    await logSession(sessionId, normalizedPhone, serviceCode, session.state, lastInput);

    // State machine
    response = await handleUSSDState(session, lastInput, user, normalizedPhone, serviceCode, networkCode);

    // Save session
    sessions.set(sessionId, session);

    // Clear session if response ends
    if (response.startsWith('END')) {
      sessions.delete(sessionId);
      await db.query(`
        UPDATE bigcompany.ussd_sessions SET ended_at = NOW() WHERE session_id = $1
      `, [sessionId]);
    }

    // Send response with correct content type for Africa's Talking
    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (error: any) {
    console.error('USSD Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send(`END Habyanze. Ongera ugerageze.\nError occurred. Please try again.`);
  }
}));

/**
 * USSD State Machine Handler
 */
async function handleUSSDState(
  session: USSDSession,
  input: string,
  user: any,
  phone: string,
  serviceCode: string,
  networkCode?: string
): Promise<string> {

  switch (session.state) {
    // ==================== MAIN MENU ====================
    case 'main_menu':
      if (input === '') {
        return `CON Murakaza neza kuri BIG Company
Welcome to BIG Company *939#

1. Reba Balance (Check Balance)
2. Uzuza Wallet (Top Up Wallet)
3. Gura Gaz (Buy Gas)
4. Reba Inguzanyo (Check Loan)
5. Kwishyura Inguzanyo (Pay Loan)
6. NFC Card
7. Konti Yanjye (My Account)`;
      }
      session.state = 'main_menu_selection';
      return handleUSSDState(session, input, user, phone, serviceCode, networkCode);

    case 'main_menu_selection':
      switch (input) {
        case '1': // Check Balance
          return await handleCheckBalance(session, user, phone);
        case '2': // Top Up Wallet
          return handleTopUpMenu(session, user, phone);
        case '3': // Buy Gas
          return handleGasMenu(session, user, phone);
        case '4': // Check Loan
          return await handleCheckLoan(session, user, phone);
        case '5': // Pay Loan
          return await handlePayLoanMenu(session, user, phone);
        case '6': // NFC Card
          return handleNFCMenu(session, user, phone);
        case '7': // My Account
          return await handleMyAccount(session, user, phone);
        default:
          return `END Hitamo nabi.\nInvalid selection. Dial ${serviceCode} to try again.`;
      }

    // ==================== CHECK BALANCE ====================
    case 'check_balance':
      return await handleCheckBalance(session, user, phone);

    // ==================== TOP UP WALLET ====================
    case 'topup_amount':
      const topupAmount = AMOUNTS[input];
      if (!topupAmount) {
        return `END Hitamo nabi.\nInvalid selection. Dial ${serviceCode}`;
      }
      session.data.topup_amount = topupAmount;
      session.state = 'topup_confirm';
      const isMTN = isMTNNumber(phone);
      return `CON Uzuza: ${topupAmount.toLocaleString()} RWF
Top up: ${topupAmount.toLocaleString()} RWF
Hakoreshejwe: ${isMTN ? 'MTN MoMo' : 'Airtel Money'}
Via: ${isMTN ? 'MTN MoMo' : 'Airtel Money'}

1. Emeza (Confirm)
0. Gusubira Inyuma (Back)`;

    case 'topup_confirm':
      if (input === '1') {
        return await processTopUp(session, user, phone);
      } else if (input === '0') {
        session.state = 'main_menu';
        return handleUSSDState(session, '', user, phone, serviceCode, networkCode);
      }
      return `END Hitamo nabi. Invalid selection.`;

    // ==================== BUY GAS ====================
    case 'gas_meter_select':
      if (input === '1' && session.data.default_meter) {
        session.data.meter_number = session.data.default_meter;
        session.state = 'gas_amount';
        return getGasAmountMenu(session.data.meter_number);
      } else if (input === '2' || !session.data.default_meter) {
        session.state = 'gas_meter_input';
        return `CON Andika nimero ya gaz meter:
Enter gas meter number:`;
      }
      return `END Hitamo nabi. Invalid selection.`;

    case 'gas_meter_input':
      const meterNumber = input.replace(/\D/g, '');
      if (meterNumber.length < 11) {
        return `END Nimero ya meter si yo.\nInvalid meter number.`;
      }
      // Validate meter
      const meterInfo = await gasService.validateMeter(meterNumber);
      if (!meterInfo) {
        return `END Meter ntiboneka.\nMeter not found.`;
      }
      session.data.meter_number = meterNumber;
      session.data.meter_info = meterInfo;
      session.state = 'gas_amount';
      return getGasAmountMenu(meterNumber, meterInfo.customerName);

    case 'gas_amount':
      const gasAmount = AMOUNTS[input];
      if (!gasAmount) {
        return `END Hitamo nabi. Invalid selection.`;
      }
      session.data.gas_amount = gasAmount;
      session.state = 'gas_payment_method';
      return `CON Gura gaz: ${gasAmount.toLocaleString()} RWF
Buy gas: ${gasAmount.toLocaleString()} RWF
Meter: ${session.data.meter_number}

1. Kwishyura kuri Wallet (Pay from Wallet)
2. MTN MoMo
3. Airtel Money`;

    case 'gas_payment_method':
      const paymentMethod = input === '1' ? 'wallet' : input === '2' ? 'mtn_momo' : input === '3' ? 'airtel_money' : null;
      if (!paymentMethod) {
        return `END Hitamo nabi. Invalid selection.`;
      }
      session.data.payment_method = paymentMethod;
      return await processGasPurchase(session, user, phone);

    // ==================== PAY LOAN ====================
    case 'pay_loan_amount':
      const repayAmount = AMOUNTS[input];
      if (!repayAmount) {
        return `END Hitamo nabi. Invalid amount.`;
      }
      if (repayAmount > session.data.outstanding) {
        return `END Ubu bwishyu ni bwinshi.\nAmount exceeds outstanding: ${session.data.outstanding.toLocaleString()} RWF`;
      }
      session.data.repay_amount = repayAmount;
      session.state = 'pay_loan_confirm';
      return `CON Kwishyura inguzanyo
Pay loan: ${repayAmount.toLocaleString()} RWF
${isMTNNumber(phone) ? 'Via MTN MoMo' : 'Via Airtel Money'}

1. Emeza (Confirm)
0. Gusubira (Back)`;

    case 'pay_loan_confirm':
      if (input === '1') {
        return await processLoanRepayment(session, user, phone);
      }
      session.state = 'main_menu';
      return handleUSSDState(session, '', user, phone, serviceCode, networkCode);

    // ==================== NFC CARD ====================
    case 'nfc_menu':
      switch (input) {
        case '1': // Check balance
          return await handleCheckBalance(session, user, phone);
        case '2': // Block card
          return await handleBlockCard(session, user);
        case '3': // Unblock card
          return await handleUnblockCard(session, user);
        default:
          return `END Hitamo nabi. Invalid selection.`;
      }

    default:
      session.state = 'main_menu';
      return handleUSSDState(session, '', user, phone, serviceCode, networkCode);
  }
}

// ==================== HANDLER FUNCTIONS ====================

async function handleCheckBalance(session: USSDSession, user: any, phone: string): Promise<string> {
  if (!user) {
    return `END Ntimwanditse kuri BIG Company.
You are not registered.
Iyandikishe kuri bigcompany.rw
Register at bigcompany.rw`;
  }

  try {
    const walletBalance = await blnkService.getCustomerBalance(user.customer_id, 'customer_wallets');

    // Get food loan credit
    const loanResult = await db.query(`
      SELECT outstanding_balance FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')
    `, [user.customer_id]);

    const loanCredit = loanResult.rows[0]?.outstanding_balance || 0;
    const totalAvailable = walletBalance + loanCredit;

    return `END Balance yawe / Your Balance:
Wallet: ${walletBalance.toLocaleString()} RWF
Food Credit: ${loanCredit.toLocaleString()} RWF
━━━━━━━━━━━━━
Byose: ${totalAvailable.toLocaleString()} RWF
Total: ${totalAvailable.toLocaleString()} RWF`;
  } catch (error) {
    console.error('Balance check error:', error);
    return `END Habyanze kureba balance.\nFailed to check balance.`;
  }
}

function handleTopUpMenu(session: USSDSession, user: any, phone: string): string {
  if (!user) {
    return `END Ntimwanditse. Iyandikishe kuri bigcompany.rw
Not registered. Sign up at bigcompany.rw`;
  }

  session.state = 'topup_amount';
  return `CON Hitamo amafaranga yo kuzuza:
Select top-up amount:

1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`;
}

function handleGasMenu(session: USSDSession, user: any, phone: string): string {
  if (!user) {
    return `END Ntimwanditse. Iyandikishe kuri bigcompany.rw
Not registered. Sign up at bigcompany.rw`;
  }

  session.state = 'gas_meter_select';

  // Check for default meter
  // In a real implementation, fetch from database
  session.data.default_meter = null;

  return `CON Gura Gaz / Buy Gas
Andika nimero ya meter:
Enter meter number:`;
}

function getGasAmountMenu(meterNumber: string, customerName?: string): string {
  return `CON Meter: ${meterNumber}
${customerName ? `Izina: ${customerName}` : ''}

Hitamo amafaranga:
Select amount:

1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`;
}

async function handleCheckLoan(session: USSDSession, user: any, phone: string): Promise<string> {
  if (!user) {
    return `END Ntimwanditse. Not registered.`;
  }

  try {
    const loanResult = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1 AND l.status IN ('active', 'disbursed', 'pending')
      ORDER BY l.created_at DESC LIMIT 1
    `, [user.customer_id]);

    if (loanResult.rows.length === 0) {
      return `END Nta nguzanyo ufite.
You have no active loans.
Saba kuri bigcompany.rw
Apply at bigcompany.rw`;
    }

    const loan = loanResult.rows[0];
    const dueDate = new Date(loan.due_date).toLocaleDateString('rw-RW');

    return `END Inguzanyo yawe / Your Loan:
━━━━━━━━━━━━━
#${loan.loan_number}
Ubwoko: ${loan.product_name}
Type: ${loan.loan_type}
━━━━━━━━━━━━━
Principal: ${Number(loan.principal).toLocaleString()} RWF
Hasigaye: ${Number(loan.outstanding_balance).toLocaleString()} RWF
Outstanding: ${Number(loan.outstanding_balance).toLocaleString()} RWF
━━━━━━━━━━━━━
Igihe: ${dueDate}
Due: ${dueDate}
Status: ${loan.status.toUpperCase()}`;
  } catch (error) {
    console.error('Loan check error:', error);
    return `END Habyanze. Failed to check loan.`;
  }
}

async function handlePayLoanMenu(session: USSDSession, user: any, phone: string): Promise<string> {
  if (!user) {
    return `END Ntimwanditse. Not registered.`;
  }

  try {
    const loanResult = await db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
      ORDER BY created_at DESC LIMIT 1
    `, [user.customer_id]);

    if (loanResult.rows.length === 0) {
      return `END Nta nguzanyo yo kwishyura.\nNo active loan to repay.`;
    }

    const loan = loanResult.rows[0];
    session.data.loan_id = loan.id;
    session.data.outstanding = Number(loan.outstanding_balance);
    session.state = 'pay_loan_amount';

    return `CON Kwishyura Inguzanyo
Pay Loan #${loan.loan_number}
Hasigaye: ${Number(loan.outstanding_balance).toLocaleString()} RWF

Hitamo amafaranga:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`;
  } catch (error) {
    return `END Habyanze. Error loading loan.`;
  }
}

function handleNFCMenu(session: USSDSession, user: any, phone: string): string {
  if (!user) {
    return `END Ntimwanditse. Not registered.`;
  }

  session.state = 'nfc_menu';
  return `CON NFC Card / Ikarita
1. Reba Balance (Check Balance)
2. Hagarika Ikarita (Block Card)
3. Fungura Ikarita (Unblock Card)`;
}

async function handleMyAccount(session: USSDSession, user: any, phone: string): Promise<string> {
  if (!user) {
    return `END Ntimwanditse kuri BIG Company.
Not registered.
Iyandikishe: bigcompany.rw`;
  }

  const name = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Customer';

  return `END Konti Yawe / Your Account
━━━━━━━━━━━━━
Izina: ${name}
Name: ${name}
Phone: ${phone}
Email: ${user.email || 'Not set'}
━━━━━━━━━━━━━
Genzura kuri bigcompany.rw
Manage at bigcompany.rw`;
}

async function handleBlockCard(session: USSDSession, user: any): Promise<string> {
  try {
    const result = await db.query(`
      UPDATE bigcompany.nfc_cards SET is_active = false
      WHERE user_id = $1 AND is_active = true
      RETURNING dashboard_id
    `, [user.customer_id]);

    if (result.rows.length === 0) {
      return `END Nta karita iboneka.\nNo active card found.`;
    }

    return `END Ikarita yawe yahagaritswe.
Your card ${result.rows[0].dashboard_id} has been blocked.
Fungura kuri bigcompany.rw cyangwa *939#`;
  } catch (error) {
    return `END Habyanze. Failed to block card.`;
  }
}

async function handleUnblockCard(session: USSDSession, user: any): Promise<string> {
  try {
    const result = await db.query(`
      UPDATE bigcompany.nfc_cards SET is_active = true
      WHERE user_id = $1 AND is_active = false
      RETURNING dashboard_id
    `, [user.customer_id]);

    if (result.rows.length === 0) {
      return `END Nta karita yahagaritswe.\nNo blocked card found.`;
    }

    return `END Ikarita yawe yafunguwe.
Your card ${result.rows[0].dashboard_id} has been unblocked.`;
  } catch (error) {
    return `END Habyanze. Failed to unblock card.`;
  }
}

// ==================== PAYMENT PROCESSORS ====================

async function processTopUp(session: USSDSession, user: any, phone: string): Promise<string> {
  const amount = session.data.topup_amount;
  const reference = `USSD-TOP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  try {
    let paymentResult;

    if (isMTNNumber(phone)) {
      // MTN MoMo Collection
      paymentResult = await momoService.requestPayment({
        amount: amount,
        currency: 'RWF',
        externalId: reference,
        payerPhone: phone,
        payerMessage: `BIG Wallet Top-up ${amount} RWF`,
      });
    } else if (isAirtelNumber(phone)) {
      // Airtel Money Collection
      paymentResult = await airtelService.requestPayment({
        amount: amount,
        phone: phone,
        reference: reference,
      });
    } else {
      return `END Nimero ya telefoni ntiyemerewe.\nPhone number not supported for mobile money.`;
    }

    if (paymentResult.success) {
      // Store pending top-up
      await db.query(`
        INSERT INTO bigcompany.wallet_topups
        (user_id, amount, currency, status, provider, provider_reference, phone)
        VALUES ($1, $2, 'RWF', 'pending', $3, $4, $5)
      `, [
        user?.customer_id,
        amount,
        isMTNNumber(phone) ? 'mtn_momo' : 'airtel_money',
        reference,
        phone
      ]);

      return `END Kwemeza kwishyura koherejwe kuri telefoni yawe.
Payment request sent to your phone.
━━━━━━━━━━━━━
Amafaranga: ${amount.toLocaleString()} RWF
Amount: ${amount.toLocaleString()} RWF
Ref: ${reference.substring(0, 15)}
━━━━━━━━━━━━━
Emeza kuri telefoni yawe.
Approve on your phone.`;
    } else {
      return `END Kwishyura byanze.
Payment request failed.
Ongera ugerageze.
Please try again.`;
    }
  } catch (error: any) {
    console.error('Top-up error:', error);
    return `END Habyanze. Payment failed. Try again.`;
  }
}

async function processGasPurchase(session: USSDSession, user: any, phone: string): Promise<string> {
  const { meter_number, gas_amount, payment_method } = session.data;
  const reference = `USSD-GAS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  try {
    if (payment_method === 'wallet') {
      // Check balance
      if (!user) {
        return `END Ntimwanditse. Not registered.`;
      }

      const balance = await blnkService.getCustomerBalance(user.customer_id, 'customer_wallets');

      // Also check food loan credit
      const loanResult = await db.query(`
        SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans
        WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
        AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')
      `, [user.customer_id]);

      const foodCredit = Number(loanResult.rows[0]?.credit || 0);
      const totalAvailable = balance + foodCredit;

      if (totalAvailable < gas_amount) {
        return `END Amafaranga ntahagije.
Insufficient balance.
Ufite: ${totalAvailable.toLocaleString()} RWF
Available: ${totalAvailable.toLocaleString()} RWF
Ukeneye: ${gas_amount.toLocaleString()} RWF
Required: ${gas_amount.toLocaleString()} RWF`;
      }

      // Process gas purchase
      const result = await gasService.purchaseUnits({
        meterNumber: meter_number,
        amount: gas_amount,
        customerId: user.customer_id,
        phone: phone,
      });

      if (result.success) {
        // Send SMS with token
        await smsService.send({
          to: phone,
          message: `BIG Gas: Meter ${meter_number}\nToken: ${result.token}\nUnits: ${result.units}\nRef: ${result.transactionId}`,
        });

        return `END Gura gaz byagenze neza!
Gas purchase successful!
━━━━━━━━━━━━━
Meter: ${meter_number}
Units: ${result.units}
Token: ${result.token}
━━━━━━━━━━━━━
Token yoherejwe kuri SMS.
Token sent via SMS.`;
      } else {
        return `END Gura gaz byanze.
Gas purchase failed: ${result.error}`;
      }
    } else {
      // Mobile money payment
      let paymentResult;

      if (payment_method === 'mtn_momo') {
        paymentResult = await momoService.requestPayment({
          amount: gas_amount,
          currency: 'RWF',
          externalId: reference,
          payerPhone: phone,
          payerMessage: `BIG Gas ${meter_number} - ${gas_amount} RWF`,
        });
      } else {
        paymentResult = await airtelService.requestPayment({
          amount: gas_amount,
          phone: phone,
          reference: reference,
        });
      }

      if (paymentResult.success) {
        // Store pending gas purchase for webhook completion
        await db.query(`
          INSERT INTO bigcompany.utility_topups
          (user_id, amount, currency, status, provider_reference, metadata)
          VALUES ($1, $2, 'RWF', 'pending', $3, $4)
        `, [
          user?.customer_id,
          gas_amount,
          reference,
          JSON.stringify({
            meter_number,
            phone,
            payment_method,
            source: 'ussd',
          })
        ]);

        return `END Kwishyura gaz koherejwe.
Gas payment request sent.
━━━━━━━━━━━━━
Meter: ${meter_number}
Amafaranga: ${gas_amount.toLocaleString()} RWF
Ref: ${reference.substring(0, 15)}
━━━━━━━━━━━━━
Emeza kuri telefoni.
Approve on your phone.
Token izohererezwa kuri SMS.
Token will be sent via SMS.`;
      } else {
        return `END Kwishyura byanze.\nPayment request failed.`;
      }
    }
  } catch (error: any) {
    console.error('Gas purchase error:', error);
    return `END Habyanze. Gas purchase failed.`;
  }
}

async function processLoanRepayment(session: USSDSession, user: any, phone: string): Promise<string> {
  const { loan_id, repay_amount } = session.data;
  const reference = `USSD-LOAN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  try {
    let paymentResult;

    if (isMTNNumber(phone)) {
      paymentResult = await momoService.requestPayment({
        amount: repay_amount,
        currency: 'RWF',
        externalId: reference,
        payerPhone: phone,
        payerMessage: `BIG Loan Repayment ${repay_amount} RWF`,
      });
    } else {
      paymentResult = await airtelService.requestPayment({
        amount: repay_amount,
        phone: phone,
        reference: reference,
      });
    }

    if (paymentResult.success) {
      // Store pending repayment
      await db.query(`
        INSERT INTO bigcompany.loan_repayments
        (loan_id, amount, payment_method, status, reference)
        VALUES ($1, $2, $3, 'pending', $4)
      `, [loan_id, repay_amount, isMTNNumber(phone) ? 'mtn_momo' : 'airtel_money', reference]);

      return `END Kwishyura inguzanyo koherejwe.
Loan payment request sent.
━━━━━━━━━━━━━
Amafaranga: ${repay_amount.toLocaleString()} RWF
Ref: ${reference.substring(0, 15)}
━━━━━━━━━━━━━
Emeza kuri telefoni yawe.
Approve on your phone.`;
    } else {
      return `END Kwishyura byanze.\nPayment failed. Try again.`;
    }
  } catch (error) {
    console.error('Loan repayment error:', error);
    return `END Habyanze. Repayment failed.`;
  }
}

// ==================== HELPER FUNCTIONS ====================

async function logSession(
  sessionId: string,
  phone: string,
  serviceCode: string,
  state: string,
  input: string
): Promise<void> {
  try {
    await db.query(`
      INSERT INTO bigcompany.ussd_sessions
      (session_id, phone_number, service_code, current_state, last_input)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (session_id) DO UPDATE SET
        current_state = $4, last_input = $5, updated_at = NOW()
    `, [sessionId, phone, serviceCode, state, input]);
  } catch (error) {
    console.error('Session log error:', error);
  }
}

/**
 * Africa's Talking Delivery Report Webhook
 * POST /ussd/delivery
 */
router.post('/delivery', wrapHandler(async (req, res) => {
  const { id, status, phoneNumber, networkCode } = req.body;

  console.log('USSD Delivery Report:', { id, status, phoneNumber, networkCode });

  // Log delivery report
  await db.query(`
    INSERT INTO bigcompany.ussd_delivery_reports
    (session_id, status, phone_number, network_code)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT DO NOTHING
  `, [id, status, phoneNumber, networkCode]);

  res.status(200).send('OK');
}));

export default router;
