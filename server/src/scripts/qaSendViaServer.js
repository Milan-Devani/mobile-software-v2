import axios from 'axios';

async function testViaServer() {
  console.log('1. Logging in to http://localhost:5050/api/auth/login...');
  const loginRes = await axios.post('http://localhost:5050/api/auth/login', {
    email: 'admin@mobotech.com',
    password: 'Admin@123456',
  });

  const token = loginRes.data.data.token;
  console.log('✅ Logged in successfully. Token acquired.');

  console.log('\n2. Checking WhatsApp status on live server...');
  let isConnected = false;
  for (let i = 0; i < 15; i++) {
    const statusRes = await axios.get('http://localhost:5050/api/whatsapp/status');
    const st = statusRes.data?.data?.status;
    console.log(`[Attempt ${i + 1}] WhatsApp Status: ${st}`);
    if (st === 'CONNECTED') {
      isConnected = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (!isConnected) {
    throw new Error('WhatsApp did not reach CONNECTED status within timeout.');
  }
  console.log('✅ WhatsApp is CONNECTED on the server!');

  const targetPhone = process.argv[2] || process.env.QA_TEST_PHONE;
  const targetName = process.env.QA_TEST_NAME || 'Customer';
  if (!targetPhone) {
    throw new Error('Pass a phone number as the first argument or set QA_TEST_PHONE.');
  }
  console.log(`\n3. Sending WhatsApp test message to ${targetPhone} via live server...`);
  const customMessage =
    `*Mobotech Mobile Care — System Verification*\n` +
    `Hello ${targetName},\n\n` +
    `✅ *WhatsApp Connected Sender:* 7575841604\n` +
    `🔍 *QA Audit Status:* Full Master QA Inspection & Verification Active\n` +
    `⚡ *System State:* Frontend & Backend Operational\n` +
    `⏰ *Timestamp:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  const sendRes = await axios.post(
    'http://localhost:5050/api/whatsapp/send-test',
    {
      phone: targetPhone,
      message: customMessage,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log('✅ WhatsApp Send Result:', JSON.stringify(sendRes.data, null, 2));
}

testViaServer().catch((err) => {
  console.error('❌ Error sending via server:', err.response?.data || err.message);
  process.exit(1);
});
