import { Pool } from 'pg';
import BlnkService from './blnk';
import GasService from './gas';
import SMSService from './sms';
import MTNMoMoService from './momo';
import AirtelMoneyService from './airtel';

interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

interface USSDResponse {
  response: string;
  endSession: boolean;
}

interface SessionData {
  currentState: string;
  selectedService?: string;
  amount?: number;
  meterNumber?: string;
  cardId?: string;
  phone?: string;
  pin?: string;
  customerId?: string;
  data?: Record<string, any>;
}

// USSD Menu States
const STATES = {
  MAIN_MENU: 'main_menu',
  WALLET_MENU: 'wallet_menu',
  GAS_MENU: 'gas_menu',
  CARD_MENU: 'card_menu',
  LOAN_MENU: 'loan_menu',
  ENTER_AMOUNT: 'enter_amount',
  ENTER_METER: 'enter_meter',
  ENTER_CARD_ID: 'enter_card_id',
  ENTER_PIN: 'enter_pin',
  CONFIRM_TRANSACTION: 'confirm_transaction',
  PROCESSING: 'processing',
};

class USSDService {
  private db: Pool;
  private blnkService: BlnkService;
  private gasService: GasService;
  private smsService: SMSService;
  private momoService: MTNMoMoService;
  private airtelService: AirtelMoneyService;
  private predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

  constructor(container: any) {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.blnkService = new BlnkService(container);
    this.gasService = new GasService();
    this.smsService = new SMSService();
    this.momoService = new MTNMoMoService();
    this.airtelService = new AirtelMoneyService();
  }

  /**
   * Main USSD handler - processes incoming USSD requests
   */
  async handleRequest(request: USSDRequest): Promise<USSDResponse> {
    const { sessionId, phoneNumber, text } = request;
    const formattedPhone = this.formatPhone(phoneNumber);

    // Get or create session
    let session = await this.getSession(sessionId);

    if (!session) {
      session = await this.createSession(sessionId, formattedPhone);
    }

    // Parse user input
    const inputs = text.split('*').filter(i => i !== '');
    const currentInput = inputs[inputs.length - 1] || '';

    // Process based on current state
    const response = await this.processState(session, currentInput, formattedPhone);

    // Update session
    await this.updateSession(sessionId, session.data);

    return response;
  }

