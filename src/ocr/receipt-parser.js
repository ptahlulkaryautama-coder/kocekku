/**
 * Sakku — Receipt Parser
 * 
 * Extracts structured data from OCR text of Indonesian receipts.
 * Works with Indomaret, Alfamart, supermarkets, restaurants, etc.
 * 
 * No external API needed — all processing is client-side.
 */

/**
 * Parse OCR text from a receipt into structured transaction data
 * @param {string} ocrText - Raw OCR text from receipt
 * @param {string} userCurrency - User's display currency
 * @returns {Object} Parsed receipt data
 */
export function parseReceipt(ocrText, userCurrency = 'IDR') {
  if (!ocrText || !ocrText.trim()) return null;

  const text = ocrText;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const result = {
    store: '',
    date: '',
    total: 0,
    category: '',
    items: [],
    raw: text,
  };

  // ── Extract store name ──
  result.store = extractStoreName(lines);

  // ── Extract date ──
  result.date = extractDate(text);

  // ── Extract total amount ──
  result.total = extractTotal(lines);

  // ── Extract line items ──
  result.items = extractItems(lines);

  // ── Auto-detect category from store name ──
  result.category = detectCategoryFromStore(result.store, text);

  return result;
}

/**
 * Extract store/merchant name from receipt
 */
function extractStoreName(lines) {
  // Common Indonesian store patterns
  const storePatterns = [
    /indomaret/i,
    /alfamart/i,
    /alfamidi/i,
    /circle\s*k/i,
    /hari\s*harma/i,
    /trans\s*toto/i,
    /lotte\s*mart/i,
    /carrefour/i,
    /hypermart/i,
    /matahari/i,
    /gramedia/i,
    /starbucks/i,
    /mcdonald/i,
    /kfc/i,
    /pizza\s*hub/i,
    /domino/i,
    /subway/i,
    /bakmi\s*gm/i,
    /marugame/i,
    /ichiban/i,
    /sushi\s*tei/i,
    /guardian/i,
    /k24\s*klinik/i,
    /apotek/i,
    /century/i,
    /pptn/i,
    /pertamina/i,
    /spbu/i,
    /pln/i,
    /telkom/i,
  ];

  // Check first 5 lines for store name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    for (const pattern of storePatterns) {
      if (pattern.test(line)) {
        return line.replace(/[^\w\s]/g, '').trim();
      }
    }
  }

  // If no known store found, use first non-numeric line as store name
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    // Skip lines that are mostly numbers (receipt numbers, dates)
    const numRatio = (line.match(/\d/g) || []).length / line.length;
    if (numRatio < 0.5 && line.length > 2 && !/^(STRUK|NOTA|Kwitansi|Bon|Bayar)/i.test(line)) {
      return line.replace(/[^\w\s]/g, '').trim();
    }
  }

  return '';
}

/**
 * Extract transaction date from receipt text
 */
function extractDate(text) {
  const today = new Date().toISOString().split('T')[0];

  // Indonesian date patterns
  const datePatterns = [
    // "02/09/2026" or "02-09-2026"
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // "2026-09-02"
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // "02 Sep 2026" or "02 September 2026"
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des|January|February|March|April|May|June|July|August|September|October|November|December)\w*\s+(\d{4})/i,
    // "2 SEP 2026"
    /(\d{1,2})\s+(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)\w*\s+(\d{4})/i,
  ];

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
    jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12',
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('\\d{4}')) {
        // Year is in the match
        const groups = match.slice(1);
        if (groups.length === 3) {
          // Check if first group is year or day
          if (groups[0].length === 4) {
            // YYYY-MM-DD
            return `${groups[0]}-${groups[1].padStart(2, '0')}-${groups[2].padStart(2, '0')}`;
          } else if (groups[2].length === 4) {
            // DD/MM/YYYY or DD Month YYYY
            const monthStr = groups[1].toLowerCase();
            const monthNum = months[monthStr];
            if (monthNum) {
              return `${groups[2]}-${monthNum}-${groups[0].padStart(2, '0')}`;
            }
            // DD/MM/YYYY
            return `${groups[2]}-${groups[1].padStart(2, '0')}-${groups[0].padStart(2, '0')}`;
          }
        }
      }
    }
  }

  return today;
}

/**
 * Extract total amount from receipt
 */
