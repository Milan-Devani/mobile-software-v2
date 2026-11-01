// Formatter utilities for Indian Invoicing (Lakh / Crore number-to-words, Currency & Date)

export const formatIndianCurrency = (num, showSymbol = false) => {
  if (num === null || num === undefined || isNaN(num)) return showSymbol ? '₹0.00' : '0.00';
  const val = parseFloat(num);
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  const [intPart, decPart] = absVal.toFixed(2).split('.');
  
  // Indian numbering format: 3 digits, then groups of 2 (e.g. 1,82,000.00)
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = `${formattedInt}.${decPart}`;

  if (showSymbol) {
    return isNegative ? `-₹${result}` : `₹${result}`;
  }
  return isNegative ? `-${result}` : result;
};

export const numberToIndianWords = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return 'ZERO RUPEES ONLY';
  }

  const a = [
    '', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ',
    'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '
  ];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];

  const intAmount = Math.floor(Math.abs(amount));
  const decAmount = Math.round((Math.abs(amount) - intAmount) * 100);

  const numStr = ('000000000' + intAmount).slice(-9); // up to 99 crore
  const crore = parseInt(numStr.slice(0, 2), 10);
  const lakh = parseInt(numStr.slice(2, 4), 10);
  const thousand = parseInt(numStr.slice(4, 6), 10);
  const hundred = parseInt(numStr.slice(6, 7), 10);
  const rest = parseInt(numStr.slice(7, 9), 10);

  let words = '';

  const getTwoDigit = (n) => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + a[n % 10];
  };

  if (crore > 0) words += getTwoDigit(crore) + 'CRORE ';
  if (lakh > 0) words += getTwoDigit(lakh) + 'LAKH ';
  if (thousand > 0) words += getTwoDigit(thousand) + 'THOUSAND ';
  if (hundred > 0) words += a[hundred] + 'HUNDRED ';

  if (rest > 0) {
    if (words !== '' && !words.endsWith('HUNDRED ')) {
      // Add AND if preceded by thousands/lakhs without hundred
      words += 'AND ';
    } else if (words.endsWith('HUNDRED ')) {
      words += 'AND ';
    }
    words += getTwoDigit(rest);
  }

  words = words.trim();

  let result = words ? `${words} RUPEES` : '';

  if (decAmount > 0) {
    result += (result ? ' AND ' : '') + `${getTwoDigit(decAmount).trim()} PAISE`;
  }

  return (result ? `${result} ONLY` : 'ZERO RUPEES ONLY').toUpperCase();
};

export const formatInvoiceDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const cleanWarrantyText = (warranty) => {
  if (!warranty) return "-";
  const str = String(warranty).trim();
  if (
    !str ||
    str.toLowerCase() === "no warranty" ||
    str.toLowerCase() === "no" ||
    str.toLowerCase() === "none" ||
    str === "-"
  ) {
    return "-";
  }
  const cleaned = str
    .replace(/\b(brand|testing)\s+warranty\b/gi, "")
    .replace(/\b(warranty|replacement)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "-";
};

export const calculatePendingWarranty = (warrantyStr, saleDateVal) => {
  if (!warrantyStr) return { status: 'NO_WARRANTY', text: 'No Warranty', daysLeft: 0, totalDays: 0 };
  const str = String(warrantyStr).trim().toLowerCase();
  if (
    !str ||
    str === '-' ||
    str === 'no warranty' ||
    str === 'none' ||
    str === 'no' ||
    str === '0'
  ) {
    return { status: 'NO_WARRANTY', text: 'No Warranty', daysLeft: 0, totalDays: 0 };
  }

  let totalDays = 0;
  const yearMatch = str.match(/(\d+)\s*(y|year)/i);
  const monthMatch = str.match(/(\d+)\s*(m|month)/i);
  const dayMatch = str.match(/(\d+)\s*(d|day)?/i);

  if (yearMatch) {
    totalDays = parseInt(yearMatch[1], 10) * 365;
  } else if (monthMatch) {
    totalDays = parseInt(monthMatch[1], 10) * 30;
  } else if (dayMatch && dayMatch[1]) {
    totalDays = parseInt(dayMatch[1], 10);
  }

  if (isNaN(totalDays) || totalDays <= 0) {
    return { status: 'NO_WARRANTY', text: 'No Warranty', daysLeft: 0, totalDays: 0 };
  }

  const saleDate = saleDateVal ? new Date(saleDateVal) : new Date();
  if (isNaN(saleDate.getTime())) {
    return { status: 'ACTIVE', daysLeft: totalDays, totalDays, text: `${totalDays} Days Left` };
  }

  const today = new Date();
  const startOfDaySale = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate()).getTime();
  const startOfDayToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const elapsedDays = Math.max(0, Math.round((startOfDayToday - startOfDaySale) / (1000 * 60 * 60 * 24)));
  const daysLeft = totalDays - elapsedDays;

  const expiryDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate() + totalDays);

  if (daysLeft <= 0) {
    return {
      status: 'EXPIRED',
      totalDays,
      daysLeft: 0,
      expiryDate,
      text: 'Expired',
    };
  }

  return {
    status: 'ACTIVE',
    totalDays,
    daysLeft,
    expiryDate,
    text: `${daysLeft} Days Left`,
  };
};

