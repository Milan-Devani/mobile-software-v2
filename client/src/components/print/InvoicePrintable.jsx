import { getAllWarrantyClaims } from '../../utils/warrantyUtils';
import React, { useRef, useState, useEffect } from 'react';
import {
  Download,
  Printer,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { WhatsAppQrModal } from '../common/WhatsAppQrModal';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../../utils/checklistConstants';

// Code 39 Barcode Generator for crisp vector barcodes in PDF and Print
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

const BarcodeSvg = ({ value, height = 20, showText = true, align = 'right' }) => {
  const cleanVal = String(value || 'REF12345').toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '-');
  const full = `*${cleanVal}*`;
  let currentX = 0;
  const narrow = 1.0;
  const wide = 2.4;
  const interGap = 1.0;
  const rects = [];

  for (let i = 0; i < full.length; i++) {
    const pattern = CODE39_PATTERNS[full[i]] || CODE39_PATTERNS['-'];
    for (let p = 0; p < pattern.length; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wide : narrow;
      if (isBar) {
        rects.push(
          <rect
            key={`${i}-${p}`}
            x={currentX}
            y={0}
            width={w}
            height={height}
            fill="#000"
            shapeRendering="crispEdges"
          />
        );
      }
      currentX += w;
    }
    currentX += interGap;
  }
  const totalW = Math.max(110, currentX);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : align === 'left' ? 'flex-start' : 'center',
      }}
    >
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: '160px',
          display: 'block',
        }}
        shapeRendering="crispEdges"
      >
        {rects}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#000',
            marginTop: '1px',
            textAlign: align,
            width: '100%',
          }}
        >
          {cleanVal}
        </span>
      )}
    </div>
  );
};

// Mobotech Brand Logo Component matching local PDF aesthetic exactly
const MobotechLogo = ({ logoUrl, shopName = 'Mobotech mobile care', tagline = 'mobile care', isPage2 = false }) => {
  if (isPage2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {logoUrl ? (
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', padding: '1px', flexShrink: 0 }}>
            <img src={logoUrl} alt={shopName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="#000" strokeWidth="2.5" />
            <path d="M9 22V10L16 17L23 10V22" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="7" r="1.5" fill="#000" />
          </svg>
        )}
        <span style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1 }}>{shopName.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {logoUrl ? (
        <div style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', padding: '2px', flexShrink: 0 }}>
          <img src={logoUrl} alt={shopName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="26" height="26" rx="6" stroke="#000" strokeWidth="2.5" />
          <path d="M9 22V10L16 17L23 10V22" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="7" r="1.5" fill="#000" />
        </svg>
      )}
      <div>
        <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px' }}>{shopName.toLowerCase()}</div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#1e293b' }}>{tagline}</div>
      </div>
    </div>
  );
};

