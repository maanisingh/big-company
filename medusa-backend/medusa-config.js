const dotenv = require("dotenv");

let ENV_FILE_NAME = "";
switch (process.env.NODE_ENV) {
  case "production":
    ENV_FILE_NAME = ".env.production";
    break;
  case "staging":
    ENV_FILE_NAME = ".env.staging";
    break;
  case "test":
    ENV_FILE_NAME = ".env.test";
    break;
  case "development":
  default:
    ENV_FILE_NAME = ".env";
    break;
}

try {
  dotenv.config({ path: process.cwd() + "/" + ENV_FILE_NAME });
} catch (e) {}

// CORS Configuration
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7001";
const STORE_CORS = process.env.STORE_CORS || "http://localhost:3000,http://localhost:3001,http://localhost:3002";

// Database Configuration
const DATABASE_URL = process.env.DATABASE_URL || "postgres://bigcompany:bigcompany_secure_2024@localhost:5432/bigcompany";

// Redis Configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Blnk Wallet API
const BLNK_API_URL = process.env.BLNK_API_URL || "http://localhost:5001";

// JWT and Cookie Secrets
const JWT_SECRET = process.env.JWT_SECRET || "bigcompany_jwt_secret_2024";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "bigcompany_cookie_secret_2024";

// Minimal plugins for Railway deployment - remove admin to prevent startup issues
// See: https://stackoverflow.com/questions/79387415/error-starting-server-in-railway-deployment
const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: `@medusajs/file-local`,
    options: {
      upload_dir: "uploads",
    },
  },
  // Admin plugin disabled - causes "Error starting server" on Railway
  // Deploy admin UI separately or use medusa-admin CLI locally
];

// IMPORTANT: Use local event bus and cache to avoid Redis connection issues during startup
// The @medusajs/event-bus-redis and @medusajs/cache-redis modules can cause
// "Error starting server" during "Initializing defaults" on Railway due to
// connection timing issues. BullMQ workers use Redis separately and work fine.
// See: https://github.com/medusajs/medusa/issues/4141
const modules = {
  eventBus: {
    resolve: "@medusajs/event-bus-local"
  },
  cacheService: {
    resolve: "@medusajs/cache-inmemory"
  },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwt_secret: JWT_SECRET,
  cookie_secret: COOKIE_SECRET,
  store_cors: STORE_CORS,
  database_url: DATABASE_URL,
  admin_cors: ADMIN_CORS,
  // Redis URL is REQUIRED for session storage to prevent MemoryStore memory leaks
  // Even with local event bus, session middleware needs Redis in production
  redis_url: REDIS_URL,
  // Use Railway's PORT environment variable or default to 9000
  http: {
    port: parseInt(process.env.PORT) || 9000,
  },
  // SSL configuration for Railway PostgreSQL (requires SSL in production)
  database_extra: process.env.NODE_ENV === "production" ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {},
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  plugins,
  modules,
  featureFlags: {
    product_categories: true,
    tax_inclusive_pricing: true,
  },
  // Custom BigCompany configuration
  bigcompany: {
    blnk_api_url: BLNK_API_URL,
    default_currency: "RWF",
    country: "RW",
    gas_reward_percentage: 12,
    min_profit_for_reward: 1000,
    predefined_topup_amounts: [300, 500, 1000, 2000, 5000, 10000],
  }
};