  /**
   * Process current state and return response
   */
  private async processState(
    session: { id: string; data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    const state = session.data.currentState;

    switch (state) {
      case STATES.MAIN_MENU:
        return this.handleMainMenu(session, input);

      case STATES.WALLET_MENU:
        return this.handleWalletMenu(session, input, phone);

      case STATES.GAS_MENU:
        return this.handleGasMenu(session, input, phone);

      case STATES.CARD_MENU:
        return this.handleCardMenu(session, input, phone);

      case STATES.LOAN_MENU:
        return this.handleLoanMenu(session, input, phone);

      case STATES.ENTER_AMOUNT:
        return this.handleEnterAmount(session, input);

      case STATES.ENTER_METER:
        return this.handleEnterMeter(session, input);

      case STATES.ENTER_CARD_ID:
        return this.handleEnterCardId(session, input);

      case STATES.ENTER_PIN:
        return this.handleEnterPin(session, input, phone);

      case STATES.CONFIRM_TRANSACTION:
        return this.handleConfirmation(session, input, phone);

      default:
        return this.showMainMenu(session);
    }
  }

  /**
   * Show main menu
   */
  private showMainMenu(session: { data: SessionData }): USSDResponse {
    session.data.currentState = STATES.MAIN_MENU;
    session.data.selectedService = undefined;

    return {
      response: `Welcome to BIG Company
1. Check Balance
2. Top Up Wallet
3. Buy Gas
4. Shop Card
5. Loans
6. Help`,
      endSession: false,
    };
  }

  /**
   * Handle main menu selection
   */
  private async handleMainMenu(
    session: { data: SessionData },
    input: string
  ): Promise<USSDResponse> {
    switch (input) {
      case '1':
        session.data.currentState = STATES.WALLET_MENU;
        session.data.selectedService = 'balance';
        return { response: 'Enter your PIN:', endSession: false };

      case '2':
        session.data.currentState = STATES.WALLET_MENU;
        session.data.selectedService = 'topup';
        return {
          response: `Top Up Wallet
Select amount:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF
7. Other amount`,
          endSession: false,
        };

      case '3':
        session.data.currentState = STATES.GAS_MENU;
        session.data.selectedService = 'gas';
        return {
          response: `Buy Gas
Select amount:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`,
          endSession: false,
        };

      case '4':
        session.data.currentState = STATES.CARD_MENU;
        return {
          response: `Shop Card
1. Top Up Card
2. Check Card Balance
3. Link New Card`,
          endSession: false,
        };

      case '5':
        session.data.currentState = STATES.LOAN_MENU;
        return {
          response: `Loans
1. Apply for Food Loan
2. Check Loan Status
3. Repay Loan`,
          endSession: false,
        };

      case '6':
        return {
          response: `BIG Company Help
- Dial *939*6# for support
- SMS HELP to 8939
- Visit big.rw/help
- WhatsApp: +250788000000`,
          endSession: true,
        };

      default:
        return this.showMainMenu(session);
    }
  }

  /**
   * Handle wallet menu
   */
  private async handleWalletMenu(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    const service = session.data.selectedService;

    if (service === 'balance') {
      // Verify PIN and show balance
      const customer = await this.getCustomerByPhone(phone);
      if (!customer) {
        return {
          response: 'Account not found. Register at big.rw',
          endSession: true,
        };
      }

      // Verify PIN
      const pinValid = await this.verifyPin(customer.id, input);
      if (!pinValid) {
        return { response: 'Invalid PIN. Try again.', endSession: true };
      }

      const balance = await this.blnkService.getCustomerBalance(
        customer.id,
        'customer_wallets'
      );

      return {
        response: `Your BIG Wallet Balance:
${balance.toLocaleString()} RWF

Last updated: ${new Date().toLocaleString('en-RW', { timeZone: 'Africa/Kigali' })}`,
        endSession: true,
      };
    }

    if (service === 'topup') {
      // Handle amount selection
      const amountIndex = parseInt(input) - 1;

      if (input === '7') {
        session.data.currentState = STATES.ENTER_AMOUNT;
        return { response: 'Enter amount in RWF:', endSession: false };
      }

      if (amountIndex >= 0 && amountIndex < this.predefinedAmounts.length) {
        session.data.amount = this.predefinedAmounts[amountIndex];
        session.data.currentState = STATES.CONFIRM_TRANSACTION;
        session.data.data = { type: 'wallet_topup' };

        return {
          response: `Top Up ${session.data.amount?.toLocaleString()} RWF to your wallet?
1. Confirm (Pay via MoMo)
2. Cancel`,
          endSession: false,
        };
      }

      return { response: 'Invalid selection', endSession: true };
    }

    return this.showMainMenu(session);
  }

  /**
   * Handle gas menu
   */
  private async handleGasMenu(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    // Check if selecting amount
    if (!session.data.amount) {
      const amountIndex = parseInt(input) - 1;

      if (amountIndex >= 0 && amountIndex < this.predefinedAmounts.length) {
        session.data.amount = this.predefinedAmounts[amountIndex];
        session.data.currentState = STATES.ENTER_METER;

        // Check if user has saved meters
        const customer = await this.getCustomerByPhone(phone);
        if (customer) {
          const meters = await this.gasService.getUserMeters(customer.id);
          if (meters.length > 0) {
            let meterList = meters.map((m, i) => `${i + 1}. ${m.meterNumber}`).join('\n');
            return {
              response: `Select meter or enter new:
${meterList}
${meters.length + 1}. Enter new meter`,
              endSession: false,
            };
          }
        }

        return { response: 'Enter meter number:', endSession: false };
      }

      return { response: 'Invalid selection', endSession: true };
    }

    return this.showMainMenu(session);
  }

  /**
   * Handle meter entry
   */
  private async handleEnterMeter(
    session: { data: SessionData },
    input: string
  ): Promise<USSDResponse> {
    const meterNumber = input.replace(/\D/g, '');

    if (meterNumber.length < 11) {
      return { response: 'Invalid meter number. Please try again:', endSession: false };
    }

    // Validate meter
    const meterInfo = await this.gasService.validateMeter(meterNumber);

    if (!meterInfo) {
      return { response: 'Meter not found. Check number and try again.', endSession: true };
    }

    session.data.meterNumber = meterNumber;
    session.data.currentState = STATES.CONFIRM_TRANSACTION;
    session.data.data = { type: 'gas_purchase', meterInfo };

    return {
      response: `Buy Gas:
Meter: ${meterNumber}
Name: ${meterInfo.customerName}
Amount: ${session.data.amount?.toLocaleString()} RWF

1. Confirm (Pay via MoMo)
2. Cancel`,
      endSession: false,
    };
  }

  /**
   * Handle card menu
   */
  private async handleCardMenu(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    switch (input) {
      case '1':
        session.data.selectedService = 'card_topup';
        session.data.currentState = STATES.ENTER_CARD_ID;
        return { response: 'Enter your Card ID (printed on card):', endSession: false };

      case '2':
        session.data.selectedService = 'card_balance';
        session.data.currentState = STATES.ENTER_CARD_ID;
        return { response: 'Enter your Card ID:', endSession: false };

      case '3':
        session.data.selectedService = 'card_link';
        session.data.currentState = STATES.ENTER_CARD_ID;
        return { response: 'Enter the Card ID to link:', endSession: false };

      default:
        return this.showMainMenu(session);
    }
  }

  /**
   * Handle card ID entry
   */
  private async handleEnterCardId(
    session: { data: SessionData },
    input: string
  ): Promise<USSDResponse> {
    const cardId = input.trim().toUpperCase();

    // Validate card exists
    const card = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1',
      [cardId]
    );

    if (card.rows.length === 0) {
      return { response: 'Card not found. Check ID and try again.', endSession: true };
    }

    session.data.cardId = cardId;

    const service = session.data.selectedService;

    if (service === 'card_topup') {
      session.data.currentState = STATES.ENTER_AMOUNT;
      return {
        response: `Top Up Card ${cardId}
Select amount:
1. 300 RWF
2. 500 RWF
3. 1,000 RWF
4. 2,000 RWF
5. 5,000 RWF
6. 10,000 RWF`,
        endSession: false,
      };
    }

    if (service === 'card_balance') {
      session.data.currentState = STATES.ENTER_PIN;
      return { response: 'Enter card PIN:', endSession: false };
    }

    if (service === 'card_link') {
      session.data.currentState = STATES.ENTER_PIN;
      session.data.data = { cardData: card.rows[0] };
      return { response: 'Enter PIN to confirm linking:', endSession: false };
    }

    return this.showMainMenu(session);
  }

