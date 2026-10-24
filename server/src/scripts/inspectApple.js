import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

async function inspectAppleProperties() {
  const ps = `
    $dev = Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like '*05AC*12A8*' }
    foreach ($d in $dev) {
      Write-Host "=== Device: $($d.FriendlyName) ($($d.InstanceId)) ==="
      $props = Get-PnpDeviceProperty -InstanceId $d.InstanceId -ErrorAction SilentlyContinue | Where-Object { $_.Data -ne $null }
      foreach ($p in $props) {
        if ($p.KeyName -match 'Desc|Name|Model|Manufacturer|Serial|Hardware|Location|Compatible|Vendor|Product') {
          Write-Host "$($p.KeyName): $($p.Data)"
        }
      }
    }
  `;

  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 15000 });
  console.log(stdout);
}

inspectAppleProperties();
