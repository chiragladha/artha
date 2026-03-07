/**
 * ============================================================
 * Artha — Gmail → Google Sheets Auto-Sync
 * Google Apps Script
 * ============================================================
 * 
 * This script runs inside Google Sheets (via Extensions > Apps Script).
 * It reads your Gmail for UPI and Credit Card transaction emails,
 * extracts the amounts and merchant names, and writes them to your
 * expense sheet automatically.
 * 
 * SETUP:
 * 1. Open your Artha Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Save (💾)
 * 5. Run the function "syncGmailToSheet" once manually to grant permissions
 * 6. Go to Triggers (⏰ icon) → Add Trigger:
 *    - Choose function: syncGmailToSheet
 *    - Event source: Time-driven
 *    - Type: Minutes timer → Every 15 minutes (or your preference)
 * 7. Click Save
 * 
 * The script will now automatically check your Gmail every 15 minutes
 * and add new transactions to your sheet!
 * ============================================================
 */

// ── Configuration ──────────────────────────────────────────
const CONFIG = {
  // Which sheet tab to write expenses to (current year)
  EXPENSE_SHEET: '2026',
  
  // How far back to look for emails (in days)
  LOOKBACK_DAYS: 7,
  
  // Gmail search queries for transaction emails
  SEARCH_QUERIES: [
    // ── HDFC Bank (primary bank) ──
    'from:alerts@hdfcbank.bank.in newer_than:7d',
    'from:alerts@hdfcbank.net newer_than:7d',
    'subject:"UPI txn" newer_than:7d',
    'subject:"debited from your account" newer_than:7d',
    'subject:"debited from account" newer_than:7d',
    
    // ── Generic Bank Debit Alerts ──
    'subject:"has been debited" newer_than:7d',
    'subject:"money has been debited" newer_than:7d',
    'subject:"debited from" newer_than:7d',
    'subject:"UPI transaction" newer_than:7d',
    'subject:"sent Rs" newer_than:7d',
    'subject:"Payment of Rs" newer_than:7d',
    'subject:"paid to" newer_than:7d',
    'subject:"transaction alert" newer_than:7d',
    'subject:"debit alert" newer_than:7d',
    
    // ── Credit Card Transactions ──
    'subject:"credit card" subject:"transaction" newer_than:7d',
    'subject:"card ending" newer_than:7d',
    'subject:"has been used" newer_than:7d',
    'subject:"credit card" subject:"spent" newer_than:7d',
    
    // ── Other Indian Banks ──
    'from:alerts@icicibank.com newer_than:7d (subject:debited OR subject:transaction)',
    'from:alerts@axisbank.com newer_than:7d (subject:debited OR subject:transaction)',
    'from:alerts@sbi.co.in newer_than:7d (subject:debited OR subject:transaction)',
    'from:alerts@kotak.com newer_than:7d (subject:debited OR subject:transaction)',
    
    // ── Google Pay ──
    'from:noreply@google.com subject:"You paid" newer_than:7d',
    'from:noreply@google.com subject:"sent" newer_than:7d',
    
    // ── PhonePe / Paytm / CRED ──
    'from:support@phonepe.com subject:"Payment" newer_than:7d',
    'from:noreply@paytm.com subject:"paid" newer_than:7d',
    'from:no-reply@cred.club newer_than:7d (subject:paid OR subject:payment)',
  ],
  
  // Patterns to extract amount from email body/subject
  AMOUNT_PATTERNS: [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited|paid|sent|spent|charged)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:has been debited|was debited)/i,
    /amount\s*(?:of\s*)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  
  // Patterns to extract merchant/payee name
  MERCHANT_PATTERNS: [
    // HDFC: "debited from account XXXX to VPA user@bank Name Surname on DD-MM-YY"
    /to\s+VPA\s+\S+\s+(.+?)\s+on\s+\d/i,
    // Generic: "paid to Name" / "sent to Name"
    /(?:paid to|sent to|transferred to|paid)\s+(.+?)(?:\s+on|\s+via|\s+using|\s+from|\.|$)/i,
    // "at Merchant" / "to Merchant"
    /(?:at|to)\s+(.+?)(?:\s+on|\s+using|\s+for|\.|$)/i,
    // VPA extraction (fallback: use VPA ID as name)
    /VPA\s*[:\-]?\s*(\S+@\S+)/i,
    /VPA\s*[:\-]?\s*(\S+)/i,
    /merchant\s*[:\-]?\s*(.+?)(?:\s+on|\.|$)/i,
    /(?:UPI|NEFT|IMPS)\/\S+\/(.+?)(?:\/|$)/i,
    // "credited to / debited to Name"
    /debited.*?to\s+(.+?)(?:\s+on|\.|$)/i,
  ],
  
  // Mode detection patterns
  MODE_PATTERNS: {
    'Credit Card': /credit\s*card|card\s+ending|visa|mastercard|rupay/i,
    'UPI': /upi|gpay|phonepe|paytm|bhim|google\s*pay/i,
    'Bank - NACH': /nach|ecs|auto.?debit|standing.?instruction|si\s/i,
    'NEFT': /neft/i,
    'IMPS': /imps/i,
  },
  
  // Category auto-detection keywords (same as Artha app)
  CATEGORY_KEYWORDS: {
    'Food': ['swiggy', 'zomato', 'lunch', 'dinner', 'breakfast', 'food', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'biryani', 'chai', 'tea', 'meal', 'eat', 'maggi', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'chaayos'],
    'Travel': ['uber', 'ola', 'rapido', 'metro', 'irctc', 'train', 'flight', 'bus', 'cab', 'auto', 'makemytrip', 'goibibo', 'cleartrip', 'redbus'],
    'Investment': ['sip', 'mutual fund', 'zerodha', 'groww', 'coin', 'mf', 'stock', 'investment', 'nps'],
    'Rent': ['rent', 'house', 'flat', 'pg', 'accomodation', 'landlord'],
    'Tech': ['spotify', 'netflix', 'amazon prime', 'hotstar', 'youtube', 'apple', 'google', 'aws', 'hosting', 'domain', 'github', 'icloud'],
    'Experience': ['movie', 'concert', 'event', 'bookmyshow', 'pvr', 'inox', 'theatre', 'gaming'],
    'Lifestyle': ['gym', 'shopping', 'clothes', 'myntra', 'ajio', 'nykaa', 'flipkart', 'amazon', 'salon', 'healthcare', 'medicine', 'pharmeasy'],
    'Credit Card Spends': ['credit card bill', 'cc bill', 'hdfc card', 'icici card', 'sbi card', 'axis card', 'credit card payment', 'hdfc loan'],
  },
};

