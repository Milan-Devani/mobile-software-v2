import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * DeviceBridgeService
 * Autonomous Hardware Bridge for iOS (libimobiledevice), Android (ADB),
 * and Windows USB PnP fallback detection.
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
   * Priority: 1. iOS (libimobiledevice) -> 2. Android (ADB) -> 3. Windows USB PnP Fallback
   */
  async detectConnectedDevice() {
    // 1. Attempt iOS detection
    try {
      const iosResult = await this.detectIosDevice();
      if (iosResult && iosResult.connected) {
        return iosResult;
      }
    } catch (err) {
      // Continue to Android
    }

    // 2. Attempt Android detection via ADB
    try {
      const androidResult = await this.detectAndroidDevice();
      if (androidResult && androidResult.connected) {
        return androidResult;
      }
    } catch (err) {
      // Continue to Windows PnP
    }

    // 3. Fallback to Windows USB PnP (Hardware Plug & Play query)
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
   * Detects iPhone / iPad via libimobiledevice / ideviceinfo
   */
  async detectIosDevice() {
    const cmd = `"${this.ideviceinfoPath}"`;
    try {
      const { stdout } = await execAsync(cmd, { timeout: 4000 });
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

      // Dynamic commercial model extraction
      const marketingName = props.MarketingName || props.DeviceName || props.ProductType || 'iPhone';
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

      // Check if iPhone is physically connected but locked / untrusted
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
      const { stdout: devicesOutput } = await execAsync(`${adb} devices -l`, { timeout: 3500 });
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

      // If unauthorized state
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

      // Query dynamic properties concurrently
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
        execAsync(`${adb} shell getprop ro.product.brand`, { timeout: 2500 }),
        execAsync(`${adb} shell getprop ro.product.marketname`, { timeout: 2500 }),
        execAsync(`${adb} shell settings get global device_name`, { timeout: 2500 }),
        execAsync(`${adb} shell settings get secure bluetooth_name`, { timeout: 2500 }),
        execAsync(`${adb} shell getprop ro.product.model`, { timeout: 2500 }),
        execAsync(`${adb} get-serialno`, { timeout: 2500 }),
        execAsync(`${adb} shell getprop ro.build.version.release`, { timeout: 2500 }),
        this.extractAndroidImei(adb),
      ]);

      const getVal = (res) => (res.status === 'fulfilled' && res.value?.stdout ? res.value.stdout.trim() : '');

      let brand = getVal(brandRaw) || 'Android';
      brand = brand.charAt(0).toUpperCase() + brand.slice(1);

      // Prioritize dynamic commercial marketing names:
      // 1. ro.product.marketname
      // 2. settings get global device_name
      // 3. settings get secure bluetooth_name
      // 4. ro.product.model
      let model =
        getVal(marketNameRaw) ||
        getVal(deviceNameRaw) ||
        getVal(btNameRaw) ||
        getVal(modelRaw) ||
        'Smartphone';

      // Clean null or undefined strings
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
    // 1. Try modern Android phone command (Android 10+)
    try {
      const { stdout } = await execAsync(`${adb} shell cmd phone get-imei`, { timeout: 2000 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    // 2. Try cmd iphonesubinfo
    try {
      const { stdout } = await execAsync(`${adb} shell cmd iphonesubinfo 1`, { timeout: 2000 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    // 3. Try service call iphonesubinfo 1 (parses hex dump)
    try {
      const { stdout } = await execAsync(`${adb} shell service call iphonesubinfo 1`, { timeout: 2000 });
      if (stdout) {
        // Strip out dots and hex formatting to extract 15 consecutive digits
        const cleaned = stdout.replace(/[^0-9]/g, '');
        const match = cleaned.match(/\b\d{15}\b/);
        if (match) return match[0];
      }
    } catch (e) {}

    // 4. Try getprop ril.gsm.imei
    try {
      const { stdout } = await execAsync(`${adb} shell getprop ril.gsm.imei`, { timeout: 1500 });
      const match = stdout.match(/\b\d{15}\b/);
      if (match) return match[0];
    } catch (e) {}

    return '';
  }

  /**
   * Fallback: Queries Windows PnP (Plug and Play) subsystem for USB connected mobile devices
   */
  async detectWindowsPnpDevice() {
    const psScript = `
      $devices = Get-CimInstance Win32_PnPEntity | Where-Object {
        $_.PNPClass -in @('WPD','AndroidUsbDeviceType','USB','Ports') -or
        $_.Caption -match 'Apple|iPhone|iPad|Android|Samsung|Xiaomi|Redmi|Realme|OnePlus|Pixel|Vivo|Oppo|Motorola|Huawei|MTP'
      } | Select-Object -First 6 Caption, Description, DeviceID, Manufacturer, PNPClass
      $devices | ConvertTo-Json -Compress
    `;

    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript], {
        timeout: 4500,
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

      // Look for Apple first
      const appleDev = list.find(
        (d) =>
          (d.Caption && /Apple|iPhone|iPad/i.test(d.Caption)) ||
          (d.Manufacturer && /Apple/i.test(d.Manufacturer))
      );

      if (appleDev) {
        let serial = '';
        if (appleDev.DeviceID && appleDev.DeviceID.includes('\\')) {
          const parts = appleDev.DeviceID.split('\\');
          serial = parts[parts.length - 1];
        }

        return {
          success: true,
          connected: true,
          platform: 'ios',
          brand: 'Apple',
          model: appleDev.Caption || 'Apple iPhone',
          serial_number: serial,
          imei: '',
          os_version: 'iOS',
          device_status: 'driver_only',
          message: 'Apple device connected via USB port.',
          action_required: 'Please unlock the iPhone and tap "Trust This Computer" to read specifications.',
        };
      }

      // Look for Android / OEM smartphone brands
      const oemRegex = /(samsung|xiaomi|redmi|realme|oneplus|pixel|vivo|oppo|motorola|huawei|honor|infinix|tecno|lenovo|asus|nokia|nothing)/i;
      const androidDev = list.find(
        (d) =>
          (d.Caption && oemRegex.test(d.Caption)) ||
          (d.Manufacturer && oemRegex.test(d.Manufacturer)) ||
          (d.Description && oemRegex.test(d.Description))
      );

      if (androidDev) {
        const text = `${androidDev.Caption || ''} ${androidDev.Manufacturer || ''}`;
        const match = text.match(oemRegex);
        let brand = match ? match[1] : 'Android';
        brand = brand.charAt(0).toUpperCase() + brand.slice(1);

        let model = androidDev.Caption || 'Smartphone';
        let serial = '';
        if (androidDev.DeviceID && androidDev.DeviceID.includes('\\')) {
          const parts = androidDev.DeviceID.split('\\');
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
          device_status: 'driver_only',
          message: `${brand} device detected on USB port.`,
          action_required: 'Enable USB Debugging on your phone to auto-fill IMEI and hardware properties.',
        };
      }

      // Check for generic MTP / Android Composite device
      const genericMtp = list.find(
        (d) => d.Caption && /MTP|Android|Composite/i.test(d.Caption) && d.PNPClass === 'WPD'
      );
      if (genericMtp) {
        return {
          success: true,
          connected: true,
          platform: 'android',
          brand: 'Android',
          model: genericMtp.Caption || 'MTP Mobile Device',
          serial_number: '',
          imei: '',
          os_version: 'Android',
          device_status: 'driver_only',
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
