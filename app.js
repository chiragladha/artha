/* ============================================================
   ARTHA — app.js  |  Complete App Logic
   ============================================================ */

// ── Data Store (localStorage) ──────────────────────────────
const DB = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem('artha_' + k)) ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem('artha_' + k, JSON.stringify(v)),
};

// ── State ──────────────────────────────────────────────────
let transactions = DB.get('transactions', []);
let ccTransactions = DB.get('cc_transactions', []);
let petrolEntries = DB.get('petrol', []);
let owedEntries = DB.get('owed', []);
let gmailConfig = DB.get('gmail_config', { connected: false });
let emailConfig = DB.get('email_config', {});
let keywords = DB.get('keywords', getDefaultKeywords());
let sortCol = 'date', sortDir = -1;

// ── Categories & Config ────────────────────────────────────
const CATEGORIES = ['Food', 'Travel', 'Investment', 'Rent', 'Tech', 'Experience', 'Lifestyle', 'Credit Card Spends', 'Others'];
const CAT_COLORS = {
  'Food': '#3b82f6', 'Travel': '#a855f7', 'Investment': '#10b981', 'Rent': '#f43f5e',
  'Tech': '#22c55e', 'Experience': '#f59e0b', 'Lifestyle': '#ec4899',
  'Credit Card Spends': '#06b6d4', 'Others': '#6b7280'
};
const CAT_EMOJI = {
  'Food': '🍔', 'Travel': '🚗', 'Investment': '📈', 'Rent': '🏠',
  'Tech': '💻', 'Experience': '🎭', 'Lifestyle': '✨', 'Credit Card Spends': '💳', 'Others': '📦'
};

function getDefaultKeywords() {
  return {
    'Food': ['lunch', 'dinner', 'breakfast', 'zomato', 'swiggy', 'blinkit', 'cafe', 'coffee', 'maggi', 'restaurant', 'chai', 'food', 'snack', 'pizza', 'biryani', 'thali', 'mess', 'hotel', 'juice', 'nathd'],
    'Travel': ['uber', 'ola', 'train', 'flight', 'bus', 'irctc', 'rapido', 'metro', 'cab', 'taxi', 'auto', 'petrol', 'fuel', 'rapido', 'parking', 'toll'],
    'Investment': ['sip', 'mutual fund', 'zerodha', 'groww', 'nifty', 'stocks', 'ppf', 'fd', 'nps', 'investment', 'mf', 'kuvera', 'coin', 'trading'],
    'Rent': ['rent', 'maintenance', 'society', 'electricity', 'water bill', 'gas', 'housing', 'flat', 'pg'],
    'Tech': ['spotify', 'netflix', 'apple', 'amazon prime', 'jio', 'airtel', 'software', 'recharge', 'internet', 'phone', 'mobile', 'hotstar', 'youtube', 'prime', 'adobe', 'canva'],
    'Experience': ['movie', 'concert', 'event', 'entertainment', 'game', 'match', 'show', 'theatre', 'park', 'trip', 'tour', 'experience'],
    'Lifestyle': ['shopping', 'clothes', 'gym', 'salon', 'razorpay', 'myntra', 'amazon', 'flipkart', 'beauty', 'haircut', 'spa', 'grooming', 'fashion'],
    'Credit Card Spends': ['credit card bill', 'cc bill', 'card payment', 'hdfc bill', 'icici bill', 'axis bill', 'sbi card'],
    'Others': []
  };
}

// ── Categorise ─────────────────────────────────────────────
function categorise(name) {
  if (!name) return 'Others';
  const n = name.toLowerCase();
  for (const cat of CATEGORIES.slice(0, -1)) {
    const kws = keywords[cat] || [];
    if (kws.some(k => n.includes(k.toLowerCase()))) return cat;
  }
  return 'Others';
}

// ── Helpers ────────────────────────────────────────────────
function fmtAmt(v) { return '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthKey(dateStr) { const d = new Date(dateStr); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(mk) { if (!mk) return ''; const [y, m] = mk.split('-'); return new Date(y, m - 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' }); }

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function catPill(cat) {
  const c = CAT_COLORS[cat] || '#6b7280';
  return `<span class="cat-pill" style="background:${c}22;color:${c};border:1px solid ${c}44">${CAT_EMOJI[cat] || ''} ${cat}</span>`;
}

function modePill(mode) {
  const cls = mode === 'UPI' ? 'upi' : mode === 'Credit Card' ? 'cc' : mode === 'Cash' ? 'cash' : 'manual';
  return `<span class="mode-pill mode-${cls}">${mode}</span>`;
}

function save() {
  DB.set('transactions', transactions);
  DB.set('cc_transactions', ccTransactions);
  DB.set('petrol', petrolEntries);
  DB.set('owed', owedEntries);
  DB.set('keywords', keywords);
}

// ── Navigation ─────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // Update mobile bottom nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  const pg = document.getElementById('page-' + page);
  const nav = document.getElementById('nav-' + page);
  if (pg) pg.classList.add('active');
  if (nav) nav.classList.add('active');
  if (page === 'dashboard') updateDashboard();
  if (page === 'analytics') updateAnalytics();
  if (page === 'creditcards') renderCCPage();
  if (page === 'petrol') renderPetrolPage();
  if (page === 'owed') renderOwedPage();
  if (page === 'settings') renderSettings();
  if (page === 'transactions') { renderTransactions(); updateFilterMonth(); }
  // Close mobile sidebar if open
  closeMobileSidebar();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

// ── Mobile Sidebar Toggle ──────────────────────────────────
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

// ── Month Picker ───────────────────────────────────────────
function buildMonthOptions(selectId, includeAll = false) {
  const months = [...new Set(transactions.map(t => monthKey(t.date)).filter(Boolean))].sort().reverse();
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  if (includeAll) sel.innerHTML = '<option value="">All Time</option>';
  months.forEach(mk => {
    const opt = document.createElement('option');
    opt.value = mk; opt.textContent = monthLabel(mk);
    sel.appendChild(opt);
  });
  if (!includeAll && months.length) sel.value = months[0];
}

// ── Dashboard ──────────────────────────────────────────────
let donutChart, trendChart;

function updateDashboard() {
  buildMonthOptions('dashboard-month-select');
  const sel = document.getElementById('dashboard-month-select');
  const mk = sel?.value || monthKey(todayISO());
  const monthTxns = transactions.filter(t => monthKey(t.date) === mk);

  // Last month
  const [y, m] = (mk || '2026-01').split('-').map(Number);
  const prevD = new Date(y, m - 2);
  const prevMk = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
  const prevTxns = transactions.filter(t => monthKey(t.date) === prevMk);

  const total = monthTxns.reduce((s, t) => s + t.amount, 0);
  const prevTotal = prevTxns.reduce((s, t) => s + t.amount, 0);
  const txnCount = monthTxns.length;
  const avgAmt = txnCount ? total / txnCount : 0;

  // Forecast
  const today = new Date(); const daysInMonth = new Date(y, m, 0).getDate();
  const daysPassed = mk === monthKey(todayISO()) ? today.getDate() : daysInMonth;
  const forecast = daysPassed ? Math.round(total / daysPassed * daysInMonth) : total;

  document.getElementById('stat-total').textContent = fmtAmt(total);
  document.getElementById('stat-txn-count').textContent = txnCount;
  document.getElementById('stat-avg').textContent = `Avg ${fmtAmt(avgAmt)}/txn`;
  document.getElementById('stat-forecast').textContent = fmtAmt(forecast);
  document.getElementById('dashboard-subtitle').textContent = monthLabel(mk);

  const pct = prevTotal ? Math.round((total - prevTotal) / prevTotal * 100) : 0;
  const chEl = document.getElementById('stat-total-change');
  chEl.textContent = (pct >= 0 ? '↑' : '↓') + Math.abs(pct) + '% vs last month';
  chEl.className = 'stat-change ' + (pct > 0 ? 'up' : 'down');

  // Largest category
  const byCat = {};
  monthTxns.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  document.getElementById('stat-largest-cat').textContent = sorted[0]?.[0] || '—';
  document.getElementById('stat-largest-amt').textContent = sorted[0] ? fmtAmt(sorted[0][1]) : '₹0';

  renderDonut(byCat);
  renderTrend();
  renderRecentTxns(monthTxns.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8));
  renderCCDues();
}