// ── Main Function ──────────────────────────────────────────
function syncGmailToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET);
  
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + CONFIG.EXPENSE_SHEET + '" not found!');
    return;
  }
  
  // Get existing entries to avoid duplicates
  const existingData = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  existingData.forEach(row => {
    if (row[1] && row[2] && row[3]) {
      // Key = date + name + amount
      const key = formatDate(row[1]) + '|' + String(row[2]).trim().toLowerCase() + '|' + String(row[3]);
      existingKeys.add(key);
    }
  });
  
  let newEntries = [];
  let processedMessageIds = getProcessedIds();
  
  // Search Gmail for transaction emails
  CONFIG.SEARCH_QUERIES.forEach(query => {
    try {
      const threads = GmailApp.search(query, 0, 50);
      threads.forEach(thread => {
        const messages = thread.getMessages();
        messages.forEach(message => {
          const msgId = message.getId();
          if (processedMessageIds.has(msgId)) return; // Already processed
          
          const entry = parseTransactionEmail(message);
          if (entry && entry.amount > 0) {
            const key = entry.date + '|' + entry.name.toLowerCase() + '|' + entry.amount;
            if (!existingKeys.has(key)) {
              newEntries.push(entry);
              existingKeys.add(key);
            }
          }
          processedMessageIds.add(msgId);
        });
      });
    } catch (e) {
      Logger.log('Search error for "' + query + '": ' + e.message);
    }
  });
  
  // Write new entries to sheet — ONLY UPI/NEFT/IMPS/Cash, NOT Credit Card
  const expenseEntries = newEntries.filter(e => {
    // Make sure we thoroughly catch any variation of 'credit card' mode
    const isCc = e.mode && (
      e.mode.toLowerCase().includes('credit card') || 
      e.mode.toLowerCase().includes('cc') ||
      e.category === 'Credit Card Spends'
    );
    return !isCc;
  });
  
  // Collect CC entries separately
  const ccEntries = newEntries.filter(e => {
    const isCc = e.mode && (
      e.mode.toLowerCase().includes('credit card') || 
      e.mode.toLowerCase().includes('cc') ||
      e.category === 'Credit Card Spends'
    );
    return isCc;
  });

  if (expenseEntries.length > 0) {
    // Sort by date
    expenseEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    expenseEntries.forEach(entry => {
      const dateParts = entry.date.split('-');
      const month = getMonthName(parseInt(dateParts[1]));
      const dateStr = dateParts[2] + '/' + dateParts[1]; // DD/MM format
      
      sheet.appendRow([
        month,            // Column A: Month
        dateStr,          // Column B: Date (DD/MM)
        entry.name,       // Column C: Name
        entry.amount,     // Column D: Amount
        entry.mode,       // Column E: Mode
      ]);
    });
    
    Logger.log('✅ Added ' + expenseEntries.length + ' new expense transactions');
  } else {
    Logger.log('ℹ️ No new UPI/expense transactions found');
  }
  
  // ── Write CC entries to 💳 tab ──────────────────────────────
  if (ccEntries.length > 0) {
    writeCCEntries(ss, ccEntries);
  }
  
  // Save processed message IDs
  saveProcessedIds(processedMessageIds);
}

