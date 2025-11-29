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

const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: `@medusajs/file-local`,
    options: {
      upload_dir: "uploads",
    },
  },
  {
    resolve: "@medusajs/admin",
    options: {
      autoRebuild: process.env.NODE_ENV !== "production",
      serve: process.env.NODE_ENV === "production",
      develop: {
        open: false,
      },
    },
  },
];

// Use Redis if available, otherwise fallback to local modules
const modules = REDIS_URL && REDIS_URL !== "redis://localhost:6379" ? {
  eventBus: {
    resolve: "@medusajs/event-bus-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },
  cacheService: {
    resolve: "@medusajs/cache-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },
} : {
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