function renderDonut(byCat) {
  const labels = Object.keys(byCat);
  const data = Object.values(byCat);
  const colors = labels.map(l => CAT_COLORS[l] || '#6b7280');
  const total = data.reduce((s, v) => s + v, 0);
  document.getElementById('donut-total-amt').textContent = fmtAmt(total);

  const ctx = document.getElementById('donutChart').getContext('2d');
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: 'transparent', hoverOffset: 8 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: i => `${i.label}: ${fmtAmt(i.raw)} (${Math.round(i.raw / total * 100)}%)` } } }, animation: { animateRotate: true, duration: 600 } }
  });

  const legend = document.getElementById('donut-legend');
  legend.innerHTML = labels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l}: ${fmtAmt(data[i])}</div>`).join('');
}

function renderTrend() {
  const months = [...new Set(transactions.map(t => monthKey(t.date)).filter(Boolean))].sort().slice(-6);
  const totals = months.map(mk => transactions.filter(t => monthKey(t.date) === mk).reduce((s, t) => s + t.amount, 0));
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(monthLabel), datasets: [{
        label: 'Spent', data: totals,
        backgroundColor: 'rgba(124,106,245,0.25)', borderColor: '#7c6af5',
        borderWidth: 2, borderRadius: 6, hoverBackgroundColor: 'rgba(124,106,245,0.4)'
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', font: { size: 11 }, callback: v => fmtAmt(v) } } } }
  });
}

function renderRecentTxns(txns) {
  const el = document.getElementById('recent-txns');
  if (!txns.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px 0">No transactions this month</div>'; return; }
  el.innerHTML = txns.map(t => `
    <div class="recent-item">
      <div class="recent-icon" style="background:${CAT_COLORS[t.category] || '#6b7280'}22">${CAT_EMOJI[t.category] || '📦'}</div>
      <div class="recent-info"><div class="recent-name">${t.name}</div><div class="recent-meta">${fmtDate(t.date)} · ${t.mode}</div></div>
      <div class="recent-amount">${fmtAmt(t.amount)}</div>
    </div>`).join('');
}

function renderCCDues() {
  const el = document.getElementById('cc-dues-list');
  const unpaid = ccTransactions.filter(t => t.status === 'Not Paid' && t.dueDate).slice(0, 5);
  if (!unpaid.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px 0">No pending dues 🎉</div>'; return; }
  const today = new Date();
  el.innerHTML = unpaid.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(t => {
    const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
    const cls = diff < 0 ? 'overdue' : diff <= 7 ? 'soon' : '';
    const label = diff < 0 ? 'Overdue!' : diff === 0 ? 'Due today' : `Due in ${diff}d`;
    return `<div class="due-item ${cls}">
      <div><div class="due-name">${t.expense}</div><div class="due-meta">${t.card} · ${label}</div></div>
      <div class="due-amount">${fmtAmt(t.amount)}</div>
    </div>`;
  }).join('');
}

// ── Transactions ───────────────────────────────────────────
let filteredTxns = [];

function renderTransactions() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const cat = document.getElementById('filter-category')?.value || '';
  const mode = document.getElementById('filter-mode')?.value || '';
  const month = document.getElementById('filter-month')?.value || '';

  filteredTxns = transactions.filter(t => {
    if (search && !t.name.toLowerCase().includes(search)) return false;
    if (cat && t.category !== cat) return false;
    if (mode && t.mode !== mode) return false;
    if (month && monthKey(t.date) !== month) return false;
    return true;
  }).sort((a, b) => sortDir * (sortCol === 'amount' ? a.amount - b.amount : sortCol === 'name' ? a.name.localeCompare(b.name) : new Date(a.date) - new Date(b.date)));

  document.getElementById('txn-count-label').textContent = `${filteredTxns.length} transactions`;
  const tbody = document.getElementById('txn-tbody');
  const empty = document.getElementById('table-empty');
  const summaryBar = document.getElementById('txn-summary-bar');

  if (!filteredTxns.length) { tbody.innerHTML = ''; empty.style.display = 'block'; if (summaryBar) summaryBar.style.display = 'none'; return; }
  empty.style.display = 'none';

  // Show sum bar
  if (summaryBar) {
    const total = filteredTxns.reduce((s, t) => s + t.amount, 0);
    document.getElementById('txn-summary-text').textContent = `Showing ${filteredTxns.length} transaction${filteredTxns.length !== 1 ? 's' : ''}`;
    document.getElementById('txn-summary-total').textContent = `Total: ${fmtAmt(total)}`;
    summaryBar.style.display = 'flex';
  }

  tbody.innerHTML = filteredTxns.map(t => `
    <tr>
      <td class="txn-date">${fmtDate(t.date)}</td>
      <td class="txn-name">${t.name}${t.notes ? `<br><small style="color:var(--muted);font-size:11px">${t.notes}</small>` : ''}</td>
      <td class="txn-amount">${fmtAmt(t.amount)}</td>
      <td>${modePill(t.mode)}</td>
      <td>
        <select class="cat-select" onchange="updateCategory('${t.id}',this.value)">
          ${CATEGORIES.map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${CAT_EMOJI[c]} ${c}</option>`).join('')}
        </select>
      </td>
      <td><span class="source-pill">${t.source || 'manual'}</span></td>
      <td>
        <button class="btn-ghost btn-sm btn-icon" onclick="deleteTxn('${t.id}')" title="Delete">🗑</button>
      </td>
    </tr>`).join('');
}

function filterTransactions() { renderTransactions(); }

function updateFilterMonth() {
  buildMonthOptions('filter-month', true);
}

function clearFilters() {
  ['search-input', 'filter-category', 'filter-mode', 'filter-month'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderTransactions();
}

function sortBy(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = -1; }
  renderTransactions();
}

function updateCategory(id, cat) {
  const t = transactions.find(t => t.id === id);
  if (t) { t.category = cat; save(); showToast(`Moved to ${cat}`, 'success'); }
}

function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== id);
  save(); renderTransactions(); showToast('Deleted');
}

// ── Add Expense Modal ──────────────────────────────────────
function openAddModal() {
  document.getElementById('add-date').value = todayISO();
  document.getElementById('add-name').value = '';
  document.getElementById('add-amount').value = '';
  document.getElementById('add-notes').value = '';
  document.getElementById('add-category').value = '';
  document.getElementById('modal-add').classList.add('open');
}

