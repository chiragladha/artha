# Artha — Making meaning of your wealth

A premium personal expense dashboard that auto-categorises transactions, tracks credit cards, forecasts spending, and reminds people who owe you money.

## How to Open

Just **double-click `index.html`** or drag it into any browser. No installation, no server.

---

## Features

| Feature | Status |
|---|---|
| Dashboard with category donut chart | ✅ |
| Monthly trend bar chart | ✅ |
| Transactions table with search & filter | ✅ |
| Inline category override | ✅ |
| Manual expense entry | ✅ |
| CSV import (from Google Sheets export) | ✅ |
| Analytics with MoM comparison | ✅ |
| Annual spend forecast | ✅ |
| Top merchants list | ✅ |
| Credit card dues tracking | ✅ |
| Petrol tracker with mileage charts | ✅ |
| Money owed tracker | ✅ |
| One-click reminder emailer | ✅ |
| Auto-categorisation engine | ✅ |
| Gmail sync (needs OAuth setup) | ⚙️ Setup required |

---

## Importing Your Google Sheets Data

1. Open your spreadsheet → File → Download → CSV for each tab (2024, 2025, 2026)
2. In Artha, go to **Transactions** → **Import CSV**
3. Upload the CSV — it auto-maps Date, Name, Amount, Mode columns
4. Transactions are auto-categorised and de-duplicated

---

## Gmail Auto-Sync Setup

To enable automatic email reading, you need a Google Cloud OAuth app:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → New project
2. Enable **Gmail API** and **Google Sheets API**
3. Create **OAuth 2.0 Client ID** (Web Application)
4. In Artha → Settings → Connect Gmail → paste Client ID & Secret

> **Note:** Full Gmail API access requires a Node.js backend server. The current app is a fully working frontend with CSV import. Gmail sync will be the next enhancement.

---

## Email Reminder Setup (Money Owed)

1. Go to Settings → Reminder Email Config
2. Enter your Gmail address
3. Generate an App Password at [myaccount.google.com](https://myaccount.google.com) → Security → App Passwords
4. Click "Send Reminder" on any owed entry to open a pre-filled email

---

## Data Storage

All data is stored **locally** in your browser's `localStorage`. Nothing is sent to any server. To back up, use **Import/Export CSV**.

---

## Categories

| Category | Examples |
|---|---|
| 🍔 Food | Lunch, Zomato, Coffee, Swiggy |
| 🚗 Travel | Uber, IRCTC, Petrol |
| 📈 Investment | SIP, Zerodha, Groww |
| 🏠 Rent | Rent, Maintenance |
| 💻 Tech | Spotify, Netflix, Recharge |
| 🎭 Experience | Movie, Concert, Events |
| ✨ Lifestyle | Shopping, Gym, Salon |
| 💳 Credit Card Spends | CC Bill, Card Payment |
| 📦 Others | Everything else |

> Customise keywords in **Settings → Category Keywords**