  /**
   * Handle loan menu
   */
  private async handleLoanMenu(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    const customer = await this.getCustomerByPhone(phone);

    if (!customer) {
      return { response: 'Register at big.rw to access loans.', endSession: true };
    }

    switch (input) {
      case '1':
        // Check eligibility
        const eligible = await this.checkLoanEligibility(customer.id);
        if (!eligible.eligible) {
          return { response: `Loan not available: ${eligible.reason}`, endSession: true };
        }

        session.data.selectedService = 'loan_apply';
        return {
          response: `Food Loan
Max amount: ${eligible.maxAmount?.toLocaleString()} RWF
Select loan amount:
1. 1,000 RWF
2. 2,000 RWF
3. 3,000 RWF
4. 5,000 RWF`,
          endSession: false,
        };

      case '2':
        const loans = await this.getUserLoans(customer.id);
        if (loans.length === 0) {
          return { response: 'No active loans.', endSession: true };
        }

        const activeLoan = loans[0];
        return {
          response: `Loan Status:
Loan #${activeLoan.loan_number}
Principal: ${activeLoan.principal.toLocaleString()} RWF
Outstanding: ${activeLoan.outstanding_balance.toLocaleString()} RWF
Due: ${new Date(activeLoan.due_date).toLocaleDateString()}
Status: ${activeLoan.status}`,
          endSession: true,
        };

      case '3':
        session.data.selectedService = 'loan_repay';
        session.data.currentState = STATES.ENTER_AMOUNT;
        return { response: 'Enter repayment amount in RWF:', endSession: false };

      default:
        return this.showMainMenu(session);
    }
  }