function saveExpense(e) {
  e.preventDefault();
  const name = document.getElementById('add-name').value.trim();
  const catSel = document.getElementById('add-category').value;
  const txn = {
    id: uid(),
    date: document.getElementById('add-date').value,
    name,
    amount: parseFloat(document.getElementById('add-amount').value),
    mode: document.getElementById('add-mode').value,
    category: catSel || categorise(name),
    notes: document.getElementById('add-notes').value.trim(),
    source: 'manual',
  };
  transactions.unshift(txn);
  save();
  closeModal('modal-add');
  showToast('Expense added!', 'success');
  updateDashboard();
  if (document.getElementById('page-transactions').classList.contains('active')) renderTransactions();
}

// ── Analytics ──────────────────────────────────────────────
let monthlyBarChart, categoryTrendChart, forecastChart;

function updateAnalytics() {
  const year = parseInt(document.getElementById('analytics-year')?.value || new Date().getFullYear());
  const yearTxns = transactions.filter(t => t.date && t.date.startsWith(year));

  const ytd = yearTxns.reduce((s, t) => s + t.amount, 0);
  document.getElementById('ytd-spent').textContent = fmtAmt(ytd);

  // Monthly data
  const mKeys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const mTotals = mKeys.map(mk => yearTxns.filter(t => monthKey(t.date) === mk).reduce((s, t) => s + t.amount, 0));
  const filledMonths = mTotals.filter(v => v > 0);
  const avg = filledMonths.length ? filledMonths.reduce((s, v) => s + v, 0) / filledMonths.length : 0;
  document.getElementById('monthly-avg').textContent = fmtAmt(avg);

  const projAnnual = avg * 12;
  document.getElementById('projected-annual').textContent = fmtAmt(projAnnual);

  const minIdx = mTotals.indexOf(Math.min(...filledMonths));
  document.getElementById('best-month').textContent = filledMonths.length ? new Date(year, minIdx).toLocaleString('en-IN', { month: 'short' }) : '—';
  document.getElementById('best-month-amt').textContent = filledMonths.length ? fmtAmt(Math.min(...filledMonths)) : '';

  renderMonthlyBar(mKeys, mTotals, year);
  renderCategoryTrend(year);
  renderMoMTable(mKeys, mTotals);
  renderTopMerchants(yearTxns);
  renderForecast(mKeys, mTotals, avg, year);
}

function renderMonthlyBar(mKeys, mTotals, year) {
  const ctx = document.getElementById('monthlyBarChart').getContext('2d');
  if (monthlyBarChart) monthlyBarChart.destroy();
  monthlyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: mKeys.map(mk => new Date(mk + '-01').toLocaleString('en-IN', { month: 'short' })), datasets: [{
        label: 'Monthly Spend', data: mTotals,
        backgroundColor: mTotals.map((_, i) => `hsla(${250 + i * 8},70%,65%,0.4)`),
        borderColor: mTotals.map((_, i) => `hsl(${250 + i * 8},70%,65%)`),
        borderWidth: 2, borderRadius: 8
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', callback: v => fmtAmt(v) } } } }
  });
}

function renderCategoryTrend(year) {
  const mKeys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const ctx = document.getElementById('categoryTrendChart').getContext('2d');
  if (categoryTrendChart) categoryTrendChart.destroy();
  const datasets = CATEGORIES.slice(0, -1).map(cat => ({
    label: cat,
    data: mKeys.map(mk => transactions.filter(t => monthKey(t.date) === mk && t.category === cat).reduce((s, t) => s + t.amount, 0)),
    borderColor: CAT_COLORS[cat], backgroundColor: CAT_COLORS[cat] + '22',
    borderWidth: 2, tension: 0.4, pointRadius: 3, fill: false
  })).filter(ds => ds.data.some(v => v > 0));
  categoryTrendChart = new Chart(ctx, {
    type: 'line',
    data: { labels: mKeys.map(mk => new Date(mk + '-01').toLocaleString('en-IN', { month: 'short' })), datasets },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#888aaa', boxWidth: 12, font: { size: 11 } } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', callback: v => fmtAmt(v) } } } }
  });
}

function renderMoMTable(mKeys, mTotals) {
  const now = new Date(); const curIdx = now.getMonth();
  const rows = CATEGORIES.map(cat => {
    const cur = transactions.filter(t => monthKey(t.date) === mKeys[curIdx] && t.category === cat).reduce((s, t) => s + t.amount, 0);
    const prev = curIdx > 0 ? transactions.filter(t => monthKey(t.date) === mKeys[curIdx - 1] && t.category === cat).reduce((s, t) => s + t.amount, 0) : 0;
    const pct = prev ? Math.round((cur - prev) / prev * 100) : (cur ? 100 : 0);
    if (!cur && !prev) return null;
    const cls = pct > 0 ? 'change-up' : pct < 0 ? 'change-down' : 'change-neutral';
    return `<tr><td>${catPill(cat)}</td><td>${fmtAmt(cur)}</td><td>${fmtAmt(prev)}</td><td class="${cls}">${pct > 0 ? '+' : ''}${pct}%</td></tr>`;
  }).filter(Boolean).join('');
  document.getElementById('mom-table-container').innerHTML = `
    <table class="txn-table mom-table">
      <thead><tr><th>Category</th><th>This Month</th><th>Last Month</th><th>Change</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:20px">No data yet</td></tr>'}</tbody>
    </table>`;
}

function renderTopMerchants(yearTxns) {
  const map = {};
  yearTxns.forEach(t => { map[t.name] = (map[t.name] || 0) + t.amount; });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;
  document.getElementById('top-merchants-list').innerHTML = sorted.map(([name, amt], i) => `
    <div class="merchant-item">
      <div class="merchant-rank">#${i + 1}</div>
      <div class="merchant-bar-wrap">
        <div class="merchant-name">${name}</div>
        <div class="merchant-bar-bg"><div class="merchant-bar" style="width:${Math.round(amt / max * 100)}%"></div></div>
      </div>
      <div class="merchant-amt">${fmtAmt(amt)}</div>
    </div>`).join('') || '<div style="color:var(--muted);padding:20px;text-align:center">No data</div>';
}

function renderForecast(mKeys, mTotals, avg, year) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (forecastChart) forecastChart.destroy();
  const actualLabels = mKeys.map(mk => new Date(mk + '-01').toLocaleString('en-IN', { month: 'short' }));
  const actual = mTotals;
  const forecast = mTotals.map((v, i) => v > 0 ? null : Math.round(avg));
  const upper = mTotals.map((v, i) => v > 0 ? null : Math.round(avg * 1.15));
  const lower = mTotals.map((v, i) => v > 0 ? null : Math.round(avg * 0.85));
  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: actualLabels, datasets: [
        { label: 'Actual', data: actual, borderColor: '#7c6af5', backgroundColor: 'rgba(124,106,245,0.15)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4 },
        { label: 'Forecast', data: forecast, borderColor: '#f59e0b', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 4], tension: 0.4, pointRadius: 3 },
        { label: 'Upper bound', data: upper, borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, tension: 0.4, fill: '+1', pointRadius: 0 },
        { label: 'Lower bound', data: lower, borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'transparent', borderWidth: 1, tension: 0.4, fill: false, pointRadius: 0 },
      ]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#888aaa', boxWidth: 12, font: { size: 11 }, filter: i => i.datasetIndex < 2 } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', callback: v => fmtAmt(v) } } } }
  });
}

