import { Router, json, urlencoded } from 'express';
import cors from 'cors';
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

  // CORS configuration for custom routes
  const ADMIN_CORS = process.env.ADMIN_CORS || 'http://localhost:7001';
  const STORE_CORS = process.env.STORE_CORS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002';

  const adminCorsOrigins = ADMIN_CORS.split(',').map(origin => origin.trim());
  const storeCorsOrigins = STORE_CORS.split(',').map(origin => origin.trim());

  // Add common production domains
  const productionOrigins = [
    'https://bigcompany.alexandratechlab.com',
    'https://bigcompany-retailer.alexandratechlab.com',
    'https://bigcompany-wholesaler.alexandratechlab.com',
    'https://unified-frontend-production.up.railway.app',
    // Allow all Railway subdomains
    /https:\/\/.*\.up\.railway\.app$/
  ];

  const allCorsOrigins = [...adminCorsOrigins, ...storeCorsOrigins, ...productionOrigins];

  // Apply CORS to all custom routes
  router.use(cors({
    origin: allCorsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  }));

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
      version: '1.3.0',
      build: '2024-11-30-v3',
      buildTimestamp: Date.now().toString(),
      features: ['retailer-orders', 'credit-requests', 'enhanced-dashboards', 'admin-reports', 'branch-management'],
    });
  });

  return router;
};
