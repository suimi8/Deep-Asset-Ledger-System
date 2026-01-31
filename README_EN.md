# Deep Asset Ledger System

[🇨🇳 简体中文](./README.md) | [🇨🇳 繁體中文](./README_TW.md)

A professional asset management system designed for tracking independent stock timelines with advanced cost basis calculation.

## ✨ Features
- **Independent Timelines**: Track each stock's history and transaction flow separately.
- **FIFO Cost Basis**: Real-time calculation of realized P&L using First-In-First-Out logic for accurate tax accounting.
- **Visual Dashboard**: Interactive charts and summary statistics for instant asset overview.
- **Modern Stack**: Built with React 19 (Vite) + FastAPI + Tailwind CSS.
- **Security First**: Dynamic Token signature verification and RSA encrypted communication.

## 🛠️ Project Structure
```text
/backend         # FastAPI Python Backend
  /routers       # API Endpoints
  /services      # Financial Logic (FIFO core algorithm, etc.)
  models.py      # Database Schema
  main.py        # Entry Point
  .env.example   # Environment Variables Example
/frontend        # React Frontend
  /src/pages     # Page Components (Dashboard, StockList, etc.)
  /src/components # UI Components
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+

### 1. Start Backend
```bash
cd backend
# 1. Create Virtual Environment (Recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 2. Install Dependencies
pip install -r requirements.txt

# 3. Configure Environment Variables
cp .env.example .env
# (Optional) Modify configuration in .env

# 4. Start Service
uvicorn main:app --reload
# Service runs on http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

## 📖 Usage
1. Open the app in your browser (default http://localhost:5173).
2. Register and login to your account.
3. Go to "Stocks" page and add a new ticker (e.g., AAPL).
4. Record Buy/Sell transactions, the system will automatically calculate FIFO cost and P&L.

## 🔐 Deployment (Zeabur / Docker)
The project is optimized for cloud-native environments.
- **Environment Variables**: Make sure to set `TOKEN_SECRET` and `ALLOWED_ORIGINS` in production.
- **Persistence**: Ensure the directory containing the database file (`ledger.db`) uses persistent storage.
