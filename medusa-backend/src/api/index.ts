import { Router, json, urlencoded } from 'express';
import walletRoutes from './routes/wallet';
import gasRoutes from './routes/gas';
import loansRoutes from './routes/loans';
import ussdRoutes from './routes/ussd';
import nfcRoutes from './routes/nfc';
import rewardsRoutes from './routes/rewards';
import retailerRoutes from './routes/retailer';
import wholesalerRoutes from './routes/wholesaler';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import storeRoutes from './routes/store';

export default (rootDirectory: string): Router | Router[] => {
  const router = Router();

  // Body parser middleware for all custom routes
  router.use(json());
  router.use(urlencoded({ extended: true }));

  // BigCompany Custom API Routes

  // Auth routes (consumer-facing)
  router.use('/store/auth', authRoutes);

  // Admin dashboard routes
  router.use('/admin', adminRoutes);

  // Store routes (customer-facing)
  router.use('/store', storeRoutes);  // retailers, categories, products
  router.use('/store/wallet', walletRoutes);
  router.use('/store/gas', gasRoutes);
  router.use('/store/loans', loansRoutes);
  router.use('/store/nfc', nfcRoutes);
  router.use('/store/rewards', rewardsRoutes);

  // USSD callback (public endpoint for Africa's Talking)
  router.use('/ussd', ussdRoutes);

  // POS routes (retailer-facing)
  router.use('/pos/nfc', nfcRoutes);

  // Retailer Dashboard API routes
  router.use('/retailer', retailerRoutes);

  // Wholesaler Dashboard API routes
  router.use('/wholesaler', wholesalerRoutes);

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'bigcompany-medusa',
      timestamp: new Date().toISOString(),
    });
  });

  // Version check
  router.get('/version', (req, res) => {
    res.json({
      version: '1.1.0',
      build: '2024-11-30',
      features: ['retailer-orders', 'credit-requests', 'enhanced-dashboards'],
    });
  });

  return router;
};