// ── Credit Cards ───────────────────────────────────────────
function renderCCPage() {
  const isPaid = t => t.status && t.status.toLowerCase().includes('paid') && !t.status.toLowerCase().includes('not');
  const isUnpaid = t => !isPaid(t);
  const unpaid = ccTransactions.filter(isUnpaid);
  const paid = ccTransactions.filter(isPaid);
  const today = new Date();
  const dueSoon = unpaid.filter(t => { const d = new Date(t.dueDate); return d && !isNaN(d) && (d - today) / 86400000 <= 7; }).reduce((s, t) => s + t.amount, 0);
  document.getElementById('cc-total-unpaid').textContent = fmtAmt(unpaid.reduce((s, t) => s + t.amount, 0));
  document.getElementById('cc-due-soon').textContent = fmtAmt(dueSoon);
  document.getElementById('cc-paid-ytd').textContent = fmtAmt(paid.reduce((s, t) => s + t.amount, 0));
  const cards = [...new Set(ccTransactions.map(t => t.card).filter(Boolean))];
  document.getElementById('cc-active-cards').textContent = cards.length;
  renderCCTable();
}

function renderCCTable() {
  const filter = document.getElementById('cc-filter-status')?.value || '';
  const isPaidFn = t => t.status && t.status.toLowerCase().includes('paid') && !t.status.toLowerCase().includes('not');
  let list = ccTransactions;
  if (filter === 'Paid') list = ccTransactions.filter(isPaidFn);
  else if (filter === 'Not Paid' || filter === 'Unpaid') list = ccTransactions.filter(t => !isPaidFn(t));
  const today = new Date();
  document.getElementById('cc-tbody').innerHTML = list.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)).map(t => {
    const diff = t.dueDate ? Math.ceil((new Date(t.dueDate) - today) / 86400000) : null;
    const paid = isPaidFn(t);
    const statusCls = paid ? 'status-paid' : diff < 0 ? 'status-overdue' : 'status-unpaid';
    const statusLabel = paid ? '✓ Paid' : diff === null ? 'Unpaid' : diff < 0 ? `Overdue ${Math.abs(diff)}d` : `Due in ${diff}d`;
    return `<tr>
      <td class="txn-date">${fmtDate(t.date)}</td>
      <td class="txn-name">${t.expense}</td>
      <td class="txn-amount">${fmtAmt(t.amount)}</td>
      <td><span class="source-pill">${t.card || '—'}</span></td>
      <td class="txn-date">${fmtDate(t.dueDate)}</td>
      <td><span class="${statusCls}">${statusLabel}</span></td>
      <td>
        ${!paid ? `<button class="btn-ghost btn-sm" onclick="markCCPaid('${t.id}')">Mark Paid</button>` : ''}
        <button class="btn-ghost btn-sm btn-icon" onclick="deleteCC('${t.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">No CC transactions</td></tr>';
}

function openAddCCModal() {
  document.getElementById('cc-add-date').value = todayISO();
  document.getElementById('modal-add-cc').classList.add('open');
}

function saveCCExpense(e) {
  e.preventDefault();
  const entry = {
    id: uid(), date: document.getElementById('cc-add-date').value,
    expense: document.getElementById('cc-add-name').value.trim(),
    amount: parseFloat(document.getElementById('cc-add-amount').value),
    card: document.getElementById('cc-add-card').value.trim(),
    dueDate: document.getElementById('cc-add-due').value,
    status: document.getElementById('cc-add-status').value,
  };
  ccTransactions.unshift(entry); save();
  closeModal('modal-add-cc'); showToast('CC expense added!', 'success'); renderCCPage();
}

function markCCPaid(id) {
  const t = ccTransactions.find(t => t.id === id);
  if (t) { t.status = 'Paid'; t.paymentDate = todayISO(); save(); renderCCPage(); showToast('Marked as paid ✓', 'success'); }
}

function deleteCC(id) {
  if (!confirm('Delete?')) return;
  ccTransactions = ccTransactions.filter(t => t.id !== id); save(); renderCCPage();
}

// ── Petrol ─────────────────────────────────────────────────
let mileageChart, fuelRateChart;

function renderPetrolPage() {
  if (!petrolEntries.length) { document.getElementById('petrol-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">No fuel entries yet</td></tr>'; return; }
  const total = petrolEntries.reduce((s, e) => s + e.amount, 0);
  const mileages = petrolEntries.filter(e => e.mileage).map(e => e.mileage);
  const rates = petrolEntries.filter(e => e.rate).map(e => e.rate);
  const kms = petrolEntries.filter(e => e.kmRun).reduce((s, e) => s + e.kmRun, 0);
  document.getElementById('petrol-total').textContent = fmtAmt(total);
  document.getElementById('petrol-mileage').textContent = mileages.length ? (mileages.reduce((a, b) => a + b) / mileages.length).toFixed(1) + ' km/L' : '—';
  document.getElementById('petrol-rate').textContent = rates.length ? '₹' + (rates.reduce((a, b) => a + b) / rates.length).toFixed(2) + '/L' : '—';
  document.getElementById('petrol-kms').textContent = kms ? kms.toFixed(0) + ' km' : '—';

  const sorted = [...petrolEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  document.getElementById('petrol-tbody').innerHTML = sorted.map(e => `
    <tr><td class="txn-date">${fmtDate(e.date)}</td><td class="txn-amount">${fmtAmt(e.amount)}</td>
    <td>${e.rate ? '₹' + e.rate + '/L' : '—'}</td><td>${e.litres ? e.litres + 'L' : '—'}</td>
    <td>${e.kmRun ? e.kmRun + ' km' : '—'}</td><td>${e.mileage ? e.mileage + ' km/L' : '—'}</td></tr>`).join('');

  renderMileageChart(sorted);
  renderFuelRateChart(sorted);
}

function renderMileageChart(sorted) {
  const ctx = document.getElementById('mileageChart').getContext('2d');
  if (mileageChart) mileageChart.destroy();
  const data = sorted.filter(e => e.mileage);
  mileageChart = new Chart(ctx, { type: 'line', data: { labels: data.map(e => fmtDate(e.date)), datasets: [{ label: 'Mileage (km/L)', data: data.map(e => e.mileage), borderColor: '#22d97e', backgroundColor: 'rgba(34,217,126,0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', maxTicksLimit: 8 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', callback: v => v + ' km/L' } } } } });
}

function renderFuelRateChart(sorted) {
  const ctx = document.getElementById('fuelRateChart').getContext('2d');
  if (fuelRateChart) fuelRateChart.destroy();
  const data = sorted.filter(e => e.rate);
  fuelRateChart = new Chart(ctx, { type: 'line', data: { labels: data.map(e => fmtDate(e.date)), datasets: [{ label: 'Rate (₹/L)', data: data.map(e => e.rate), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', maxTicksLimit: 8 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888aaa', callback: v => '₹' + v } } } } });
}

function openAddPetrolModal() {
  document.getElementById('p-date').value = todayISO();
  document.getElementById('modal-add-petrol').classList.add('open');
}

function savePetrolEntry(e) {
  e.preventDefault();
  const start = parseFloat(document.getElementById('p-start').value) || 0;
  const end = parseFloat(document.getElementById('p-end').value) || 0;
  const litres = parseFloat(document.getElementById('p-litres').value) || 0;
  const kmRun = end > start ? end - start : 0;
  const mileage = litres && kmRun ? parseFloat((kmRun / litres).toFixed(2)) : null;
  petrolEntries.unshift({
    id: uid(), date: document.getElementById('p-date').value,
    amount: parseFloat(document.getElementById('p-amount').value),
    rate: parseFloat(document.getElementById('p-rate').value) || null,
    litres: litres || null, meterStart: start || null, meterEnd: end || null,
    kmRun: kmRun || null, mileage, mode: document.getElementById('p-mode').value
  });
  save(); closeModal('modal-add-petrol'); showToast('Fuel entry saved!', 'success'); renderPetrolPage();
}

// ── Money Owed ─────────────────────────────────────────────
function renderOwedPage() {
  const pending = owedEntries.filter(e => e.status === 'pending');
  const recovered = owedEntries.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalOwed = pending.reduce((s, e) => s + e.amount, 0);
  const reminders = owedEntries.reduce((s, e) => s + (e.reminderCount || 0), 0);
  document.getElementById('owed-total').textContent = fmtAmt(totalOwed);
  document.getElementById('owed-people').textContent = [...new Set(pending.map(e => e.name))].length;
  document.getElementById('owed-recovered').textContent = fmtAmt(recovered);
  document.getElementById('owed-reminders').textContent = reminders;
  document.getElementById('owed-subtitle').textContent = pending.length ? `${pending.length} pending entries · ${fmtAmt(totalOwed)} to recover` : 'All settled! 🎉';

  document.getElementById('owed-cards').innerHTML = owedEntries.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map(e => `
    <div class="owed-card ${e.status === 'paid' ? 'paid' : ''}">
      <div class="owed-card-header">
        <div class="owed-avatar">${e.name[0].toUpperCase()}</div>
        <div><div class="owed-person">${e.name}</div><div class="owed-date">${fmtDate(e.date)}</div></div>
      </div>
      <div class="owed-amount-big">${fmtAmt(e.amount)}</div>
      <div class="owed-desc">${e.description}</div>
      ${e.email ? `<div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">📧 ${e.email}</div>` : ''}
      <div class="owed-actions">
        ${e.status === 'pending' ? `
          <button class="btn-secondary btn-sm" onclick="sendReminder('${e.id}')">📧 Send Reminder</button>
          <button class="btn-primary btn-sm" onclick="markOwedPaid('${e.id}')">✓ Settled</button>
        `: `<span style="color:var(--success);font-size:13px;font-weight:600">✓ Settled</span>`}
        <button class="btn-ghost btn-sm btn-icon" onclick="deleteOwed('${e.id}')">🗑</button>
      </div>
      ${e.reminderCount ? `<div style="font-size:11px;color:var(--muted);margin-top:8px">Reminders sent: ${e.reminderCount}</div>` : ''}
    </div>`).join('') || '<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:40px;margin-bottom:12px">🤝</div><p>No entries yet</p></div>';
}

function openAddOwedModal() {
  document.getElementById('owed-date').value = todayISO();
  ['owed-name', 'owed-amount', 'owed-email', 'owed-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('modal-add-owed').classList.add('open');
}

function saveOwedEntry(e) {
  e.preventDefault();
  owedEntries.unshift({
    id: uid(), name: document.getElementById('owed-name').value.trim(),
    amount: parseFloat(document.getElementById('owed-amount').value),
    email: document.getElementById('owed-email').value.trim(),
    description: document.getElementById('owed-desc').value.trim(),
    date: document.getElementById('owed-date').value,
    status: 'pending', reminderCount: 0
  });
  save(); closeModal('modal-add-owed'); showToast('Entry added!', 'success'); renderOwedPage();
}

function markOwedPaid(id) {
  const e = owedEntries.find(e => e.id === id);
  if (e) { e.status = 'paid'; save(); renderOwedPage(); showToast('Marked as settled ✓', 'success'); }
}

function deleteOwed(id) {
  if (!confirm('Delete?')) return;
  owedEntries = owedEntries.filter(e => e.id !== id); save(); renderOwedPage();
}

function sendReminder(id) {
  const e = owedEntries.find(e => e.id === id);
  if (!e) return;
  if (!e.email) { showToast('No email address saved for this person', 'error'); return; }
  const subject = `Friendly Reminder — ₹${e.amount.toLocaleString('en-IN')} owed`;
  const body = `Hi ${e.name},\n\nHope you're doing well! Just a friendly reminder that you owe me ₹${e.amount.toLocaleString('en-IN')} for "${e.description}".\n\nPlease transfer at your earliest convenience. Thank you!\n\nBest regards`;
  const mailtoLink = `mailto:${e.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoLink);
  e.reminderCount = (e.reminderCount || 0) + 1;
  e.lastReminder = todayISO();
  save(); renderOwedPage(); showToast('Reminder email opened!', 'success');
}

// ── Settings ───────────────────────────────────────────────
function renderSettings() {
  const cfg = DB.get('email_config', {});
  if (cfg.senderEmail) document.getElementById('sender-email').value = cfg.senderEmail;

  // Keyword editor
  const editor = document.getElementById('keyword-editor');
  editor.innerHTML = CATEGORIES.map(cat => `
    <div class="keyword-row">
      <span class="keyword-cat-label">${catPill(cat)}</span>
      <input class="keyword-input" id="kw-${cat.replace(/ /g, '_')}" value="${(keywords[cat] || []).join(', ')}" placeholder="comma separated keywords..." />
    </div>`).join('');

  // Gmail status
  const gCfg = DB.get('gmail_config', {});
  if (gCfg.connected) {
    document.getElementById('gmail-status').innerHTML = '<span class="status-dot connected"></span> Connected';
  }
}

function saveKeywords() {
  CATEGORIES.forEach(cat => {
    const el = document.getElementById('kw-' + cat.replace(/ /g, '_'));
    if (el) keywords[cat] = el.value.split(',').map(s => s.trim()).filter(Boolean);
  });
  save(); showToast('Keywords saved!', 'success');
}

function saveEmailConfig() {
  const cfg = { senderEmail: document.getElementById('sender-email').value.trim(), appPassword: document.getElementById('email-app-password').value.trim() };
  DB.set('email_config', cfg); showToast('Email config saved!', 'success');
}

function setupGmail() {
  document.getElementById('gmail-guide').style.display = document.getElementById('gmail-guide').style.display === 'block' ? 'none' : 'block';
}

function saveGmailCreds() {
  const clientId = document.getElementById('gmail-client-id').value.trim();
  const clientSecret = document.getElementById('gmail-client-secret').value.trim();
  if (!clientId || !clientSecret) { showToast('Please fill in both fields', 'error'); return; }
  const cfg = { clientId, clientSecret, connected: false };
  DB.set('gmail_config', cfg);
  showToast('Credentials saved! OAuth flow requires a backend server. See README for setup.', 'success');
}

// ── Gmail Sync (Demo) ──────────────────────────────────────
function syncGmail() {
  const gCfg = DB.get('gmail_config', {});
  if (!gCfg.connected) {
    showToast('Gmail not connected. Go to Settings to connect.', 'error');
    navigateTo('settings'); return;
  }
  const overlay = document.getElementById('sync-overlay');
  overlay.style.display = 'flex';
  let step = 0;
  const steps = ['Fetching UPI transaction emails...', 'Parsing email bodies...', 'Auto-categorising transactions...', 'Checking for duplicates...', 'Saving to database...', 'Sync complete!'];
  const tick = () => {
    document.getElementById('sync-progress').textContent = steps[step];
    step++;
    if (step < steps.length) setTimeout(tick, 800); else setTimeout(() => { overlay.style.display = 'none'; showToast('Sync complete!', 'success'); updateDashboard(); }, 800);
  };
  tick();
}

// ── CSV Parser (RFC 4180 — handles commas inside quoted fields) ──
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim());
    return row;
  });
}

// ── CSV Import (file upload) ───────────────────────────────
function openImportModal() { document.getElementById('modal-import').classList.add('open'); }

function handleCSVImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const rows = parseCSV(ev.target.result);
    let imported = 0, dupes = 0;
    rows.forEach(row => {
      const rawDate = row['date'] || row['date '] || '';
      const isoDate = parseIndianDate(rawDate);
      const name = row['name'] || row['description'] || 'Unknown';
      const rawAmt = row['amount'] || row['amount '] || '0';
      const amount = parseFloat(rawAmt.replace(/[,₹\s"]/g, ''));
      if (!amount || isNaN(amount)) return;
      const mode = row['mode'] || 'Manual';
      const existing = transactions.find(t => t.date === isoDate && t.name === name && t.amount === amount);
      if (existing) { dupes++; return; }
      transactions.unshift({
        id: uid(), date: isoDate || todayISO(), name, amount,
        mode: mode.replace(/^"|"$/g, ''),
        category: categorise(name), source: 'csv_import'
      });
      imported++;
    });
    save();
    document.getElementById('import-result').innerHTML =
      `<div style="padding:12px;background:var(--success-bg);border:1px solid var(--success);border-radius:8px;color:var(--success);font-size:13px">✓ Imported ${imported} transactions (${dupes} duplicates skipped)</div>`;
    showToast(`Imported ${imported} transactions!`, 'success');
    setTimeout(() => closeModal('modal-import'), 1500);
    updateDashboard(); renderTransactions(); updateFilterMonth(); buildMonthOptions('dashboard-month-select');
  };
  reader.readAsText(file);
}

function parseIndianDate(str) {
  if (!str) return null;
  str = str.replace(/^"|"$/g, '').trim();
  // DD/MM or DD/MM/YY or DD/MM/YYYY
  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (m1) {
    const day = m1[1].padStart(2, '0'), month = m1[2].padStart(2, '0');
    let year = m1[3] ? (m1[3].length === 2 ? '20' + m1[3] : m1[3]) : new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }
  // Try standard date
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

// ── Google Sheets Direct Sync ──────────────────────────────
const SHEET_ID = '1L22_p2ZHMusfzzcXJUfSRVBnrUiA0tCTt9qcwbzJmYg';

let _jsonpCounter = 0;

// Returns raw Google Viz table: { cols: [...], rows: [...] }
function fetchSheetRaw(sheetName) {
  return new Promise((resolve, reject) => {
    const cb = '_artha' + (++_jsonpCounter);
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${cb}&sheet=${encodeURIComponent(sheetName)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Timeout: "${sheetName}"`)); }, 15000);

    function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }

    window[cb] = resp => {
      cleanup();
      if (!resp?.table) { reject(new Error(`No data: "${sheetName}"`)); return; }
      resolve(resp.table);
    };
    script.onerror = () => { cleanup(); reject(new Error(`Fetch fail: "${sheetName}"`)); };
    script.src = url;
    document.head.appendChild(script);
  });
}

