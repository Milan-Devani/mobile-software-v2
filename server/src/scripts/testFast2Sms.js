import { testFast2SmsConnection } from '../services/fast2smsService.js';
import { env } from '../config/env.js';

// Read target phone from CLI args or default
const targetPhone = process.argv[2] || '8758152507';
const customMsg = process.argv[3] || `*Mobotech Mobile Care*\nHello Milan, this is an official test message from Mobotech Service Portal!\nFast2SMS Status: Verified & Connected.`;

console.log('========================================================');
console.log('🚀 FAST2SMS WHATSAPP TEST RUNNER');
console.log('========================================================');
console.log(`🔑 FAST2SMS_API_KEY Configured: ${env.FAST2SMS_API_KEY ? 'YES (' + env.FAST2SMS_API_KEY.slice(0, 8) + '...)' : 'NO (Running in Simulator Mode)'}`);
console.log(`📱 Target Phone: ${targetPhone}`);
console.log('--------------------------------------------------------');

testFast2SmsConnection(targetPhone, customMsg)
  .then((result) => {
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('========================================================');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error during Fast2SMS test:', err.message);
    console.log('========================================================');
    process.exit(1);
  });