// ── Credit Card Entries → 💳 Tab ──────────────────────────────
// Card number to name mapping
const CARD_MAP = {
  '1550': 'Mastercard',
  '9110': 'Tata Neu',
};

function detectCard(text) {
  const lower = text.toLowerCase();
  for (const [num, name] of Object.entries(CARD_MAP)) {
    if (lower.includes(num)) return name;
  }
  // Try to extract card ending digits
  const m = lower.match(/card\s*(?:ending|no\.?)\s*(\d{4})/);
  if (m && CARD_MAP[m[1]]) return CARD_MAP[m[1]];
  return 'Credit Card';
}

function writeCCEntries(ss, ccEntries) {
  // Find or create the CC tab
  let ccSheet = ss.getSheetByName('💳');
  if (!ccSheet) {
    ccSheet = ss.getSheetByName('Credit Card');
  }
  if (!ccSheet) {
    ccSheet = ss.getSheetByName('Credit Card Expense');
  }
  if (!ccSheet) {
    // Create the tab with headers
    ccSheet = ss.insertSheet('💳');
    ccSheet.appendRow(['Date', 'Expense', 'Amount', 'Card', 'Paid By', 'Status', 'Due Date']);
    Logger.log('📋 Created new "💳" sheet tab');
  }
  
  // Get existing CC entries for deduplication
  const existingData = ccSheet.getDataRange().getValues();
  const existingKeys = new Set();
  existingData.forEach(row => {
    if (row[0] && row[1] && row[2]) {
      const key = formatDate(row[0]) + '|' + String(row[1]).trim().toLowerCase() + '|' + String(row[2]);
      existingKeys.add(key);
    }
  });
  
  let ccAdded = 0;
  ccEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  ccEntries.forEach(entry => {
    const key = entry.date + '|' + entry.name.toLowerCase() + '|' + entry.amount;
    if (existingKeys.has(key)) {
      Logger.log('⏭ Skipping duplicate CC: ' + entry.name + ' ₹' + entry.amount);
      return;
    }
    
    const dateParts = entry.date.split('-');
    const dateStr = dateParts[2] + '/' + dateParts[1]; // DD/MM format
    
    // Detect which card from the email text
    const card = detectCard(entry.name);
    
    // Calculate due date (~20 days from transaction)
    const txnDate = new Date(entry.date);
    txnDate.setDate(txnDate.getDate() + 20);
    const dueStr = txnDate.getDate().toString().padStart(2, '0') + '/' + 
                   (txnDate.getMonth() + 1).toString().padStart(2, '0');
    
    ccSheet.appendRow([
      dateStr,          // Column A: Date (DD/MM)
      entry.name,       // Column B: Expense
      entry.amount,     // Column C: Amount
      card,             // Column D: Card name
      'Chirag',         // Column E: Paid By (default)
      'Not Paid',       // Column F: Status
      dueStr,           // Column G: Due Date (DD/MM)
    ]);
    
    existingKeys.add(key);
    ccAdded++;
  });
  
  Logger.log('✅ Added ' + ccAdded + ' CC transactions to 💳 tab');
}

