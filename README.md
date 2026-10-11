# TidyUps Cleaning Operations Portal (app.tidyupscleaning.com)

Internal Operations, Field Service Scheduling, & Billing Dispatch Portal for TidyUps Cleaning Service Inc.

## 🌐 Production Domains & Jobber Integration
- **Primary Domain**: [https://app.tidyupscleaning.com](https://app.tidyupscleaning.com)
- **Jobber Developer Redirect URI**: `https://app.tidyupscleaning.com/api/jobber/oauth/callback`
- **Project Store**: `data/tidyups_cleaning_store.json`
- **Operations Hotline**: `1-833-TIDYUPS (833-843-9877)`
- **Registrar / DNS**: Hostinger (CNAME `app` -> Google Cloud Run)

## 🚀 Getting Started
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev

# 4. Production build
npm run build
npm start
```

## 📦 Features
- TidyUps Cleaning Service crew scheduling & dispatch
- Dedicated Jobber ledger synchronization (Quotes, Invoices, Work Orders)
- Cleaner mobile portal with turn-by-turn routing and job status updates
- Standalone persistent operations database separate from Dispatch Genie