function extractTotal(lines) {
  // Look for total patterns
  const totalPatterns = [
    /(?:TOTAL|Grand\s*Total|TOTAL\s*BAYAR|JUMLAH|Sub\s*Total|Bayar|Tunai|Cash|Kartu|Debit|Kredit)\s*[:.]?\s*(?:Rp\.?\s*)?([\d.,]+)/i,
    /(?:Rp\.?|IDR)\s*([\d.,]+)\s*$/i,
  ];

  // Also check for the largest number on the receipt (likely the total)
  let largestAmount = 0;

  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseIndonesianNumber(match[1]);
        if (amount > 0) return amount;
      }
    }

    // Track largest standalone number
    const numMatch = line.match(/(?:Rp\.?\s*)?([\d.,]+)(?:\s*[-–])?\s*$/);
    if (numMatch) {
      const amount = parseIndonesianNumber(numMatch[1]);
      if (amount > largestAmount && amount < 100000000) { // Cap at 100M
        largestAmount = amount;
      }
    }
  }

  return largestAmount;
}

/**
 * Parse Indonesian number format (1.234.567 or 1,234,567)
 */
function parseIndonesianNumber(str) {
  if (!str) return 0;
  // Remove currency symbols and whitespace
  let cleaned = str.replace(/[Rp.,\s]/g, '');
  // If the original has dots as thousand separators (Indonesian style)
  // e.g., "1.234.567" → remove dots
  if (str.includes('.') && !str.includes(',')) {
    cleaned = str.replace(/\./g, '');
  }
  // If has both dots and commas, use last separator as decimal
  // e.g., "1.234,56" → "1234.56"
  else if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Comma is decimal: "1.234,56"
      cleaned = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: "1,234.56"
      cleaned = str.replace(/,/g, '');
    }
  }
  // If has only commas, could be thousand or decimal separator
  else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal: "1234,56"
      cleaned = str.replace(',', '.');
    } else {
      // Thousand: "1,234,567"
      cleaned = str.replace(/,/g, '');
    }
  }
  return Math.round(parseFloat(cleaned) || 0);
}

/**
 * Extract line items from receipt
 */
function extractItems(lines) {
  const items = [];
  const itemPattern = /^(.+?)\s+(?:Rp\.?\s*)?([\d.,]+)\s*$/;

  for (const line of lines) {
    // Skip header/footer lines
    if (/^(STRUK|NOTA|Bon|Bayar|TOTAL|Sub|Grand|Kembali|Kartu|Tunai|Cash|Terima\s*kasih|Scan|Barcode)/i.test(line)) continue;
    if (line.length < 5) continue;

    const match = line.match(itemPattern);
    if (match) {
      const name = match[1].trim();
      const amount = parseIndonesianNumber(match[2]);
      if (amount > 0 && amount < 10000000 && name.length > 1) {
        items.push({ name, amount });
      }
    }
  }

  return items.slice(0, 20); // Cap at 20 items
}

/**
 * Detect category from store name and receipt text
 */
function detectCategoryFromStore(storeName, fullText) {
  const text = (storeName + ' ' + fullText).toLowerCase();

  const categoryMap = {
    'Food & Dining': ['indomaret', 'alfamart', 'alfamidi', 'circle k', 'hari-harma', 'starbucks', 'mcdonald', 'kfc', 'pizza', 'domino', 'subway', 'bakmi', 'marugame', 'ichiban', 'sushi', 'restoran', 'cafe', 'kopitiam', 'warteg', 'rumah makan', 'food court'],
    'Transportation': ['pertamina', 'spbu', 'gas', 'bensin', 'solar', 'parkir', 'tol'],
    'Health': ['guardian', 'k24', 'apotek', 'century', 'kimia farma', 'rs ', 'rumah sakit', 'klinik', 'dokter'],
    'Shopping': ['gramedia', 'matahari', 'carrefour', 'hypermart', 'lotte', 'tokopedia', 'shopee', 'lazada', 'mall'],
    'Bills & Utilities': ['pln', 'listrik', 'telkom', 'indihome', 'pdam', 'air', 'internet', 'pulsa'],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Perform OCR on an image using Tesseract.js
 * @param {File|Blob|string} image - Image to process
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} OCR text
 */
export async function performOCR(image, onProgress) {
  // Lazy load Tesseract.js
  if (!window.Tesseract) {
    await window.loadTesseract();
  }

  const worker = await window.Tesseract.createWorker('eng+ind', 1, {
    logger: (m) => {
      if (onProgress && m.progress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