  /**
   * Handle transaction confirmation
   */
  private async handleConfirmation(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    if (input === '2') {
      return { response: 'Transaction cancelled.', endSession: true };
    }

    if (input !== '1') {
      return { response: 'Invalid selection. Transaction cancelled.', endSession: true };
    }

    const transactionType = session.data.data?.type;
    const amount = session.data.amount || 0;

    // Determine provider based on phone number
    const isMTN = this.isMTNNumber(phone);
    const provider = isMTN ? 'mtn_momo' : 'airtel_money';

    // Initiate mobile money payment
    const reference = `USSD-${Date.now()}`;

    let paymentResult;
    if (isMTN) {
      paymentResult = await this.momoService.requestPayment({
        amount,
        currency: 'RWF',
        externalId: reference,
        payerPhone: phone,
        payerMessage: `BIG ${transactionType} - ${amount} RWF`,
      });
    } else {
      paymentResult = await this.airtelService.requestPayment({
        amount,
        phone,
        reference,
      });
    }

    if (!paymentResult.success) {
      return { response: 'Payment failed. Please try again.', endSession: true };
    }

    // Store pending transaction
    await this.db.query(`
      INSERT INTO bigcompany.ussd_sessions
      (session_id, phone_number, current_state, session_data)
      VALUES ($1, $2, 'payment_pending', $3)
      ON CONFLICT (session_id) DO UPDATE
      SET session_data = $3, current_state = 'payment_pending'
    `, [
      reference,
      phone,
      JSON.stringify({
        type: transactionType,
        amount,
        meter: session.data.meterNumber,
        card: session.data.cardId,
        paymentRef: paymentResult.referenceId || paymentResult.transactionId,
      }),
    ]);

    return {
      response: `Payment request sent!
Amount: ${amount.toLocaleString()} RWF

Approve the ${isMTN ? 'MTN MoMo' : 'Airtel Money'} prompt on your phone.

Ref: ${reference}`,
      endSession: true,
    };
  }

  /**
   * Handle amount entry
   */
  private async handleEnterAmount(
    session: { data: SessionData },
    input: string
  ): Promise<USSDResponse> {
    // Check if selecting from predefined
    const amountIndex = parseInt(input) - 1;
    if (amountIndex >= 0 && amountIndex < this.predefinedAmounts.length) {
      session.data.amount = this.predefinedAmounts[amountIndex];
    } else {
      const amount = parseInt(input);
      if (isNaN(amount) || amount < 100) {
        return { response: 'Invalid amount. Minimum 100 RWF:', endSession: false };
      }
      session.data.amount = amount;
    }

    session.data.currentState = STATES.CONFIRM_TRANSACTION;

    if (session.data.selectedService === 'card_topup') {
      session.data.data = { type: 'card_topup' };
      return {
        response: `Top Up Card ${session.data.cardId}
Amount: ${session.data.amount.toLocaleString()} RWF

1. Confirm
2. Cancel`,
        endSession: false,
      };
    }

    return {
      response: `Confirm ${session.data.amount.toLocaleString()} RWF?
1. Yes
2. No`,
      endSession: false,
    };
  }

