import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/vesd',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'vesd-bucket'
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  payos: {
    baseUrl: process.env.PAYOS_BASE_URL || 'https://api-merchant.payos.vn',
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    partnerCode: process.env.PAYOS_PARTNER_CODE,
    payout: {
      clientId: process.env.PAYOS_PAYOUT_CLIENT_ID || process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_PAYOUT_API_KEY || process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_PAYOUT_CHECKSUM_KEY || process.env.PAYOS_CHECKSUM_KEY
    }
  },
  casso: {
    webhookSecret: process.env.CASSO_WEBHOOK_SECRET || process.env.CASSO_WEBHOOK_V2_SECRET,
    legacySecureToken: process.env.CASSO_WEBHOOK_LEGACY_TOKEN || process.env.CASSO_WEBHOOK_SECRET
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'VESD <noreply@vesd.site>'
  }
};
