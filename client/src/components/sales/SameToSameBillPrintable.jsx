import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer, Share2, Download, Copy, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  formatIndianCurrency,
  numberToIndianWords,
  formatInvoiceDate,
  cleanWarrantyText,
} from "../../utils/billFormatters";

export const SameToSameBillPrintable = ({
  sale,
  shop,
  isPreview = false,
  onPrint,
  onShareWhatsApp,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [instagramQrDataUrl, setInstagramQrDataUrl] = useState("");
  const printRef = useRef(null);

  // Fallback defaults
  const shopData = {
    name: shop?.name || "Shree Mobile Shop",
    tagline:
      shop?.tagline ||
      "Get All Your Desired Smart Phones From Apple To Vivo On Huge Discounts And Easy EMI",
    address:
      shop?.address ||
      "G/456, Basant Lok Comm., Vasant Vihar, Tardeo Road, Maharashtra - 400001",
    phone: shop?.phone || "Ph. 111 2222 3333",
    tax_number: shop?.tax_number || "26CORPP3939N1ZA",
    logo_url: shop?.logo_url || "",
    instagram_qr_url: shop?.instagram_qr_url || "",
  };

  const invoiceNumber = sale?.invoice_no_seq || sale?.invoice_number || "47";
  const invoiceDate = sale?.invoice_date
    ? formatInvoiceDate(sale.invoice_date)
    : formatInvoiceDate(new Date());

  const items =
    sale?.items && sale.items.length > 0
      ? sale.items
      : [
        {
          sr_no: 1,
          name: "iPhone 15 Pro Max",
          imei: "IMEI 234534565432567",
          hsn: "8517",
          quantity: 1,
          unit: "NOS",
          rate: 180000,
          taxable_value: 180000,
          gst_rate: 18,
          gst_amount: 32400,
          total: 212400,
        },
        {
          sr_no: 2,
          name: "20W USB-C Power Adapter",
          imei: "",
          hsn: "8517",
          quantity: 1,
          unit: "NOS",
          rate: 2000,
          taxable_value: 2000,
          gst_rate: 18,
          gst_amount: 360,
          total: 2360,
        },
      ];

  const totalQty = items.reduce(
    (sum, item) => sum + (parseInt(item.quantity, 10) || 1),
    0,
  );
  const taxableAmount =
    sale?.taxable_amount !== undefined
      ? sale.taxable_amount
      : items.reduce(
        (sum, item) => sum + (parseFloat(item.taxable_value) || 0),
        0,
      );
  const totalTax =
    sale?.total_tax !== undefined
      ? sale.total_tax
      : items.reduce(
        (sum, item) => sum + (parseFloat(item.gst_amount) || 0),
        0,
      );
  const grandTotal =
    sale?.total_amount !== undefined
      ? sale.total_amount
      : taxableAmount + totalTax;
  const gstEnabled = sale?.gst_enabled !== false;
  const isIgst = sale?.gst_type !== "CGST_SGST";

  const totalInWords = sale?.total_in_words || numberToIndianWords(grandTotal);

  // Generate scannable QR code if instagram_qr_url is an Instagram link/handle, or use direct image
  useEffect(() => {
    const raw = (shopData.instagram_qr_url || "").trim();
    if (!raw) {
      setInstagramQrDataUrl("");
      return;
    }

    const pathWithoutQuery = raw.split("?")[0].toLowerCase();
    const isDirectImage =
      raw.startsWith("data:image/") ||
      raw.includes("/uploads/") ||
      raw.includes("/api/upload") ||
      /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(pathWithoutQuery);

    if (isDirectImage) {
      setInstagramQrDataUrl(raw);
      return;
    }

    let targetLink = raw;
    if (targetLink.startsWith("@")) {
      targetLink = `https://www.instagram.com/${targetLink.slice(1)}/`;
    } else if (!targetLink.startsWith("http://") && !targetLink.startsWith("https://")) {
      targetLink = `https://${targetLink}`;
    }

    QRCode.toDataURL(targetLink, {
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => setInstagramQrDataUrl(dataUrl))
      .catch((err) => {
        console.error("Failed to generate Instagram QR for invoice:", err);
        setInstagramQrDataUrl("");
      });
  }, [shopData.instagram_qr_url]);

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
    toast.success("Invoice details copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Action Bar (hidden on print) */}
      {!isPreview && (
        <div className="w-full max-w-[794px] mb-4 p-3 bg-slate-900 border border-slate-800 text-white rounded-2xl flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-white">
              Tax Invoice Preview #{invoiceNumber}
            </span>
            <span className="text-[11px] text-slate-400">
              ({items.length} items,{" "}
              {gstEnabled ? (isIgst ? "IGST 18%" : "CGST+SGST 18%") : "Non-GST"}
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              type="button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
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
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Bill
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAME TO SAME TAX INVOICE PRINT CANVAS (A4 Sized: 210mm x 297mm)          */}
      {/* ========================================================================= */}
      <div
        ref={printRef}
        id="same-to-same-bill-sheet"
        className="bg-white text-black font-sans shadow-2xl rounded-sm w-full max-w-[794px] p-12 print:!p-[48px] print:max-w-none print:shadow-none print:w-full print:m-0"
        style={{
          boxSizing: "border-box",
          padding: "48px",
          fontFamily:
            '"Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
          color: "#000000",
          backgroundColor: "#ffffff",
        }}
      >
        {/* 1. TOP HEADER (Outside main box) */}
        <div className="flex items-start justify-between pb-2">
          {/* Top Left: Logo & Shop Details */}
          <div className="flex items-start gap-3 max-w-[60%]">
            {/* Shop Logo Badge (Color preserved) */}
            {shopData.logo_url ? (
              <div className="w-16 h-16 rounded-lg border border-black p-1 flex items-center justify-center shrink-0 bg-white shadow-xs overflow-hidden">
                <img
                  src={shopData.logo_url}
                  alt={shopData.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center shrink-0">
                <div className="w-12 h-14 rounded-lg bg-sky-500 flex items-center justify-center p-2 text-white shadow-xs rotate-[-8deg] transform hover:rotate-0 transition-transform">
                  <svg
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-tighter text-black mt-1">
                  PHONE SHOP
                </span>
                <span className="text-[6.5px] text-slate-500 tracking-tight uppercase">
                  {shopData.tagline ? "OFFICIAL" : "SLOGAN HERE"}
                </span>
              </div>
            )}

            {/* Shop info */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black leading-tight tracking-tight">
                {shopData.name}
              </h1>
              <p className="text-[11px] text-black leading-snug mt-0.5">
                {shopData.address}
              </p>
              <p className="text-[11px] font-semibold text-black mt-0.5">
                {shopData.phone}
              </p>
            </div>
          </div>

          {/* Top Right: Instagram QR code if configured (Preserved Instagram color #E1306C) */}
          <div className="max-w-[40%] flex flex-col items-end">
            {instagramQrDataUrl ? (
              <div className="flex items-center gap-2.5 p-1.5 border border-black rounded-lg bg-slate-50 shadow-xs">
                <div className="flex flex-col text-right">
                  <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#E1306C]">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span>Instagram</span>
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">
                    Scan to Connect
                  </span>
                </div>
                <img
                  src={instagramQrDataUrl}
                  alt="Instagram Profile QR"
                  className="w-14 h-14 object-contain rounded border border-black bg-white p-0.5"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Slogan banner ribbon */}
        <div className="border-t border-b border-black py-1 my-1.5 text-center">
          <p className="text-[11px] text-black font-medium tracking-tight">
            Get All Your Desired Smart Phones From Apple To Vivo On Huge
            Discounts And Easy EMI
          </p>
        </div>

        {/* 2. MAIN BORDERED BOX CONTAINER (Black borders) */}
        <div
          className="w-full mt-2"
          style={{
            border: "2px solid #000000",
            boxSizing: "border-box",
          }}
        >
          {/* Header Bar inside Box: GSTIN, TAX INVOICE, ORIGINAL FOR RECIPIENT */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              borderBottom: "1.5px solid #000000",
              backgroundColor: "#ffffff",
            }}
          >
            <div className="text-[12px] font-bold text-black w-1/3">
              {gstEnabled
                ? `GSTIN : ${shopData.tax_number}`
                : `REG : ${shopData.tax_number || "UNREGISTERED"}`}
            </div>
            <div className="text-[17px] font-black tracking-wider text-black text-center w-1/3 uppercase">
              {gstEnabled ? "TAX INVOICE" : "RETAIL INVOICE"}
            </div>
            <div className="text-[11px] font-bold text-black text-right w-1/3 uppercase tracking-tight">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>

          {/* Split Box: Customer Detail (Left) vs Invoice Info (Right) */}
          <div
            className="flex items-stretch text-xs"
            style={{ borderBottom: "1.5px solid #000000" }}
          >
            {/* Left: Customer Detail */}
            <div
              className="w-[58%] p-2.5"
              style={{ width: "58%", borderRight: "1.5px solid #000000" }}
            >
              <div
                className="text-center font-bold text-[11px] text-black pb-1 mb-1.5"
                style={{ borderBottom: "1px solid #000000" }}
              >
                Customer Detail
              </div>
              <div className="grid grid-cols-[85px_1fr] gap-y-1 text-[11px] leading-tight text-black">
                <span className="font-bold text-black">Name</span>
                <span className="font-semibold text-black">
                  : {sale?.customer_name || "Ronak Panchal"}
                </span>

                <span className="font-bold text-black">Address</span>
                <span className="text-black">
                  : {sale?.customer_address || "Gujarat"}
                </span>

                <span className="font-bold text-black">PHONE</span>
                <span className="text-black">
                  : {sale?.customer_phone || "-"}
                </span>

                {sale?.customer_email && (
                  <>
                    <span className="font-bold text-black">Mail ID</span>
                    <span className="text-black">
                      : {sale?.customer_email}
                    </span>
                  </>
                )}

                <span className="font-bold text-black">GSTIN</span>
                <span className="text-black">
                  : {sale?.customer_gstin || "-"}
                </span>

                <span className="font-bold text-black">
                  Place of Supply
                </span>
                <span className="text-black">
                  : {sale?.place_of_supply || "Gujarat"}
                </span>
              </div>
            </div>

            {/* Right: Invoice Info */}
            <div className="w-[42%] p-2.5 flex flex-col justify-start" style={{ width: "42%" }}>
              <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[11px] leading-tight text-black">
                <span className="font-bold text-black">Invoice No.</span>
                <span className="font-bold text-black">
                  : {invoiceNumber}
                </span>

                <span className="font-bold text-black">Invoice Date</span>
                <span className="font-semibold text-black">
                  : {invoiceDate}
                </span>

                {sale?.payment_mode && (
                  <>
                    <span className="font-bold text-black">
                      Payment Mode
                    </span>
                    <span className="font-semibold text-black">
                      : {sale.payment_mode}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. PRODUCT & SERVICE TABLE */}
          <div className="w-full">
            <table
              className="w-full text-left border-collapse"
              style={{ tableLayout: "fixed" }}
            >
              <thead>
                <tr
                  className="text-[11px] font-black uppercase tracking-wider text-black"
                  style={{
                    backgroundColor: "#ffffff",
                    borderBottom: "1.5px solid #000000",
                    color: "#000000",
                    fontWeight: 900,
                  }}
                >
                  <th
                    className="py-2.5 px-1 text-center font-black text-black"
                    style={{
                      width: "6%",
                      borderRight: "1px solid #000000",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
                    No.
                  </th>
                  <th
                    className="py-2.5 px-2 text-left font-black text-black"
                    style={{
                      width: gstEnabled ? "38%" : "40%",
                      borderRight: "1px solid #000000",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
                    Name of Product
                  </th>
                  <th
                    className="py-2.5 px-1 text-center font-black text-black"
                    style={{
                      width: gstEnabled ? "14%" : "12%",
                      borderRight: "1.5px solid #000000",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
                    Warranty
                  </th>
                  <th
                    className="py-2.5 px-1 text-center font-black text-black"
                    style={{
                      width: gstEnabled ? "7%" : "8%",
                      borderRight: "1px solid #000000",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
                    Qty
                  </th>
                  <th
                    className="py-2.5 px-1.5 text-right font-black text-black"
                    style={{
                      width: gstEnabled ? "11%" : "14%",
                      borderRight: "1px solid #000000",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
                    Rate
                  </th>
                  {gstEnabled && (
                    <th
                      className="p-0 text-center font-black text-black"
                      style={{
                        width: "11%",
                        borderRight: "1px solid #000000",
                        color: "#000000",
                        fontWeight: 900,
                      }}
                    >
                      <div className="py-0.5 border-b border-black font-black text-black">
                        {isIgst ? "IGST" : "CGST / SGST"}
                      </div>
                      <div className="grid grid-cols-[35%_65%] text-[9.5px]">
                        <span className="py-0.5 border-r border-black font-black text-black">
                          %
                        </span>
                        <span className="py-0.5 font-black text-black">Amount</span>
                      </div>
                    </th>
                  )}
                  <th
                    className="py-2.5 px-2 text-right font-black text-black"
                    style={{
                      width: gstEnabled ? "13%" : "20%",
                      color: "#000000",
                      fontWeight: 900,
                    }}
                  >
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
                      borderBottom:
                        idx === items.length - 1 ? "none" : "1px solid #000000",
                      minHeight: "28px",
                    }}
                  >
                    {/* Sr No */}
                    <td
                      className="py-1.5 px-1 text-center text-black"
                      style={{ borderRight: "1px solid #000000" }}
                    >
                      {item.sr_no || idx + 1}
                    </td>

                    {/* Name of Product / Service */}
                    <td
                      className="py-1.5 px-2 text-black"
                      style={{ borderRight: "1px solid #000000" }}
                    >
                      <div className="font-bold text-[11px] text-black leading-snug">
                        {item.name}
                      </div>
                      {/* IMEI / Serial Number in italic */}
                      {item.imei && (
                        <div className="italic text-[10px] text-black font-mono mt-0.5">
                          {item.imei.startsWith("IMEI")
                            ? item.imei
                            : `IMEI ${item.imei}`}
                        </div>
                      )}
                    </td>

                    {/* Warranty */}
                    <td
                      className="py-1.5 px-1 text-center text-black font-semibold"
                      style={{ borderRight: "1.5px solid #000000" }}
                    >
                      {cleanWarrantyText(item.warranty)}
                    </td>

                    {/* Qty */}
                    <td
                      className="py-1.5 px-1 text-center font-semibold text-black whitespace-nowrap"
                      style={{ borderRight: "1px solid #000000" }}
                    >
                      {item.quantity} {item.unit || "NOS"}
                    </td>

                    {/* Rate */}
                    <td
                      className="py-1.5 px-1.5 text-right text-black font-mono"
                      style={{ borderRight: "1px solid #000000" }}
                    >
                      {formatIndianCurrency(item.rate)}
                    </td>

                    {/* GST: % & Amount */}
                    {gstEnabled && (
                      <td
                        className="p-0 text-black font-mono"
                        style={{ borderRight: "1px solid #000000" }}
                      >
                        <div className="grid grid-cols-[35%_65%] h-full">
                          <span className="py-1.5 px-0.5 text-center border-r border-black">
                            {(parseFloat(item.gst_rate) || 18).toFixed(2)}
                          </span>
                          <span className="py-1.5 px-1.5 text-right">
                            {formatIndianCurrency(item.gst_amount)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Line Total */}
                    <td className="py-1.5 px-2 text-right font-semibold text-black font-mono">
                      {formatIndianCurrency(item.total)}
                    </td>
                  </tr>
                ))}

                {/* Empty Filler Row dynamically scaled for Full A4 Page Height with 48px margins */}
                <tr
                  style={{
                    height: `${Math.max(25, Math.round(360 - (items.length - 1) * 36))}px`,
                  }}
                >
                  <td style={{ borderRight: "1px solid #000000" }}></td>
                  <td style={{ borderRight: "1px solid #000000" }}></td>
                  <td style={{ borderRight: "1.5px solid #000000" }}></td>
                  <td style={{ borderRight: "1px solid #000000" }}></td>
                  <td style={{ borderRight: "1px solid #000000" }}></td>
                  {gstEnabled && (
                    <td style={{ borderRight: "1px solid #000000" }}>
                      <div className="grid grid-cols-[35%_65%] h-full">
                        <span className="border-r border-black"></span>
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
                  className="font-bold text-[10.5px] text-black"
                  style={{
                    borderTop: "1.5px solid #000000",
                    borderBottom: "1.5px solid #000000",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <td
                    colSpan={3}
                    className="py-1.5 px-2 text-right uppercase tracking-wider font-bold text-black"
                    style={{ borderRight: "1.5px solid #000000" }}
                  >
                    Total
                  </td>
                  <td
                    className="py-1.5 px-1 text-center font-bold text-black"
                    style={{ borderRight: "1px solid #000000" }}
                  >
                    {totalQty}
                  </td>
                  <td
                    className="py-1.5 px-1.5 text-right"
                    style={{ borderRight: "1px solid #000000" }}
                  >
                    {/* Rate column total is left empty as in sample */}
                  </td>
                  {gstEnabled && (
                    <td
                      className="p-0 font-mono font-bold text-black"
                      style={{ borderRight: "1px solid #000000" }}
                    >
                      <div className="grid grid-cols-[35%_65%]">
                        <span className="py-1.5 px-0.5 text-center border-r border-black"></span>
                        <span className="py-1.5 px-1.5 text-right">
                          {formatIndianCurrency(totalTax)}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="py-1.5 px-2 text-right font-mono font-black text-black">
                    {formatIndianCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. BOTTOM SECTION: Words, Bank Details, Terms & Conditions vs Summary Totals */}
          {(() => {
            const breakdownRows = [];
            if (sale?.discount_amount > 0) {
              breakdownRows.push({
                key: "discount",
                render: () => (
                  <div className="flex items-center justify-between py-0.5 px-3 text-[10px] bg-white text-black">
                    <span className="font-semibold text-black">
                      Less : Discount{" "}
                      {sale?.discount_type === "percentage"
                        ? `(${sale.discount_value}%)`
                        : ""}
                    </span>
                    <span className="font-mono font-bold text-black">
                      -{formatIndianCurrency(sale.discount_amount)}
                    </span>
                  </div>
                ),
                borderBottom: "1px solid #000000",
              });
            }
            if (gstEnabled) {
              if (isIgst) {
                breakdownRows.push({
                  key: "igst",
                  render: () => (
                    <div className="flex items-center justify-between py-1 px-3 text-black">
                      <span className="font-bold text-black">Add : IGST</span>
                      <span className="font-mono font-medium text-black">
                        {formatIndianCurrency(totalTax)}
                      </span>
                    </div>
                  ),
                  borderBottom: "1px solid #000000",
                });
              } else {
                breakdownRows.push({
                  key: "cgst",
                  render: () => (
                    <div className="flex items-center justify-between py-1 px-3 text-black">
                      <span className="font-bold text-black">
                        Add : CGST ({(sale?.cgst_rate || 9).toFixed(1)}%)
                      </span>
                      <span className="font-mono font-medium text-black">
                        {formatIndianCurrency(sale?.cgst_amount || totalTax / 2)}
                      </span>
                    </div>
                  ),
                  borderBottom: "1px solid #000000",
                });
                breakdownRows.push({
                  key: "sgst",
                  render: () => (
                    <div className="flex items-center justify-between py-1 px-3 text-black">
                      <span className="font-bold text-black">
                        Add : SGST ({(sale?.sgst_rate || 9).toFixed(1)}%)
                      </span>
                      <span className="font-mono font-medium text-black">
                        {formatIndianCurrency(sale?.sgst_amount || totalTax / 2)}
                      </span>
                    </div>
                  ),
                  borderBottom: "1px solid #000000",
                });
              }
              breakdownRows.push({
                key: "total_tax",
                render: () => (
                  <div className="flex items-center justify-between py-1 px-3 font-bold text-black">
                    <span className="text-black">Total Tax</span>
                    <span className="font-mono font-medium text-black">
                      {formatIndianCurrency(totalTax)}
                    </span>
                  </div>
                ),
                borderBottom: "1.5px solid #000000",
              });
            }
            breakdownRows.push({
              key: "grand_total",
              render: () => (
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/50 text-black">
                  <span className="font-black text-black text-[12px]">
                    Total Amount After Tax
                  </span>
                  <span className="font-black text-[15px] sm:text-[17px] text-black font-mono tracking-tight">
                    {formatIndianCurrency(grandTotal, true)}
                  </span>
                </div>
              ),
              borderBottom: "1px solid #000000",
            });

            return (
              <table
                className="w-full text-left border-collapse"
                style={{
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                  borderTop: "none",
                }}
              >
                <colgroup>
                  <col style={{ width: "58%" }} />
                  <col style={{ width: "42%" }} />
                </colgroup>
                <tbody>
                  {/* Row 1: Total in words Header vs Taxable Amount */}
                  <tr style={{ borderBottom: "1px solid #000000" }}>
                    <td
                      className="text-center font-bold text-[10.5px] text-black py-1"
                      style={{
                        width: "58%",
                        borderRight: "1.5px solid #000000",
                        borderBottom: "1px solid #000000",
                      }}
                    >
                      Total in words
                    </td>
                    <td
                      className="py-1 px-3 text-[11px] text-black"
                      style={{
                        width: "42%",
                        borderBottom: "1px solid #000000",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black">
                          Taxable Amount
                        </span>
                        <span className="font-mono font-medium text-black">
                          {formatIndianCurrency(taxableAmount)}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Breakdown Rows: Left cell spans all rows, Right shows rows */}
                  {breakdownRows.map((row, idx) => (
                    <tr key={row.key} style={{ borderBottom: row.borderBottom }}>
                      {idx === 0 && (
                        <td
                          rowSpan={breakdownRows.length}
                          className="p-2.5 text-[10.5px] font-bold text-black tracking-tight leading-relaxed uppercase"
                          style={{
                            width: "58%",
                            borderRight: "1.5px solid #000000",
                            borderBottom: "1px solid #000000",
                            verticalAlign: "middle",
                          }}
                        >
                          {totalInWords}
                        </td>
                      )}
                      <td
                        style={{
                          width: "42%",
                          borderBottom: row.borderBottom,
                          verticalAlign: "middle",
                        }}
                      >
                        {row.render()}
                      </td>
                    </tr>
                  ))}

                  {/* Row: Terms and Conditions Full-Width Header */}
                  <tr style={{ borderBottom: "1px solid #000000" }}>
                    <td
                      colSpan={2}
                      className="py-1 px-3"
                      style={{
                        width: "100%",
                        borderBottom: "1px solid #000000",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10.5px] text-black flex-1 text-center pl-10">
                          Terms and Conditions
                        </span>
                        <span className="text-right text-[10px] text-black font-semibold italic shrink-0">
                          (E & O.E.)
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row: Terms Content Full-Width (Authorised Signatory removed) */}
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2.5 text-[9.5px] text-black leading-snug space-y-1"
                      style={{
                        width: "100%",
                        verticalAlign: "top",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <p>1. Customers must check the device condition, model, IMEI and accessories before accepting delivery.</p>
                      <p>2. Repair warranty, if applicable, covers only the repaired or replaced parts as mentioned on the invoice.</p>
                      <p>3. Physical damage, liquid damage, misuse and unauthorized repairs are not covered under warranty.</p>
                      <p>4. Customers are advised to back up their data before repair; the shop is not responsible for data loss.</p>
                      <p>5. Returns, replacements and refunds are subject to the applicable shop policy and Indian consumer protection laws.</p>
                      {sale?.notes && (
                        <p className="font-semibold text-black mt-1">
                          Note: {sale.notes}
                        </p>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
