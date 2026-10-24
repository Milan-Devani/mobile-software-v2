import { deviceBridgeService } from '../services/deviceBridgeService.js';

async function runCliTest() {
  console.log('====================================================');
  console.log('🔍 SCANNING FOR CONNECTED MOBILE DEVICES (USB BRIDGE)...');
  console.log('   Checking: iOS (libimobiledevice) -> Android (ADB) -> Windows PnP');
  console.log('====================================================');

  const start = Date.now();
  try {
    const result = await deviceBridgeService.detectConnectedDevice();
    const elapsed = Date.now() - start;

    console.log(`\nScan completed in ${elapsed}ms:`);
    console.log(JSON.stringify(result, null, 2));

    if (result.connected) {
      console.log('\n✅ DEVICE FOUND:');
      console.log(`   Platform: ${result.platform}`);
      console.log(`   Brand:    ${result.brand}`);
      console.log(`   Model:    ${result.model}`);
      console.log(`   IMEI:     ${result.imei || '(Not extracted / locked)'}`);
      console.log(`   Serial:   ${result.serial_number || '(N/A)'}`);
      console.log(`   OS:       ${result.os_version}`);
      console.log(`   Status:   ${result.device_status}`);
      if (result.action_required) {
        console.log(`   ⚠️ Notice: ${result.action_required}`);
      }
    } else {
      console.log('\n❌ NO DEVICE DETECTED:');
      console.log(`   ${result.message}`);
      console.log('   Tip: Plug a phone in via USB and unlock screen, then re-run this script.');
    }
  } catch (err) {
    console.error('Detection test failed with error:', err);
  }
  console.log('====================================================\n');
}

runCliTest();
