import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

async function testProperties() {
  const ps = `
    $devices = Get-PnpDevice -PresentOnly | Where-Object {
      $_.FriendlyName -match 'Apple|iPhone|iPad|Samsung|Xiaomi|Redmi|Realme|OnePlus|Pixel|Vivo|Oppo|Motorola|Huawei|MTP' -or
      $_.Class -in @('WPD', 'AndroidUsbDeviceType')
    }
    
    $results = foreach ($d in $devices) {
      $props = Get-PnpDeviceProperty -InstanceId $d.InstanceId -ErrorAction SilentlyContinue | Where-Object { $_.Data -ne $null }
      $modelProp = $props | Where-Object { $_.KeyName -match 'DEVPKEY_Device_BusReportedDeviceDesc|DEVPKEY_Device_Model|DEVPKEY_Device_DeviceDesc' } | Select-Object -First 1
      [PSCustomObject]@{
        FriendlyName = $d.FriendlyName
        InstanceId = $d.InstanceId
        Class = $d.Class
        Status = $d.Status
        ReportedDesc = if ($modelProp) { $modelProp.Data } else { $null }
      }
    }
    $results | ConvertTo-Json -Compress
  `;

  const start = Date.now();
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 10000 });
  console.log(`Execution time: ${Date.now() - start}ms`);
  console.log('Result:\n', stdout);
}

testProperties();
