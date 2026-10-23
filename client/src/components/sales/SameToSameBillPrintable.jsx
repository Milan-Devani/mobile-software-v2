import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Printer, Share2, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIndianCurrency, numberToIndianWords, formatInvoiceDate } from '../../utils/billFormatters';

// Brand Badges Component reproducing the exact top-right header in the sample bill
const BrandBadges = () => {
  return (
    <div className="flex flex-col gap-1 items-end select-none">
      {/* Row 1: Apple, Samsung, Mi, OnePlus, Google, Oppo */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* Apple */}
        <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center p-0.5">
          <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 170 170" fill="currentColor">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.42-9.78-11.48-20.91-15.19-33.39-3.7-12.48-5.56-24.16-5.56-35.04 0-14.73 3.73-26.78 11.19-36.14 7.46-9.36 16.77-14.15 27.94-14.37 4.9 0 10.3 1.25 16.19 3.75 5.89 2.51 9.68 3.82 11.38 3.93 1.48-.11 5.38-1.45 11.71-4.04 6.33-2.58 11.75-3.76 16.27-3.53 12.85.77 23.01 5.35 30.49 13.75-11.12 6.75-16.56 16.22-16.33 28.43.23 9.57 3.98 17.58 11.25 24.03 7.27 6.45 15.93 10.15 25.99 11.1-2.29 6.96-4.75 13.59-7.39 19.89zm-31.95-103.35c-.11-3.48.98-7.37 3.27-11.66 2.29-4.29 5.37-7.86 9.24-10.72 3.87-2.86 7.85-4.52 11.94-4.98.11 3.48-.99 7.37-3.3 11.66-2.31 4.29-5.45 7.86-9.42 10.72-3.97 2.86-7.88 4.52-11.73 4.98z"/>
          </svg>
        </div>
        {/* Samsung */}
        <div className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-bold tracking-tighter flex items-center justify-center border border-black">
          SAMSUNG
        </div>
        {/* Mi */}
        <div className="w-5 h-5 rounded bg-[#ff6700] text-white text-[10px] font-black flex items-center justify-center leading-none shadow-xs">
          mi
        </div>
        {/* OnePlus */}
        <div className="px-1 py-0.5 rounded bg-[#eb0029] text-white text-[9px] font-black flex items-center justify-center leading-none">
          1+
        </div>
        {/* Google */}
        <div className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[9px] font-black tracking-tight flex items-center justify-center">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-amber-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
        </div>
        {/* Oppo */}
        <div className="px-1.5 py-0.5 rounded bg-[#008954] text-white text-[9px] font-black tracking-tighter flex items-center justify-center">
          oppo
        </div>
      </div>

      {/* Row 2: Huawei, Vivo, Nokia, Asus, Sony, Honor */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* Huawei */}
        <div className="px-1.5 py-0.5 rounded bg-white border border-red-500 text-[#d40000] text-[8px] font-black flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
          HUAWEI
        </div>
        {/* Vivo */}
        <div className="px-1.5 py-0.5 rounded bg-[#0052d9] text-white text-[9px] font-black tracking-tight flex items-center justify-center">
          vivo
        </div>
        {/* Nokia */}
        <div className="px-1.5 py-0.5 rounded bg-[#124191] text-white text-[8px] font-black tracking-wider flex items-center justify-center">
          NOKIA
        </div>
        {/* Asus */}
        <div className="px-1.5 py-0.5 rounded bg-black text-white text-[8px] font-black tracking-tight flex items-center justify-center">
          ASUS
        </div>
        {/* Sony */}
        <div className="px-1.5 py-0.5 rounded bg-black text-white text-[8px] font-black tracking-widest flex items-center justify-center">
          SONY
        </div>
        {/* Honor */}
        <div className="px-1.5 py-0.5 rounded bg-white border border-sky-400 text-sky-600 text-[8px] font-bold tracking-wider flex items-center justify-center">
          HONOR
        </div>
      </div>
    </div>
  );
};

