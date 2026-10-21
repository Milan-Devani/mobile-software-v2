import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  ShieldCheck,
  Download,
  Eye,
  FileText,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Button } from '../common/Button';
import { WhatsAppQrModal } from '../common/WhatsAppQrModal';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../../utils/checklistConstants';

// High-Precision Code 39 Barcode Generator (Scalable Vector SVG)
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

const BarcodeSvg = ({ value = 'REF12345', height = 24, showText = true, align = 'right' }) => {
  const cleanVal = (value || 'REF12345').toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '-');
  const fullStr = `*${cleanVal}*`;

  const bars = [];
  let currentX = 0;
  const narrow = 1.0;
  const wide = 2.4;
  const interGap = 1.0;

  for (let i = 0; i < fullStr.length; i++) {
    const char = fullStr[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let p = 0; p < pattern.length; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wide : narrow;

      if (isBar) {
        bars.push({ x: currentX, width: w });
      }
      currentX += w;
    }
    currentX += interGap;
  }

  const totalWidth = Math.max(110, currentX);

  return (
    <div className={`inline-flex flex-col ${align === 'right' ? 'items-end' : align === 'left' ? 'items-start' : 'items-center'} my-0.5`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="h-6 w-auto max-w-[170px] block"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height={height}
            fill="#000000"
            shapeRendering="crispEdges"
          />
        ))}
      </svg>
      {showText && (
        <span className={`w-full font-mono text-[11.5px] tracking-wider text-black font-semibold mt-0.5 ${align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : 'text-center'}`}>
          {cleanVal}
        </span>
      )}
    </div>
  );
};

// Mobotech Brand Logo Component matching iVenus aesthetic
const MobotechLogo = () => (
  <div className="flex items-center gap-1.5 select-none">
    {/* Stylized Modern Emblem */}
    <div className="relative flex items-center justify-center">
      <svg className="w-8 h-8 text-black" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M9 22V10L16 17L23 10V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="7" r="1.5" fill="currentColor" />
      </svg>
    </div>
    <div className="leading-none">
      <span className="text-2xl font-black tracking-tight text-black font-sans">
        mobotech
      </span>
      <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-800 -mt-0.5">
        mobile care
      </span>
    </div>
  </div>
);