// ── Email Parser ───────────────────────────────────────────
function parseTransactionEmail(message) {
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const fullText = subject + ' ' + body;
  const date = message.getDate();
  
  // Extract amount
  let amount = 0;
  for (const pattern of CONFIG.AMOUNT_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0) break;
    }
  }
  
  if (!amount || amount <= 0) return null;
  
  // Extract merchant name
  let name = 'Unknown';
  for (const pattern of CONFIG.MERCHANT_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      name = match[1].trim().substring(0, 50); // Limit length
      // Clean up the name
      name = name.replace(/[<>]/g, '').trim();
      if (name.length > 2) break;
    }
  }
  
  // If still unknown, try to get from subject
  if (name === 'Unknown' || name.length <= 2) {
    name = subject.replace(/^(Re:|Fwd:)\s*/i, '').substring(0, 50).trim();
  }
  
  // Detect mode
  let mode = 'UPI'; // Default
  for (const [modeName, pattern] of Object.entries(CONFIG.MODE_PATTERNS)) {
    if (pattern.test(fullText)) {
      mode = modeName;
      break;
    }
  }
  
  const isoDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  return {
    date: isoDate,
    name: name,
    amount: amount,
    mode: mode,
    category: categorise(name),
  };
}

// ── Categorization ─────────────────────────────────────────
function categorise(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CONFIG.CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Others';
}

// ── Helper Functions ───────────────────────────────────────
function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(dateVal);
}

function getMonthName(monthNum) {
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNum] || '';
}

// Store processed email IDs in Script Properties to avoid re-processing
function getProcessedIds() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty('processedEmailIds') || '[]';
  return new Set(JSON.parse(stored));
}

function saveProcessedIds(ids) {
  const props = PropertiesService.getScriptProperties();
  const arr = Array.from(ids);
  // Keep only last 5000 IDs to avoid property size limits
  const trimmed = arr.slice(-5000);
  props.setProperty('processedEmailIds', JSON.stringify(trimmed));
}

// ── Manual Trigger ─────────────────────────────────────────
// Run this function to do a one-time sync
function manualSync() {
  syncGmailToSheet();
  SpreadsheetApp.getUi().alert('Sync complete! Check the ' + CONFIG.EXPENSE_SHEET + ' tab.');
}

// ── Web App Endpoint ───────────────────────────────────────
// This allows Artha dashboard to trigger Gmail sync via HTTP GET.
// Deploy as Web App: Deploy → New Deployment → Web App
//   Execute as: Me | Who has access: Anyone
// Then copy the web app URL into Artha Settings.
function doGet(e) {
  try {
    syncGmailToSheet();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Gmail sync complete' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Menu ───────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('💰 Artha')
    .addItem('Sync Gmail Now', 'manualSync')
    .addItem('Setup Auto-Sync (every 15 min)', 'setupTrigger')
    .addItem('Remove Auto-Sync', 'removeTrigger')
    .addItem('Show Web App URL (for Artha)', 'showWebAppUrl')
    .addToUi();
}

function showWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  if (url) {
    SpreadsheetApp.getUi().alert(
      '📋 Your Artha Web App URL:\n\n' + url +
      '\n\nCopy and paste this into:\nArtha → Settings → Gmail Integration → Web App URL'
    );
  } else {
    SpreadsheetApp.getUi().alert(
      '⚠️ Not deployed yet!\n\n' +
      'Go to: Extensions → Apps Script → Deploy → New Deployment\n' +
      'Type: Web App\n' +
      'Execute as: Me\n' +
      'Who has access: Anyone\n\n' +
      'Then click "Show Web App URL" again.'
    );
  }
}

function setupTrigger() {
  removeTrigger();
  ScriptApp.newTrigger('syncGmailToSheet')
    .timeBased()
    .everyMinutes(15)
    .create();
  SpreadsheetApp.getUi().alert(
    '✅ Auto-sync enabled!\n\n' +
    'Gmail will be checked every 15 minutes.\n' +
    'New transactions will automatically appear in your "' + CONFIG.EXPENSE_SHEET + '" sheet.\n\n' +
    'Artha dashboard will pick them up on next sync.'
  );
}

function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncGmailToSheet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}


