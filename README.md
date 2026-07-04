# 📊 LedgerPulse: A Data-Driven Inventory & Sales Management Platform for Nigerian SMEs

[![Platform](https://img.shields.io/badge/Platform-PWA%20%7C%20Mobile--First-blue)](https://ledgerpulse.netlify.app/)
[![Academic Purpose](https://img.shields.io/badge/Purpose-Final%20Year%20Project-orange)]()

**LedgerPulse** is a modern, high-end, mobile-first Progressive Web App (PWA) engineered specifically to address operational inefficiencies within Nigerian Small and Medium-sized Enterprises (SMEs). Developed as an undergraduate Final Year Project in Information Technology, the platform serves as a direct, data-driven replacement for traditional, error-prone paper ledger books.

---

## 🌐 Production Deployment

🚀 **Live Application URL:** [https://ledgerpulse.netlify.app/](https://ledgerpulse.netlify.app/)

---

## 📷 Screenshots

### Dashboard (Light Mode)
![LedgerPulse Light Mode](assets/images/lightmode.jpg)

### Dashboard (Dark Mode)
![LedgerPulse Dark Mode](assets/images/darkmode.jpg)

---

## 📝 Problem Statement & Core Objective

### The Problem
The vast majority of retail SMEs in Nigeria rely heavily on physical paper ledgers or fragmented desktop setups to record daily sales and track stock levels. This traditional methodology leads to severe vulnerabilities:
- **Data Loss & Degradation:** Physical theft, water, or fire damage completely wipes business records.
- **Zero Real-Time Visibility:** Merchants cannot instantly know which items are running out of stock without manual auditing.
- **Calculation Errors:** Manual tallying compromises financial accuracy, leading to unrecorded losses.
- **High Infrastructure Costs:** Existing enterprise resource planning (ERP) systems demand heavy hardware budgets and reliable high-speed internet, which are impractical for localized storefronts.

### The Objective
The core objective of **LedgerPulse** is to transition merchants from paper logs into dynamic business intelligence by providing an accessible, zero-cost, installable PWA that runs entirely on client-side infrastructure and maintains **100% offline functionality** under unstable network environments.

---

## ✨ System Features

### 🖥️ Enterprise Business Intelligence
- **🔐 Secure Native Authentication:** Client-side administrative access restriction with dynamic cryptographic password strength evaluation.
- **📦 Data-Driven Inventory Control:** Full CRUD operations for products, automated stock categorization, and historical tracking.
- **📉 Intelligent Low-Stock Monitoring:** Predictive alerting framework that maps local stock metrics against dynamic threshold limits (`reorderLevel`) to prevent stockouts.
- **💰 High-Performance POS Interface:** Rapid point-of-sale checkout stream that dynamically hooks into real-time transactional databases.
- **📊 Real-Time Financial Analytics:** Graphic generation using `Chart.js` to illustrate sales velocity, high-margin products, and revenue trajectories.

### 📱 Advanced PWA Capabilities
- **📡 Service Worker Caching:** Intercepts network requests to store asset configurations natively, granting instant loading speeds.
- **⚡ Offline First Architecture:** Business continuity remains uncompromised—users can view data, check levels, and operate the platform with zero active network connections.
- **📱 Responsive Minimalist UI:** Premium, modern UI tailored closely to standard Nigerian retail smartphone display aspect ratios.
- **🌙 Universal Theme Engine:** Persistent Light and Dark UI modes configured via a CSS Custom Properties system to reduce device battery strain.

---

## 🛠️ Technical Stack & Architecture

- **Front-End Design Architecture:** Vanilla HTML5, Semantic CSS3, and Bootstrap 5.3.2 UI framework.
- **Application Logic Engine:** Modern Modular ES6+ JavaScript (Vanilla).
- **Client-Side Storage Engine:** Synchronous JSON-serialized `LocalStorage API` namespaces, implementing custom service adapters (`Storage`, `Utils`, `App`) to simulate standard database paradigms.
- **Data Visualization:** `Chart.js` for dynamic vector analytics rendering.
- **PWA Specifications:** W3C Web App Manifest compliance and custom asynchronous Service Worker caching networks.

---

## 📂 Project Directory Topology

```text
LedgerPulse/
│
├── assets/
│   ├── css/          # Premium minimalist global stylesheets & variable declarations
│   ├── js/           # Centralized core logic files (app.js, core modules)
│   └── icons/        # Standardized Android & iOS Web App manifest assets
│
├── pages/
│   ├── dashboard.html # Executive operational KPIs and stock warnings
│   ├── inventory.html # Real-time stock counts and adjustment entry tools
│   ├── products.html  # Base item parameters and management panels
│   ├── pos.html       # Digital storefront transaction terminal
│   ├── reports.html   # Sales analysis charts and generation streams
│   ├── sales.html     # Historical receipts and auditing logs
│   └── settings.html  # Corporate parameters and data threshold configurations
│
├── index.html        # Main app entry-point (Smart setup wizard & authentication)
├── offline.html      # Network fallback view for cached page exceptions
├── manifest.json     # PWA operational descriptor and installation properties
├── sw.js             # Service Worker cache control script
└── README.md         # Academic and system deployment documentation
