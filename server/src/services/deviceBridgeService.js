import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import net from 'net';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Comprehensive Apple Commercial Marketing Name Table
const APPLE_MODEL_MAP = {
  'iPhone10,1': 'iPhone 8',
  'iPhone10,2': 'iPhone 8 Plus',
  'iPhone10,3': 'iPhone X',
  'iPhone10,4': 'iPhone 8',
  'iPhone10,5': 'iPhone 8 Plus',
  'iPhone10,6': 'iPhone X',
  'iPhone11,2': 'iPhone XS',
  'iPhone11,4': 'iPhone XS Max',
  'iPhone11,6': 'iPhone XS Max',
  'iPhone11,8': 'iPhone XR',
  'iPhone12,1': 'iPhone 11',
  'iPhone12,3': 'iPhone 11 Pro',
  'iPhone12,5': 'iPhone 11 Pro Max',
  'iPhone12,8': 'iPhone SE (2nd gen)',
  'iPhone13,1': 'iPhone 12 mini',
  'iPhone13,2': 'iPhone 12',
  'iPhone13,3': 'iPhone 12 Pro',
  'iPhone13,4': 'iPhone 12 Pro Max',
  'iPhone14,2': 'iPhone 13 Pro',
  'iPhone14,3': 'iPhone 13 Pro Max',
  'iPhone14,4': 'iPhone 13 mini',
  'iPhone14,5': 'iPhone 13',
  'iPhone14,6': 'iPhone SE (3rd gen)',
  'iPhone14,7': 'iPhone 14',
  'iPhone14,8': 'iPhone 14 Plus',
  'iPhone15,2': 'iPhone 14 Pro',
  'iPhone15,3': 'iPhone 14 Pro Max',
  'iPhone15,4': 'iPhone 15',
  'iPhone15,5': 'iPhone 15 Plus',
  'iPhone16,1': 'iPhone 15 Pro',
  'iPhone16,2': 'iPhone 15 Pro Max',
  'iPhone17,1': 'iPhone 16 Pro',
  'iPhone17,2': 'iPhone 16 Pro Max',
  'iPhone17,3': 'iPhone 16',
  'iPhone17,4': 'iPhone 16 Plus',
};

function createUsbmuxdPacket(tag, plistXml) {
  const payload = Buffer.from(plistXml, 'utf-8');
  const length = 16 + payload.length;
  const header = Buffer.alloc(16);
  header.writeUInt32LE(length, 0);
  header.writeUInt32LE(1, 4); // version 1
  header.writeUInt32LE(8, 8); // request = 8 (PLIST)
  header.writeUInt32LE(tag, 12);
  return Buffer.concat([header, payload]);
}

function htons(port) {
  return ((port & 0xff) << 8) | ((port >> 8) & 0xff);
}