// Realistic Handwritten Signature SVG stroke matching pdfService.js exactly
const SignatureStroke = () => (
  <svg viewBox="0 0 160 30" style={{ width: '90px', height: '20px', display: 'block' }}>
    <path
      d="M10 22 C 25 10, 35 25, 45 14 C 55 3, 52 22, 68 18 C 82 14, 95 24, 115 12 C 130 3, 142 18, 155 14"
      fill="none"
      stroke="#000000"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const InvoicePrintable = ({ invoice, job, shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'page1' | 'page2'
  const printAreaRef = useRef(null);

  // Shop Details (matching defaults in pdfService.js)
  const shopName = shop?.name || 'Mobotech mobile care';
  const shopAddress = shop?.address || 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar';
  const shopCity = shop?.city || 'Surat';
  const shopState = shop?.state || 'Gujarat';
  const shopPostal = shop?.postal_code || '395006';
  const shopPhone = shop?.phone || '080000 24439';
  const shopEmail = shop?.email || 'support@mobotech.com';
  const shopTagline = shop?.tagline || 'PROFESSIONAL SMARTPHONE & TABLET REPAIR SERVICES';
  const currencySymbol = shop?.currency_symbol || '₹';

  // Customer & Device data
  const cust = job?.customer || {};
  const dev = job?.device || {};
  const cond = job?.device_condition || {};
  const baseItems = invoice?.items || job?.estimate?.items || job?.estimate_items || [];
  const warrantyParts = (Array.isArray(job?.warranty_parts) && job.warranty_parts.length > 0)
    ? job.warranty_parts
    : (Array.isArray(job?.device_condition?.warranty_parts) && job.device_condition.warranty_parts.length > 0
        ? job.device_condition.warranty_parts
        : (Array.isArray(job?.warranty_history)
            ? job.warranty_history.flatMap(h => h.replacement_parts || [])
            : []));
  const items = [
    ...baseItems,
    ...warrantyParts.map((wp, idx) => ({
      id: wp.id || `wp-${idx}`,
      item_name: `${wp.item_name || wp.part_name || 'Replacement Component'} (Warranty Claim #${wp.claim_number || 1} Free Replacement)`,
      warranty: wp.warranty || wp.warranty_period || '30 Days',
      item_type: 'PART',
      quantity: wp.quantity || 1,
      unit_price: 0,
      total_price: 0,
      is_warranty_free: true,
    })),
  ];
  const payments = job?.payments || [];

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waStatus, setWaStatus] = useState({ isConnected: false });

  // Generate QR Code on mount
  useEffect(() => {
    if (!job) return;
    const trackingUrl = `${window.location.origin}/repair/${job?.job_number || 'INV'}/approval?token=${job?.approval_token || ''}`;
    QRCode.toDataURL(trackingUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [job]);

  // Check Baileys WhatsApp connection status on mount
  useEffect(() => {
    const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api`;
    fetch(`${apiBase}/whatsapp/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setWaStatus(data.data);
      })
      .catch(() => {});
  }, []);

  if (!job) return null;

  const handlePrint = () => {
    const cleanJobNum = (invoice?.invoice_number || job.job_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Mobotech_Invoice_${cleanJobNum}`;
    const prevTitle = document.title;
    document.title = filename;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 2000);
  };

  // High-fidelity vector PDF download matching bill-live.pdf layout 100%
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const cleanJobNum = (invoice?.invoice_number || job.job_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Mobotech_Invoice_${cleanJobNum}.pdf`;
    const toastId = toast.loading(`Preparing ${filename}...`);

    try {
      // 1. Attempt official server-side vector PDF download
      const token = localStorage.getItem('token');
      const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const apiBase = rawApiBase.endsWith('/api')
        ? rawApiBase
        : `${rawApiBase.replace(/\/+$/, '')}/api`;

      const downloadUrl = token
        ? `${apiBase}/invoices/job/${job.id || job.job_number}/download-pdf`
        : `${apiBase}/invoices/public/${job.id || job.job_number}/download-pdf`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast.success(`Downloaded ${filename} successfully!`, { id: toastId });
        setIsGeneratingPdf(false);
        return;
      }
    } catch (netErr) {
      console.warn('Backend vector PDF download error, switching to native vector generator:', netErr.message);
    } finally {
      setIsGeneratingPdf(false);
    }

    // 2. High-fidelity native vector PDF generation:
    // Uses the browser's native Skia vector pipeline (producing 100% identical layout to bill-live.pdf).
    // Pre-setting document.title ensures Chrome / Edge "Save as PDF" automatically names it "Mobotech_Invoice_INV-2026-000001.pdf"
    toast.dismiss(toastId);
    const cleanTitle = `Mobotech_Invoice_${cleanJobNum}`;
    const prevTitle = document.title;
    document.title = cleanTitle;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 2000);
  };

  // Date Formatting helper matching the exact (29-03-2024 11:31) format in PDF
  const formatSignatureDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `(${day}-${month}-${year} ${hours}:${mins})`;
  };

  // Format "29 Mar 2024 11:28:28"
  const formatInwardDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}:${secs}`;
  };

  const inwardDateStr = formatInwardDate(job.created_at);
  const allWarrantyClaims = getAllWarrantyClaims(job);
  const signatureDateStr = formatSignatureDate(invoice?.issued_at || job.updated_at || job.created_at);
  const technicianName = job.technician?.full_name || 'Jaimini Patel';

  const isWarrantyClaim = Boolean(
    job.is_warranty_claim ||
    job.warranty_same_issue ||
    job.warranty_free_rework ||
    (job.reopen_count && job.reopen_count > 0) ||
    allWarrantyClaims.length > 0
  );

  const extractDays = (val) => {
    if (!val) return null;
    const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
    return !isNaN(num) && num > 0 ? num : null;
  };

  const itemWarrantyDays = (items || [])
    .map((it) => extractDays(it.warranty))
    .filter(Boolean);
  const maxItemDays = itemWarrantyDays.length > 0 ? Math.max(...itemWarrantyDays) : null;

  const resolvedWarrantyDays =
    extractDays(job.warranty_days) ||
    extractDays(invoice?.warranty_period) ||
    maxItemDays ||
    (isWarrantyClaim ? 30 : null);

  const hasRepairWarranty = Boolean(
    isWarrantyClaim ||
    resolvedWarrantyDays ||
    (invoice?.warranty_period && !invoice.warranty_period.toLowerCase().includes('out of warranty') && !invoice.warranty_period.toLowerCase().includes('none')) ||
    (job.warranty_days && Number(job.warranty_days) > 0)
  );

  const warrantyDaysText = resolvedWarrantyDays ? `${resolvedWarrantyDays} Days` : (invoice?.warranty_period || '30 Days');

  // 12 Checklist items matching PDF exactly
  const checklistData = INWARD_CHECKLIST_CONFIG.map((item) => ({
    label: item.label,
    val: resolveChecklistValue(item.key, cond),
  }));

  // Accessories actually received
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

  const paidViaSummary = payments.length > 0
    ? payments.map((p) => `${p.payment_method} (${currencySymbol}${Number(p.amount).toFixed(2)})`).join(', ')
    : `CASH (${currencySymbol}${Number(invoice?.paid_amount || job.paid_amount || 0).toFixed(2)})`;

  // WhatsApp share helpers
  const cleanPhoneForWhatsApp = (p) => {
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const handleShareWhatsAppPrimary = async () => {
    const phone = cleanPhoneForWhatsApp(cust.whatsapp_number || cust.phone);
    if (!phone) {
      toast.error('No customer phone recorded');
      return;
    }

    if (waStatus?.isConnected) {
      setIsSendingWa(true);
      const toastId = toast.loading('Sending invoice & PDF directly to customer WhatsApp in background...');
      try {
        const token = localStorage.getItem('token');
        const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const apiBase = rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api`;
        const res = await fetch(`${apiBase}/whatsapp/send-invoice/${job.id || job.job_number}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ targetPhone: phone }),
        });
        const data = await res.json();
        if (data?.success) {
          toast.success(`Official invoice PDF sent automatically to ${cust.full_name || 'customer'}!`, { id: toastId });
          return;
        }
        throw new Error(data?.message || 'Failed to dispatch via WhatsApp');
      } catch (err) {
        console.warn('Background WhatsApp send failed:', err.message);
        toast.error(`Auto-send issue: ${err.message}. Opening WhatsApp Web...`, { id: toastId });
      } finally {
        setIsSendingWa(false);
      }
    } else {
      setShowWaModal(true);
      return;
    }

    const isWarranty = Boolean(job.is_warranty_claim || job.warranty_same_issue || job.warranty_free_rework);
    const getGreeting = () => {
      let hour;
      try {
        const istTimeStr = new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: 'numeric',
        });
        hour = parseInt(istTimeStr, 10);
      } catch (_) {
        hour = new Date().getHours();
      }
      if (hour >= 5 && hour < 12) return '☀️ Good Morning';
      if (hour >= 12 && hour < 17) return '🌤️ Good Afternoon';
      if (hour >= 17 && hour < 21) return '🌆 Good Evening';
      return '🌙 Hello';
    };
    const customerName = (cust.full_name || 'Customer').trim();
    const deviceName = `${dev.brand || ''} ${dev.model || 'Device'}`.trim();

    const msg = isWarranty
      ? `${getGreeting()} *${customerName}*!\n\n` +
        `🛡️ *Warranty Service Handover & Invoice - ${shopName}*\n\n` +
        `Your warranty rework for ${deviceName} (Job #${job.job_number}) is completed and handed over (100% Free Rework - ${currencySymbol}0.00 Balance Due).\n\n` +
        `📱 *Device:* ${deviceName}\n` +
        `🆔 *Job ID:* #${job.job_number}\n` +
        `💰 *Balance Due:* ${currencySymbol}0.00\n\n` +
        `Thank you for trusting *${shopName}*! ❤️`
      : `${getGreeting()} *${customerName}*!\n\n` +
        `🎊 *Thank You for Choosing ${shopName}!* ❤️\n\n` +
        `Your device has been delivered and invoice #${invoice?.invoice_number || job.job_number} is settled.\n\n` +
        `📱 *Device:* ${deviceName}\n` +
        `🆔 *Job ID:* #${job.job_number}\n` +
        `💰 *Total Amount:* ${currencySymbol}${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}\n\n` +
        `Thank you for choosing *${shopName}*! ❤️`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShareWhatsAppAlternate = async () => {
    const phone = cleanPhoneForWhatsApp(cust.alternate_whatsapp || cust.alternate_phone);
    if (!phone) {
      toast.error('No alternate contact recorded');
      return;
    }

    if (waStatus?.isConnected) {
      setIsSendingWa(true);
      const toastId = toast.loading('Sending invoice to alternate WhatsApp in background...');
      try {
        const token = localStorage.getItem('token');
        const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const apiBase = rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api`;
        const res = await fetch(`${apiBase}/whatsapp/send-invoice/${job.id || job.job_number}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ targetPhone: phone }),
        });
        const data = await res.json();
        if (data?.success) {
          toast.success(`Sent to alternate WhatsApp!`, { id: toastId });
          return;
        }
      } catch (err) {
        console.warn('Alternate WhatsApp background send failed:', err);
      } finally {
        setIsSendingWa(false);
      }
    }

    const msg = `*Service Record & Invoice Update - ${shopName}*\n` +
      `Dear ${cust.full_name || 'Customer'},\n` +
      `Service record for device ${dev.brand || ''} ${dev.model || ''} (Ref: ${job.job_number}).\n` +
      `Mobotech Mobile Care: ${shopPhone}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyDetails = () => {
    const summary =
      `MOBOTECH MOBILE CARE - SERVICE RECORD & INVOICE\n` +
      `Ref ID: ${job.job_number}\n` +
      `Invoice: ${invoice?.invoice_number || 'INV-FINAL'}\n` +
      `Customer: ${cust.full_name} (${cust.phone})\n` +
      `Device: ${dev.brand || ''} ${dev.model || ''} (IMEI/SN: ${dev.imei || dev.serial_number || 'N/A'})\n` +
      `Total Amount: ${currencySymbol}${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}\n` +
      `Address: ${shopAddress}, ${shopCity}, ${shopState} ${shopPostal}\n` +
      `Phone: ${shopPhone}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Invoice & Service Record details copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-slate-100 min-h-screen py-6 px-2 sm:px-4 text-black font-sans print:p-0 print:m-0 print:bg-white print:min-h-0"
      style={{ colorScheme: 'light' }}
    >
      {/* ============================================================== */}
      {/* EXACT CSS STYLES WITH VERIFIED PADDING ON ALL 4 SIDES          */}
      {/* ============================================================== */}
      <style>{`
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Screen Preview Styling */
        @media screen {
          .service-record-page {
            width: 100%;
            max-width: 800px;
            min-height: 1120px;
            padding: 24px 28px !important;
            margin: 0 auto;
            box-sizing: border-box;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }

        /* Print / Print to PDF Styling */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important; /* Zero margin to prevent browser driver clipping */
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: visible !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
          }
          #root {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          .no-print, header, nav, aside, button {
            display: none !important;
          }
          #print-invoice-portal,
          #print-jobsheet-portal,
          .print-modal-portal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .invoice-page-container {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
          }
          .page-break {
            display: none !important;
          }
          /* GUARANTEED PADDING ON ALL 4 SIDES (Top/Bottom: 6mm, Left/Right: 8mm) */
          .service-record-page {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 6mm 8mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .service-record-page:last-of-type {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
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
      `}</style>

      {/* ============================================================== */}
      {/* TOP ACTION TOOLBAR (Hidden when printed)                       */}
      {/* ============================================================== */}
      <div className="no-print max-w-[800px] mx-auto mb-4 bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-black text-white font-mono font-bold text-xs uppercase tracking-wider">
                {shopName}
              </span>
              <span className="font-mono text-xs font-bold text-slate-700">
                Invoice & Service Record • {job.job_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Apple / iVenus format official invoice & service record with checklists, barcodes & terms.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              onClick={handleDownloadPdf}
              icon={Download}
              size="sm"
              loading={isGeneratingPdf}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-sm"
              title="Automatically download official PDF with filename Mobotech_Invoice_..."
            >
              {isGeneratingPdf ? 'Downloading PDF...' : 'Download PDF'}
            </Button>

            <Button
              onClick={handlePrint}
              icon={Printer}
              size="sm"
              className="bg-black text-white hover:bg-slate-900 font-bold"
              title="Print directly or Save as PDF via browser"
            >
              Print / Save as PDF
            </Button>

            <button
              onClick={handleShareWhatsAppPrimary}
              disabled={isSendingWa}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title={waStatus?.isConnected ? 'Send official invoice & PDF automatically in background' : 'Link WhatsApp via QR to send automatically'}
            >
              {isSendingWa ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Auto...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                  {waStatus?.isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />}
                </>
              )}
            </button>

            {/* Quick Status Pill / Link Device Trigger */}
            <button
              onClick={() => setShowWaModal(true)}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                waStatus?.isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title={waStatus?.isConnected ? 'Device linked! Click to manage' : 'Click to scan QR code & link your phone'}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{waStatus?.isConnected ? `Linked (+${waStatus.user?.phone || '8758152507'})` : 'Link WhatsApp (QR)'}</span>
            </button>

            {cust.alternate_phone && (
              <button
                onClick={handleShareWhatsAppAlternate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium transition-colors"
                title="Send update to alternate number"
              >
                <span>Alt WP</span>
              </button>
            )}

            <button
              onClick={handleCopyDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* View Toggle Bar */}
        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Display View:</span>
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'both' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Complete (Page 1 & 2)
            </button>
            <button
              onClick={() => setViewMode('page1')}
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'page1' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Page 1 Only
            </button>
            <button
              onClick={() => setViewMode('page2')}
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'page2' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Page 2 (Terms)
            </button>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
            A4 Standard • 100% Print-Ready
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINTABLE DOCUMENT WRAPPER                                     */}
      {/* ============================================================== */}
      <div
        ref={printAreaRef}
        className="invoice-page-container max-w-[800px] mx-auto space-y-6 print:space-y-0"
      >
        {/* ============================================================ */}
        {/* PAGE 1: SERVICE RECORD & TAX INVOICE                         */}
        {/* ============================================================ */}
        {(viewMode === 'both' || viewMode === 'page1') && (
          <div
            className="service-record-page bg-white shadow-md border border-slate-300 print:shadow-none print:border-none"
            style={{ backgroundColor: '#ffffff', color: '#000000', colorScheme: 'light' }}
          >
            <div>
              {/* Top Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
                <MobotechLogo logoUrl={shop?.logo_url} shopName={shopName} tagline={shopTagline} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1.1 }}>Service Record</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>Tax Invoice & Device Inspection Report</div>
                </div>
              </div>

              {/* Main Outer Table */}
              <div className="border-box">
                {/* 2 Columns Body */}
                <div className="grid-2 border-b">
                  {/* LEFT COLUMN */}
                  <div className="col-2 border-r" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Service Details */}
                    <div style={{ padding: '4px 6px', borderBottom: '1px solid #000' }}>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Service Details</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '11.5px' }}>Reference ID:</span>
                        <BarcodeSvg value={invoice?.invoice_number || job.job_number} height={20} align="right" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '11.5px' }}>Serial Number:</span>
                        <BarcodeSvg value={dev.imei || dev.serial_number || '789654123654789'} height={20} align="right" />
                      </div>
                      <div style={{ fontSize: '11px', paddingTop: '2px', borderTop: '1px solid #cbd5e1', lineHeight: 1.25 }}>
                        <div>Service Mode: <b>Carry in</b></div>
                        {hasRepairWarranty && (
                          <div>Warranty Status: <b style={{ color: isWarrantyClaim ? '#166534' : 'inherit' }}>{isWarrantyClaim ? `Under Warranty (${warrantyDaysText} - Free Rework)` : `Under Warranty (${warrantyDaysText})`}</b></div>
                        )}
                        <div>Date of Device Inward: <b>{inwardDateStr}</b></div>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', fontSize: '11px', lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '2px' }}>Customer Details</div>
                      <div style={{ marginBottom: '1.5px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Name : </span>
                        <b style={{ fontSize: '12px' }}>{cust.full_name || 'Milan Devani'}</b>
                      </div>
                      <div style={{ marginBottom: '1.5px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Address : </span>
                        <span style={{ fontSize: '11px' }}>{cust.address || (cust.city ? `${cust.city}, ${cust.state || 'Gujarat'}, India` : 'pasodara')}</span>
                      </div>
                      <div style={{ marginBottom: '1.5px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Contact Number : </span>
                        <b style={{ fontSize: '11px' }}>{cust.phone || '8758152507'}</b>
                      </div>
                      <div style={{ marginBottom: '1.5px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Mail ID : </span>
                        <b style={{ fontSize: '11px' }}>{cust.email || 'milandevani994@gmail.com'}</b>
                      </div>
                      {cust.alternate_phone && (
                        <div>
                          <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Alternate Contact : </span>
                          <b style={{ fontSize: '11px' }}>{cust.alternate_phone}</b>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', fontSize: '11.5px' }}>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Product Details</div>
                      <div style={{ display: 'flex', marginBottom: '2px' }}>
                        <span style={{ width: '50%', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Model Name:</span>
                        <span style={{ width: '50%', fontWeight: 700, fontSize: '12px' }}>{dev.model || (dev.brand ? `${dev.brand} ${dev.model}` : 'iPhone 14 Pro')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <span style={{ width: '50%', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', paddingTop: '2px' }}>IMEI / Serial Number:</span>
                        <div style={{ width: '50%' }}>
                          <BarcodeSvg value={dev.imei || dev.serial_number || '789654123654789'} height={18} align="left" />
                        </div>
                      </div>
                      {hasRepairWarranty && (
                        <div style={{ display: 'flex' }}>
                          <span style={{ width: '50%', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Warranty Status:</span>
                          <span style={{ width: '50%', fontWeight: 700, fontSize: '12px', color: '#166534' }}>
                            {isWarrantyClaim ? `Under Warranty (${warrantyDaysText} - Free Rework)` : `Under Warranty (${warrantyDaysText})`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Issue Reported & Complete Warranty Claims Table */}
                    <div style={{ padding: '4px 6px', fontSize: '11px' }}>
                      {allWarrantyClaims.length > 0 ? (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Service & Warranty Claim History ({allWarrantyClaims.length} Claim{allWarrantyClaims.length > 1 ? 's' : ''}):</span>
                            <span style={{ color: '#166534', fontSize: '10px', fontWeight: 700 }}>100% Free Rework (₹0 Due)</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000', fontWeight: 700 }}>
                                <th style={{ width: '22%', borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'left' }}>Stage / Claim</th>
                                <th style={{ width: '39%', borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'left' }}>Reported Issue / Complaint</th>
                                <th style={{ width: '39%', padding: '2px 4px', textAlign: 'left' }}>Why Part Changed / Repaired</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #000' }}>
                                <td style={{ borderRight: '1px solid #000', padding: '2px 4px', verticalAlign: 'top', fontWeight: 700 }}>
                                  Initial Service
                                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 500 }}>{inwardDateStr}</div>
                                </td>
                                <td style={{ borderRight: '1px solid #000', padding: '2px 4px', verticalAlign: 'top' }}>
                                  • {job.customer_complaint || 'display not working'}
                                </td>
                                <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>
                                  • {job.diagnosis?.recommended_solution || 'Replace display / hardware component service'}
                                </td>
                              </tr>
                              {allWarrantyClaims.map((c, cIdx) => (
                                <tr
                                  key={c.claim_number || cIdx}
                                  style={{
                                    borderBottom: cIdx === allWarrantyClaims.length - 1 ? 'none' : '1px solid #cbd5e1',
                                    background: cIdx % 2 === 0 ? '#fefce8' : '#f0fdf4',
                                  }}
                                >
                                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', verticalAlign: 'top', fontWeight: 700, color: '#854d0e' }}>
                                    Warranty Claim #{c.claim_number}
                                    <div style={{ fontSize: '9px', color: '#166534', fontWeight: 700 }}>
                                      {c.is_free_rework ? '✓ 100% Free' : 'Chargeable'}
                                    </div>
                                    {c.claimed_at && (
                                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 500 }}>
                                        {new Date(c.claimed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        {c.days_after_delivery !== null && c.days_after_delivery !== undefined ? ` • Day ${c.days_after_delivery}` : ''}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', verticalAlign: 'top', color: '#854d0e', fontWeight: 600 }}>
                                    • {c.warranty_issue || 'Warranty issue reported'}
                                  </td>
                                  <td style={{ padding: '2px 4px', verticalAlign: 'top', color: '#166534', fontWeight: 600 }}>
                                    {(() => {
                                      const claimWp = warrantyParts.filter(
                                        (p) => Number(p.claim_number) === Number(c.claim_number) || warrantyParts.length === 1
                                      );
                                      const rawReason = (c.rework_reason || '').trim();
                                      const isBoilerplate = !rawReason ||
                                        rawReason.toLowerCase().includes('same issue rework / part replacement authorized') ||
                                        rawReason.toLowerCase().includes('technical inspection verified') ||
                                        rawReason.toLowerCase().includes('free rework / replacement under warranty') ||
                                        rawReason.toLowerCase().includes('free warranty rework') ||
                                        rawReason.toLowerCase().includes('technical diagnosis & free component rework') ||
                                        rawReason.toLowerCase().includes('authorized at') ||
                                        rawReason.toLowerCase() === 'free rework' ||
                                        rawReason.toLowerCase() === 'same issue rework';
                                      const customReason = !isBoilerplate ? rawReason : null;

                                      if (claimWp.length > 0) {
                                        return (
                                          <>
                                            {customReason && <div>• {customReason}</div>}
                                            {claimWp.map((wp, wIdx) => (
                                              <div key={wIdx}>• {wp.item_name}</div>
                                            ))}
                                          </>
                                        );
                                      }
                                      return <div>• {customReason || 'Same issue rework'}</div>;
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '12.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Issue Reported by Customer:</div>
                          <div style={{ border: '1px solid #000' }}>
                            <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #000', fontWeight: 700, padding: '1px 3px' }}>
                              <span style={{ width: '35%' }}>Category</span>
                              <span style={{ width: '65%' }}>Description</span>
                            </div>
                            <div style={{ display: 'flex', padding: '2px 3px' }}>
                              <span style={{ width: '35%', fontWeight: 700 }}>{job.service_type || 'Screen / Display Replacement'}</span>
                              <span style={{ width: '65%', fontWeight: 600 }}>• {job.customer_complaint || 'display not working'}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="col-2" style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Checklist */}
                    <div style={{ borderBottom: '1px solid #000' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="table-header">
                        <span>Checklist</span>
                        <span>Inward Check</span>
                      </div>
                      {checklistData.map((r, i) => (
                        <div key={i} className="checklist-row">
                          <span>{r.label}</span>
                          <b>{r.val}</b>
                        </div>
                      ))}
                    </div>

                    {/* Cosmetic Condition of Product */}
                    <div style={{ padding: '3.5px 6px', borderBottom: '1px solid #000', fontSize: '11px' }}>
                      <div style={{ fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Cosmetic Condition of Product:</div>
                      <div style={{ border: '1px solid #000', background: '#f8fafc', padding: '2.5px 4px', fontWeight: 700, fontSize: '11px' }}>
                        {dev.cosmetic_condition || cond.body || 'Wear And Tear'}
                        {cond.notes && (
                          <div style={{ fontSize: '10px', fontWeight: 500, fontStyle: 'italic', marginTop: '2px', color: '#334155' }}>
                            Note: {cond.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accessories & Passcode */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="table-header">Accessories Received</div>
                        {actualReceivedAccessories.length > 0 ? (
                          actualReceivedAccessories.map((acc, idx) => (
                            <div key={idx} className="checklist-row">
                              <span>{acc}</span>
                              <b>Received</b>
                            </div>
                          ))
                        ) : (
                          <div className="checklist-row" style={{ color: '#64748b', fontStyle: 'italic' }}>
                            <span>None / Handset Only</span>
                            <b>None</b>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '2.5px 5px', background: '#f8fafc', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <b>Device Passcode / PIN:</b>
                        <b style={{ fontFamily: 'monospace', fontSize: '12px' }}>{dev.passcode || '789654'}</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax Invoice & Charges */}
                <div style={{ padding: '4px 6px' }} className="border-b">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '3px' }}>
                    <span style={{ fontSize: '12.5px', textTransform: 'uppercase' }}>Tax Invoice & Repair Charges</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>Invoice No: {invoice?.invoice_number || 'INV-2026-000001'}</span>
                  </div>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25px', textAlign: 'center' }}>#</th>
                        <th style={{ textAlign: 'left' }}>Item / Service Description</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Warranty</th>
                        <th style={{ width: '55px', textAlign: 'center' }}>Type</th>
                        <th style={{ width: '35px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>Unit Rate ({currencySymbol})</th>
                        <th style={{ width: '85px', textAlign: 'right' }}>Total ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length > 0 ? (
                        items.map((it, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{idx + 1}</td>
                            <td><b>{it.item_name}</b></td>
                            <td style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>
                              {it.warranty || invoice?.warranty_period || '—'}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{it.item_type || 'PART'}</td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{it.quantity || 1}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(it.unit_price).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{Number(it.total_price).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                          <td><b>Standard Diagnostic / Service Fee</b></td>
                          <td style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>
                            {invoice?.warranty_period || (job.warranty_days ? `${job.warranty_days} Days` : 'As per line items')}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>SERVICE</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(job.total_amount || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{Number(job.total_amount || 0).toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Totals Grid */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11.5px' }}>
                    <div style={{ lineHeight: 1.35 }}>
                      <div>Payment Status: <b>{job.payment_status || 'SETTLED'}</b></div>
                      <div>Paid Via: {paidViaSummary}</div>
                    </div>
                    <div style={{ width: '230px', fontFamily: 'monospace', fontSize: '11.5px', lineHeight: 1.3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <b>{currencySymbol}{Number(invoice?.subtotal || job.subtotal || 0).toFixed(2)}</b>
                      </div>
                      {Number(invoice?.discount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            Discount Applied
                            {invoice?.discount_type === 'PERCENTAGE' && invoice?.discount_value
                              ? ` (${invoice.discount_value}%)`
                              : ''}
                            :
                          </span>
                          <b>-{currencySymbol}{Number(invoice.discount).toFixed(2)}</b>
                        </div>
                      )}
                      {Number(invoice?.tax_amount || 0) > 0 || Number(invoice?.tax_rate || 0) > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>GST / Tax ({invoice?.tax_rate ?? 18}%):</span>
                          <b>{currencySymbol}{Number(invoice?.tax_amount || 0).toFixed(2)}</b>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                          <span>GST / Tax:</span>
                          <b>Nil ({currencySymbol}0.00)</b>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '2px', fontWeight: 900, fontSize: '12.5px' }}>
                        <span>Total Invoice Amount:</span>
                        <span>{currencySymbol}{Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Amount Paid:</span>
                        <span>{currencySymbol}{Number(invoice?.paid_amount || job.paid_amount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '2px', fontWeight: 900 }}>
                        <span>Balance Remaining:</span>
                        <span>{currencySymbol}{Number(invoice?.balance_due || job.balance_due || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions Summary on Page 1 */}
                <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '2px' }}>Terms and Conditions:</div>
                    <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '10px', lineHeight: 1.25, color: '#000' }}>
                      <li>Subject to Engineer’s physical & internal diagnostic inspection.</li>
                      <li>Quality program repairs will not cover all defective parts on non-chargeable basis. Only parts covered under quality program will be covered as non-chargeable post inspection.</li>
                      <li>Mobotech mobile care receives customer devices without opening; full diagnostics follow standard testing procedures.</li>
                      <li>Repair cannot be cancelled once approved. Non-approved estimates are returned as-is.</li>
                      <li><b>DATA WARNING: Storage contents may be deleted/reformatted during repair. Customer must backup data before service. Mobotech is not responsible for data loss.</b></li>
                      <li>Unclaimed devices after 30 days of notification are subject to disposal/auction to recover costs.</li>
                    </ul>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, fontStyle: 'italic', marginTop: '2px', paddingLeft: '14px' }}>
                      * Note: For complete detailed terms & conditions, please refer to Page 2 overleaf.
                    </div>
                  </div>
                  {qrDataUrl && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <img src={qrDataUrl} alt="Verify QR" style={{ width: '48px', height: '48px', border: '1px solid #000', padding: '1px', display: 'block' }} />
                      <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 700, marginTop: '1px' }}>SCAN TO TRACK</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Signatures on Page 1 */}
            <div className="sig-row">
              <div className="sig-box">
                <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{signatureDateStr}</div>
                <SignatureStroke />
                <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Authorized Signatory</div>
                  <div style={{ fontSize: '11px' }}>({technicianName})</div>
                </div>
              </div>
              <div className="sig-box" style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{signatureDateStr}</div>
                <div style={{ height: '20px' }}></div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Customer's Signature</div>
                  <div style={{ fontSize: '11px' }}>({cust.full_name || 'Milan Devani'})</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Break for Print */}
        <div className="page-break" />

        {/* ============================================================ */}
        {/* PAGE 2: COMPLETE TERMS AND CONDITIONS CONTINUATION           */}
        {/* ============================================================ */}
        {(viewMode === 'both' || viewMode === 'page2') && (
          <div
            className="service-record-page bg-white shadow-md border border-slate-300 print:shadow-none print:border-none"
            style={{ backgroundColor: '#ffffff', color: '#000000', colorScheme: 'light' }}
          >
            <div>
              {/* Page 2 Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '3px', borderBottom: '1px solid #000' }}>
                <MobotechLogo logoUrl={shop?.logo_url} shopName={shopName} isPage2={true} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '19px', fontWeight: 900 }}>Service Record</div>
                  <div style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 700 }}>Ref: {job.job_number} • Page 2 of 2</div>
                </div>
              </div>

              {/* Support Banner */}
              <div style={{ padding: '2px 0', fontSize: '10.5px', fontStyle: 'italic', borderBottom: '1px solid #000', marginBottom: '4px' }}>
                Need Help? Contact Mobotech mobile care at <b>{shopPhone}</b> or visit {shopAddress}, Surat for all support on your smartphones & tablets.
              </div>

              {/* Complete 17 Terms */}
              <div style={{ fontSize: '10px', lineHeight: 1.25, textAlign: 'justify' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                  All device intake, diagnostic, and repair services conducted by Mobotech mobile care are subject to the following standard service terms and conditions:
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px' }}>
                  <li style={{ marginBottom: '2px' }}>In case of any Tempering/Unauthorised Modification found While doing micro inspection at our centre then Mobotech will not be able to provide any service on this unit. device will be return back to customer un-repaired in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios, also Mobotech may not be able to provide any service on this unit in future.</li>
                  <li style={{ marginBottom: '2px' }}>While submitting device (warranty/non-warranty) if there is any damage are present Then there may be a chance while opening/servicing your device by Mobotech Repair Centre that damage may be increased or any other hardware issue May appeared, for that Mobotech is not responsible.</li>
                  <li style={{ marginBottom: '2px' }}>While submitting device Remove any SIM card, case, screen protector or accessories from your device. As a part of repair Mobotech may have to remove and discard such accessories, in such cases Mobotech is not responsible for any damage or loss of SIM card, case, screen protector or accessories.</li>
                  <li style={{ marginBottom: '2px' }}>The charges for labour as well as spares used for non-warranty repair shall be as per the applicable price lists approved and recommended by Mobotech.</li>
                  <li style={{ marginBottom: '2px' }}>The Estimate price given at the time of acceptance of the Product to repairs are Provisional and may vary at the time of detailed inspection. Should the final expected charges be more than the initial estimate, Mobotech will proceed only after taking the approval of the Customer.</li>
                  <li style={{ marginBottom: '2px' }}>In the event the final estimate/Re-Quote from Mobotech Repair Centre is not approved by the customer within 2 days, the device will be return back to customer "as is condition (partly repaired/un-repaired)" in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios.</li>
                  <li style={{ marginBottom: '2px' }}>Mobotech shall make all efforts to ensure that the product is repaired within 7 working days from the receipt of faulty product. At times however, due to non-availability/shortage of critical spare parts or complicated fault, the repair turnaround time may take longer than the indicated while accepting the machine for repair. Mobotech will not be responsible for any loss/losses whatsoever in the event of the delay in repair for such aforementioned reasons.</li>
                  <li style={{ marginBottom: '2px' }}>For Same day Display/Battery repair for smartphones, the Turn Around Time may be depending upon the scenario and intensity of the issue and stock availability.</li>
                  <li style={{ marginBottom: '2px' }}>Mobotech is not liable for any delays, non-performance, failure or non-delivery of the product due to contingencies arising from any force measure, act of God, storm, earthquake, accident, strikes, lockout, industrial dispute, labour trouble, transportation embargo, imminence or the existence of any state emergency, war, civil commotion right, approval or imposition of sanctions or any measure taken by government which renders it impossible or impractical for Mobotech to perform supply, service or deliver the Product to the Customer.</li>
                  <li style={{ marginBottom: '2px' }}>The customer shall take the delivery of the Product within 30 (Thirty) days of intimation (either by Phone call or through Email or Text Message/WhatsApp Message) from Mobotech. In the event the delivery is not taken by the customer, Mobotech reserves the right to Auction the Product to recover the repair/ storage charges.</li>
                  <li style={{ marginBottom: '2px' }}>Following warranty service your device or a replacement product will be returned to you as configured when originally purchased, subject to applicable updates. Third party applications installed may not be compatible or work as a result of the software update. You will be responsible for reinstalling all other software programs, data and information. Recovery and reinstallation of other software programs, data and information are not covered under warranty.</li>
                  <li style={{ marginBottom: '2px' }}>The Customer must produce the Original Service or Digital Service Report at the time of taking the delivery. Mobotech reserves the right to refuse delivery upon non-production of the original service report, if you fail to provide, Mobotech reserves the right to retain the product till it is provided. Mobotech may at its sole discretion consider alternative modes to verify the authenticity of the customer and choose to deliver the product only after verifying the credentials of the customer.</li>
                  <li style={{ marginBottom: '2px' }}>Mobotech mobile care acts as an independent multi-brand hardware & software service center, where decision making authorities on repair / replacement / warranty deliverables is governed by Mobotech Service Policies.</li>
                  <li style={{ marginBottom: '2px' }}>For any payments refund if repair/service got cancelled for any reason, amount will be transferred only through Bank Transfer or UPI to customer account in 4-5 bank working days (after customer provided their bank details).</li>
                  <li style={{ marginBottom: '2px' }}>Vintage / Obsolete Products: Products where parts have been discontinued by manufacturers are repaired strictly subject to compatible component availability. Mobotech does not guarantee OEM part availability for discontinued lines.</li>
                  <li style={{ marginBottom: '2px' }}>This equipment is accepted subject to repair terms and conditions mentioned above and/or on website, printed overleaf or attached in e-mail along with digital service report and digital delivery report sent on customer email ID or WhatsApp.</li>
                  <li style={{ marginBottom: '2px' }}>By accepting the Service report / Final Invoice, it is deemed that the Customer agrees to all the terms and conditions mentioned in the Service Report.</li>
                </ul>
              </div>
            </div>

            {/* Signatures on Page 2 */}
            <div className="sig-row">
              <div className="sig-box">
                <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{signatureDateStr}</div>
                <SignatureStroke />
                <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Authorized Signatory</div>
                  <div style={{ fontSize: '11px' }}>({technicianName})</div>
                </div>
              </div>
              <div className="sig-box" style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{signatureDateStr}</div>
                <div style={{ height: '20px' }}></div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Customer's Signature</div>
                  <div style={{ fontSize: '11px' }}>({cust.full_name || 'Milan Devani'})</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp QR Scan Modal */}
      <WhatsAppQrModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        onConnected={(user) => setWaStatus({ isConnected: true, user })}
      />
    </div>
  );
};