// Extract cell value as string — handles Google Date(y,m,d) and numbers
function cellVal(cell) {
  if (!cell) return '';
  // Prefer formatted value for dates, else raw value
  if (cell.v != null) return String(cell.v);
  if (cell.f) return cell.f;
  return '';
}

// Parse Google Visualization date format: "Date(2026,0,1)" → "2026-01-01"
function parseGoogleDate(v) {
  if (!v) return null;
  const str = String(v);
  const m = str.match(/Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/);
  if (m) {
    const year = m[1];
    const month = String(parseInt(m[2]) + 1).padStart(2, '0'); // 0-indexed month
    const day = m[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Fallback: try parseIndianDate
  return parseIndianDate(str);
}

// Try fetching a sheet with multiple possible tab names
async function tryFetchSheet(names) {
  for (const name of names) {
    try {
      return await fetchSheetRaw(name);
    } catch (e) {
      console.warn(`Tab "${name}" not found, trying next...`);
    }
  }
  throw new Error(`None of these tabs found: ${names.join(', ')}`);
}

async function importFromSheets() {
  const statusEl = document.getElementById('sheets-import-status');
  const showStatus = msg => {
    statusEl.innerHTML = `<div style="padding:12px;background:var(--accent-glow);border:1px solid var(--accent);border-radius:8px;color:var(--accent-light);font-size:13px">⏳ ${msg}</div>`;
  };
  showStatus('Connecting to Google Sheets...');

  let totalImported = 0, errors = [];

  // ── FULL REPLACE: clear all sheet-sourced data before re-importing ──
  // This ensures deleted rows in the sheet disappear in Artha,
  // and CC transactions can't accumulate duplicates.
  transactions = transactions.filter(t => !t.source || t.source === 'manual' || t.source === 'gmail');
  ccTransactions = ccTransactions.filter(t => !t.source || t.source === 'manual');
  save(); // persist cleared state

  try {
    // ── Import expense year tabs: 2024, 2025, 2026 ──
    for (const year of ['2024', '2025', '2026']) {
      showStatus(`Importing ${year} expenses...`);
      try {
        // Try various possible tab name formats
        const table = await tryFetchSheet([year, `${year} `, ` ${year}`, `2 ${year}`]);
        let imported = 0;

        // Column layout from your sheet:
        // A = "Month - YYYY" (skip)
        // B = Date (DD/MM or Google Date format)
        // C = Name
        // D = Amount
        // E = Mode (UPI, Cash, etc.)
        // First row (index 0) is the header row, skip it

        table.rows.forEach((row, rowIdx) => {
          if (!row.c || row.c.length < 4) return;

          // Get raw cell values
          const colB = row.c[1]; // Date
          const colC = row.c[2]; // Name
          const colD = row.c[3]; // Amount
          const colE = row.c[4]; // Mode

          const name = cellVal(colC).trim();
          if (!name) return;
          // Skip header row
          if (name.toLowerCase() === 'name' || name.toLowerCase() === 'name ') return;

          // Parse amount — could be number or string
          let amount = 0;
          if (colD) {
            const rawAmt = colD.v != null ? colD.v : colD.f;
            amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[,₹\s]/g, ''));
          }
          if (!amount || isNaN(amount)) return;

          // Parse date
          let isoDate = null;
          if (colB) {
            const rawDate = colB.v != null ? String(colB.v) : (colB.f || '');
            isoDate = parseGoogleDate(rawDate);
            // If date has no year or wrong year, force the tab year
            if (isoDate && !isoDate.startsWith(year)) {
              isoDate = year + isoDate.slice(4);
            }
          }
          if (!isoDate) return;

          // Mode
          const mode = cellVal(colE).trim() || 'UPI';

          // Skip CC-mode rows — they belong in the CC tab, not expense tabs
          if (mode.toLowerCase().includes('credit card')) return;

          transactions.unshift({
            id: uid(), date: isoDate, name, amount,
            mode: mode,
            category: categorise(name),
            source: `sheets_${year}`
          });
          imported++;
        });
        totalImported += imported;
        console.log(`✅ ${year}: ${imported} imported`);
      } catch (err) {
        console.warn(`⚠️ Could not import ${year}:`, err.message);
        errors.push(`${year}: ${err.message}`);
      }
    }

    // ── Import Credit Card tab ──
    showStatus('Importing Credit Card data...');
    try {
      const table = await tryFetchSheet(['💳', 'Credit Card', 'CREDIT CARD EXPENSE', 'Credit Card Expense', 'CC', 'Credit Cards']);
      let ccImported = 0;
      console.log('CC tab rows:', table.rows.length, 'cols:', table.cols?.length);

      // Auto-detect column offset: CC sheet may have empty first column
      let ccOffset = 0;
      const firstRow = table.rows[0];
      if (firstRow?.c) {
        const c0 = firstRow.c[0];
        const c1 = firstRow.c[1];
        // If first cell is empty/null and second cell has a value → offset by 1
        if ((!c0 || c0.v == null || String(c0.v).trim() === '') && c1 && c1.v != null) {
          ccOffset = 1;
        }
        // Also check if any cell says 'Date' as column header
        for (let i = 0; i < Math.min(firstRow.c.length, 15); i++) {
          if (cellVal(firstRow.c[i]).trim().toLowerCase() === 'date') {
            ccOffset = i;
            break;
          }
        }
      }
      console.log(`CC offset: ${ccOffset}`);

      // If first row has header 'Date', skip from row 1; otherwise start from 0
      const startIdx = (firstRow?.c && cellVal(firstRow.c[ccOffset]).trim().toLowerCase() === 'date') ? 1 : 0;

      for (let rowIdx = startIdx; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];
        if (!row.c || row.c.length < 3) continue;

        const vals = (row.c || []).map(c => cellVal(c).trim());

        // Skip title/header rows
        const joinedLower = vals.join(' ').toLowerCase();
        if (joinedLower.includes('credit card') || joinedLower.includes('expense') && joinedLower.includes('date') && joinedLower.includes('amount')) continue;
        if (vals.every(v => !v)) continue;

        // Read data using offset
        const o = ccOffset;
        const rawDate = row.c[o] ? String(row.c[o].v || row.c[o].f || '') : '';
        const expense = vals[o + 1] || '';
        const rawAmt = row.c[o + 2] ? (row.c[o + 2].v != null ? row.c[o + 2].v : row.c[o + 2].f) : '';
        const card = vals[o + 3] || '';
        const paidBy = vals[o + 4] || '';
        const status = vals[o + 5] || 'Not Paid';
        const rawDueDate = row.c[o + 6] ? String(row.c[o + 6].v || row.c[o + 6].f || '') : '';

        const amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[,₹\s]/g, ''));
        if (!expense || !amount || isNaN(amount)) continue;

        const isoDate = parseGoogleDate(rawDate);
        const isoDueDate = parseGoogleDate(rawDueDate);

        // Better Deduplication Logic
        // We only check if the transaction exists in the CURRENT batch of CC transactions.
        // Because we cleared ccTransactions before import of sheets data (line 913),
        // we won't have cross-sync duplicates. But we prevent duplicates native to the sheet itself.
        const existing = ccTransactions.find(t =>
          t.expense === expense &&
          t.amount === amount &&
          t.date === isoDate
        );
        if (existing) continue;

        ccTransactions.unshift({
          id: uid(), date: isoDate, expense, amount, card,
          paidBy, status: status || 'Not Paid',
          dueDate: isoDueDate, source: 'sheets_cc'
        });
        ccImported++;
      }
      totalImported += ccImported;
      console.log(`✅ Credit Card: ${ccImported} imported`);
    } catch (err) {
      console.warn('⚠️ Could not import Credit Card:', err.message);
      errors.push(`Credit Card: ${err.message}`);
    }

    // ── Import Petrol tab ──
    showStatus('Importing Petrol data...');
    try {
      const table = await tryFetchSheet(['Petrol', 'Petro', 'Fuel']);
      let pImported = 0;

      table.rows.forEach(row => {
        if (!row.c || row.c.length < 3) return;

        const vals = (row.c || []).map(c => cellVal(c).trim());
        // Skip header
        if (vals.some(v => v.toLowerCase().includes('date') || v.toLowerCase().includes('amount paid'))) return;

        const rawDate = row.c[0] ? String(row.c[0].v || row.c[0].f || '') : '';
        const rawAmt = row.c[1] ? (row.c[1].v != null ? row.c[1].v : row.c[1].f) : '';
        const rawRate = row.c[2] ? (row.c[2].v != null ? row.c[2].v : row.c[2].f) : '';
        const rawLtrs = row.c[3] ? (row.c[3].v != null ? row.c[3].v : row.c[3].f) : '';

        const amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[,₹\s]/g, ''));
        if (!amount || isNaN(amount)) return;
        const isoDate = parseGoogleDate(rawDate);

        const existing = petrolEntries.find(e => e.date === isoDate && e.amount === amount);
        if (existing) return;

        const rate = typeof rawRate === 'number' ? rawRate : (parseFloat(String(rawRate).replace(/[₹\s]/g, '')) || null);
        const litres = typeof rawLtrs === 'number' ? rawLtrs : (parseFloat(String(rawLtrs)) || null);

        // If more columns exist for meter readings
        const start = row.c[4] ? (typeof row.c[4].v === 'number' ? row.c[4].v : parseFloat(String(row.c[4].v)) || null) : null;
        const end = row.c[5] ? (typeof row.c[5].v === 'number' ? row.c[5].v : parseFloat(String(row.c[5].v)) || null) : null;
        const kmRun = row.c[6] ? (typeof row.c[6].v === 'number' ? row.c[6].v : null) : (end && start ? end - start : null);
        const mileage = row.c[7] ? (typeof row.c[7].v === 'number' ? row.c[7].v : null) : (litres && kmRun ? parseFloat((kmRun / litres).toFixed(2)) : null);
        const pMode = vals[8] || 'UPI';

        petrolEntries.unshift({
          id: uid(), date: isoDate, amount, rate, litres,
          meterStart: start, meterEnd: end,
          kmRun, mileage, mode: pMode, source: 'sheets_petrol'
        });
        pImported++;
      });
      totalImported += pImported;
      console.log(`✅ Petrol: ${pImported} imported`);
    } catch (err) {
      console.warn('⚠️ Could not import Petrol:', err.message);
      errors.push(`Petrol: ${err.message}`);
    }

    save();
    const errNote = errors.length ? `<br><small style="opacity:0.7">⚠️ Skipped tabs: ${errors.join('; ')}</small>` : '';
    statusEl.innerHTML = `<div style="padding:12px;background:var(--success-bg);border:1px solid var(--success);border-radius:8px;color:var(--success);font-size:13px">✅ Imported ${totalImported} entries (${totalDupes} duplicates skipped) from Google Sheets!${errNote}</div>`;
    showToast(`Imported ${totalImported} entries from Google Sheets!`, 'success');
    DB.set('last_sync', new Date().toISOString());
    document.getElementById('sync-status').textContent = 'Last sync: ' + new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    updateDashboard();
    buildMonthOptions('dashboard-month-select');
    updateFilterMonth();
  } catch (err) {
    statusEl.innerHTML = `<div style="padding:12px;background:var(--danger-bg);border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-size:13px">❌ Error: ${err.message}. Make sure the sheet is shared as "Anyone with the link can view".</div>`;
    showToast('Import failed — check sheet share settings', 'error');
  }
}

