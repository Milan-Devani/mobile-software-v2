import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.API_URL || 'http://localhost:5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'super_secure_jwt_secret_key_fixit_repair_system_2026_xyz987',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'repair-assets',
  
  // Brevo Email
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'TechFix Pro <notifications@techfixpro.com>',
  
  // OpenWA WhatsApp (https://github.com/rmyndharis/OpenWA)
  OPENWA_API_URL: process.env.OPENWA_API_URL || 'http://localhost:8000',
  OPENWA_API_KEY: process.env.OPENWA_API_KEY || '',
  OPENWA_SESSION_ID: process.env.OPENWA_SESSION_ID || 'default',
  
  // MSG91 SMS
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_FLOW_ID: process.env.MSG91_FLOW_ID || '',
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'TCHFIX',
  MSG91_TEST_MODE: process.env.MSG91_TEST_MODE === 'true' || !process.env.MSG91_AUTH_KEY,
};
