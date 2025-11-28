interface SMSOptions {
  to: string | string[];
  message: string;
  from?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private africastalking: any;
  private sms: any;
  private senderId: string;

  constructor() {
    const apiKey = process.env.AT_API_KEY || '';
    const username = process.env.AT_USERNAME || 'sandbox';
    this.senderId = process.env.AT_SENDER_ID || 'BIGCompany';

    if (apiKey) {
      const AfricasTalking = require('africastalking');
      this.africastalking = AfricasTalking({
        apiKey,
        username,
      });
      this.sms = this.africastalking.SMS;
    }
  }

  /**
   * Format phone number to Rwandan format
   */
  private formatPhone(phone: string): string {
    if (phone.startsWith('0')) {
      return '+250' + phone.substring(1);
    }
    if (!phone.startsWith('+')) {
      return '+' + phone;
    }
    return phone;
  }

  /**
   * Send SMS message (low-level)
   */
  async send(options: SMSOptions): Promise<SMSResponse> {
    if (!this.sms) {
      console.warn('SMS service not configured. Set AT_API_KEY environment variable.');
      // In development, log the message
      console.log(`[SMS DEV] To: ${options.to} | Message: ${options.message}`);
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const formattedRecipients = recipients.map(this.formatPhone);

      const result = await this.sms.send({
        to: formattedRecipients,
        message: options.message,
        from: options.from || this.senderId,
      });

      return {
        success: true,
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
      };
    } catch (error: any) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Simple send SMS helper
   */
  async sendSms(phone: string, message: string): Promise<SMSResponse> {
    return this.send({ to: phone, message });
  }

  /**
   * Send OTP for verification
   */
  async sendOTP(phone: string, otp: string): Promise<SMSResponse> {
    const message = `Your BIG verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.send({ to: phone, message });
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(phone: string, orderNumber: string, total: number): Promise<SMSResponse> {
    const message = `BIG: Order #${orderNumber} confirmed! Total: ${total.toLocaleString()} RWF. Track at big.rw/track/${orderNumber}`;
    return this.send({ to: phone, message });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(phone: string, amount: number, reference: string): Promise<SMSResponse> {
    const message = `BIG: Payment of ${amount.toLocaleString()} RWF received. Ref: ${reference}. Wallet credited.`;
    return this.send({ to: phone, message });
  }

  /**
   * Send loan approval notification
   */
  async sendLoanApproval(phone: string, amount: number, dueDate: string): Promise<SMSResponse> {
    const message = `BIG: Your loan of ${amount.toLocaleString()} RWF has been approved and sent to your wallet! Repay by ${dueDate}.`;
    return this.send({ to: phone, message });
  }

  /**
   * Send loan reminder
   */
  async sendLoanReminder(phone: string, loanNumber: string, amount: number, dueDate: string): Promise<SMSResponse> {
    const message = `BIG: Reminder - Loan #${loanNumber} payment of ${amount.toLocaleString()} RWF due on ${dueDate}. Dial *939# to pay.`;
    return this.send({ to: phone, message });
  }

  /**
   * Send gas top-up confirmation
   */
  async sendGasTopupConfirmation(phone: string, meterNumber: string, amount: number, units: number, token: string): Promise<SMSResponse> {
    const message = `BIG Gas: Meter ${meterNumber} topped up! Amount: ${amount.toLocaleString()} RWF. Units: ${units}. Token: ${token}`;
    return this.send({ to: phone, message });
  }

  /**
   * Send wallet top-up confirmation
   */
  async sendWalletTopup(phone: string, amount: number, newBalance: number): Promise<SMSResponse> {
    const message = `BIG: Wallet credited with ${amount.toLocaleString()} RWF. Balance: ${newBalance.toLocaleString()} RWF.`;
    return this.send({ to: phone, message });
  }

  /**
   * Send low stock alert to retailer
   */
  async sendLowStockAlert(phone: string, productName: string, currentStock: number): Promise<SMSResponse> {
    const message = `BIG Alert: Low stock "${productName}". Current: ${currentStock} units. Reorder now!`;
    return this.send({ to: phone, message });
  }

  /**
   * Send credit order approval to retailer
   */
  async sendCreditOrderApproval(phone: string, orderNumber: string, amount: number, dueDate: string): Promise<SMSResponse> {
    const message = `BIG: Credit order #${orderNumber} for ${amount.toLocaleString()} RWF approved! Due: ${dueDate}.`;
    return this.send({ to: phone, message });
  }
}

export default SMSService;
