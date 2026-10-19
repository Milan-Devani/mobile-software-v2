import { sendBaileysMessage, formatJid, getBaileysStatus } from '../services/baileysService.js';
import { sendBrevoEmail } from '../services/brevoEmailService.js';
import { env } from '../config/env.js';

async function run() {
  console.log('========================================================');
  console.log('🚀 QA AUDIT NOTIFICATION DISPATCH VERIFICATION');
  console.log('========================================================');

  // 1. Check Baileys WhatsApp Connection
  const wpStatus = getBaileysStatus();
  console.log('📱 WhatsApp Status:', JSON.stringify(wpStatus, null, 2));

  // 2. Send WhatsApp message to 8758152507
  const targetPhone = '8758152507';
  const wpText = `*Mobotech Mobile Care — System Verification*\n` +
    `Hello Milan Devani,\n\n` +
    `✅ *WhatsApp Connected Sender:* 7575841604\n` +
    `🔍 *QA Audit Status:* Full Master QA Inspection In Progress\n` +
    `⚡ *System State:* Frontend & Backend Operational\n` +
    `⏰ *Timestamp:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  try {
    console.log(`\n📤 Sending WhatsApp to ${targetPhone}...`);
    const wpResult = await sendBaileysMessage({
      phone: targetPhone,
      message: wpText,
    });
    console.log('✅ WhatsApp Result:', JSON.stringify(wpResult, null, 2));
  } catch (wpErr) {
    console.error('❌ WhatsApp Send Error:', wpErr.message);
  }

  // 3. Send Brevo Email to milandevani994@gmail.com
  const targetEmail = 'milandevani994@gmail.com';
  console.log(`\n📧 Sending Email to ${targetEmail}...`);
  try {
    const emailResult = await sendBrevoEmail({
      toEmail: targetEmail,
      toName: 'Milan Devani',
      subject: 'Mobotech Care — System Verification & QA Audit Initiated',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px; border-radius: 8px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">Mobotech Mobile Care</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">System Verification & Full QA Audit</p>
          </div>
          <div style="padding: 20px 0; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Hello <strong>Milan Devani</strong>,</p>
            <p>This automated notification confirms that your communication channels are active and integrated with the Mobotech management system:</p>
            <ul style="background: #f8fafc; padding: 15px 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <li><strong>WhatsApp Sender:</strong> 7575841604 (Connected via Baileys)</li>
              <li><strong>WhatsApp Recipient:</strong> 8758152507</li>
              <li><strong>Email Provider:</strong> Brevo Transactional API</li>
              <li><strong>Email Recipient:</strong> ${targetEmail}</li>
              <li><strong>Audit Status:</strong> Comprehensive Phase 1-15 Execution</li>
            </ul>
            <p style="color: #64748b; font-size: 12px;">Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      `,
    });
    console.log('✅ Email Result:', JSON.stringify(emailResult, null, 2));
  } catch (emailErr) {
    console.error('❌ Email Send Error:', emailErr.message);
  }

  console.log('\n========================================================');
  console.log('🎉 Verification run complete.');
  console.log('========================================================');
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal runner error:', e);
  process.exit(1);
});
