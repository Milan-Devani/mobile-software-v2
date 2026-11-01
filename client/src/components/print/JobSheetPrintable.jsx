import React, { useRef, useState } from 'react';
import {
  Smartphone,
  Printer,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';
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

const BarcodeSvg = ({ value = 'SO-000001', height = 28 }) => {
  const cleanVal = (value || 'SO-000001').toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '-');
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

  const totalWidth = Math.max(120, currentX);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[150px]">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-7 block"
        preserveAspectRatio="xMidYMid meet"
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      <span className="font-mono text-[9px] tracking-wider text-black font-bold mt-0.5">
        {cleanVal}
      </span>
    </div>
  );
};

export const JobSheetPrintable = ({ job, shop }) => {
  const [copied, setCopied] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waStatus, setWaStatus] = useState({ isConnected: false });
  const printAreaRef = useRef(null);

  // Check Baileys WhatsApp status on mount
  React.useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${apiBase}/whatsapp/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setWaStatus(data.data);
      })
      .catch(() => {});
  }, []);

  if (!job) return null;

  const cond = job.device_condition || {};
  const accessories = job.accessories_received || [];
  const cust = job.customer || {};
  const dev = job.device || {};

  const handlePrint = () => {
    window.print();
  };

  const cleanPhoneForWhatsApp = (p) => {
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const getWhatsAppMessage = (isAlternate = false) => {
    const shopName = shop?.name || 'Mobile Repair Center';
    const trackingUrl = `${window.location.origin}/repair/${job.job_number}/approval?token=${job.approval_token || ''}`;

    let msg = `*Service Order Confirmation - ${shopName}*\n\n`;
    msg += `Dear *${cust.full_name || 'Customer'}*,\n`;
    if (isAlternate) {
      msg += `📌 _Sending to your alternate WhatsApp as your phone is submitted to our workbench._\n\n`;
    } else {
      msg += `Your device has been checked in for repair.\n\n`;
    }
    msg += `📄 *Order No:* ${job.job_number}\n`;
    msg += `📱 *Device:* ${dev.brand || ''} ${dev.model || ''}\n`;
    msg += `🔢 *IMEI/SN:* ${dev.imei || dev.serial_number || 'N/A'}\n`;
    msg += `⚠️ *Reported Issue:* ${job.customer_complaint || 'Diagnostic'}\n`;
    msg += `🔧 *Service:* ${job.service_type || 'Hardware Repair'}\n`;
    if (job.total_amount > 0) {
      msg += `💰 *Estimated Total:* ₹${Number(job.total_amount).toFixed(2)}\n`;
    }
    msg += `\n🔍 *Live Status & Track:* ${trackingUrl}\n\n`;
    msg += `Thank you for choosing ${shopName}! Queries: ${shop?.phone || ''}`;
    return encodeURIComponent(msg);
  };

  const handleShareWhatsAppPrimary = async () => {
    const phone = cleanPhoneForWhatsApp(cust.whatsapp_number || cust.phone);
    if (!phone) {
      toast.error('No primary phone or WhatsApp number recorded');
      return;
    }

    if (waStatus?.isConnected) {
      setIsSendingWa(true);
      const toastId = toast.loading('Sending service order automatically in background...');
      try {
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/whatsapp/send-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            phone: phone,
            message: decodeURIComponent(getWhatsAppMessage(false)),
          }),
        });
        const data = await res.json();
        if (data?.success) {
          toast.success(`Service order sent automatically to ${cust.full_name || 'customer'}!`, { id: toastId });
          return;
        }
      } catch (err) {
        console.warn('Background WhatsApp send failed:', err);
      } finally {
        setIsSendingWa(false);
      }
    } else {
      setShowWaModal(true);
      return;
    }

    window.open(`https://wa.me/${phone}?text=${getWhatsAppMessage(false)}`, '_blank');
  };

  const handleShareWhatsAppAlternate = async () => {
    const phone = cleanPhoneForWhatsApp(cust.alternate_whatsapp || cust.alternate_phone);
    if (!phone) {
      toast.error('No alternate WhatsApp or phone recorded for this customer');
      return;
    }

    if (waStatus?.isConnected) {
      setIsSendingWa(true);
      const toastId = toast.loading('Sending to alternate WhatsApp in background...');
      try {
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/whatsapp/send-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            phone: phone,
            message: decodeURIComponent(getWhatsAppMessage(true)),
          }),
        });
        const data = await res.json();
        if (data?.success) {
          toast.success(`Sent to alternate WhatsApp!`, { id: toastId });
          return;
        }
      } catch (err) {
        console.warn('Alternate background WhatsApp send failed:', err);
      } finally {
        setIsSendingWa(false);
      }
    }

    window.open(`https://wa.me/${phone}?text=${getWhatsAppMessage(true)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!cust.email) {
      toast.error('No email address recorded for this customer');
      return;
    }
    const subject = encodeURIComponent(`Service Order #${job.job_number} - ${shop?.name || 'Repair Shop'}`);
    const body = encodeURIComponent(
      `Dear ${cust.full_name},\n\n` +
      `Your repair order #${job.job_number} has been created.\n\n` +
      `Device: ${dev.brand || ''} ${dev.model || ''}\n` +
      `IMEI: ${dev.imei || 'N/A'}\n` +
      `Reported Fault: ${job.customer_complaint}\n` +
      `Service: ${job.service_type || 'Hardware Repair'}\n` +
      `Estimate: ₹${Number(job.total_amount || 0).toFixed(2)}\n\n` +
      `Thank you,\n${shop?.name || 'Repair Shop'}\n${shop?.phone || ''}`
    );
    window.open(`mailto:${cust.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyDetails = () => {
    const summary =
      `SERVICE ORDER #${job.job_number}\n` +
      `Customer: ${cust.full_name} (${cust.phone})\n` +
      `Alt WP: ${cust.alternate_whatsapp || 'N/A'}\n` +
      `Device: ${dev.brand} ${dev.model} (IMEI: ${dev.imei || 'N/A'})\n` +
      `Issue: ${job.customer_complaint}\n` +
      `Date: ${new Date(job.created_at).toLocaleString()}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Service Order summary copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const createDateStr = job.created_at
    ? new Date(job.created_at).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="bg-white text-black font-sans print:p-0">
      {/* Embedded Print Styling to Force Single-Page Fit & Prevent Overflow */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* CRITICAL: Completely hide background app (#root) so job details never print */
          #root {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          .no-print, header, aside, nav {
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
          .service-order-document {
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            padding: 6px !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ============================================================== */}
      {/* ACTION TOOLBAR (Hidden on print)                                */}
      {/* ============================================================== */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-wide">
                AFTERMARKET REPAIR SERVICE ORDER
              </span>
              <span className="font-mono text-xs font-bold text-slate-700">
                #{job.job_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Multi-brand intake sheet • Perfectly aligned single-page document with aftermarket warranty terms
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              onClick={handlePrint}
              icon={Printer}
              size="sm"
              className="bg-slate-900 text-white hover:bg-black font-semibold"
            >
              Print Service Order (1-Page)
            </Button>

            {/* In-Repair Alternate WhatsApp button */}
            <button
              onClick={handleShareWhatsAppAlternate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Customer phone is kept in shop, send update to alternate WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share Alt WhatsApp</span>
              {cust.alternate_whatsapp && (
                <span className="px-1.5 py-0.2 bg-emerald-800 rounded text-[10px] font-mono">
                  {cust.alternate_whatsapp}
                </span>
              )}
            </button>

            {/* Primary WhatsApp */}
            <button
              onClick={handleShareWhatsAppPrimary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Primary WP</span>
            </button>

            {/* Quick WhatsApp Status / Link Trigger */}
            <button
              onClick={() => setShowWaModal(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                waStatus?.isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title={waStatus?.isConnected ? 'Device linked! Click to manage' : 'Click to scan QR code & link your phone'}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{waStatus?.isConnected ? `Linked (+${waStatus.user?.phone || '8758152507'})` : 'Link WhatsApp (QR)'}</span>
            </button>
            {cust.email && (
              <button
                onClick={handleShareEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email</span>
              </button>
            )}

            {/* Copy */}
            <button
              onClick={handleCopyDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SERVICE ORDER PRINTABLE SHEET (Single-Page Optimized)          */}
      {/* ============================================================== */}
      <div
        ref={printAreaRef}
        className="service-order-document bg-white p-5 max-w-[800px] mx-auto border border-slate-400 print:border-none print:p-0 print:max-w-full text-black text-[11px] leading-tight font-sans"
        style={{ backgroundColor: '#ffffff', color: '#000000', colorScheme: 'light' }}
      >
        {/* ============================================================== */}
        {/* HEADER: SHOP DETAILS (LEFT) & DEDICATED ORDER BOX (RIGHT)       */}
        {/* Completely separates title & barcode to eliminate any collision */}
        {/* ============================================================== */}
        <div className="border border-black p-2.5 mb-2 flex items-center justify-between">
          {/* Left: Shop Details */}
          <div className="w-[62%] pr-3">
            <div className="flex items-center gap-2">
              {shop?.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt={shop?.name || 'Shop Logo'}
                  className="w-9 h-9 rounded object-contain shrink-0 border border-slate-300 p-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-black tracking-tight text-black leading-none uppercase">
                  {shop?.name || 'Mobotech mobile care'}
                </h1>
                <p className="text-[9.5px] text-slate-600 font-medium mt-0.5">
                  {shop?.tagline || 'Professional Smartphone & Tablet Repair Services'}
                </p>
              </div>
            </div>

            <div className="mt-1.5 text-[9.5px] text-slate-700 leading-snug space-y-0.5">
              <p>
                <strong>Address:</strong> {shop?.address || 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006'}
              </p>
              <p>
                <strong>Phone:</strong> {shop?.phone || '080000 24439'}
                {shop?.email ? ` • Email: ${shop.email}` : ' • Email: support@mobotech.com'}
              </p>
            </div>
          </div>

          {/* Right: Dedicated Barcode & Order Header Box */}
          <div className="w-[38%] border-l border-black pl-3 flex flex-col items-center justify-center text-center">
            <span className="font-mono font-black text-[12px] tracking-wider text-black uppercase mb-1">
              SERVICE ORDER / JOB SHEET
            </span>

            {/* Barcode SVG cleanly centered with bounded dimensions */}
            <BarcodeSvg value={job.job_number} height={28} />

            <div className="text-[9px] text-slate-700 mt-1 space-y-0.5">
              <p>Intake Date: <strong className="font-mono">{createDateStr}</strong></p>
              <p>Workbench Staff: <strong>{job.technician?.full_name || job.created_by?.full_name || 'Staff'}</strong></p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 1. CUSTOMER INFORMATION (Structured Bordered 4-Column Table)   */}
        {/* ============================================================== */}
        <div className="border border-black mb-2 text-[10px]">
          <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase tracking-wider text-[9.5px] text-black flex justify-between">
            <span>Customer Information</span>
            <span className="font-mono text-slate-600 font-normal">Code: {cust.customer_code || 'CUST'}</span>
          </div>

          <div className="grid grid-cols-4 divide-x divide-black">
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Customer Name</span>
              <strong className="text-black uppercase text-[10.5px]">{cust.full_name || 'N/A'}</strong>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Primary Phone</span>
              <span className="font-mono font-bold text-black">{cust.phone || 'N/A'}</span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Primary WhatsApp</span>
              <span className="font-mono text-black">{cust.whatsapp_number || cust.phone || 'N/A'}</span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Customer Type</span>
              <span className="text-black">{cust.user_type || 'End User'} ({cust.gender || 'male'})</span>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-black border-t border-black">
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Email (Mail ID)</span>
              <span className="text-black truncate block">{cust.email || 'N/A'}</span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Alternate Contact</span>
              <span className="font-mono text-black">{cust.alternate_phone || 'N/A'}</span>
            </div>
            <div className="p-1.5 bg-emerald-50/60">
              <span className="text-emerald-800 block text-[8.5px] uppercase font-bold">Alt WhatsApp (In-Repair)</span>
              <span className="font-mono font-bold text-emerald-950">
                {cust.alternate_whatsapp || cust.alternate_phone || 'N/A'}
              </span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Customer City / Area</span>
              <span className="text-black uppercase">{cust.city || 'Surat'}{cust.state ? `, ${cust.state}` : ''}</span>
            </div>
          </div>

          <div className="border-t border-black p-1.5 bg-slate-50/40 flex items-center">
            <span className="text-slate-500 text-[8px] uppercase font-bold mr-1.5 shrink-0">Address:</span>
            <span className="text-black uppercase truncate text-[9.5px]">
              {cust.address || (cust.city ? `${cust.city}${cust.state ? ', ' + cust.state : ''}` : 'Local Walk-In / Surat, Gujarat')}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. DEVICE SPECIFICATIONS & INTAKE CONDITION (Bordered Table)  */}
        {/* ============================================================== */}
        <div className="border border-black mb-2 text-[10px]">
          <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase tracking-wider text-[9.5px] text-black">
            Device Specifications & Physical Intake Condition
          </div>

          <div className="grid grid-cols-4 divide-x divide-black">
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Device Brand & Model</span>
              <strong className="text-black uppercase text-[10.5px]">
                {dev.brand ? `${dev.brand} ` : ''}{dev.model || 'Smartphone'}
              </strong>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Color / Storage</span>
              <span className="text-black">{dev.color || 'Standard'} {dev.storage_capacity ? `• ${dev.storage_capacity}` : ''}</span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">IMEI / Serial Number</span>
              <span className="font-mono font-bold text-black">{dev.imei || dev.serial_number || 'N/A'}</span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Passcode / Pattern (Testing)</span>
              <span className="font-mono font-bold text-black bg-slate-100 px-1 py-0.2 rounded">
                {dev.passcode || 'None'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-black border-t border-black">
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Screen State at Intake</span>
              <strong className="text-black">{cond.screen || 'Intact'}</strong>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Body / Frame Cosmetic</span>
              <strong className="text-black">{dev.cosmetic_condition || cond.body || 'Wear And Tear'}</strong>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Liquid / Water Damage</span>
              <strong className={cond.water_damage ? 'text-rose-700' : 'text-emerald-700'}>
                {cond.water_damage ? 'YES (Liquid Damage Detected)' : 'NO'}
              </strong>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Charging / Port State</span>
              <strong className="text-black">{cond.charging_port || 'Normal'}</strong>
            </div>
          </div>

          {/* Dynamic 12-Point Inward Checklist */}
          <div className="border-t border-black p-1.5 bg-white">
            <div className="text-[8.5px] uppercase font-bold text-black mb-1">
              Inward Inspection Checklist (12-Point)
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-0.5 text-[8.5px]">
              {INWARD_CHECKLIST_CONFIG.map((item) => {
                const val = resolveChecklistValue(item.key, cond);
                return (
                  <div key={item.key} className="flex items-center justify-between border-b border-slate-100 py-0.5">
                    <span className="text-slate-700 truncate pr-1">{item.label}</span>
                    <strong className="font-mono text-black shrink-0">{val}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-black p-1.5 flex items-center justify-between bg-slate-50/40">
            <div>
              <span className="text-slate-500 text-[8.5px] uppercase font-bold mr-1">Accessories Received:</span>
              <span className="text-black font-semibold">
                {accessories.length > 0 ? accessories.join(', ') : 'Device Only (No accessories handed in)'}
              </span>
            </div>
            {cond.notes && (
              <span className="text-[9px] text-slate-600 italic">
                Notes: {cond.notes}
              </span>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FAULT DIAGNOSIS & REPAIR ESTIMATE (Bordered Table)          */}
        {/* ============================================================== */}
        <div className="border border-black mb-2 text-[10px]">
          <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold uppercase tracking-wider text-[9.5px] text-black">
            Fault Diagnosis & Repair Estimate
          </div>

          <div className="grid grid-cols-12 divide-x divide-black">
            <div className="col-span-4 p-1.5">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Repair Job Category</span>
              <strong className="text-black uppercase text-[10.5px]">
                {job.service_type || 'Hardware Component Repair'}
              </strong>
            </div>
            <div className="col-span-8 p-1.5">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Customer Reported Fault</span>
              <strong className="text-black text-[11px]">
                "{job.customer_complaint}"
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-black border-t border-black bg-slate-50/60">
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Estimated Total</span>
              <span className="font-mono font-bold text-black text-[12px]">
                ${Number(job.total_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Advance Deposit</span>
              <span className="font-mono font-bold text-emerald-800 text-[12px]">
                ${Number(job.paid_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Remaining Due</span>
              <span className="font-mono font-bold text-black text-[12px]">
                ${Number(job.balance_due || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-1.5">
              <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Shop Warranty Coverage</span>
              <span className="font-bold text-black">
                {job.warranty_days || 90} Days Limited Shop Warranty
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. AFTERMARKET REPAIR SHOP TERMS (Compact 2-Column Rules)       */}
        {/* Replaces manufacturer warranty clauses with independent terms */}
        {/* ============================================================== */}
        <div className="border border-black p-2 mb-2 text-[8px] leading-[1.25] text-slate-800">
          <div className="font-bold uppercase tracking-wider text-[8.5px] text-black mb-1 border-b border-slate-300 pb-0.5">
            Aftermarket Mobile Repair Terms & Conditions
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-justify">
            <div>
              <p>
                <strong>1. Estimate & Concealed Faults:</strong> Initial charges are estimates based on preliminary visual inspection. If internal board short-circuits, micro-soldering faults, or hidden corrosion are detected during disassembly, customer will be contacted for approval before proceeding.
              </p>
              <p>
                <strong>2. Data Backup Disclaimer:</strong> Customer is solely responsible for backing up personal data prior to check-in. The shop exercises utmost care, but assumes no responsibility for data loss, OS crashes, or bootloops during board, chip, or firmware repairs.
              </p>
              <p>
                <strong>3. Quality Replacement Components:</strong> Premium OEM-grade / aftermarket replacement parts are fitted. Defective replaced parts will be responsibly recycled and discarded unless customer explicitly requests return at intake.
              </p>
              <p>
                <strong>4. Liquid & Impact Vulnerability:</strong> Devices with prior water immersion or severe impact have stressed internal circuitry. Shop is not responsible if a pre-damaged device fails during bench diagnostics.
              </p>
            </div>

            <div>
              <p>
                <strong>5. Passcode & Post-Repair Testing:</strong> Passcode/PIN is requested strictly to verify hardware functionality (touchscreen, cameras, mic, speaker, Face ID, charging). If passcode is not provided, full quality test cannot be guaranteed.
              </p>
              <p>
                <strong>6. Delivery on Claim Slip:</strong> This Service Order sheet must be produced at pickup. Device will be released to the holder of this slip upon payment of outstanding balance.
              </p>
              <p>
                <strong>7. Limited Shop Warranty:</strong> Standard 30 to 90 days shop warranty covers replaced hardware components. Warranty is strictly VOID if the device suffers physical impact, cracked glass, screen lines/ink bleed, liquid ingress, or third-party tampering.
              </p>
              <p>
                <strong>8. Uncollected Devices:</strong> Handsets left unclaimed for more than 30 days following completion notification will incur storage fees or may be disposed of to recover service and parts costs.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. SIGNATURES (Guaranteed on Page 1)                            */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 gap-3 text-[9.5px]">
          {/* Customer Signature Box */}
          <div className="border border-black p-2 flex flex-col justify-between h-16">
            <p className="text-[8px] text-slate-600">
              I verify the device intake specifications, reported issues, and authorize repair per the terms above:
            </p>
            <div className="border-t border-black pt-0.5 flex items-center justify-between">
              <span className="font-bold text-black">Customer Signature</span>
              <span className="text-[8.5px] text-slate-500 font-mono">Date: ____________</span>
            </div>
          </div>

          {/* Workshop Technician Signature Box */}
          <div className="border border-black p-2 flex flex-col justify-between h-16">
            <p className="text-[8px] text-slate-600">
              Device received and checked into repair workbench by authorized technician:
            </p>
            <div className="border-t border-black pt-0.5 flex items-center justify-between">
              <span className="font-bold text-black">Authorized Technician / Workshop Seal</span>
              <span className="text-[8.5px] text-slate-500 font-mono">Staff: {job.technician?.full_name || 'Workbench'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp QR Modal */}
      <WhatsAppQrModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        onConnected={(user) => {
          setWaStatus({ isConnected: true, user });
          setShowWaModal(false);
        }}
      />
    </div>
  );
};
