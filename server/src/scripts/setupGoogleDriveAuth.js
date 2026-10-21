#!/usr/bin/env node
import http from 'http';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { generateRandomEncryptionKey } from '../services/encryptionService.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE = path.resolve(__dirname, '../../.env');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function updateEnvFile(updates) {
  if (!fs.existsSync(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, '', 'utf-8');
  }

  let content = fs.readFileSync(ENV_FILE, 'utf-8');
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(ENV_FILE, content, 'utf-8');
  console.log(`💾 Updated ${ENV_FILE} with new credentials.`);
}

async function main() {
  console.log('================================================================');
  console.log('🔐 GOOGLE DRIVE OAUTH 2.0 ONE-TIME SETUP FOR DATABASE BACKUPS');
  console.log('================================================================\n');

  console.log('📋 PRE-REQUISITES (Takes 2 minutes in Google Cloud Console):');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Create or select a project.');
  console.log('3. Enable "Google Drive API" under APIs & Services > Enabled APIs & Services.');
  console.log('4. Go to APIs & Services > OAuth consent screen:');
  console.log('   - User Type: "External"');
  console.log('   - App name: "Supabase Database Backups"');
  console.log('   - Add your Google account under "Test users".');
  console.log('5. Go to APIs & Services > Credentials:');
  console.log('   - Click "Create Credentials" > "OAuth client ID"');
  console.log('   - Application type: "Web application"');
  console.log('   - Authorized redirect URIs: http://localhost:3000/oauth2callback\n');

  let clientId = env.GOOGLE_CLIENT_ID;
  let clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    clientId = await ask('👉 Enter your Google Client ID: ');
  } else {
    console.log(`ℹ️ Using configured GOOGLE_CLIENT_ID: ${clientId.slice(0, 15)}...`);
  }

  if (!clientSecret) {
    clientSecret = await ask('👉 Enter your Google Client Secret: ');
  } else {
    console.log(`ℹ️ Using configured GOOGLE_CLIENT_SECRET: ${clientSecret.slice(0, 6)}...`);
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID and Client Secret are required.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n================================================================');
  console.log('🌐 STEP 2: AUTHORIZE GOOGLE DRIVE ACCESS');
  console.log('================================================================');
  console.log('Open this URL in your web browser:');
  console.log(`\n🔗 ${authUrl}\n`);
  console.log('Waiting for authorization callback on http://localhost:3000/oauth2callback...');

  let codeReceived = false;

  const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith('/oauth2callback')) {
      const urlObj = new URL(req.url, 'http://localhost:3000');
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
        console.error(`❌ OAuth Error: ${error}`);
        server.close();
        process.exit(1);
      }

      if (code) {
        codeReceived = true;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication Successful!</h1><p>You can close this window now. The refresh token has been received.</p>`);
        server.close();

        await handleAuthCode(oauth2Client, clientId, clientSecret, code);
      }
    }
  });

  server.listen(3000, () => {
    console.log('Listening on http://localhost:3000 for callback...');
  });

  // Fallback: If local server cannot be reached, allow manual code entry
  setTimeout(async () => {
    if (!codeReceived) {
      console.log('\n💡 Alternatively, if your browser did not redirect automatically,');
      console.log('paste the "code" query parameter from the redirect URL below:');
      const manualCode = await ask('👉 Enter authorization code (or press Enter to keep waiting): ');
      if (manualCode) {
        server.close();
        await handleAuthCode(oauth2Client, clientId, clientSecret, manualCode);
      }
    }
  }, 10000);
}

async function handleAuthCode(oauth2Client, clientId, clientSecret, code) {
  try {
    console.log('\n⏳ Exchanging authorization code for OAuth tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      console.warn('⚠️ No refresh token was returned. If you have already authorized this app, go to your Google Account security settings, revoke access, and run this script again with prompt=consent.');
    } else {
      console.log('✅ Received Google OAuth Refresh Token!');
    }

    // Test Google Drive API
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log('🔍 Testing Google Drive connection...');
    const about = await drive.about.get({ fields: 'user(displayName, emailAddress), storageQuota' });
    console.log(`✅ Connected as: ${about.data.user?.displayName} (${about.data.user?.emailAddress})`);

    // Generate encryption key if missing
    let encryptionKey = env.BACKUP_ENCRYPTION_KEY;
    if (!encryptionKey) {
      encryptionKey = generateRandomEncryptionKey();
      console.log(`🔑 Generated fresh 256-bit AES-256-GCM Backup Encryption Key.`);
    }

    const updates = {
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      ...(tokens.refresh_token && { GOOGLE_REFRESH_TOKEN: tokens.refresh_token }),
      BACKUP_ENCRYPTION_KEY: encryptionKey,
    };

    updateEnvFile(updates);

    console.log('\n================================================================');
    console.log('🎉 GOOGLE DRIVE BACKUP CONFIGURATION COMPLETE!');
    console.log('================================================================');
    console.log('Your environment is ready. You can test a backup immediately by:');
    console.log('  1. Running: node src/scripts/runScheduledBackup.js');
    console.log('  2. Or clicking "Trigger Backup Now" in Settings > Backups');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to complete OAuth token exchange:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Setup error:', err);
  process.exit(1);
});
