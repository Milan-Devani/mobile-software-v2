import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import QRCode from 'qrcode';
import axios from 'axios';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../utils/checklistConstants.js';

/**
 * Converts local or remote image URLs to inlined base64 data URIs
 * so Chromium headless renders them immediately without network delays or local file resolution failures.
 */
export async function imageSourceToDataUrl(source) {
  if (!source || typeof source !== 'string') return '';
  const trimmed = source.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;

  // 1. Check if it's a local upload in server/uploads or relative path
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  let localFilename = '';
  if (trimmed.includes('/uploads/')) {
    localFilename = trimmed.split('/uploads/')[1].split('?')[0];
  } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    localFilename = trimmed;
  }

  if (localFilename) {
    const fullLocalPath = path.join(uploadsDir, localFilename);
    if (fs.existsSync(fullLocalPath)) {
      try {
        const ext = path.extname(fullLocalPath).toLowerCase();
        const mimeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.gif': 'image/gif',
        };
        const mime = mimeMap[ext] || 'image/png';
        const fileBuf = fs.readFileSync(fullLocalPath);
        return `data:${mime};base64,${fileBuf.toString('base64')}`;
      } catch (err) {
        console.warn('⚠️ Error reading local upload image:', err.message);
      }
    }
  }

  // 2. If it's an HTTP/HTTPS URL, fetch it and convert to base64 Data URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const response = await axios.get(trimmed, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const mime = response.headers['content-type'] || 'image/jpeg';
      const b64 = Buffer.from(response.data).toString('base64');
      return `data:${mime};base64,${b64}`;
    } catch (netErr) {
      console.warn('⚠️ Error converting image URL to base64 for PDF:', trimmed, netErr.message);
    }
  }

  return '';
}

// Code 39 Barcode Generator for crisp vector barcodes in PDF
const CODE39_PATTERNS = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

function generateBarcodeSvg(val, height = 20, align = 'right') {
  const clean = (val || 'REF12345').toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '-');
  const full = `*${clean}*`;
  let currentX = 0;
  const narrow = 1.0;
  const wide = 2.4;
  const interGap = 1.0;
  let rects = '';
  for (let i = 0; i < full.length; i++) {
    const pattern = CODE39_PATTERNS[full[i]] || CODE39_PATTERNS['-'];
    for (let p = 0; p < pattern.length; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wide : narrow;
      if (isBar) {
        rects += `<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000" shape-rendering="crispEdges"/>`;
      }
      currentX += w;
    }
    currentX += interGap;
  }
  const totalW = Math.max(110, currentX);
  return `
    <div style="display:inline-flex; flex-direction:column; align-items:${align === 'right' ? 'flex-end' : align === 'left' ? 'flex-start' : 'center'};">
      <svg viewBox="0 0 ${totalW} ${height}" style="height:${height}px; width:auto; max-width:160px; display:block;" shape-rendering="crispEdges">
        ${rects}
      </svg>
      <span style="font-family:monospace; font-size:11.5px; font-weight:700; color:#000; margin-top:1px; text-align:${align}; width:100%;">
        ${clean}
      </span>
    </div>
  `;
}

