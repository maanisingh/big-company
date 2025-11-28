import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';

const router = Router();

interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

interface USSDSession {
  state: string;
  data: Record<string, any>;
}

// In-memory session store (use Redis in production)
const sessions: Map<string, USSDSession> = new Map();

/**
 * USSD Menu Handler
 * POST /ussd/callback
 *
 * Africa's Talking sends USSD requests here
 */
router.post('/callback', wrapHandler(async (req, res) => {
  const manager = req.scope.resolve('manager');
  const blnkService = req.scope.resolve('blnkService');

  const { sessionId, serviceCode, phoneNumber, text } = req.body as USSDRequest;

  // Get or create session
  let session = sessions.get(sessionId) || { state: 'main_menu', data: {} };

  // Parse user input
  const inputs = text.split('*');
  const lastInput = inputs[inputs.length - 1];

  let response = '';

  try {
    // Find user by phone number
    const users = await manager.query(`
      SELECT c.id as customer_id, c.email, c.phone
      FROM customer c
      WHERE c.phone = $1 OR c.phone = $2
    `, [phoneNumber, phoneNumber.replace('+', '')]);

    const user = users[0];

    // Build USSD response based on state
    switch (session.state) {
      case 'main_menu':
        if (text === '') {
          // Initial menu
          response = `CON Welcome to BIG Company
1. Check Balance
2. Top Up Wallet
3. Buy Gas
4. Check Loan Status
5. My Account`;
          session.state = 'main_menu_selection';
        }
        break;

      case 'main_menu_selection':
        switch (lastInput) {
          case '1': // Check Balance
            if (!user) {
              response = `END You are not registered.
Please sign up at bigcompany.rw`;
            } else {
              const balance = await blnkService.getCustomerBalance(user.customer_id, 'customer_wallets');
              response = `END Your wallet balance is:
${balance.toLocaleString()} RWF`;
            }
            break;

          case '2': // Top Up Wallet
            response = `CON Select top-up amount:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`;
            session.state = 'topup_amount';
            break;

          case '3': // Buy Gas
            if (!user) {
              response = `END You are not registered.
Please sign up at bigcompany.rw`;
            } else {
              response = `CON Enter your gas meter number:`;
              session.state = 'gas_meter_input';
            }
            break;

          case '4': // Check Loan Status
            if (!user) {
              response = `END You are not registered.
Please sign up at bigcompany.rw`;
            } else {
              const loans = await manager.query(`
                SELECT * FROM bigcompany.loans
                WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
                ORDER BY created_at DESC LIMIT 1
              `, [user.customer_id]);

              if (loans.length === 0) {
                response = `END You have no active loans.
Apply at bigcompany.rw`;
              } else {
                const loan = loans[0];
                response = `END Loan #${loan.loan_number}
Status: ${loan.status}
Outstanding: ${loan.outstanding_balance.toLocaleString()} RWF
Due: ${loan.due_date}`;
              }
            }
            break;

          case '5': // My Account
            if (!user) {
              response = `END You are not registered.
Please sign up at bigcompany.rw`;
            } else {
              response = `END Account: ${phoneNumber}
Email: ${user.email || 'Not set'}
Visit bigcompany.rw to manage`;
            }
            break;

          default:
            response = `END Invalid selection.
Dial ${serviceCode} to try again.`;
        }
        break;

      case 'topup_amount':
        const amounts: Record<string, number> = {
          '1': 300, '2': 500, '3': 1000,
          '4': 2000, '5': 5000, '6': 10000
        };
        const amount = amounts[lastInput];

        if (!amount) {
          response = `END Invalid selection.
Dial ${serviceCode} to try again.`;
        } else {
          session.data.topup_amount = amount;
          response = `CON Top up ${amount.toLocaleString()} RWF
Select payment method:
1. MTN Mobile Money
2. Airtel Money`;
          session.state = 'topup_payment_method';
        }
        break;

      case 'topup_payment_method':
        const paymentMethod = lastInput === '1' ? 'mtn_momo' : lastInput === '2' ? 'airtel_money' : null;

        if (!paymentMethod) {
          response = `END Invalid selection.
Dial ${serviceCode} to try again.`;
        } else {
          const topupAmount = session.data.topup_amount;
          // TODO: Trigger payment collection via n8n webhook
          response = `END Top-up request submitted!
Amount: ${topupAmount.toLocaleString()} RWF
Via: ${paymentMethod === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}

Please approve the payment on your phone.`;
        }
        break;

      case 'gas_meter_input':
        const meterNumber = lastInput;
        session.data.meter_number = meterNumber;
        response = `CON Meter: ${meterNumber}
Select gas amount:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`;
        session.state = 'gas_amount';
        break;

      case 'gas_amount':
        const gasAmounts: Record<string, number> = {
          '1': 300, '2': 500, '3': 1000,
          '4': 2000, '5': 5000, '6': 10000
        };
        const gasAmount = gasAmounts[lastInput];

        if (!gasAmount) {
          response = `END Invalid selection.
Dial ${serviceCode} to try again.`;
        } else {
          session.data.gas_amount = gasAmount;
          response = `CON Buy ${gasAmount.toLocaleString()} RWF gas
For meter: ${session.data.meter_number}

1. Pay from Wallet
2. Pay via MTN MoMo
3. Pay via Airtel Money`;
          session.state = 'gas_payment';
        }
        break;

      case 'gas_payment':
        const gasPaymentMethod = lastInput === '1' ? 'wallet' : lastInput === '2' ? 'mtn_momo' : lastInput === '3' ? 'airtel_money' : null;

        if (!gasPaymentMethod) {
          response = `END Invalid selection.
Dial ${serviceCode} to try again.`;
        } else {
          // TODO: Process gas purchase
          const token = `${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}`;
          const units = Math.round(session.data.gas_amount / 50);

          response = `END Gas purchase successful!
Meter: ${session.data.meter_number}
Units: ${units}
Token: ${token}

Token sent via SMS.`;
        }
        break;

      default:
        response = `END Session error.
Dial ${serviceCode} to restart.`;
    }

    // Save session
    sessions.set(sessionId, session);

    // Log USSD session
    await manager.query(`
      INSERT INTO bigcompany.ussd_sessions (session_id, phone_number, service_code, current_state, session_data, last_input)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id) DO UPDATE SET
        current_state = $4, session_data = $5, last_input = $6
    `, [sessionId, phoneNumber, serviceCode, session.state, JSON.stringify(session.data), lastInput]);

    // Clear session if response ends
    if (response.startsWith('END')) {
      sessions.delete(sessionId);
      await manager.query(`
        UPDATE bigcompany.ussd_sessions SET ended_at = NOW() WHERE session_id = $1
      `, [sessionId]);
    }

    // Send response with correct content type
    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (error: any) {
    console.error('USSD Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send(`END An error occurred.
Please try again later.`);
  }
}));

export default router;
