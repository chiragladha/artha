function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Artha Sync')
      .addItem('Sync Gmail Transactions', 'syncGmailTransactions')
      .addToUi();
}

function syncGmailTransactions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var threads = GmailApp.search('label:bank-alerts after:2025/01/01');
  // Logic to parse threads and append to sheet
}