function createLockdownPacket(plistXml) {
  const payload = Buffer.from(plistXml, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

function extractPlistVal(xml, key) {
  const reg = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`, 'i');
  const match = xml.match(reg);
  if (match) return match[1];

  const intReg = new RegExp(`<key>${key}</key>\\s*<integer>([^<]+)</integer>`, 'i');
  const intMatch = xml.match(intReg);
  if (intMatch) return intMatch[1];

  return '';
}

/**
 * DeviceBridgeService
 * Autonomous Hardware Bridge for iOS (native usbmuxd socket + libimobiledevice),
 * Android (ADB), and ultra-fast Windows USB PnP fallback detection.
 */
class DeviceBridgeService {
  constructor() {
    this.adbPath = this.resolveAdbPath();
    this.ideviceinfoPath = this.resolveIdeviceinfoPath();
  }

  /**
   * Resolves ADB executable path across standard environment and Android SDK locations.
   */
  resolveAdbPath() {
    const candidates = [
      'adb',
      path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
      'C:\\Users\\Milan Devani\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
      'C:\\Program Files\\Android\\platform-tools\\adb.exe',
      'C:\\Program Files (x86)\\Android\\platform-tools\\adb.exe',
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate === 'adb') continue;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return 'adb';
  }

  /**
   * Resolves ideviceinfo executable path across system & third-party mobile suites.
   */
  resolveIdeviceinfoPath() {
    const candidates = [
      'ideviceinfo',
      'C:\\Program Files\\libimobiledevice\\ideviceinfo.exe',
      'C:\\Program Files (x86)\\libimobiledevice\\ideviceinfo.exe',
      'C:\\3uTools\\ideviceinfo.exe',
      'C:\\Program Files\\3uTools\\ideviceinfo.exe',
      'C:\\Program Files (x86)\\3uTools\\ideviceinfo.exe',
    ];

    for (const candidate of candidates) {
      if (candidate === 'ideviceinfo') continue;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return 'ideviceinfo';
  }

  /**
   * Main entry point for detecting connected mobile devices.
   * Priority:
   * 1. iOS via Native usbmuxd Socket (Port 27015 - ~15ms, zero dependencies)
   * 2. iOS via ideviceinfo CLI
   * 3. Android via ADB
   * 4. Windows USB PnP Fast Discovery (< 1 second)
   */
  async detectConnectedDevice() {
    // 1. Attempt iOS detection via native usbmuxd socket
    try {
      const usbmuxdResult = await this.detectViaNativeUsbmuxd();
      if (usbmuxdResult && usbmuxdResult.connected) {
        return usbmuxdResult;
      }
    } catch (err) {
      // Continue to next check
    }

    // 2. Attempt iOS detection via CLI
    try {
      const iosResult = await this.detectIosDevice();
      if (iosResult && iosResult.connected) {
        return iosResult;
      }
    } catch (err) {
      // Continue to Android
    }

    // 3. Attempt Android detection via ADB
    try {
      const androidResult = await this.detectAndroidDevice();
      if (androidResult && androidResult.connected) {
        return androidResult;
      }
    } catch (err) {
      // Continue to Windows PnP
    }

    // 4. Fast Windows USB PnP query (covers Samsung, Xiaomi, Apple, Pixel, OnePlus, Vivo, Oppo, MTP)
    try {
      const pnpResult = await this.detectWindowsPnpDevice();
      if (pnpResult && pnpResult.connected) {
        return pnpResult;
      }
    } catch (err) {
      // PnP query failed
    }

    return {
      success: true,
      connected: false,
      platform: null,
      brand: '',
      model: '',
      serial_number: '',
      imei: '',
      os_version: '',
      device_status: 'not_connected',
      message: 'No mobile device detected on USB. Please connect your phone with a USB data cable.',
      action_required: 'Connect phone via USB cable and unlock screen.',
    };
  }

  /**
   * Direct native TCP communication with Apple's usbmuxd daemon on port 27015
   */
  async detectViaNativeUsbmuxd() {
    return new Promise((resolve) => {
      let resolved = false;
      const finish = (val) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      const client = net.createConnection({ port: 27015, host: '127.0.0.1' }, () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>MessageType</key>
    <string>ListDevices</string>
    <key>ClientVersionString</key>
    <string>mobotech-usbmuxd</string>
    <key>ProgName</key>
    <string>Mobotech</string>
</dict>
</plist>`;
        client.write(createUsbmuxdPacket(1, xml));
      });

      client.setTimeout(2500, () => {
        client.destroy();
        finish(null);
      });

      let buffer = Buffer.alloc(0);
      let deviceId = null;
      let serialNumber = '';
      let stage = 'list_devices';

      client.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        if (stage === 'list_devices') {
          if (buffer.length >= 16) {
            const totalLen = buffer.readUInt32LE(0);
            if (buffer.length >= totalLen) {
              const xml = buffer.slice(16, totalLen).toString('utf-8');
              buffer = buffer.slice(totalLen);

              const devIdMatch = xml.match(/<key>DeviceID<\/key>\s*<integer>(\d+)<\/integer>/i);
              const serialMatch = xml.match(/<key>SerialNumber<\/key>\s*<string>([^<]+)<\/string>/i);

              if (!devIdMatch) {
                client.end();
                return finish(null);
              }

              deviceId = parseInt(devIdMatch[1], 10);
              serialNumber = serialMatch ? serialMatch[1] : '';

              stage = 'lockdown_connect';
              const connectXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>MessageType</key>
    <string>Connect</string>
    <key>ClientVersionString</key>
    <string>mobotech-client</string>
    <key>ProgName</key>
    <string>Mobotech</string>
    <key>DeviceID</key>
    <integer>${deviceId}</integer>
    <key>PortNumber</key>
    <integer>${htons(62078)}</integer>
</dict>
</plist>`;
              client.write(createUsbmuxdPacket(2, connectXml));
            }
          }
        } else if (stage === 'lockdown_connect') {
          if (buffer.length >= 16) {
            const totalLen = buffer.readUInt32LE(0);
            if (buffer.length >= totalLen) {
              buffer = buffer.slice(totalLen);
              stage = 'lockdown_query';

              const queryXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>Mobotech</string>
    <key>Request</key>
    <string>GetValue</string>
</dict>
</plist>`;
              client.write(createLockdownPacket(queryXml));
            }
          }
        } else if (stage === 'lockdown_query') {
          if (buffer.length >= 4) {
            const payloadLen = buffer.readUInt32BE(0);
            if (buffer.length >= 4 + payloadLen) {
              const xml = buffer.slice(4, 4 + payloadLen).toString('utf-8');
              client.end();

              if (xml.includes('PasswordProtected') || xml.includes('DeviceLocked')) {
                return finish({
                  success: true,
                  connected: true,
                  platform: 'ios',
                  brand: 'Apple',
                  model: 'iPhone (Locked)',
                  serial_number: serialNumber,
                  imei: '',
                  os_version: 'iOS',
                  device_status: 'locked',
                  message: 'Apple iPhone detected! Screen is locked or untrusted.',
                  action_required: 'Please unlock your iPhone screen and tap "Trust This Computer".',
                });
              }

              const productType = extractPlistVal(xml, 'ProductType') || 'iPhone';
              const deviceName = extractPlistVal(xml, 'DeviceName') || 'iPhone';
              const productVersion = extractPlistVal(xml, 'ProductVersion') || extractPlistVal(xml, 'HumanReadableProductVersionString') || '';
              const udid = extractPlistVal(xml, 'UniqueDeviceID') || serialNumber;
              const imei = extractPlistVal(xml, 'InternationalMobileEquipmentIdentity') || extractPlistVal(xml, 'IMEI') || '';

              const commercialModel = APPLE_MODEL_MAP[productType] || productType || 'iPhone';
              const osDisplay = productVersion ? `iOS ${productVersion}` : 'iOS';

              return finish({
                success: true,
                connected: true,
                platform: 'ios',
                brand: 'Apple',
                model: commercialModel,
                serial_number: udid,
                imei: imei || '',
                os_version: osDisplay,
                device_status: 'authorized',
                message: `Successfully connected: Apple ${commercialModel} (${deviceName})`,
                details: {
                  product_type: productType,
                  device_name: deviceName,
                  udid,
                },
              });
            }
          }
        }
      });

      client.on('error', () => finish(null));
    });
  }

  /**
   * Detects iPhone / iPad via libimobiledevice / ideviceinfo CLI
   */
  async detectIosDevice() {
    const cmd = `"${this.ideviceinfoPath}"`;
    try {
      const { stdout } = await execAsync(cmd, { timeout: 3500 });
      if (!stdout || stdout.trim().length === 0) return null;

      const props = {};
      const lines = stdout.split('\n');
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          props[key] = val;
        }
      }

      const productType = props.ProductType || '';
      const marketingName = props.MarketingName || props.DeviceName || APPLE_MODEL_MAP[productType] || productType || 'iPhone';
      const serial = props.SerialNumber || props.UniqueDeviceID || '';
      const imei = props.InternationalMobileEquipmentIdentity || props.IMEI || props.InternationalMobileEquipmentIdentity2 || '';
      const osVersion = props.ProductVersion ? `iOS ${props.ProductVersion}` : 'iOS';

      return {
        success: true,
        connected: true,
        platform: 'ios',
        brand: 'Apple',
        model: marketingName,
        serial_number: serial,
        imei: imei,
        os_version: osVersion,
        device_status: 'authorized',
        message: `Successfully connected: Apple ${marketingName} (${osVersion})`,
        details: {
          product_type: props.ProductType,
          battery_current_capacity: props.BatteryCurrentCapacity,
        },
      };
    } catch (err) {
      const errMsg = (err.stderr || err.message || '').toLowerCase();

      if (
        errMsg.includes('passwordprotected') ||
        errMsg.includes('devicelocked') ||
        errMsg.includes('could not connect to lockdownd') ||
        errMsg.includes('trust')
      ) {
        return {
          success: true,
          connected: true,
          platform: 'ios',
          brand: 'Apple',
          model: 'iPhone (Locked)',
          serial_number: '',
          imei: '',
          os_version: 'iOS',
          device_status: 'locked',
          message: 'Apple iPhone detected! Screen is locked or untrusted.',
          action_required: 'Please unlock your iPhone screen and tap "Trust This Computer".',
        };
      }
      return null;
    }
  }

  /**
   * Detects Android device dynamically via ADB
   */
  async detectAndroidDevice() {
    const adb = `"${this.adbPath}"`;
    try {
      const { stdout: devicesOutput } = await execAsync(`${adb} devices -l`, { timeout: 3000 });
      if (!devicesOutput) return null;

      const lines = devicesOutput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('*') && !l.startsWith('List of devices'));

      if (lines.length === 0) return null;

      const firstLine = lines[0];
      const parts = firstLine.split(/\s+/);
      const serialFromList = parts[0];
      const state = parts[1];

      if (state === 'unauthorized') {
        return {
          success: true,
          connected: true,
          platform: 'android',
          brand: 'Android Device',
          model: 'Phone Connected (Unauthorized)',
          serial_number: serialFromList,
          imei: '',
          os_version: 'Android',
          device_status: 'unauthorized',
          message: 'Android phone detected, but USB debugging is unauthorized.',
          action_required: 'Check phone screen and tap "Allow USB debugging" (Allow from this computer).',
        };
      }

      if (state !== 'device') {
        return null;
      }

      const [
        brandRaw,
        marketNameRaw,
        deviceNameRaw,
        btNameRaw,
        modelRaw,
        serialRaw,
        osVersionRaw,
        imei1Raw,
      ] = await Promise.allSettled([
        execAsync(`${adb} shell getprop ro.product.brand`, { timeout: 2000 }),
        execAsync(`${adb} shell getprop ro.product.marketname`, { timeout: 2000 }),
        execAsync(`${adb} shell settings get global device_name`, { timeout: 2000 }),
        execAsync(`${adb} shell settings get secure bluetooth_name`, { timeout: 2000 }),
        execAsync(`${adb} shell getprop ro.product.model`, { timeout: 2000 }),
        execAsync(`${adb} get-serialno`, { timeout: 2000 }),
        execAsync(`${adb} shell getprop ro.build.version.release`, { timeout: 2000 }),
        this.extractAndroidImei(adb),
      ]);

      const getVal = (res) => (res.status === 'fulfilled' && res.value?.stdout ? res.value.stdout.trim() : '');

      let brand = getVal(brandRaw) || 'Android';
      brand = brand.charAt(0).toUpperCase() + brand.slice(1);

      let model =
        getVal(marketNameRaw) ||
        getVal(deviceNameRaw) ||
        getVal(btNameRaw) ||
        getVal(modelRaw) ||
        'Smartphone';

      if (model.toLowerCase() === 'null' || model.toLowerCase() === 'unknown') {
        model = getVal(modelRaw) || 'Smartphone';
      }

      const serial = getVal(serialRaw) || serialFromList || '';
      const osRel = getVal(osVersionRaw);
      const osVersion = osRel ? `Android ${osRel}` : 'Android';
      const imei = imei1Raw.status === 'fulfilled' ? imei1Raw.value : '';

      return {
        success: true,
        connected: true,
        platform: 'android',
        brand,
        model,
        serial_number: serial,
        imei: imei || '',
        os_version: osVersion,
        device_status: 'authorized',
        message: `Successfully connected: ${brand} ${model} (${osVersion})`,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Dynamic Android IMEI extraction using phone service commands
   */
  async extractAndroidImei(adb) {
    try {
      const { stdout } = await execAsync(`${adb} shell cmd phone get-imei`, { timeout: 1500 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    try {
      const { stdout } = await execAsync(`${adb} shell cmd iphonesubinfo 1`, { timeout: 1500 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    try {
      const { stdout } = await execAsync(`${adb} shell service call iphonesubinfo 1`, { timeout: 1500 });
      if (stdout) {
        const cleaned = stdout.replace(/[^0-9]/g, '');
        const match = cleaned.match(/\b\d{15}\b/);
        if (match) return match[0];
      }
    } catch (e) {}

    try {
      const { stdout } = await execAsync(`${adb} shell getprop ril.gsm.imei`, { timeout: 1500 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    return '';
  }

  /**
   * Ultra-Fast Windows PnP (Plug and Play) Query (< 1 second)
   * Uses Get-PnpDevice -PresentOnly instead of slow WMI queries
   */
  async detectWindowsPnpDevice() {
    const psScript = `
      $devices = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object {
        $_.Class -in @('WPD','AndroidUsbDeviceType') -or
        $_.FriendlyName -match 'Apple|iPhone|iPad|Android|Samsung|Xiaomi|Redmi|Realme|OnePlus|Pixel|Vivo|Oppo|Motorola|Huawei|MTP' -or
        $_.InstanceId -match 'VID_05AC'
      } | Select-Object -First 10 FriendlyName, InstanceId, Class, Status
      if ($devices) { $devices | ConvertTo-Json -Compress }
    `;

    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript], {
        timeout: 3500,
      });

      if (!stdout || stdout.trim().length === 0) return null;

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (e) {
        return null;
      }

      const list = Array.isArray(parsed) ? parsed : [parsed];
      if (list.length === 0 || !list[0]) return null;

      // 1. Look for Apple iPhone
      const appleDev = list.find(
        (d) =>
          (d.FriendlyName && /Apple|iPhone|iPad/i.test(d.FriendlyName)) ||
          (d.InstanceId && /05AC/i.test(d.InstanceId))
      );

      if (appleDev) {
        let serial = '';
        if (appleDev.InstanceId && appleDev.InstanceId.includes('\\')) {
          const parts = appleDev.InstanceId.split('\\');
          const last = parts[parts.length - 1];
          // Check for Apple Unique Device ID (e.g. 00008120001C69E10E07C01E)
          if (/^[a-zA-Z0-9_-]{16,40}$/.test(last)) {
            serial = last;
          }
        }

        return {
          success: true,
          connected: true,
          platform: 'ios',
          brand: 'Apple',
          model: appleDev.FriendlyName === 'Apple Mobile Device USB Composite Device' ? 'Apple iPhone' : (appleDev.FriendlyName || 'Apple iPhone'),
          serial_number: serial,
          imei: '',
          os_version: 'iOS',
          device_status: 'authorized',
          message: 'Apple iPhone detected and connected via USB port.',
          action_required: 'Phone is connected. Tap "Trust This Computer" on iPhone to unlock additional specs.',
        };
      }

      // 2. Look for Android / OEM smartphone brands
      const oemRegex = /(samsung|xiaomi|redmi|realme|oneplus|pixel|vivo|oppo|motorola|huawei|honor|infinix|tecno|lenovo|asus|nokia|nothing)/i;
      const androidDev = list.find(
        (d) =>
          (d.FriendlyName && oemRegex.test(d.FriendlyName)) ||
          (d.InstanceId && oemRegex.test(d.InstanceId))
      );

      if (androidDev) {
        const text = `${androidDev.FriendlyName || ''} ${androidDev.InstanceId || ''}`;
        const match = text.match(oemRegex);
        let brand = match ? match[1] : 'Android';
        brand = brand.charAt(0).toUpperCase() + brand.slice(1);

        let model = androidDev.FriendlyName || 'Smartphone';
        let serial = '';
        if (androidDev.InstanceId && androidDev.InstanceId.includes('\\')) {
          const parts = androidDev.InstanceId.split('\\');
          const last = parts[parts.length - 1];
          if (/^[a-zA-Z0-9_-]{6,30}$/.test(last)) {
            serial = last;
          }
        }

        return {
          success: true,
          connected: true,
          platform: 'android',
          brand,
          model,
          serial_number: serial,
          imei: '',
          os_version: 'Android',
          device_status: 'authorized',
          message: `${brand} device detected on USB port.`,
          action_required: 'Enable USB Debugging on your phone to auto-fill IMEI and hardware properties.',
        };
      }

      // 3. Generic MTP / Android Portable Device
      const genericMtp = list.find(
        (d) => d.FriendlyName && /MTP|Android|Phone|Device/i.test(d.FriendlyName) && d.Class === 'WPD'
      );
      if (genericMtp) {
        return {
          success: true,
          connected: true,
          platform: 'android',
          brand: 'Android',
          model: genericMtp.FriendlyName || 'MTP Mobile Device',
          serial_number: '',
          imei: '',
          os_version: 'Android',
          device_status: 'authorized',
          message: 'Android MTP device detected via USB.',
          action_required: 'Please switch USB mode to "File Transfer" or enable USB Debugging.',
        };
      }

      return null;
    } catch (err) {
      return null;
    }
  }
}

export const deviceBridgeService = new DeviceBridgeService();
export default deviceBridgeService;
