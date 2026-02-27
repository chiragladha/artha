// Artha App - Personal Expense Intelligence
let transactions = [];
let monthData = {};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    loadTransactions();
    setupEventListeners();
    updateDashboard();
}

function loadTransactions() {
    const saved = localStorage.getItem('artha_transactions');
    if (saved) {
        transactions = JSON.parse(saved);
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById('page-' + pageId).classList.add('active');
    document.getElementById('nav-' + pageId).classList.add('active');
}

function updateDashboard() {
    // Analytics calculations...
}

window.syncGmail = function() {
    console.log('Syncing starting...');
    document.getElementById('sync-status').innerText = 'Syncing...';
    // Logic for calling script
}