// ── Clear & Re-sync ────────────────────────────────────────
function clearAndResync() {
  if (!confirm('This will delete ALL existing data and re-import from Google Sheets. Continue?')) return;
  transactions = [];
  ccTransactions = [];
  petrolEntries = [];
  save();
  importFromSheets();
}

// ── Manual Sync (from sidebar button) ──────────────────────
async function manualSync() {
  const btn = document.getElementById('btn-sync-sheets');
  const statusEl = document.getElementById('sync-status');
  if (btn.disabled) return;

  const spinIcon = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>`;
  const staticIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>`;

  btn.disabled = true;

  // Step 1: Trigger Gmail Apps Script (if web app URL is stored in settings)
  const gmailWebAppUrl = localStorage.getItem('artha_gmail_webapp_url');
  if (gmailWebAppUrl && gmailWebAppUrl.startsWith('https://')) {
    btn.innerHTML = `${spinIcon} Syncing Gmail...`;
    statusEl.textContent = 'Fetching new emails from Gmail...';
    try {
      // Fire the Gmail sync — no-cors because Apps Script returns a redirect
      await fetch(gmailWebAppUrl, { mode: 'no-cors' });
      // Wait 8 seconds for Apps Script to finish writing to sheet
      await new Promise(r => setTimeout(r, 8000));
    } catch (e) {
      console.warn('Gmail web app call failed (may still have run):', e.message);
    }
  }

  // Step 2: Pull latest data from Google Sheets
  btn.innerHTML = `${spinIcon} Fetching Sheets...`;
  statusEl.textContent = 'Pulling latest data from Google Sheets...';
  try {
    await importFromSheets();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    statusEl.textContent = `Last sync: ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`;
    localStorage.setItem('artha_last_sync', statusEl.textContent);
    showToast(gmailWebAppUrl ? '✅ Gmail + Sheets synced!' : '✅ Sheets synced!', 'success');
  } catch (err) {
    showToast('❌ Sync failed: ' + err.message, 'error');
    statusEl.textContent = 'Sync failed';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${staticIcon} Sync Now`;
  }
}


// ── Modals ─────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }

// ── Seed demo data ─────────────────────────────────────────
function seedDemoData() {
  if (transactions.length) return; // Don't overwrite real data
  const now = new Date();
  const seed = (name, amount, cat, mode, daysAgo) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo);
    return { id: uid(), date: d.toISOString().slice(0, 10), name, amount, mode, category: cat, source: 'demo' };
  };
  transactions = [
    seed('Rent', 10350, 'Rent', 'UPI', 28), seed('Spotify', 59, 'Tech', 'UPI', 25),
    seed('SIP', 2000, 'Investment', 'UPI', 24), seed('Uber', 76, 'Travel', 'UPI', 23),
    seed('Lunch', 199, 'Food', 'UPI', 22), seed('Shopping', 583, 'Lifestyle', 'UPI', 20),
    seed('Breakfast', 140, 'Food', 'UPI', 19), seed('Train', 3200, 'Travel', 'UPI', 17),
    seed('Netflix', 199, 'Tech', 'UPI', 15), seed('Dinner', 310, 'Food', 'UPI', 14),
    seed('Gym', 1200, 'Lifestyle', 'UPI', 13), seed('Uber', 228, 'Travel', 'UPI', 12),
    seed('Lunch', 309, 'Food', 'UPI', 11), seed('Coffee', 300, 'Food', 'UPI', 10),
    seed('Maggi', 110, 'Food', 'UPI', 9), seed('HDFC Loan', 2276, 'Credit Card Spends', 'UPI', 8),
    seed('Movie', 620, 'Experience', 'UPI', 6), seed('Dinner', 130, 'Food', 'UPI', 5),
    seed('Uber', 200, 'Travel', 'UPI', 4), seed('Lunch', 100, 'Food', 'UPI', 3),
    // Last month
    seed('Rent', 10350, 'Rent', 'UPI', 58), seed('Spotify', 59, 'Tech', 'UPI', 55),
    seed('SIP', 2000, 'Investment', 'UPI', 54), seed('Lunch', 350, 'Food', 'UPI', 51),
    seed('Shopping', 1200, 'Lifestyle', 'UPI', 50), seed('Train', 1500, 'Travel', 'UPI', 48),
    seed('Dinner', 450, 'Food', 'UPI', 45), seed('Coffee', 250, 'Food', 'UPI', 42),
    seed('Movie', 800, 'Experience', 'UPI', 40), seed('Uber', 320, 'Travel', 'UPI', 38),
  ];
  ccTransactions = [
    { id: uid(), date: '2026-02-18', expense: 'Insurance_EMI5', amount: 920, card: 'Millennia', status: 'Not Paid', dueDate: '2026-04-03' },
    { id: uid(), date: '2026-02-10', expense: 'Amazon Annual', amount: 1499, card: 'Millennia', status: 'Not Paid', dueDate: '2026-03-10' },
    { id: uid(), date: '2026-01-15', expense: 'Phone Bill', amount: 699, card: 'Millennia', status: 'Paid', paymentDate: '2026-02-05' },
  ];
  petrolEntries = [
    { id: uid(), date: '2026-01-15', amount: 402, rate: 95.05, litres: 4.23, meterStart: 6.4, meterEnd: 120.7, kmRun: 114.3, mileage: 27, mode: 'Credit Card' },
    { id: uid(), date: '2026-02-01', amount: 500, rate: 95.30, litres: 5.25, meterStart: 120.7, meterEnd: 268.2, kmRun: 147.5, mileage: 28.1, mode: 'UPI' },
    { id: uid(), date: '2026-02-20', amount: 450, rate: 95.30, litres: 4.72, meterStart: 268.2, meterEnd: 392.0, kmRun: 123.8, mileage: 26.2, mode: 'Credit Card' },
  ];
  owedEntries = [
    { id: uid(), name: 'Akki', amount: 680, email: '', description: 'Dinner split at The Table', date: '2026-01-03', status: 'pending', reminderCount: 0 },
    { id: uid(), name: 'Pavit', amount: 500, email: '', description: 'Movie tickets for Dune', date: '2026-01-22', status: 'pending', reminderCount: 1 },
  ];
  save();
}

// ── Init ───────────────────────────────────────────────────
function init() {
  seedDemoData();
  transactions = DB.get('transactions', []);
  ccTransactions = DB.get('cc_transactions', []);
  petrolEntries = DB.get('petrol', []);
  owedEntries = DB.get('owed', []);
  keywords = DB.get('keywords', getDefaultKeywords());

  // Set today's date on date inputs
  document.querySelectorAll('input[type="date"]').forEach(el => { if (!el.value) el.value = todayISO(); });

  // Populate month selects
  buildMonthOptions('dashboard-month-select');
  updateFilterMonth();

  updateDashboard();

  // Update sync status
  const ls = DB.get('last_sync', '');
  if (ls) document.getElementById('sync-status').textContent = 'Last sync: ' + new Date(ls).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Chart.js global defaults
  Chart.defaults.color = '#888aaa';
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.plugins.tooltip.backgroundColor = '#1a1a2e';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleColor = '#f0f0f8';
  Chart.defaults.plugins.tooltip.bodyColor = '#888aaa';

  // Auto-sync from Google Sheets on load (with 30-min cooldown)
  const lastSync = DB.get('last_sync', '');
  const cooldownMs = 30 * 60 * 1000; // 30 minutes
  const sinceLastSync = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
  if (sinceLastSync > cooldownMs) {
    setTimeout(() => {
      manualSync();
    }, 2000); // Delay slightly so UI loads first
  }
}

document.addEventListener('DOMContentLoaded', init);