function findBrowserBinary() {
  const candidatePaths = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function generateInvoicePdfBuffer({ job, invoice, shop, trackingUrl = '' }) {
  const browserBinary = findBrowserBinary();
  if (!browserBinary) {
    throw new Error('Chromium/Edge browser binary not found on host for vector PDF generation');
  }

  // Generate QR code data URL
  let qrDataUrl = '';
  try {
    const qrTarget = trackingUrl || `https://mobotech.com/track/${job.job_number}`;
    qrDataUrl = await QRCode.toDataURL(qrTarget, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  } catch (e) {
    console.error('QR code generation warning:', e);
  }

  // Convert shop logo to inline base64 Data URL so Chromium headless embeds it reliably
  const shopLogoDataUrl = await imageSourceToDataUrl(shop?.logo_url);

  const dev = job.device || {};
  const cust = job.customer || {};
  const cond = job.device_condition || {};
  const items = invoice?.items || job.estimate?.items || job.estimate_items || [];
  const payments = job.payments || [];
  const shopObj = {
    name: shop?.name || 'Mobotech mobile care',
    address: shop?.address || 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
    city: shop?.city || 'Surat',
    state: shop?.state || 'Gujarat',
    postal_code: shop?.postal_code || '395006',
    phone: shop?.phone || '080000 24439',
    email: shop?.email || 'support@mobotech.com',
    timings: shop?.timings || 'Mon - Sat: 10:30 AM to 06:30 PM',
  };

  const d = job.created_at ? new Date(job.created_at) : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const inwardDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  const sigD = invoice?.issued_at ? new Date(invoice.issued_at) : new Date();
  const sigDate = `(${String(sigD.getDate()).padStart(2, '0')}-${String(sigD.getMonth() + 1).padStart(2, '0')}-${sigD.getFullYear()} ${String(sigD.getHours()).padStart(2, '0')}:${String(sigD.getMinutes()).padStart(2, '0')})`;
  const techName = job.technician?.full_name || 'Jaimini Patel';

  const rawAccessories = job.accessories_received || [];
  let actualReceivedAccessories = [];
  if (Array.isArray(rawAccessories)) {
    actualReceivedAccessories = rawAccessories.filter(Boolean);
  } else if (typeof rawAccessories === 'string' && rawAccessories.trim()) {
    try {
      const parsed = JSON.parse(rawAccessories);
      actualReceivedAccessories = Array.isArray(parsed) ? parsed.filter(Boolean) : [rawAccessories];
    } catch {
      actualReceivedAccessories = rawAccessories.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  const checklistRows = INWARD_CHECKLIST_CONFIG.map((item) => ({
    label: item.label,
    val: resolveChecklistValue(item.key, cond),
  }));

  const paidViaSummary = payments.length > 0
    ? payments.map((p) => `${p.payment_method} (₹${Number(p.amount).toFixed(2)})`).join(', ')
    : 'CASH (₹' + Number(invoice?.paid_amount || job.paid_amount || 0).toFixed(2) + ')';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Mobotech Invoice - ${job.job_number}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 5mm 6mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.25;
  }
  .page {
    width: 100%;
    height: 287mm;
    max-height: 287mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
  .border-box { border: 1px solid #000; }
  .border-b { border-bottom: 1px solid #000; }
  .border-t { border-top: 1px solid #000; }
  .border-r { border-right: 1px solid #000; }
  .grid-2 { display: flex; width: 100%; }
  .col-2 { width: 50%; }
  .table-header {
    background: #f1f5f9;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11.5px;
    padding: 2.5px 5px;
    border-bottom: 1px solid #000;
  }
  .checklist-row {
    display: flex;
    justify-content: space-between;
    padding: 1.5px 5px;
    border-bottom: 1px solid #cbd5e1;
    font-size: 11px;
  }
  .checklist-row:last-child { border-bottom: none; }
  table.items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  table.items-table th, table.items-table td {
    border: 1px solid #000;
    padding: 2.5px 5px;
  }
  table.items-table th {
    background: #f1f5f9;
    font-weight: 700;
    text-transform: uppercase;
  }
  .sig-row {
    display: flex;
    justify-content: space-between;
    padding-top: 4px;
    font-size: 11.5px;
  }
  .sig-box { width: 45%; }
</style>
</head>
<body>

<!-- PAGE 1: SERVICE RECORD & TAX INVOICE -->
<div class="page">
  <div>
    <!-- Top Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:4px;">
      <div style="display:flex; align-items:center; gap:8px;">
        ${shopLogoDataUrl ? `
          <div style="width:36px; height:36px; border-radius:6px; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#fff; padding:2px;">
            <img src="${shopLogoDataUrl}" alt="${shopObj.name}" style="max-width:100%; max-height:100%; object-fit:contain;" />
          </div>
        ` : `
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="#000" stroke-width="2.5" />
            <path d="M9 22V10L16 17L23 10V22" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="16" cy="7" r="1.5" fill="#000" />
          </svg>
        `}
        <div>
          <div style="font-size:22px; font-weight:900; line-height:1; letter-spacing:-0.5px;">${shopObj.name.toLowerCase()}</div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#1e293b;">${shop?.tagline || 'mobile care'}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px; font-weight:900; line-height:1.1;">Service Record</div>
        <div style="font-size:11.5px; color:#475569;">Tax Invoice & Device Inspection Report</div>
      </div>
    </div>

    <!-- Main Outer Table -->
    <div class="border-box">
      <!-- 2 Columns Body -->
      <div class="grid-2 border-b">
        <!-- LEFT COLUMN -->
        <div class="col-2 border-r" style="display:flex; flex-direction:column; justify-content:space-between;">
          <!-- Service Details -->
          <div style="padding:4px 6px; border-bottom:1px solid #000;">
            <div style="font-weight:700; font-size:12.5px; text-transform:uppercase; margin-bottom:2px;">Service Details</div>
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:2px;">
              <span style="font-weight:700; font-size:11.5px;">Reference ID:</span>
              ${generateBarcodeSvg(invoice?.invoice_number || job.job_number, 20, 'right')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:2px;">
              <span style="font-weight:700; font-size:11.5px;">Serial Number:</span>
              ${generateBarcodeSvg(dev.imei || dev.serial_number || '789654123654789', 20, 'right')}
            </div>
            <div style="font-size:11px; padding-top:2px; border-top:1px solid #cbd5e1; line-height:1.25;">
              <div>Service Mode: <b>Carry in</b></div>
              <div>*Service Coverage Status: <b>${dev.warranty_status || 'Out of Warranty'}</b></div>
              <div>Date of Device Inward: <b>${inwardDate}</b></div>
            </div>
          </div>

          <!-- Customer Details -->
          <div style="padding:4px 6px; border-bottom:1px solid #000; font-size:11.5px;">
            <div style="font-weight:700; font-size:12.5px; text-transform:uppercase; margin-bottom:2px;">Customer Details</div>
            <div><span style="font-size:10.5px; text-transform:uppercase; font-weight:700; display:block;">Name:</span><b style="font-size:13px;">${cust.full_name || 'Milan Devani'}</b></div>
            <div style="margin-top:1px;"><span style="font-size:10.5px; text-transform:uppercase; font-weight:700; display:block;">Address:</span>${cust.address || (cust.city ? `${cust.city}, ${cust.state || 'Gujarat'}, India` : 'pasodara')}</div>
            <div style="display:flex; justify-content:space-between; margin-top:2px;">
              <div style="width:50%;"><span style="font-size:10.5px; text-transform:uppercase; font-weight:700; display:block;">Contact Number:</span><b>${cust.phone || '8758152507'}</b></div>
              <div style="width:50%;"><span style="font-size:10.5px; text-transform:uppercase; font-weight:700; display:block;">Email ID:</span><b>${cust.email || 'milandevani@gmail.com'}</b></div>
            </div>
            ${cust.alternate_phone ? `<div style="margin-top:1px;"><span style="font-size:10.5px; text-transform:uppercase; font-weight:700; display:block;">Alternate Contact:</span><b>${cust.alternate_phone}</b></div>` : ''}
          </div>

          <!-- Product Details -->
          <div style="padding:4px 6px; border-bottom:1px solid #000; font-size:11.5px;">
            <div style="font-weight:700; font-size:12.5px; text-transform:uppercase; margin-bottom:2px;">Product Details</div>
            <div style="display:flex; margin-bottom:2px;">
              <span style="width:50%; font-weight:700; text-transform:uppercase; font-size:11px;">Model Name:</span>
              <span style="width:50%; font-weight:700; font-size:12px;">${dev.model || (dev.brand ? `${dev.brand} ${dev.model}` : 'iPhone 14 Pro')}</span>
            </div>
            <div style="display:flex; align-items:flex-start; margin-bottom:2px;">
              <span style="width:50%; font-weight:700; text-transform:uppercase; font-size:11px; padding-top:2px;">IMEI / Serial Number:</span>
              <div style="width:50%;">${generateBarcodeSvg(dev.imei || dev.serial_number || '789654123654789', 18, 'left')}</div>
            </div>
            <div style="display:flex;">
              <span style="width:50%; font-weight:700; text-transform:uppercase; font-size:11px;">Product Warranty Status:</span>
              <span style="width:50%; font-weight:700; font-size:12px;">${dev.warranty_status || 'Out of Warranty'}</span>
            </div>
          </div>

          <!-- Issue Reported -->
          <div style="padding:4px 6px; font-size:11px;">
            <div style="font-weight:700; font-size:12.5px; text-transform:uppercase; margin-bottom:2px;">Issue Reported by Customer:</div>
            <div style="border:1px solid #000;">
              <div style="display:flex; background:#f1f5f9; border-bottom:1px solid #000; font-weight:700; padding:1px 3px;">
                <span style="width:35%;">Category</span>
                <span style="width:65%;">Description</span>
              </div>
              <div style="display:flex; padding:2px 3px;">
                <span style="width:35%; font-weight:700;">${job.service_type || 'Screen / Display Replacement'}</span>
                <span style="width:65%; font-weight:600;">• ${job.customer_complaint || 'display not working'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="col-2" style="display:flex; flex-direction:column;">
          <!-- Checklist -->
          <div style="border-bottom:1px solid #000;">
            <div style="display:flex; justify-content:space-between;" class="table-header">
              <span>Checklist</span>
              <span>Inward Check</span>
            </div>
            ${checklistRows.map((r) => `<div class="checklist-row"><span>${r.label}</span><b>${r.val}</b></div>`).join('')}
          </div>

          <!-- Cosmetic Condition of Product -->
          <div style="padding:3.5px 6px; border-bottom:1px solid #000; font-size:11px;">
            <div style="font-weight:700; font-size:11.5px; text-transform:uppercase; margin-bottom:2px;">Cosmetic Condition of Product:</div>
            <div style="border:1px solid #000; background:#f8fafc; padding:2.5px 4px; font-weight:700; font-size:11px;">
              ${dev.cosmetic_condition || cond.body || 'Wear And Tear'}
              ${cond.notes ? `<div style="font-size:10px; font-weight:500; font-style:italic; margin-top:2px; color:#334155;">Note: ${cond.notes}</div>` : ''}
            </div>
          </div>

          <!-- Accessories & Passcode -->
          <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div class="table-header">Accessories Received</div>
              ${actualReceivedAccessories.length > 0 ? actualReceivedAccessories.map(acc => `
                <div class="checklist-row"><span>${acc}</span><b>Received</b></div>
              `).join('') : `
                <div class="checklist-row" style="color:#64748b; font-style:italic;"><span>None / Handset Only</span><b>None</b></div>
              `}
            </div>
            <div style="padding:2.5px 5px; background:#f8fafc; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; font-size:11px;">
              <b>Device Passcode / PIN:</b>
              <b style="font-family:monospace; font-size:12px;">${dev.passcode || '789654'}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- Tax Invoice & Charges -->
      <div style="padding:4px 6px;" class="border-b">
        <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:3px;">
          <span style="font-size:12.5px; text-transform:uppercase;">Tax Invoice & Repair Charges</span>
          <span style="font-family:monospace; font-size:11.5px;">Invoice No: ${invoice?.invoice_number || 'INV-2026-000001'}</span>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:25px; text-align:center;">#</th>
              <th>Item / Service Description</th>
              <th style="width:80px; text-align:center;">Warranty</th>
              <th style="width:55px; text-align:center;">Type</th>
              <th style="width:35px; text-align:center;">Qty</th>
              <th style="width:80px; text-align:right;">Unit Rate (₹)</th>
              <th style="width:85px; text-align:right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map((it, idx) => `
              <tr>
                <td style="text-align:center; font-family:monospace;">${idx + 1}</td>
                <td><b>${it.item_name}</b></td>
                <td style="text-align:center; font-size:10px; font-weight:700; color:#0369a1;">${it.warranty || invoice?.warranty_period || '—'}</td>
                <td style="text-align:center; font-family:monospace;">${it.item_type || 'PART'}</td>
                <td style="text-align:center; font-family:monospace;">${it.quantity || 1}</td>
                <td style="text-align:right; font-family:monospace;">${Number(it.unit_price).toFixed(2)}</td>
                <td style="text-align:right; font-family:monospace; font-weight:700;">${Number(it.total_price).toFixed(2)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td style="text-align:center;">1</td>
                <td><b>Standard Diagnostic / Service Fee</b></td>
                <td style="text-align:center; font-size:10px; font-weight:700; color:#0369a1;">${invoice?.warranty_period || (job.warranty_days ? `${job.warranty_days} Days` : 'As per line items')}</td>
                <td style="text-align:center;">SERVICE</td>
                <td style="text-align:center;">1</td>
                <td style="text-align:right;">${Number(job.total_amount || 0).toFixed(2)}</td>
                <td style="text-align:right; font-weight:700;">${Number(job.total_amount || 0).toFixed(2)}</td>
              </tr>
            `}
          </tbody>
        </table>

        <!-- Totals Grid -->
        <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:11.5px;">
          <div style="line-height:1.35;">
            <div>Payment Status: <b>${job.payment_status || 'SETTLED'}</b></div>
            <div>Paid Via: ${paidViaSummary}</div>
          </div>
          <div style="width:230px; font-family:monospace; font-size:11.5px; line-height:1.3;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><b>₹${Number(invoice?.subtotal || job.subtotal || 0).toFixed(2)}</b></div>
            ${Number(invoice?.discount || 0) > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Discount Applied${invoice?.discount_type === 'PERCENTAGE' && invoice?.discount_value ? ` (${invoice.discount_value}%)` : ''}:</span><b>-₹${Number(invoice.discount).toFixed(2)}</b></div>` : ''}
            ${Number(invoice?.tax_amount || 0) > 0 || Number(invoice?.tax_rate || 0) > 0 ? `<div style="display:flex; justify-content:space-between;"><span>GST / Tax (${invoice?.tax_rate ?? 18}%):</span><b>₹${Number(invoice?.tax_amount || 0).toFixed(2)}</b></div>` : `<div style="display:flex; justify-content:space-between; color:#666;"><span>GST / Tax:</span><b>Nil (₹0.00)</b></div>`}
            <div style="display:flex; justify-content:space-between; border-top:1px solid #000; padding-top:2px; font-weight:900; font-size:12.5px;"><span>Total Invoice Amount:</span><span>₹${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:700;"><span>Amount Paid:</span><span>₹${Number(invoice?.paid_amount || job.paid_amount || 0).toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid #000; padding-top:2px; font-weight:900;"><span>Balance Remaining:</span><span>₹${Number(invoice?.balance_due || job.balance_due || 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <!-- Terms & Conditions Summary on Page 1 -->
      <div style="padding:4px 6px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1; padding-right:10px;">
          <div style="font-weight:700; font-size:12px; text-transform:uppercase; margin-bottom:2px;">Terms and Conditions:</div>
          <ul style="margin:0; padding-left:14px; font-size:10px; line-height:1.25; color:#000;">
            <li>Subject to Engineer’s physical & internal diagnostic inspection.</li>
            <li>Quality program repairs will not cover all defective parts on non-chargeable basis. Only parts covered under quality program will be covered as non-chargeable post inspection.</li>
            <li>Mobotech mobile care receives customer devices without opening; full diagnostics follow standard testing procedures.</li>
            <li>Repair cannot be cancelled once approved. Non-approved estimates are returned as-is.</li>
            <li><b>DATA WARNING: Storage contents may be deleted/reformatted during repair. Customer must backup data before service. Mobotech is not responsible for data loss.</b></li>
            <li>Unclaimed devices after 30 days of notification are subject to disposal/auction to recover costs.</li>
          </ul>
          <div style="font-size:9.5px; font-weight:700; font-style:italic; margin-top:2px; padding-left:14px;">
            * Note: For complete detailed terms & conditions, please refer to Page 2 overleaf.
          </div>
        </div>
        ${qrDataUrl ? `
          <div style="text-align:center; shrink:0;">
            <img src="${qrDataUrl}" style="width:48px; height:48px; border:1px solid #000; padding:1px; display:block;" />
            <div style="font-family:monospace; font-size:9px; font-weight:700; margin-top:1px;">SCAN TO TRACK</div>
          </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- Signatures on Page 1 -->
  <div class="sig-row">
    <div class="sig-box">
      <div style="font-family:monospace; font-size:11px; font-weight:700;">${sigDate}</div>
      <svg viewBox="0 0 160 30" style="width:90px; height:20px; display:block;">
        <path d="M10 22 C 25 10, 35 25, 45 14 C 55 3, 52 22, 68 18 C 82 14, 95 24, 115 12 C 130 3, 142 18, 155 14" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <div style="border-top:1px solid #000; padding-top:1px;">
        <div style="font-weight:700; font-size:12.5px;">Authorized Signatory</div>
        <div style="font-size:11px;">(${techName})</div>
      </div>
    </div>
    <div class="sig-box" style="text-align:right;">
      <div style="font-family:monospace; font-size:11px; font-weight:700;">${sigDate}</div>
      <div style="height:20px;"></div>
      <div style="border-top:1px solid #000; padding-top:1px;">
        <div style="font-weight:700; font-size:12.5px;">Customer's Signature</div>
        <div style="font-size:11px;">(${cust.full_name || 'Milan Devani'})</div>
      </div>
    </div>
  </div>
</div>

<!-- PAGE 2: COMPLETE TERMS AND CONDITIONS CONTINUATION -->
<div class="page">
  <div>
    <!-- Page 2 Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:3px; border-bottom:1px solid #000;">
      <div style="display:flex; align-items:center; gap:8px;">
        ${shopLogoDataUrl ? `
          <div style="width:28px; height:28px; border-radius:4px; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#fff; padding:1px;">
            <img src="${shopLogoDataUrl}" alt="${shopObj.name}" style="max-width:100%; max-height:100%; object-fit:contain;" />
          </div>
        ` : `
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="#000" stroke-width="2.5" />
            <path d="M9 22V10L16 17L23 10V22" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="16" cy="7" r="1.5" fill="#000" />
          </svg>
        `}
        <span style="font-size:20px; font-weight:900;">${shopObj.name.toLowerCase()}</span>
      </div>
      <div style="text-align:right;">
        <div style="font-size:19px; font-weight:900;">Service Record</div>
        <div style="font-size:11.5px; font-family:monospace; font-weight:700;">Ref: ${job.job_number} • Page 2 of 2</div>
      </div>
    </div>

    <!-- Support Banner -->
    <div style="padding:2px 0; font-size:10.5px; font-style:italic; border-bottom:1px solid #000; margin-bottom:4px;">
      Need Help? Contact Mobotech mobile care at <b>${shopObj.phone}</b> or visit ${shopObj.address}, Surat for all support on your smartphones & tablets.
    </div>

    <!-- Complete 17 Terms -->
    <div style="font-size:10px; line-height:1.25; text-align:justify;">
      <div style="font-weight:700; margin-bottom:2px;">All device intake, diagnostic, and repair services conducted by Mobotech mobile care are subject to the following standard service terms and conditions:</div>
      <ul style="margin:0; padding-left:14px;">
        <li style="margin-bottom:2px;">In case of any Tempering/Unauthorised Modification found While doing micro inspection at our centre then Mobotech will not be able to provide any service on this unit. device will be return back to customer un-repaired in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios, also Mobotech may not be able to provide any service on this unit in future.</li>
        <li style="margin-bottom:2px;">While submitting device (warranty/Out of Warranty) if there is any damage are present Then there may be a chance while opening/servicing your device by Mobotech Repair Centre that damage may be increased or any other hardware issue May appeared, for that Mobotech is not responsible.</li>
        <li style="margin-bottom:2px;">While submitting device Remove any SIM card, case, screen protector or accessories from your device. As a part of repair Mobotech may have to remove and discard such accessories, in such cases Mobotech is not responsible for any damage or loss of SIM card, case, screen protector or accessories.</li>
        <li style="margin-bottom:2px;">The charges for labour as well as spares used for non-warranty repair shall be as per the applicable price lists approved and recommended by Mobotech.</li>
        <li style="margin-bottom:2px;">The Estimate price given at the time of acceptance of the Product to repairs are Provisional and may vary at the time of detailed inspection. Should the final expected charges be more than the initial estimate, Mobotech will proceed only after taking the approval of the Customer.</li>
        <li style="margin-bottom:2px;">In the event the final estimate/Re-Quote from Mobotech Repair Centre is not approved by the customer within 2 days, the device will be return back to customer "as is condition (partly repaired/un-repaired)" in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios.</li>
        <li style="margin-bottom:2px;">Mobotech shall make all efforts to ensure that the product is repaired within 7 working days from the receipt of faulty product. At times however, due to non-availability/shortage of critical spare parts or complicated fault, the repair turnaround time may take longer than the indicated while accepting the machine for repair. Mobotech will not be responsible for any loss/losses whatsoever in the event of the delay in repair for such aforementioned reasons.</li>
        <li style="margin-bottom:2px;">For Same day Display/Battery repair for smartphones, the Turn Around Time may be depending upon the scenario and intensity of the issue and stock availability.</li>
        <li style="margin-bottom:2px;">Mobotech is not liable for any delays, non-performance, failure or non-delivery of the product due to contingencies arising from any force measure, act of God, storm, earthquake, accident, strikes, lockout, industrial dispute, labour trouble, transportation embargo, imminence or the existence of any state emergency, war, civil commotion right, approval or imposition of sanctions or any measure taken by government which renders it impossible or impractical for Mobotech to perform supply, service or deliver the Product to the Customer.</li>
        <li style="margin-bottom:2px;">The customer shall take the delivery of the Product within 30 (Thirty) days of intimation (either by Phone call or through Email or Text Message/WhatsApp Message) from Mobotech. In the event the delivery is not taken by the customer, Mobotech reserves the right to Auction the Product to recover the repair/ storage charges.</li>
        <li style="margin-bottom:2px;">Following warranty service your device or a replacement product will be returned to you as configured when originally purchased, subject to applicable updates. Third party applications installed may not be compatible or work as a result of the software update. You will be responsible for reinstalling all other software programs, data and information. Recovery and reinstallation of other software programs, data and information are not covered under warranty.</li>
        <li style="margin-bottom:2px;">The Customer must produce the Original Service or Digital Service Report at the time of taking the delivery. Mobotech reserves the right to refuse delivery upon non-production of the original service report, if you fail to provide, Mobotech reserves the right to retain the product till it is provided. Mobotech may at its sole discretion consider alternative modes to verify the authenticity of the customer and choose to deliver the product only after verifying the credentials of the customer.</li>
        <li style="margin-bottom:2px;">Mobotech mobile care acts as an independent multi-brand hardware & software service center, where decision making authorities on repair / replacement / warranty deliverables is governed by Mobotech Service Policies.</li>
        <li style="margin-bottom:2px;">For any payments refund if repair/service got cancelled for any reason, amount will be transferred only through Bank Transfer or UPI to customer account in 4-5 bank working days (after customer provided their bank details).</li>
        <li style="margin-bottom:2px;">Vintage / Obsolete Products: Products where parts have been discontinued by manufacturers are repaired strictly subject to compatible component availability. Mobotech does not guarantee OEM part availability for discontinued lines.</li>
        <li style="margin-bottom:2px;">This equipment is accepted subject to repair terms and conditions mentioned above and/or on website, printed overleaf or attached in e-mail along with digital service report and digital delivery report sent on customer email ID or WhatsApp.</li>
        <li style="margin-bottom:2px;">By accepting the Service report / Final Invoice, it is deemed that the Customer agrees to all the terms and conditions mentioned in the Service Report.</li>
      </ul>
    </div>
  </div>

  <!-- Signatures on Page 2 -->
  <div class="sig-row">
    <div class="sig-box">
      <div style="font-family:monospace; font-size:11px; font-weight:700;">${sigDate}</div>
      <svg viewBox="0 0 160 30" style="width:90px; height:20px; display:block;">
        <path d="M10 22 C 25 10, 35 25, 45 14 C 55 3, 52 22, 68 18 C 82 14, 95 24, 115 12 C 130 3, 142 18, 155 14" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <div style="border-top:1px solid #000; padding-top:1px;">
        <div style="font-weight:700; font-size:12.5px;">Authorized Signatory</div>
        <div style="font-size:11px;">(${techName})</div>
      </div>
    </div>
    <div class="sig-box" style="text-align:right;">
      <div style="font-family:monospace; font-size:11px; font-weight:700;">${sigDate}</div>
      <div style="height:20px;"></div>
      <div style="border-top:1px solid #000; padding-top:1px;">
        <div style="font-weight:700; font-size:12.5px;">Customer's Signature</div>
        <div style="font-size:11px;">(${cust.full_name || 'Milan Devani'})</div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;

  // Write temporary HTML file
  const tempId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tmpDir = os.tmpdir();
  const htmlPath = path.join(tmpDir, `${tempId}.html`);
  const pdfPath = path.join(tmpDir, `${tempId}.pdf`);

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');

  try {
    execSync(`"${browserBinary}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`, {
      timeout: 25000,
    });

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Chromium headless failed to produce PDF output file');
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    return pdfBuffer;
  } finally {
    try { fs.unlinkSync(htmlPath); } catch (e) { }
    try { fs.unlinkSync(pdfPath); } catch (e) { }
  }
}

// Indian Currency and Number to Words formatters for Sales Bills
function formatInr(num) {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  const val = parseFloat(num);
  const isNeg = val < 0;
  const [intPart, decPart] = Math.abs(val).toFixed(2).split('.');
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') lastThree = ',' + lastThree;
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNeg ? '-' : ''}${formattedInt}.${decPart}`;
}

function saleNumberToWords(amount) {
  if (!amount || isNaN(amount) || amount === 0) return 'ZERO RUPEES ONLY';
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ',
    'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];
  const intAmount = Math.floor(Math.abs(amount));
  const numStr = ('000000000' + intAmount).slice(-9);
  const crore = parseInt(numStr.slice(0, 2), 10);
  const lakh = parseInt(numStr.slice(2, 4), 10);
  const thousand = parseInt(numStr.slice(4, 6), 10);
  const hundred = parseInt(numStr.slice(6, 7), 10);
  const rest = parseInt(numStr.slice(7, 9), 10);
  let words = '';
  const getTwo = (n) => (n === 0 ? '' : n < 20 ? a[n] : b[Math.floor(n / 10)] + a[n % 10]);
  if (crore > 0) words += getTwo(crore) + 'CRORE ';
  if (lakh > 0) words += getTwo(lakh) + 'LAKH ';
  if (thousand > 0) words += getTwo(thousand) + 'THOUSAND ';
  if (hundred > 0) words += a[hundred] + 'HUNDRED ';
  if (rest > 0) {
    if (words !== '') words += 'AND ';
    words += getTwo(rest);
  }
  return `${words.trim()} RUPEES ONLY`;
}

export async function generateSaleInvoicePdfBuffer({ sale, shop }) {
  const browserBinary = findBrowserBinary();
  if (!browserBinary) {
    throw new Error('Chromium/Edge browser binary not found on host for vector PDF generation');
  }

  const shopName = shop?.name || shop?.shop_name || 'Shree Mobile Shop';
  const shopAddress = shop?.address || 'G/456, Basant Lok Comm., Vasant Vihar, Tardeo Road, Maharashtra - 400001';
  const shopPhone = shop?.phone || 'Ph. 111 2222 3333';
  const shopTaxNo = shop?.tax_number || '26CORPP3939N1ZA';
  const shopLogoRaw = (shop?.logo_url || '').trim();
  const instagramQrRaw = (shop?.instagram_qr_url || '').trim();

  // Convert shop logo to inline base64 Data URL so Chromium headless embeds it reliably
  const shopLogoDataUrl = await imageSourceToDataUrl(shopLogoRaw);

  const invoiceNumber = sale?.invoice_no_seq || sale?.invoice_number || '47';
  const invoiceDate = sale?.invoice_date ? String(sale.invoice_date).split('T')[0] : new Date().toISOString().split('T')[0];
  const grandTotal = parseFloat(sale?.total_amount) || 0;
  const taxableAmount = parseFloat(sale?.taxable_amount) || 0;
  const totalTax = parseFloat(sale?.total_tax) || 0;
  const gstEnabled = sale?.gst_enabled !== false;
  const isIgst = sale?.gst_type !== 'CGST_SGST';
  const totalInWords = saleNumberToWords(grandTotal);

  // Generate Instagram QR Code Data URL if configured
  let instagramQrDataUrl = '';
  if (instagramQrRaw) {
    const pathWithoutQuery = instagramQrRaw.split('?')[0].toLowerCase();
    const isDirectImage =
      instagramQrRaw.startsWith('data:image/') ||
      instagramQrRaw.includes('/uploads/') ||
      instagramQrRaw.includes('/api/upload') ||
      /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(pathWithoutQuery);

    if (isDirectImage) {
      instagramQrDataUrl = await imageSourceToDataUrl(instagramQrRaw);
    } else {
      let targetLink = instagramQrRaw;
      if (targetLink.startsWith('@')) {
        targetLink = `https://www.instagram.com/${targetLink.slice(1)}/`;
      } else if (!targetLink.startsWith('http://') && !targetLink.startsWith('https://')) {
        targetLink = `https://${targetLink}`;
      }
      try {
        instagramQrDataUrl = await QRCode.toDataURL(targetLink, {
          width: 160,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.warn('⚠️ Instagram QR generation warning:', err.message);
      }
    }
  }

  const items = sale?.items || [];
  const totalQty = items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0);

  const cleanWarrantyText = (w) => {
    if (!w) return '-';
    const str = String(w).trim();
    if (!str || str.toLowerCase() === 'no warranty' || str.toLowerCase() === 'no' || str.toLowerCase() === 'none' || str === '-') {
      return '-';
    }
    const cleaned = str
      .replace(/\b(brand|testing)\s+warranty\b/gi, '')
      .replace(/\b(warranty|replacement)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || '-';
  };

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Tax Invoice #${invoiceNumber}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0;
    padding: 48px !important;
    box-sizing: border-box !important;
    background: #ffffff;
    color: #000000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11px;
    line-height: 1.25;
  }
  .black-box {
    border: 2px solid #000000 !important;
    width: 100%;
    box-sizing: border-box;
  }
  .border-b-black { border-bottom: 1.5px solid #000000 !important; }
  .border-r-black { border-right: 1.5px solid #000000 !important; }
  .border-b-thin { border-bottom: 1px solid #000000 !important; }
  .border-r-thin { border-right: 1px solid #000000 !important; }
  table.items-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10.5px;
  }
  table.items-table th, table.items-table td {
    padding: 3px 5px;
    border-right: 1px solid #000000;
  }
  table.items-table th:last-child, table.items-table td:last-child {
    border-right: none;
  }
  table.items-table th {
    background: #ffffff;
    font-weight: 900;
    color: #000000;
    text-transform: uppercase;
    font-size: 10px;
    border-bottom: 1.5px solid #000000;
  }
  .brand-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 8px;
    font-weight: 800;
    margin: 1px;
    line-height: 1;
  }
</style>
</head>
<body>

  <!-- 1. TOP HEADER -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:6px;">
    <!-- Left: Logo & Shop Details -->
    <div style="display:flex; align-items:flex-start; gap:10px; max-width:60%;">
      ${shopLogoDataUrl ? `
        <div style="width:58px; height:58px; border-radius:6px; border:1px solid #000000; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; background:#fff; padding:2px;">
          <img src="${shopLogoDataUrl}" alt="${shopName}" style="max-width:100%; max-height:100%; object-fit:contain;" />
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
          <div style="width:42px; height:46px; border-radius:6px; background:#0ea5e9; display:flex; align-items:center; justify-content:center; color:#fff; transform:rotate(-8deg);">
            <svg style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <span style="font-size:7px; font-weight:900; text-transform:uppercase; margin-top:2px;">PHONE SHOP</span>
          <span style="font-size:6px; color:#64748b; text-transform:uppercase;">SLOGAN HERE</span>
        </div>
      `}
      <div>
        <h1 style="font-size:20px; font-weight:900; color:#000000; margin:0 0 2px 0; line-height:1.1;">${shopName}</h1>
        <p style="font-size:10.5px; color:#000000; margin:0 0 2px 0; line-height:1.2;">${shopAddress}</p>
        <p style="font-size:10.5px; font-weight:700; color:#000000; margin:0;">${shopPhone}</p>
      </div>
    </div>

    <!-- Right: Instagram QR Code if configured (Preserved Instagram color #E1306C) -->
    <div style="text-align:right; max-width:40%; display:flex; flex-direction:column; align-items:flex-end;">
      ${instagramQrDataUrl ? `
        <div style="display:flex; align-items:center; gap:8px; border:1px solid #000000; border-radius:6px; padding:4px 6px; background:#f8fafc;">
          <div style="text-align:right;">
            <div style="font-size:10px; font-weight:800; color:#E1306C; display:flex; align-items:center; justify-content:flex-end; gap:3px;">
              <svg style="width:12px; height:12px; fill:currentColor;" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>Instagram</span>
          </div>
          <div style="font-size:7.5px; font-weight:600; color:#64748b; text-transform:uppercase;">Scan to Connect</div>
        </div>
        <img src="${instagramQrDataUrl}" style="width:48px; height:48px; border:1px solid #000000; border-radius:4px; padding:1px; background:#fff;" />
      </div>
    ` : ''}
    </div>
  </div>

  <!-- Slogan Banner -->
  <div style="border-top:1px solid #000000; border-bottom:1px solid #000000; padding:3px 0; text-align:center; margin-bottom:8px;">
    <span style="font-size:10px; font-weight:600; color:#000000;">
      Get All Your Desired Smart Phones From Apple To Vivo On Huge Discounts And Easy EMI
    </span>
  </div>

  <!-- 2. MAIN BORDERED CONTAINER (Black) -->
  <div class="black-box">
    <!-- Header: GSTIN, TAX INVOICE, ORIGINAL FOR RECIPIENT -->
    <div class="border-b-black" style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px;">
      <div style="font-size:11px; font-weight:700; width:33%; color:#000000;">
        ${gstEnabled ? `GSTIN : ${shopTaxNo}` : `REG : ${shopTaxNo || 'RETAIL'}`}
      </div>
      <div style="font-size:16px; font-weight:900; color:#000000; text-align:center; width:34%; text-transform:uppercase; letter-spacing:0.5px;">
        ${gstEnabled ? 'TAX INVOICE' : 'RETAIL INVOICE'}
      </div>
      <div style="font-size:10px; font-weight:700; text-align:right; width:33%; text-transform:uppercase; color:#000000;">
        ORIGINAL FOR RECIPIENT
      </div>
    </div>

    <!-- Customer Details (Left) vs Invoice Details (Right) -->
    <div class="border-b-black" style="display:flex;">
      <!-- Customer Info -->
      <div class="border-r-black" style="width:58%; padding:6px 10px;">
        <div class="border-b-thin" style="text-align:center; font-weight:700; font-size:10.5px; padding-bottom:3px; margin-bottom:4px;">
          Customer Detail
        </div>
        <table style="width:100%; font-size:10.5px; border-collapse:collapse;">
          <tr><td style="width:85px; font-weight:700;">Name</td><td>: <b>${sale.customer_name || 'Customer'}</b></td></tr>
          <tr><td style="font-weight:700;">Address</td><td>: ${sale.customer_address || 'Surat'}</td></tr>
          <tr><td style="font-weight:700;">PHONE</td><td>: ${sale.customer_phone || '-'}</td></tr>
          ${sale.customer_email ? `<tr><td style="font-weight:700;">Mail ID</td><td>: ${sale.customer_email}</td></tr>` : ''}
          ${sale.customer_gstin ? `<tr><td style="font-weight:700;">GSTIN</td><td>: ${sale.customer_gstin}</td></tr>` : ''}
          <tr><td style="font-weight:700;">Place of Supply</td><td>: ${sale.place_of_supply || 'Gujarat'}</td></tr>
        </table>
      </div>

      <!-- Invoice Info -->
      <div style="width:42%; padding:6px 10px;">
        <table style="width:100%; font-size:10.5px; border-collapse:collapse; margin-top:15px;">
          <tr><td style="width:90px; font-weight:700;">Invoice No.</td><td>: <b>${invoiceNumber}</b></td></tr>
          <tr><td style="font-weight:700;">Invoice Date</td><td>: ${invoiceDate}</td></tr>
          <tr><td style="font-weight:700;">Payment Mode</td><td>: <b>${sale.payment_mode || 'CASH'}</b></td></tr>
          <tr><td style="font-weight:700;">Payment Status</td><td>: <span style="color:#059669; font-weight:700;">PAID</span></td></tr>
        </table>
      </div>
    </div>

    <!-- 3. PRODUCTS & SERVICES TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:6%; text-align:center;">No.</th>
          <th style="width:${gstEnabled ? '38%' : '40%'}; text-align:left;">Name of Product</th>
          <th style="width:${gstEnabled ? '14%' : '12%'}; text-align:center;">Warranty</th>
          <th style="width:${gstEnabled ? '7%' : '8%'}; text-align:center;">Qty</th>
          <th style="width:${gstEnabled ? '11%' : '14%'}; text-align:right;">Rate</th>
          ${gstEnabled ? `<th style="width:11%; text-align:center; padding:0;">
            <div style="border-bottom:1px solid #000000; padding:1px 0;">${isIgst ? 'IGST' : 'CGST / SGST'}</div>
            <div style="display:flex; font-size:9px;">
              <span style="width:35%; border-right:1px solid #000000;">%</span>
              <span style="width:65%;">Amount</span>
            </div>
          </th>` : ''}
          <th style="width:${gstEnabled ? '13%' : '20%'}; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr style="border-bottom:1px solid #000000; vertical-align:top;">
            <td style="text-align:center; color:#000000;">${it.sr_no || idx + 1}</td>
            <td>
              <div style="font-weight:700; font-size:10.5px; color:#000000;">${it.name || it.item_name || 'Product'}</div>
              ${it.imei ? `<div style="font-style:italic; font-size:9.5px; color:#000000; font-family:monospace; margin-top:1px;">${it.imei.startsWith('IMEI') ? it.imei : `IMEI: ${it.imei}`}</div>` : ''}
            </td>
            <td style="text-align:center; font-weight:600; color:#000000;">${cleanWarrantyText(it.warranty)}</td>
            <td style="text-align:center; font-weight:700; color:#000000;">${it.quantity} ${it.unit || 'NOS'}</td>
            <td style="text-align:right; font-family:monospace; color:#000000;">${formatInr(it.rate)}</td>
            ${gstEnabled ? `
              <td style="padding:0; font-family:monospace; color:#000000;">
                <div style="display:flex; height:100%;">
                  <span style="width:40%; text-align:center; border-right:1px solid #000000; padding:3px 1px;">${(parseFloat(it.gst_rate) || 18).toFixed(1)}</span>
                  <span style="width:60%; text-align:right; padding:3px 4px;">${formatInr(it.gst_amount)}</span>
                </div>
              </td>
            ` : ''}
            <td style="text-align:right; font-weight:700; font-family:monospace; color:#000000;">${formatInr(it.total)}</td>
          </tr>
        `).join('')}

        <!-- Filler Height Row dynamically scaled for Full A4 Page Height with 48px margins -->
        <tr style="height:${Math.max(25, Math.round(360 - (items.length - 1) * 36))}px;">
          <td></td><td></td><td></td><td></td><td></td>
          ${gstEnabled ? `<td><div style="display:flex; height:100%;"><span style="width:40%; border-right:1px solid #000000;"></span><span style="width:60%;"></span></div></td>` : ''}
          <td></td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="border-top:1.5px solid #000000; border-bottom:1.5px solid #000000; font-weight:700; font-size:10.5px; color:#000000;">
          <td colspan="3" style="text-align:right; text-transform:uppercase;">TOTAL</td>
          <td style="text-align:center;">${totalQty}</td>
          <td></td>
          ${gstEnabled ? `
            <td style="padding:0; font-family:monospace;">
              <div style="display:flex;">
                <span style="width:40%; border-right:1px solid #000000;"></span>
                <span style="width:60%; text-align:right; padding:3px 4px;">${formatInr(totalTax)}</span>
              </div>
            </td>
          ` : ''}
          <td style="text-align:right; font-weight:900; font-family:monospace;">${formatInr(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- 4. BOTTOM SECTION: Words, Terms vs Totals & Signature -->
    <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:10px; color:#000000;">
      <colgroup>
        <col style="width:58%;">
        <col style="width:42%;">
      </colgroup>
      <tbody>
        <!-- Row 1: 'Total in words' Title vs Taxable Amount -->
        <tr style="border-bottom:1px solid #000000;">
          <td style="width:58%; border-right:1.5px solid #000000; text-align:center; font-weight:700; padding:3px 6px;">
            Total in words
          </td>
          <td style="width:42%; padding:3px 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700;">Taxable Amount</span>
              <span style="font-family:monospace;">${formatInr(taxableAmount)}</span>
            </div>
          </td>
        </tr>

        <!-- Row 2: Words Text (left) vs Financial Breakdown Rows (right) -->
        ${(() => {
      const breakdown = [];
      if (sale.discount_amount > 0) {
        breakdown.push(`
              <div style="display:flex; justify-content:space-between; padding:2px 10px; font-size:9.5px; color:#000000; background:#ffffff;">
                <span style="font-weight:600; color:#000000;">Less : Discount ${sale.discount_type === 'percentage' ? `(${sale.discount_value}%)` : ''}</span>
                <span style="font-family:monospace; font-weight:700; color:#000000;">-${formatInr(sale.discount_amount)}</span>
              </div>
            `);
      }
      if (gstEnabled) {
        if (isIgst) {
          breakdown.push(`
                <div style="display:flex; justify-content:space-between; padding:3px 10px;">
                  <span style="font-weight:700;">Add : IGST (${sale.gst_rate}%)</span>
                  <span style="font-family:monospace;">${formatInr(totalTax)}</span>
                </div>
              `);
        } else {
          breakdown.push(`
                <div style="display:flex; justify-content:space-between; padding:2px 10px;">
                  <span style="font-weight:700;">Add : CGST (${(sale.cgst_rate || 9).toFixed(1)}%)</span>
                  <span style="font-family:monospace;">${formatInr(sale.cgst_amount || totalTax / 2)}</span>
                </div>
              `);
          breakdown.push(`
                <div style="display:flex; justify-content:space-between; padding:2px 10px;">
                  <span style="font-weight:700;">Add : SGST (${(sale.sgst_rate || 9).toFixed(1)}%)</span>
                  <span style="font-family:monospace;">${formatInr(sale.sgst_amount || totalTax / 2)}</span>
                </div>
              `);
        }
        breakdown.push(`
              <div style="display:flex; justify-content:space-between; padding:3px 10px; font-weight:700;">
                <span>Total Tax</span>
                <span style="font-family:monospace;">${formatInr(totalTax)}</span>
              </div>
            `);
      }
      breakdown.push(`
            <div style="display:flex; justify-content:space-between; padding:5px 10px; background:#f8fafc; font-size:11.5px; font-weight:900;">
              <span>Total Amount After Tax</span>
              <span style="color:#000000; font-family:monospace;">₹${formatInr(grandTotal)}</span>
            </div>
          `);

      return `
            <tr style="border-bottom:1px solid #000000;">
              <td style="width:58%; border-right:1.5px solid #000000; padding:6px 8px; font-weight:700; text-transform:uppercase; vertical-align:middle; color:#000000;">
                ${totalInWords}
              </td>
              <td style="width:42%; padding:0; vertical-align:middle;">
                ${breakdown.join('<div style=\"border-bottom:1px solid #000000;\"></div>')}
              </td>
            </tr>
          `;
    })()}

        <!-- Row 3: Terms and Conditions Header vs (E & O.E.) Full Width -->
        <tr style="border-bottom:1px solid #000000;">
          <td colspan="2" style="width:100%; padding:3px 10px; background:#ffffff;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="text-align:center; font-weight:700; font-size:10px; color:#000000; padding-left:50px;">
                  Terms and Conditions
                </td>
                <td style="width:70px; text-align:right; font-size:9.5px; font-weight:600; font-style:italic; color:#000000;">
                  (E & O.E.)
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Row 4: Terms Bullets Full Width (Authorised Signatory removed) -->
        <tr>
          <td colspan="2" style="width:100%; padding:6px 10px; font-size:9px; color:#000000; line-height:1.45; vertical-align:top; background:#ffffff;">
            <div>1. Customers must check the device condition, model, IMEI and accessories before accepting delivery.</div>
            <div>2. Repair warranty, if applicable, covers only the repaired or replaced parts as mentioned on the invoice.</div>
            <div>3. Physical damage, liquid damage, misuse and unauthorized repairs are not covered under warranty.</div>
            <div>4. Customers are advised to back up their data before repair; the shop is not responsible for data loss.</div>
            <div>5. Returns, replacements and refunds are subject to the applicable shop policy and Indian consumer protection laws.</div>
            ${sale?.notes ? `<div style="font-weight:700; color:#000000; margin-top:2px;">Note: ${sale.notes}</div>` : ''}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</body>
</html>`;

  const tempId = `sale_inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tmpDir = os.tmpdir();
  const htmlPath = path.join(tmpDir, `${tempId}.html`);
  const pdfPath = path.join(tmpDir, `${tempId}.pdf`);

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');

  try {
    execSync(`"${browserBinary}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`, {
      timeout: 25000,
    });

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Chromium headless failed to produce PDF output file');
    }

    return fs.readFileSync(pdfPath);
  } finally {
    try { fs.unlinkSync(htmlPath); } catch (e) { }
    try { fs.unlinkSync(pdfPath); } catch (e) { }
  }
}