// Realistic Handwritten Signature SVG stroke
const SignatureStroke = () => (
  <svg viewBox="0 0 160 40" className="w-28 h-7 text-black block -mb-1 opacity-90">
    <path
      d="M10 28 C 25 15, 35 32, 45 18 C 55 5, 52 28, 68 22 C 82 17, 95 30, 115 15 C 130 5, 142 22, 155 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 22 C 40 24, 70 20, 100 23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const InvoicePrintable = ({ invoice, job, shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'page1' | 'page2'
  const printAreaRef = useRef(null);

  // Shop Details (with requested Mobotech defaults)
  const shopName = shop?.name || 'Mobotech mobile care';
  const shopAddress = shop?.address || 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar';
  const shopCity = shop?.city || 'Surat';
  const shopState = shop?.state || 'Gujarat';
  const shopPostal = shop?.postal_code || '395006';
  const shopPhone = shop?.phone || '080000 24439';
  const shopEmail = shop?.email || 'support@mobotech.com';
  const shopTimings = shop?.timings || 'Mon - Sat: 10:30 AM to 06:30 PM';
  const currencySymbol = shop?.currency_symbol || '₹';

  // Customer & Device data
  const cust = job?.customer || {};
  const dev = job?.device || {};
  const cond = job?.device_condition || {};
  const items = invoice?.items || job?.estimate?.items || job?.estimate_items || [];
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
      width: 100,
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
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${apiBase}/whatsapp/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setWaStatus(data.data);
      })
      .catch(() => {});
  }, []);

  if (!job) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Generating official vector PDF...');

    try {
      const cleanJobNum = (invoice?.invoice_number || job.job_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Mobotech_Invoice_${cleanJobNum}.pdf`;

      // Use authenticated endpoint if token is present, else public endpoint
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const downloadUrl = token
        ? `${apiBase}/invoices/job/${job.id || job.job_number}/download-pdf`
        : `${apiBase}/invoices/public/${job.id || job.job_number}/download-pdf`;

      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Official razor-sharp vector PDF downloaded!', { id: toastId });
    } catch (err) {
      console.error('Vector PDF download error:', err);
      toast.error('Vector PDF generation encountered an issue. Opening Print to PDF as fallback...', { id: toastId });
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Date Formatting helper matching the exact (29-03-2024 11:31) format in PDF
  const formatSignatureDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
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
  const signatureDateStr = formatSignatureDate(invoice?.issued_at || job.updated_at || job.created_at);
  const technicianName = job.technician?.full_name || 'Jaimini Patel';

  // 12 Checklist items matching PDF exactly
  const checklistData = INWARD_CHECKLIST_CONFIG.map((item) => ({
    label: item.label,
    val: resolveChecklistValue(item.key, cond),
  }));

  // Accessories matching PDF
  const accessoriesReceived = job.accessories_received || [];
  const hasEarPods = accessoriesReceived.some((a) => a.toLowerCase().includes('ear') || a.toLowerCase().includes('pod'));
  const hasAdapter = accessoriesReceived.some((a) => a.toLowerCase().includes('adapter') || a.toLowerCase().includes('charger'));
  const hasCable = accessoriesReceived.some((a) => a.toLowerCase().includes('cable') || a.toLowerCase().includes('lightning') || a.toLowerCase().includes('usb'));

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

    // 1. If WhatsApp is linked via QR code, send AUTOMATICALLY in background with attached PDF!
    if (waStatus?.isConnected) {
      setIsSendingWa(true);
      const toastId = toast.loading('Sending invoice & PDF directly to customer WhatsApp in background...');
      try {
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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
      // If not linked yet, prompt to scan QR code
      setShowWaModal(true);
      return;
    }

    // Fallback: Open in WhatsApp Web/App
    const msg = `*Service Record & Invoice - ${shopName}*\n` +
      `Dear ${cust.full_name || 'Customer'},\n` +
      `Your service record & invoice #${invoice?.invoice_number || job.job_number} is ready.\n` +
      `Device: ${dev.brand || ''} ${dev.model || ''}\n` +
      `Total: ${currencySymbol}${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}\n` +
      `Track online: ${window.location.origin}/repair/${job.job_number}/approval?token=${job.approval_token || ''}\n` +
      `Mobotech Mobile Care, Central Bazar, Surat. Phone: ${shopPhone}`;
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
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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
      `Device: ${dev.brand} ${dev.model} (IMEI/SN: ${dev.imei || dev.serial_number || 'N/A'})\n` +
      `Total Amount: ${currencySymbol}${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}\n` +
      `Address: ${shopAddress}, ${shopCity}, ${shopState} ${shopPostal}\n` +
      `Phone: ${shopPhone}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Invoice & Service Record details copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-100 min-h-screen py-6 px-2 sm:px-4 text-black font-sans print:p-0 print:m-0 print:bg-white print:min-h-0">
      {/* ============================================================== */}
      {/* PRINT CSS STYLES FOR EXACT MULTI-PAGE & SINGLE-PAGE ACCURACY   */}
      {/* ============================================================== */}
      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          /* CRITICAL: Completely hide background app (#root) so job details & payment ledger never print */
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
            width: 100% !important;
            max-width: 100% !important;
          }
          .page-break {
            display: none !important;
          }
          .service-record-page {
            width: 100% !important;
            max-width: 100% !important;
            height: 288mm !important;
            max-height: 288mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .service-record-page:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ============================================================== */}
      {/* TOP ACTION TOOLBAR (Hidden when printed)                       */}
      {/* ============================================================== */}
      <div className="no-print max-w-[850px] mx-auto mb-4 bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
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
            >
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
            </Button>

            <Button
              onClick={handlePrint}
              icon={Printer}
              size="sm"
              className="bg-black text-white hover:bg-slate-900 font-bold"
              title="Print directly or Save as 100% Vector PDF via browser"
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
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'both' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Complete (Page 1 & 2)
            </button>
            <button
              onClick={() => setViewMode('page1')}
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'page1' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Page 1 Only
            </button>
            <button
              onClick={() => setViewMode('page2')}
              className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'page2' ? 'bg-black text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
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
        className="invoice-page-container max-w-[850px] mx-auto space-y-6 print:space-y-0"
      >
        {/* ============================================================ */}
        {/* PAGE 1: SERVICE RECORD & INVOICE BREAKDOWN                   */}
        {/* ============================================================ */}
        {(viewMode === 'both' || viewMode === 'page1') && (
          <div className="service-record-page bg-white p-6 sm:p-7 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0">
            {/* 1. Header (Logo on Left, Service Record on Right) */}
            <div className="flex items-center justify-between pb-3">
              <MobotechLogo />
              <div className="text-right">
                <h2 className="text-2xl font-black text-black tracking-tight font-sans">
                  Service Record
                </h2>
                <p className="text-[10px] text-slate-600 font-medium">
                  Tax Invoice & Device Inspection Report
                </p>
              </div>
            </div>

            {/* 2. Main Outer Table with 1px black border matching iVenus */}
            <div className="border border-black text-[12px] leading-normal">
              {/* TWO CONTINUOUS COLUMNS (Left Column & Right Column) */}
              <div className="grid grid-cols-2 divide-x divide-black border-b border-black items-stretch">
                {/* ==================================================== */}
                {/* LEFT COLUMN: Service -> Customer -> Product -> Issue -> Condition */}
                {/* ==================================================== */}
                <div className="divide-y divide-black flex flex-col justify-between">
                  {/* SECTION 1: Service Details */}
                  <div className="p-2 space-y-1 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Service Details
                    </h3>

                    <div className="flex justify-between gap-2 items-start py-0.5">
                      <span className="text-[11.5px] font-bold text-black whitespace-nowrap">Reference ID:</span>
                      <BarcodeSvg value={invoice?.invoice_number || job.job_number || 'INV-2026-000001'} height={22} align="right" />
                    </div>

                    <div className="flex justify-between gap-2 items-start py-0.5">
                      <span className="text-[11.5px] font-bold text-black whitespace-nowrap">Serial Number:</span>
                      <BarcodeSvg value={dev.imei || dev.serial_number || '789654123654789'} height={22} align="right" />
                    </div>

                    <div className="space-y-0.5 text-[11px] pt-1 border-t border-slate-300">
                      <p><span className="text-black font-semibold">Service Mode:</span> <strong className="text-black font-bold">Carry in</strong></p>
                      <p><span className="text-black font-semibold">*Service Coverage Status:</span> <strong className="text-black font-bold">{dev.warranty_status || 'Out of Warranty'}</strong></p>
                      <p><span className="text-black font-semibold">Date of Device Inward:</span> <strong className="text-black font-mono font-bold">{inwardDateStr}</strong></p>
                    </div>
                  </div>

                  {/* SECTION 2: Customer Details */}
                  <div className="p-2 space-y-1 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Customer Details
                    </h3>

                    <div>
                      <span className="text-black block text-[10.5px] uppercase font-bold">Name:</span>
                      <strong className="text-black text-[13.5px] font-bold">{cust.full_name || 'Milan Devani'}</strong>
                    </div>

                    <div>
                      <span className="text-black block text-[10.5px] uppercase font-bold">Address:</span>
                      <p className="text-black font-medium text-[11.5px] leading-snug">
                        {cust.address || (cust.city ? `${cust.city}, ${cust.state || 'Gujarat'}, India` : 'pasodara')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <span className="text-black block text-[10.5px] uppercase font-bold">Contact Number:</span>
                        <strong className="text-black font-mono font-bold text-[12px]">{cust.phone || '8758152507'}</strong>
                      </div>
                      <div>
                        <span className="text-black block text-[10.5px] uppercase font-bold">Email ID:</span>
                        <span className="text-black font-mono font-semibold text-[11.5px] break-all leading-normal block">
                          {cust.email || 'milandevani@gmail.com'}
                        </span>
                      </div>
                    </div>

                    {cust.alternate_phone && (
                      <div className="pt-0.5">
                        <span className="text-black block text-[10.5px] uppercase font-bold">Alternate Contact:</span>
                        <span className="text-black font-mono font-bold text-[11.5px]">{cust.alternate_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: Product Details */}
                  <div className="p-2 space-y-1 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Product Details
                    </h3>

                    {dev.product_name && (
                      <div className="grid grid-cols-2 gap-2 py-0.5 items-center">
                        <span className="text-black text-[11px] uppercase font-bold whitespace-nowrap">
                          Product Name:
                        </span>
                        <strong className="text-black text-[12px] text-left font-bold truncate">
                          {dev.product_name}
                        </strong>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 py-0.5 items-center">
                      <span className="text-black text-[11px] uppercase font-bold whitespace-nowrap">
                        Model Name:
                      </span>
                      <strong className="text-black text-[12px] text-left font-bold">
                        {dev.model || (dev.brand ? `${dev.brand} ${dev.model}` : 'iPhone 14 Pro')}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-0.5 items-start">
                      <span className="text-black text-[11px] uppercase font-bold whitespace-nowrap pt-1">
                        IMEI / Serial Number:
                      </span>
                      <div className="flex justify-start">
                        <BarcodeSvg
                          value={dev.imei || dev.serial_number || '789654123654789'}
                          height={20}
                          align="left"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-0.5 items-center">
                      <span className="text-black text-[11px] uppercase font-bold whitespace-nowrap">
                        Product Warranty Status:
                      </span>
                      <span className="text-black font-bold text-[12px] text-left">
                        {dev.warranty_status || 'Out of Warranty'}
                      </span>
                    </div>
                  </div>

                  {/* SECTION 4: Issue Reported by Customer */}
                  <div className="p-2 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Issue Reported by Customer:
                    </h3>

                    <div className="border border-black mt-1">
                      <div className="grid grid-cols-4 bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase text-[11px]">
                        <span className="col-span-1 text-black">Category</span>
                        <span className="col-span-3 text-black">Description</span>
                      </div>
                      <div className="grid grid-cols-4 px-2 py-1 text-[11.5px]">
                        <span className="col-span-1 font-bold text-black">{job.service_type || 'Screen / Display Replacement'}</span>
                        <span className="col-span-3 text-black font-semibold">
                          • {job.customer_complaint || 'display not working'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Cosmetic Condition of Product */}
                  <div className="p-2 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Cosmetic Condition of Product:
                    </h3>
                    <div className="p-1.5 border border-black bg-slate-50 rounded mt-0.5 min-h-[38px]">
                      <p className="text-black font-bold text-[12px]">
                        {dev.cosmetic_condition || cond.body || 'Wear And Tear'}
                      </p>
                      {cond.notes && (
                        <p className="text-black text-[10.5px] mt-0.5 italic font-medium">
                          Intake Note: {cond.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* RIGHT COLUMN: Service Provider -> Checklist -> Accessories */}
                {/* ==================================================== */}
                <div className="divide-y divide-black flex flex-col justify-between">
                  {/* SECTION 1: Authorized Service Provider Details */}
                  <div className="p-2 space-y-1 text-[11.5px]">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider mb-1">
                      Authorized Service Provider Details
                    </h3>

                    <div className="space-y-1 text-[11.5px]">
                      <div>
                        <span className="text-black block text-[10.5px] uppercase font-bold">Name:</span>
                        <strong className="text-black text-[13.5px] font-bold block">{shopName}</strong>
                      </div>

                      <div>
                        <span className="text-black block text-[10.5px] uppercase font-bold">Address:</span>
                        <p className="text-black font-medium leading-snug text-[11.5px]">
                          {shopAddress}, {shopCity}, {shopState}, India {shopPostal}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <span className="text-black block text-[10.5px] uppercase font-bold">Contact Number:</span>
                          <strong className="text-black font-mono font-bold text-[12px]">{shopPhone}</strong>
                        </div>
                        <div>
                          <span className="text-black block text-[10.5px] uppercase font-bold">Email ID:</span>
                          <span className="text-black font-mono font-semibold text-[11.5px] break-all leading-normal block">
                            {shopEmail}
                          </span>
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <span className="text-black block text-[10.5px] uppercase font-bold">Timings:</span>
                        <p className="text-black font-medium text-[11.5px]">{shopTimings}</p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Checklist & Inward Check (12 items matching original) */}
                  <div className="text-[11px]">
                    <div className="flex items-center justify-between bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase text-[11.5px]">
                      <span className="text-black">Checklist</span>
                      <span className="text-black">Inward Check</span>
                    </div>

                    <div className="divide-y divide-slate-300">
                      {checklistData.map((chk, i) => (
                        <div key={i} className="flex items-center justify-between px-2 py-[2px] leading-normal">
                          <span className="text-black font-medium">{chk.label}</span>
                          <strong className={`font-mono text-[11px] font-bold text-black`}>
                            {chk.val}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION 3: Accessories Received & Device Passcode */}
                  <div className="text-[11px] flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase text-[11.5px]">
                        Accessories Received
                      </div>

                      <div className="divide-y divide-slate-200">
                        <div className="flex items-center justify-between px-2 py-0.5 leading-normal">
                          <span className="text-black font-medium">Ear Pods</span>
                          <span className="font-mono text-black">{hasEarPods ? 'Received' : 'NA'}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-0.5 leading-normal">
                          <span className="text-black font-medium">Power Adapter</span>
                          <span className="font-mono text-black">{hasAdapter ? 'Received' : 'NA'}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-0.5 leading-normal">
                          <span className="text-black font-medium">Lightning to USB Cable</span>
                          <span className="font-mono text-black">{hasCable ? 'Received' : 'NA'}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-0.5 leading-normal">
                          <span className="text-black font-medium">SIM Card</span>
                          <span className="font-mono text-black">
                            {accessoriesReceived.some(a => a.toLowerCase().includes('sim')) ? 'Received' : 'NA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 border-t border-slate-300 text-[11px] bg-slate-50 flex items-center justify-between">
                      <span className="text-black font-bold">Device Passcode / PIN:</span>
                      <strong className="text-black font-mono font-bold text-[12px]">{dev.passcode || 'Pattern / Provided'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 5: TAX INVOICE & REPAIR BILLING BREAKDOWN */}
              {items.length > 0 && (
                <div className="p-2 border-b border-black text-[11.5px]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-[13.5px] text-black uppercase tracking-wider">
                      Tax Invoice & Repair Charges
                    </h3>
                    <span className="font-mono text-[11.5px] text-black font-semibold">
                      Invoice No: <strong className="text-black font-bold">{invoice?.invoice_number || 'INV-2024-001'}</strong>
                    </span>
                  </div>

                  <table className="w-full text-left text-[11.5px] border border-black border-collapse">
                    <thead className="bg-slate-100 border-b border-black font-bold uppercase">
                      <tr>
                        <th className="p-1 border-r border-black w-8 text-center text-black">#</th>
                        <th className="p-1 border-r border-black text-black">Item / Service Description</th>
                        <th className="p-1 border-r border-black text-center w-24 text-black">Warranty</th>
                        <th className="p-1 border-r border-black text-center w-20 text-black">Type</th>
                        <th className="p-1 border-r border-black text-center w-12 text-black">Qty</th>
                        <th className="p-1 border-r border-black text-right w-20 text-black">Unit Rate ({currencySymbol})</th>
                        <th className="p-1 text-right w-24 text-black">Total ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-1 border-r border-black text-center font-mono font-bold text-black">{idx + 1}</td>
                          <td className="p-1 border-r border-black font-semibold text-black">{it.item_name}</td>
                          <td className="p-1 border-r border-black text-center font-semibold text-black">
                            {it.warranty || invoice?.warranty_period || '—'}
                          </td>
                          <td className="p-1 border-r border-black text-center font-mono font-bold text-black">{it.item_type || 'PART'}</td>
                          <td className="p-1 border-r border-black text-center font-mono font-bold text-black">{it.quantity || 1}</td>
                          <td className="p-1 border-r border-black text-right font-mono font-bold text-black">{Number(it.unit_price).toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-bold text-black">{Number(it.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Financial Summary Calculation Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-2 pt-1 border-t border-black">
                    <div className="text-[11.5px] space-y-0.5">
                      <p><span className="text-black font-semibold">Payment Status:</span> <strong className="text-black uppercase font-bold">{job.payment_status || 'SETTLED'}</strong></p>
                      {payments.length > 0 && (
                        <p>
                          <span className="text-black font-semibold">Paid Via:</span>{' '}
                          <strong className="text-black font-mono font-bold">
                            {payments.map(p => `${p.payment_method} (${currencySymbol}${Number(p.amount).toFixed(2)})`).join(', ')}
                          </strong>
                        </p>
                      )}
                      <p><span className="text-black font-semibold">Warranty Coverage:</span> <strong className="text-black font-bold">{invoice?.warranty_period || '90 Days Hardware Warranty'}</strong></p>
                    </div>

                    <div className="space-y-0.5 text-right font-mono text-[11.5px]">
                      <div className="flex justify-between">
                        <span className="text-black font-semibold">Subtotal:</span>
                        <span className="font-bold text-black">{currencySymbol}{Number(invoice?.subtotal || job.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {Number(invoice?.discount || 0) > 0 && (
                        <div className="flex justify-between text-black font-bold">
                          <span>
                            Discount Applied
                            {invoice?.discount_type === 'PERCENTAGE' && invoice?.discount_value
                              ? ` (${invoice.discount_value}%)`
                              : ''}
                            :
                          </span>
                          <span>-{currencySymbol}{Number(invoice.discount).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(invoice?.tax_amount || 0) > 0 || Number(invoice?.tax_rate || 0) > 0 ? (
                        <div className="flex justify-between">
                          <span className="text-black font-semibold">GST / Tax ({invoice?.tax_rate ?? 18}%):</span>
                          <span className="font-bold text-black">{currencySymbol}{Number(invoice?.tax_amount || 0).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>GST / Tax:</span>
                          <span className="font-mono font-medium">Nil / Exempt ({currencySymbol}0.00)</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-[12.5px] pt-1 border-t border-black text-black">
                        <span>Total Invoice Amount:</span>
                        <span>{currencySymbol}{Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-black font-bold">
                        <span>Amount Paid:</span>
                        <span>{currencySymbol}{Number(invoice?.paid_amount || job.paid_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-black border-t border-black pt-0.5">
                        <span>Balance Remaining:</span>
                        <span>{currencySymbol}{Number(invoice?.balance_due || job.balance_due || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 6: TERMS AND CONDITIONS (WITH QR CODE) */}
              <div className="p-2 relative">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-[12.5px] text-black uppercase tracking-wider">
                    Terms and Conditions:
                  </h3>
                  {/* QR Code placed at top right of terms matching PDF */}
                  {qrDataUrl && (
                    <div className="flex flex-col items-center ml-2 shrink-0">
                      <img src={qrDataUrl} alt="Verify QR" className="w-12 h-12 border border-black p-0.5" />
                      <span className="text-[9.5px] font-mono text-black mt-0.5 font-bold uppercase">Scan to Track</span>
                    </div>
                  )}
                </div>

                {/* Key Summary Terms for Page 1 */}
                <ul className="text-[10px] leading-[1.3] text-black space-y-0.5 list-disc list-outside ml-3.5 pr-14 text-justify font-medium">
                  <li>Subject to Engineer’s physical & internal diagnostic inspection.</li>
                  <li>Quality program repairs will not cover all defective parts on non-chargeable basis. Only parts covered under quality program will be covered as non-chargeable post inspection.</li>
                  <li>Mobotech mobile care receives customer devices without opening; full diagnostics follow standard testing procedures.</li>
                  <li>Repair cannot be cancelled once approved. Non-approved estimates are returned as-is.</li>
                  <li><strong>DATA WARNING:</strong> Storage contents may be deleted/reformatted during repair. Customer must backup data before service. Mobotech is not responsible for data loss.</li>
                  <li>Unclaimed devices after 30 days of notification are subject to disposal/auction to recover costs.</li>
                </ul>
                <p className="text-[9.5px] text-black font-bold italic mt-0.5 pl-3.5">
                  * Note: For complete detailed terms & conditions, please refer to Page 2 overleaf.
                </p>
              </div>
            </div>

            {/* 3. Bottom Signatures (Page 1) */}
            <div className="grid grid-cols-2 gap-8 pt-2 text-[11px]">
              {/* Authorized Signatory */}
              <div>
                <span className="font-mono text-black font-bold text-[11px] block mb-0.5">
                  {signatureDateStr}
                </span>
                <SignatureStroke />
                <div className="border-t border-black pt-0.5">
                  <strong className="block font-bold text-black text-[12.5px]">Authorized Signatory</strong>
                  <span className="text-black font-semibold text-[11px]">({technicianName})</span>
                </div>
              </div>

              {/* Customer Signature */}
              <div className="text-right">
                <span className="font-mono text-black font-bold text-[11px] block mb-0.5">
                  {signatureDateStr}
                </span>
                <div className="h-6" />
                <div className="border-t border-black pt-0.5">
                  <strong className="block font-bold text-black text-[12.5px]">Customer's Signature</strong>
                  <span className="text-black font-semibold text-[11px]">({cust.full_name || 'Customer'})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Break for Print */}
        <div className="page-break" />

        {/* ============================================================ */}
        {/* PAGE 2: COMPLETE TERMS & CONDITIONS CONTINUATION             */}
        {/* ============================================================ */}
        {(viewMode === 'both' || viewMode === 'page2') && (
          <div className="service-record-page bg-white p-6 sm:p-7 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0">
            {/* Page 2 Header */}
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <MobotechLogo />
              <div className="text-right">
                <h2 className="text-xl font-black text-black tracking-tight font-sans">
                  Service Record
                </h2>
                <p className="text-[11.5px] font-mono text-black font-bold">
                  Ref: {job.job_number} • Page 2 of 2
                </p>
              </div>
            </div>

            {/* Support Banner matching PDF */}
            <div className="py-1.5 text-[10.5px] text-black italic border-b border-black font-medium">
              Need Help? Contact Mobotech mobile care at <strong>{shopPhone}</strong> or visit {shopAddress}, Surat for all support on your smartphones & tablets.
            </div>

            {/* Continuation of Terms and Conditions */}
            <div className="pt-2 text-[10px] leading-[1.3] text-black text-justify space-y-1.5 font-medium">
              <p className="font-semibold text-black">
                All device intake, diagnostic, and repair services conducted by Mobotech mobile care are subject to the following standard service terms and conditions:
              </p>

              <ul className="list-disc list-outside ml-3 space-y-1">
                <li>
                  In case of any Tempering/Unauthorised Modification found While doing micro inspection at our centre then Mobotech will not be able to provide any service on this unit. device will be return back to customer un-repaired in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios, also Mobotech may not be able to provide any service on this unit in future.
                </li>

                <li>
                  While submitting device (warranty/Out of Warranty) if there is any damage are present Then there may be a chance while opening/servicing your device by Mobotech Repair Centre that damage may be increased or any other hardware issue May appeared, for that Mobotech is not responsible.
                </li>

                <li>
                  While submitting device Remove any SIM card, case, screen protector or accessories from your device. As a part of repair Mobotech may have to remove and discard such accessories, in such cases Mobotech is not responsible for any damage or loss of SIM card, case, screen protector or accessories.
                </li>

                <li>
                  The charges for labour as well as spares used for non-warranty repair shall be as per the applicable price lists approved and recommended by Mobotech.
                </li>

                <li>
                  The Estimate price given at the time of acceptance of the Product to repairs are Provisional and may vary at the time of detailed inspection. Should the final expected charges be more than the initial estimate, Mobotech will proceed only after taking the approval of the Customer.
                </li>

                <li>
                  In the event the final estimate/Re-Quote from Mobotech Repair Centre is not approved by the customer within 2 days, the device will be return back to customer "as is condition (partly repaired/un-repaired)" in the damaged condition itself, Mobotech will not be responsible for returning the product in the same condition as received from the customer, Deterioration to normal functioning, including a total shutdown of the device can happen in such scenarios.
                </li>

                <li>
                  Mobotech shall make all efforts to ensure that the product is repaired within 7 working days from the receipt of faulty product. At times however, due to non-availability/shortage of critical spare parts or complicated fault, the repair turnaround time may take longer than the indicated while accepting the machine for repair. Mobotech will not be responsible for any loss/losses whatsoever in the event of the delay in repair for such aforementioned reasons.
                </li>

                <li>
                  For Same day Display/Battery repair for smartphones, the Turn Around Time may be depending upon the scenario and intensity of the issue and stock availability.
                </li>

                <li>
                  Mobotech is not liable for any delays, non-performance, failure or non-delivery of the product due to contingencies arising from any force measure, act of God, storm, earthquake, accident, strikes, lockout, industrial dispute, labour trouble, transportation embargo, imminence or the existence of any state emergency, war, civil commotion right, approval or imposition of sanctions or any measure taken by government which renders it impossible or impractical for Mobotech to perform supply, service or deliver the Product to the Customer.
                </li>

                <li>
                  The customer shall take the delivery of the Product within 30 (Thirty) days of intimation (either by Phone call or through Email or Text Message/WhatsApp Message) from Mobotech. In the event the delivery is not taken by the customer, Mobotech reserves the right to Auction the Product to recover the repair/ storage charges.
                </li>

                <li>
                  Following warranty service your device or a replacement product will be returned to you as configured when originally purchased, subject to applicable updates. Third party applications installed may not be compatible or work as a result of the software update. You will be responsible for reinstalling all other software programs, data and information. Recovery and reinstallation of other software programs, data and information are not covered under warranty.
                </li>

                <li>
                  The Customer must produce the Original Service or Digital Service Report at the time of taking the delivery. Mobotech reserves the right to refuse delivery upon non-production of the original service report, if you fail to provide, Mobotech reserves the right to retain the product till it is provided. Mobotech may at its sole discretion consider alternative modes to verify the authenticity of the customer and choose to deliver the product only after verifying the credentials of the customer.
                </li>

                <li>
                  Mobotech mobile care acts as an independent multi-brand hardware & software service center, where decision making authorities on repair / replacement / warranty deliverables is governed by Mobotech Service Policies.
                </li>

                <li>
                  For any payments refund if repair/service got cancelled for any reason, amount will be transferred only through Bank Transfer or UPI to customer account in 4-5 bank working days (after customer provided their bank details).
                </li>

                <li>
                  Vintage / Obsolete Products: Products where parts have been discontinued by manufacturers are repaired strictly subject to compatible component availability. Mobotech does not guarantee OEM part availability for discontinued lines.
                </li>

                <li>
                  This equipment is accepted subject to repair terms and conditions mentioned above and/or on website, printed overleaf or attached in e-mail along with digital service report and digital delivery report sent on customer email ID or WhatsApp.
                </li>

                <li>
                  By accepting the Service report / Final Invoice, it is deemed that the Customer agrees to all the terms and conditions mentioned in the Service Report.
                </li>
              </ul>
            </div>

            {/* Bottom Signatures (Page 2) */}
            <div className="grid grid-cols-2 gap-8 pt-5 text-[11px]">
              {/* Authorized Signatory */}
              <div>
                <span className="font-mono text-black font-bold text-[11px] block mb-0.5">
                  {signatureDateStr}
                </span>
                <SignatureStroke />
                <div className="border-t border-black pt-1">
                  <strong className="block font-bold text-black text-[12.5px]">Authorized Signatory</strong>
                  <span className="text-black font-semibold text-[11px]">({technicianName})</span>
                </div>
              </div>

              {/* Customer Signature */}
              <div className="text-right">
                <span className="font-mono text-black font-bold text-[11px] block mb-0.5">
                  {signatureDateStr}
                </span>
                <div className="h-7" />
                <div className="border-t border-black pt-1">
                  <strong className="block font-bold text-black text-[12.5px]">Customer's Signature</strong>
                  <span className="text-black font-semibold text-[11px]">({cust.full_name || 'Customer'})</span>
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
