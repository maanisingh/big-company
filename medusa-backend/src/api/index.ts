import { Router } from 'express';
import walletRoutes from './routes/wallet';
import gasRoutes from './routes/gas';
import loansRoutes from './routes/loans';
import ussdRoutes from './routes/ussd';
import nfcRoutes from './routes/nfc';

export default (rootDirectory: string): Router | Router[] => {
  const router = Router();

  // BigCompany Custom API Routes

  // Store routes (customer-facing)
  router.use('/store/wallet', walletRoutes);
  router.use('/store/gas', gasRoutes);
  router.use('/store/loans', loansRoutes);
  router.use('/store/nfc', nfcRoutes);

  // USSD callback (public endpoint for Africa's Talking)
  router.use('/ussd', ussdRoutes);

  // POS routes (retailer-facing)
  router.use('/pos/nfc', nfcRoutes);

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'bigcompany-medusa',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