  /**
   * Handle PIN entry
   */
  private async handleEnterPin(
    session: { data: SessionData },
    input: string,
    phone: string
  ): Promise<USSDResponse> {
    const customer = await this.getCustomerByPhone(phone);

    if (!customer) {
      return { response: 'Account not found.', endSession: true };
    }

    const pinValid = await this.verifyPin(customer.id, input);

    if (!pinValid) {
      return { response: 'Invalid PIN.', endSession: true };
    }

    const service = session.data.selectedService;

    if (service === 'card_balance') {
      // Get card balance
      const card = await this.db.query(
        'SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1 AND user_id = $2',
        [session.data.cardId, customer.id]
      );

      if (card.rows.length === 0) {
        return { response: 'Card not linked to your account.', endSession: true };
      }

      const balance = await this.blnkService.getCustomerBalance(
        customer.id,
        'customer_wallets'
      );

      return {
        response: `Card ${session.data.cardId}
Balance: ${balance.toLocaleString()} RWF`,
        endSession: true,
      };
    }

    return this.showMainMenu(session);
  }

  // ==================== HELPER METHODS ====================

  private async getSession(sessionId: string): Promise<{ id: string; data: SessionData } | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.ussd_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) return null;

    return {
      id: result.rows[0].id,
      data: result.rows[0].session_data || { currentState: STATES.MAIN_MENU },
    };
  }

  private async createSession(sessionId: string, phone: string): Promise<{ id: string; data: SessionData }> {
    const result = await this.db.query(`
      INSERT INTO bigcompany.ussd_sessions (session_id, phone_number, current_state, session_data)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [sessionId, phone, STATES.MAIN_MENU, JSON.stringify({ currentState: STATES.MAIN_MENU })]);

    return {
      id: result.rows[0].id,
      data: { currentState: STATES.MAIN_MENU },
    };
  }

  private async updateSession(sessionId: string, data: SessionData): Promise<void> {
    await this.db.query(`
      UPDATE bigcompany.ussd_sessions
      SET session_data = $1, current_state = $2, last_input = $3
      WHERE session_id = $4
    `, [JSON.stringify(data), data.currentState, new Date().toISOString(), sessionId]);
  }

  private async getCustomerByPhone(phone: string): Promise<{ id: string } | null> {
    const formattedPhone = this.formatPhone(phone);
    const result = await this.db.query(
      "SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1",
      [formattedPhone]
    );
    return result.rows[0] || null;
  }

  private async verifyPin(customerId: string, pin: string): Promise<boolean> {
    // In production, compare hashed PIN
    const result = await this.db.query(
      "SELECT metadata->>'pin_hash' as pin_hash FROM customer WHERE id = $1",
      [customerId]
    );

    if (!result.rows[0]?.pin_hash) return false;

    const crypto = require('crypto');
    const inputHash = crypto.createHash('sha256').update(pin).digest('hex');
    return inputHash === result.rows[0].pin_hash;
  }

  private async checkLoanEligibility(customerId: string): Promise<{
    eligible: boolean;
    reason?: string;
    maxAmount?: number;
  }> {
    // Check for existing loans
    const existingLoans = await this.db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('active', 'disbursed', 'pending')
    `, [customerId]);

    if (existingLoans.rows.length > 0) {
      return { eligible: false, reason: 'You have an existing loan' };
    }

    // Check account age and activity
    return { eligible: true, maxAmount: 5000 };
  }

  private async getUserLoans(customerId: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [customerId]);
    return result.rows;
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1);
    } else if (!cleaned.startsWith('250')) {
      cleaned = '250' + cleaned;
    }
    return '+' + cleaned;
  }

  private isMTNNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    const prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);
    const mtnPrefixes = ['78', '79']; // MTN Rwanda prefixes
    return mtnPrefixes.some(p => prefix.startsWith(p));
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}

export default USSDService;