export const SameToSameBillPrintable = ({
  sale,
  shop,
  isPreview = false,
  onPrint,
  onShareWhatsApp,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  // Fallback defaults
  const shopData = {
    name: shop?.name || 'Shree Mobile Shop',
    tagline: shop?.tagline || 'Get All Your Desired Smart Phones From Apple To Vivo On Huge Discounts And Easy EMI',
    address: shop?.address || 'G/456, Basant Lok Comm., Vasant Vihar, Tardeo Road, Maharashtra - 400001',
    phone: shop?.phone || 'Ph. 111 2222 3333',
    tax_number: shop?.tax_number || '26CORPP3939N1ZA',
    bank_name: sale?.bank_details?.bank_name || 'ICICI',
    branch: sale?.bank_details?.branch || 'Surate',
    account_number: sale?.bank_details?.account_number || '2715500356',
    ifsc: sale?.bank_details?.ifsc || 'ICIC045F',
    upi_id: sale?.bank_details?.upi_id || 'ifox@icici',
  };

  const invoiceNumber = sale?.invoice_no_seq || sale?.invoice_number || '47';
  const invoiceDate = sale?.invoice_date ? formatInvoiceDate(sale.invoice_date) : formatInvoiceDate(new Date());

  const items = sale?.items && sale.items.length > 0 ? sale.items : [
    {
      sr_no: 1,
      name: 'iPhone 15 Pro Max',
      imei: 'IMEI 234534565432567',
      hsn: '8517',
      quantity: 1,
      unit: 'NOS',
      rate: 180000,
      taxable_value: 180000,
      gst_rate: 18,
      gst_amount: 32400,
      total: 212400,
    },
    {
      sr_no: 2,
      name: '20W USB-C Power Adapter',
      imei: '',
      hsn: '8517',
      quantity: 1,
      unit: 'NOS',
      rate: 2000,
      taxable_value: 2000,
      gst_rate: 18,
      gst_amount: 360,
      total: 2360,
    },
  ];

  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
  const taxableAmount = sale?.taxable_amount !== undefined ? sale.taxable_amount : items.reduce((sum, item) => sum + (parseFloat(item.taxable_value) || 0), 0);
  const totalTax = sale?.total_tax !== undefined ? sale.total_tax : items.reduce((sum, item) => sum + (parseFloat(item.gst_amount) || 0), 0);
  const grandTotal = sale?.total_amount !== undefined ? sale.total_amount : (taxableAmount + totalTax);
  const gstEnabled = sale?.gst_enabled !== false;
  const isIgst = sale?.gst_type !== 'CGST_SGST';

  const totalInWords = sale?.total_in_words || numberToIndianWords(grandTotal);

  // Generate UPI QR code
  useEffect(() => {
    const upiId = shopData.upi_id;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopData.name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill #${invoiceNumber}`)}`;
    QRCode.toDataURL(upiUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR:', err));
  }, [shopData.upi_id, shopData.name, grandTotal, invoiceNumber]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleCopyLink = () => {
    const text = `Invoice #${invoiceNumber} from ${shopData.name}\nAmount: ${formatIndianCurrency(grandTotal, true)}\nDate: ${invoiceDate}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Invoice details copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Action Bar (hidden on print) */}
      {!isPreview && (
        <div className="w-full max-w-4xl mb-4 p-3 bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-[var(--spatial-text-title)]">
              Tax Invoice Preview #{invoiceNumber}
            </span>
            <span className="text-[11px] text-[var(--spatial-text-muted)]">
              ({items.length} items, {gstEnabled ? (isIgst ? 'IGST 18%' : 'CGST+SGST 18%') : 'Non-GST'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              type="button"
              className="spatial-btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onShareWhatsApp && (
              <button
                onClick={onShareWhatsApp}
                type="button"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            )}
            <button
              onClick={handlePrint}
              type="button"
              className="spatial-btn-primary text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Bill
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAME TO SAME TAX INVOICE PRINT CANVAS                                     */}
      {/* ========================================================================= */}
      <div
        ref={printRef}
        id="same-to-same-bill-sheet"
        className="bg-white text-slate-900 font-sans shadow-2xl rounded-sm w-full max-w-[850px] p-6 sm:p-8 print:p-0 print:max-w-none print:shadow-none print:w-full print:m-0 selection:bg-blue-100 selection:text-blue-900"
        style={{
          boxSizing: 'border-box',
          fontFamily: '"Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
          color: '#111827',
          backgroundColor: '#ffffff',
        }}
      >
        {/* 1. TOP HEADER (Outside blue box) */}
        <div className="flex items-start justify-between pb-2">
          {/* Top Left: Logo & Shop Details */}
          <div className="flex items-start gap-3 max-w-[55%]">
            {/* Phone shop logo badge */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-12 h-14 rounded-lg bg-sky-500 flex items-center justify-center p-2 text-white shadow-xs rotate-[-8deg] transform hover:rotate-0 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <span className="text-[7.5px] font-black uppercase tracking-tighter text-slate-900 mt-1">PHONE SHOP</span>
              <span className="text-[6.5px] text-slate-500 tracking-tight uppercase">SLOGAN HERE</span>
            </div>

            {/* Shop info */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1e73be] leading-tight tracking-tight">
                {shopData.name}
              </h1>
              <p className="text-[11px] text-slate-700 leading-snug mt-0.5">
                {shopData.address}
              </p>
              <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                {shopData.phone}
              </p>
            </div>
          </div>

          {/* Top Right: Brand Badges (Apple, Samsung, Mi, OnePlus, etc.) */}
          <div className="max-w-[45%] flex flex-col items-end">
            <BrandBadges />
          </div>
        </div>

        {/* Slogan banner ribbon */}
        <div className="border-t border-b border-slate-300 py-1 my-1.5 text-center">
          <p className="text-[11px] text-slate-800 font-medium tracking-tight">
            Get All Your Desired Smart Phones From Apple To Vivo On Huge Discounts And Easy EMI
          </p>
        </div>

        {/* 2. MAIN BLUE BORDERED BOX CONTAINER */}
        <div
          className="w-full mt-2"
          style={{
            border: '2px solid #1e73be',
            boxSizing: 'border-box',
          }}
        >
          {/* Header Bar inside Blue Box: GSTIN, TAX INVOICE, ORIGINAL FOR RECIPIENT */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              borderBottom: '1.5px solid #1e73be',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="text-[12px] font-bold text-slate-900 w-1/3">
              {gstEnabled ? `GSTIN : ${shopData.tax_number}` : `REG : ${shopData.tax_number || 'UNREGISTERED'}`}
            </div>
            <div className="text-[17px] font-black tracking-wider text-[#1e73be] text-center w-1/3 uppercase">
              {gstEnabled ? 'TAX INVOICE' : 'RETAIL INVOICE'}
            </div>
            <div className="text-[11px] font-bold text-slate-800 text-right w-1/3 uppercase tracking-tight">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>

          {/* Split Box: Customer Detail (Left) vs Invoice Info (Right) */}
          <div className="flex items-stretch text-xs" style={{ borderBottom: '1.5px solid #1e73be' }}>
            {/* Left: Customer Detail */}
            <div className="w-[58%] p-2.5" style={{ borderRight: '1.5px solid #1e73be' }}>
              <div
                className="text-center font-bold text-[11px] text-slate-900 pb-1 mb-1.5"
                style={{ borderBottom: '1px solid #1e73be' }}
              >
                Customer Detail
              </div>
              <div className="grid grid-cols-[85px_1fr] gap-y-1 text-[11px] leading-tight">
                <span className="font-bold text-slate-900">Name</span>
                <span className="font-semibold text-slate-900">: {sale?.customer_name || 'Ronak Panchal'}</span>

                <span className="font-bold text-slate-900">Address</span>
                <span className="text-slate-800">: {sale?.customer_address || 'Gujarat'}</span>

                <span className="font-bold text-slate-900">PHONE</span>
                <span className="text-slate-800">: {sale?.customer_phone || '-'}</span>

                {sale?.customer_email && (
                  <>
                    <span className="font-bold text-slate-900">Mail ID</span>
                    <span className="text-slate-800">: {sale?.customer_email}</span>
                  </>
                )}

                <span className="font-bold text-slate-900">GSTIN</span>
                <span className="text-slate-800">: {sale?.customer_gstin || '-'}</span>

                <span className="font-bold text-slate-900">Place of Supply</span>
                <span className="text-slate-800">: {sale?.place_of_supply || 'Gujarat ( 24 )'}</span>
              </div>
            </div>

            {/* Right: Invoice Info */}
            <div className="w-[42%] p-2.5 flex flex-col justify-start">
              <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[11px] leading-tight">
                <span className="font-bold text-slate-900">Invoice No.</span>
                <span className="font-bold text-slate-900">: {invoiceNumber}</span>

                <span className="font-bold text-slate-900">Invoice Date</span>
                <span className="font-semibold text-slate-800">: {invoiceDate}</span>

                {sale?.payment_mode && (
                  <>
                    <span className="font-bold text-slate-900">Payment Mode</span>
                    <span className="font-semibold text-slate-800">: {sale.payment_mode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. PRODUCT & SERVICE TABLE */}
          <div className="w-full">
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr
                  className="text-[10px] font-bold text-slate-900 uppercase"
                  style={{
                    backgroundColor: '#ffffff',
                    borderBottom: '1.5px solid #1e73be',
                  }}
                >
                  <th className="py-2 px-1 text-center" style={{ width: '6%', borderRight: '1px solid #1e73be' }}>
                    Sr.<br />No.
                  </th>
                  <th className="py-2 px-2 text-left" style={{ width: '33%', borderRight: '1px solid #1e73be' }}>
                    Name of Product / Service
                  </th>
                  <th className="py-2 px-1 text-center" style={{ width: '10%', borderRight: '1px solid #1e73be' }}>
                    HSN / SAC
                  </th>
                  <th className="py-2 px-1 text-center" style={{ width: '8%', borderRight: '1px solid #1e73be' }}>
                    Qty
                  </th>
                  <th className="py-2 px-1.5 text-right" style={{ width: '12%', borderRight: '1px solid #1e73be' }}>
                    Rate
                  </th>
                  <th className="py-2 px-1.5 text-right" style={{ width: '13%', borderRight: '1px solid #1e73be' }}>
                    Taxable Value
                  </th>
                  {gstEnabled && (
                    <th className="p-0 text-center" style={{ width: '18%', borderRight: '1px solid #1e73be' }}>
                      <div className="py-0.5 border-b border-[#1e73be]">{isIgst ? 'IGST' : 'CGST / SGST'}</div>
                      <div className="grid grid-cols-[35%_65%] text-[9px]">
                        <span className="py-0.5 border-r border-[#1e73be]">%</span>
                        <span className="py-0.5">Amount</span>
                      </div>
                    </th>
                  )}
                  <th className="py-2 px-2 text-right" style={{ width: gstEnabled ? '14%' : '20%' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="text-[10.5px]">
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="align-top"
                    style={{
                      borderBottom: idx === items.length - 1 ? 'none' : '1px solid #e2e8f0',
                      minHeight: '28px',
                    }}
                  >
                    {/* Sr No */}
                    <td className="py-1.5 px-1 text-center text-slate-800" style={{ borderRight: '1px solid #1e73be' }}>
                      {item.sr_no || idx + 1}
                    </td>

                    {/* Name of Product / Service */}
                    <td className="py-1.5 px-2 text-slate-900" style={{ borderRight: '1px solid #1e73be' }}>
                      <div className="font-bold text-[11px] text-slate-950 leading-snug">
                        {item.name}
                      </div>
                      {/* IMEI / Serial Number in italic as in the image */}
                      {item.imei && (
                        <div className="italic text-[10px] text-slate-700 font-mono mt-0.5">
                          {item.imei.startsWith('IMEI') ? item.imei : `IMEI ${item.imei}`}
                        </div>
                      )}
                      {/* Warranty info */}
                      {item.warranty && (
                        <div className="text-[9.5px] text-slate-600 mt-0.5">
                          Warranty: {item.warranty}
                        </div>
                      )}
                    </td>

                    {/* HSN */}
                    <td className="py-1.5 px-1 text-center text-slate-800 font-mono" style={{ borderRight: '1px solid #1e73be' }}>
                      {item.hsn || '8517'}
                    </td>

                    {/* Qty */}
                    <td className="py-1.5 px-1 text-center font-semibold text-slate-900 whitespace-nowrap" style={{ borderRight: '1px solid #1e73be' }}>
                      {item.quantity} {item.unit || 'NOS'}
                    </td>

                    {/* Rate */}
                    <td className="py-1.5 px-1.5 text-right text-slate-900 font-mono" style={{ borderRight: '1px solid #1e73be' }}>
                      {formatIndianCurrency(item.rate)}
                    </td>

                    {/* Taxable Value */}
                    <td className="py-1.5 px-1.5 text-right font-medium text-slate-900 font-mono" style={{ borderRight: '1px solid #1e73be' }}>
                      {formatIndianCurrency(item.taxable_value)}
                    </td>

                    {/* GST: % & Amount */}
                    {gstEnabled && (
                      <td className="p-0 text-slate-900 font-mono" style={{ borderRight: '1px solid #1e73be' }}>
                        <div className="grid grid-cols-[35%_65%] h-full">
                          <span className="py-1.5 px-0.5 text-center border-r border-[#1e73be]">
                            {(parseFloat(item.gst_rate) || 18).toFixed(2)}
                          </span>
                          <span className="py-1.5 px-1.5 text-right">
                            {formatIndianCurrency(item.gst_amount)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Line Total */}
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-950 font-mono">
                      {formatIndianCurrency(item.total)}
                    </td>
                  </tr>
                ))}

                {/* Empty Filler Row ensuring minimum height matching classic GST paper bills */}
                <tr style={{ height: items.length === 1 ? '140px' : items.length === 2 ? '100px' : '40px' }}>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  <td style={{ borderRight: '1px solid #1e73be' }}></td>
                  {gstEnabled && (
                    <td style={{ borderRight: '1px solid #1e73be' }}>
                      <div className="grid grid-cols-[35%_65%] h-full">
                        <span className="border-r border-[#1e73be]"></span>
                        <span></span>
                      </div>
                    </td>
                  )}
                  <td></td>
                </tr>
              </tbody>

              {/* Table Total Bar */}
              <tfoot>
                <tr
                  className="font-bold text-[10.5px] text-slate-950"
                  style={{
                    borderTop: '1.5px solid #1e73be',
                    borderBottom: '1.5px solid #1e73be',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <td colSpan={3} className="py-1.5 px-2 text-right uppercase tracking-wider font-bold" style={{ borderRight: '1px solid #1e73be' }}>
                    Total
                  </td>
                  <td className="py-1.5 px-1 text-center font-bold" style={{ borderRight: '1px solid #1e73be' }}>
                    {totalQty}
                  </td>
                  <td className="py-1.5 px-1.5 text-right" style={{ borderRight: '1px solid #1e73be' }}>
                    {/* Rate column total is left empty as in sample */}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono font-bold" style={{ borderRight: '1px solid #1e73be' }}>
                    {formatIndianCurrency(taxableAmount)}
                  </td>
                  {gstEnabled && (
                    <td className="p-0 font-mono font-bold" style={{ borderRight: '1px solid #1e73be' }}>
                      <div className="grid grid-cols-[35%_65%]">
                        <span className="py-1.5 px-0.5 text-center border-r border-[#1e73be]"></span>
                        <span className="py-1.5 px-1.5 text-right">{formatIndianCurrency(totalTax)}</span>
                      </div>
                    </td>
                  )}
                  <td className="py-1.5 px-2 text-right font-mono font-black text-slate-950">
                    {formatIndianCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. BOTTOM SECTION: Words, Bank Details, Terms & Conditions vs Summary Totals */}
          <div className="flex items-stretch text-xs" style={{ borderTop: 'none' }}>
            {/* Left Column: Total in Words, Bank Details, Terms & Conditions */}
            <div className="w-[58%] flex flex-col justify-between" style={{ borderRight: '1.5px solid #1e73be' }}>
              {/* Total in words box */}
              <div style={{ borderBottom: '1px solid #1e73be' }}>
                <div className="text-center font-bold text-[10.5px] py-1 text-slate-900" style={{ borderBottom: '1px solid #1e73be' }}>
                  Total in words
                </div>
                <div className="p-2 text-[10.5px] font-bold text-slate-900 tracking-tight leading-relaxed uppercase">
                  {totalInWords}
                </div>
              </div>

              {/* Bank Details box with live UPI QR */}
              <div style={{ borderBottom: '1px solid #1e73be' }}>
                <div className="text-center font-bold text-[10.5px] py-1 text-slate-900" style={{ borderBottom: '1px solid #1e73be' }}>
                  Bank Details
                </div>
                <div className="p-2 flex items-center justify-between gap-2">
                  {/* Account Text */}
                  <div className="grid grid-cols-[75px_1fr] gap-y-1 text-[10px] leading-tight">
                    <span className="font-bold text-slate-900">Name</span>
                    <span className="text-slate-800">: {shopData.bank_name}</span>

                    <span className="font-bold text-slate-900">Branch</span>
                    <span className="text-slate-800">: {shopData.branch}</span>

                    <span className="font-bold text-slate-900">Acc. Number</span>
                    <span className="font-bold text-slate-900 font-mono">: {shopData.account_number}</span>

                    <span className="font-bold text-slate-900">IFSC</span>
                    <span className="font-bold text-slate-900 font-mono">: {shopData.ifsc}</span>

                    <span className="font-bold text-slate-900">UPI ID</span>
                    <span className="font-bold text-slate-900 font-mono">: {shopData.upi_id}</span>
                  </div>

                  {/* QR code */}
                  <div className="flex flex-col items-center justify-center shrink-0 pr-2">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Pay using UPI"
                        className="w-16 h-16 sm:w-20 sm:h-20 border border-slate-300 rounded p-0.5"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                        QR Code
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-900 mt-1">Pay using UPI</span>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <div className="text-center font-bold text-[10.5px] py-1 text-slate-900" style={{ borderBottom: '1px solid #1e73be' }}>
                  Terms and Conditions
                </div>
                <div className="p-2 text-[9.5px] text-slate-800 leading-snug space-y-0.5">
                  <p>Subject to Maharashtra Junction.</p>
                  <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
                  <p>Goods once sold will not taken back.</p>
                  <p>Delivery Ex-Premises.</p>
                  {sale?.notes && <p className="font-semibold text-slate-900 mt-1">Note: {sale.notes}</p>}
                </div>
              </div>
            </div>

            {/* Right Column: Financial Summary & Authorised Signatory */}
            <div className="w-[42%] flex flex-col justify-between">
              {/* Financial Breakdown Table */}
              <div className="text-[11px]">
                {/* Taxable Amount */}
                <div className="flex items-center justify-between py-1.5 px-3" style={{ borderBottom: '1px solid #1e73be' }}>
                  <span className="font-bold text-slate-900">Taxable Amount</span>
                  <span className="font-mono font-medium text-slate-950">{formatIndianCurrency(taxableAmount)}</span>
                </div>

                {/* Discount (if applicable) */}
                {sale?.discount_amount > 0 && (
                  <div className="flex items-center justify-between py-1.5 px-3 text-emerald-700 bg-emerald-50/50" style={{ borderBottom: '1px solid #1e73be' }}>
                    <span className="font-bold">
                      Less : Discount {sale?.discount_type === 'percentage' ? `(${sale.discount_value}%)` : ''}
                    </span>
                    <span className="font-mono font-medium">-{formatIndianCurrency(sale.discount_amount)}</span>
                  </div>
                )}

                {/* GST Rows */}
                {gstEnabled ? (
                  isIgst ? (
                    <div className="flex items-center justify-between py-1.5 px-3" style={{ borderBottom: '1px solid #1e73be' }}>
                      <span className="font-bold text-slate-900">Add : IGST</span>
                      <span className="font-mono font-medium text-slate-950">{formatIndianCurrency(totalTax)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between py-1 px-3" style={{ borderBottom: '1px solid #1e73be' }}>
                        <span className="font-bold text-slate-900">Add : CGST ({(sale?.cgst_rate || 9).toFixed(1)}%)</span>
                        <span className="font-mono font-medium text-slate-950">{formatIndianCurrency(sale?.cgst_amount || totalTax / 2)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 px-3" style={{ borderBottom: '1px solid #1e73be' }}>
                        <span className="font-bold text-slate-900">Add : SGST ({(sale?.sgst_rate || 9).toFixed(1)}%)</span>
                        <span className="font-mono font-medium text-slate-950">{formatIndianCurrency(sale?.sgst_amount || totalTax / 2)}</span>
                      </div>
                    </>
                  )
                ) : null}

                {/* Total Tax */}
                {gstEnabled && (
                  <div className="flex items-center justify-between py-1.5 px-3" style={{ borderBottom: '1.5px solid #1e73be' }}>
                    <span className="font-bold text-slate-900">Total Tax</span>
                    <span className="font-mono font-medium text-slate-950">{formatIndianCurrency(totalTax)}</span>
                  </div>
                )}

                {/* Total Amount After Tax */}
                <div
                  className="flex items-center justify-between py-2 px-3 bg-slate-50/50"
                  style={{ borderBottom: '1px solid #1e73be' }}
                >
                  <span className="font-black text-slate-950 text-[12px]">Total Amount After Tax</span>
                  <span className="font-black text-[15px] sm:text-[17px] text-slate-950 font-mono tracking-tight">
                    {formatIndianCurrency(grandTotal, true)}
                  </span>
                </div>

                <div className="text-right px-3 py-1 text-[10px] text-slate-600 font-semibold italic">
                  (E & O.E.)
                </div>
              </div>

              {/* Signatory Box */}
              <div className="p-3 text-center mt-auto" style={{ borderTop: '1px solid #1e73be' }}>
                <p className="text-[9.5px] text-slate-600 italic">
                  Certified that the particulars given above are true and correct.
                </p>
                <p className="text-[11.5px] font-bold text-slate-950 mt-1">
                  For {shopData.name}
                </p>

                {/* Stamp / Signature placeholder space */}
                <div className="h-16 flex items-center justify-center">
                  <div className="w-24 h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-[9px] text-slate-300">
                    Seal / Sign
                  </div>
                </div>

                <div className="text-[10.5px] font-bold text-slate-900 pt-1" style={{ borderTop: '1px solid #e2e8f0' }}>
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
