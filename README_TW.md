# Deep Asset Ledger System (深度資產賬本系統)

[🇨🇳 简体中文](./README.md) | [🇺🇸 English](./README_EN.md)

專注於獨立股票時間軸追蹤與高級成本基數計算的專業資產管理系統。

## ✨ 核心特性
- **獨立時間軸**: 單獨追蹤每隻股票的歷史記錄與交易脈絡。
- **FIFO 成本計算**: 使用先進先出（FIFO）邏輯即時計算已實現盈虧，精準稅務核算。
- **可視化儀表盤**: 交互式圖表與摘要統計，資產狀況一目了然。
- **現代技術棧**: 採用 React 19 (Vite) + FastAPI + Tailwind CSS 構建。
- **安全優先**: 動態 Token 簽名驗證與 RSA 加密通信。

## 🛠️ 專案結構
```text
/backend         # FastAPI Python 後端
  /routers       # API 路由端點
  /services      # 金融邏輯 (FIFO 核心演算法等)
  models.py      # 數據庫模型定義
  main.py        # 程式入口
  .env.example   # 環境變數示例
/frontend        # React 前端
  /src/pages     # 頁面組件 (儀表盤, 股票列表等)
  /src/components # UI 組件庫
```

## 🚀 快速開始

### 環境要求
- Python 3.9+
- Node.js 16+

### 1. 啟動後端 (Backend)
```bash
cd backend
# 1. 建立虛擬環境 (推薦)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 2. 安裝依賴
pip install -r requirements.txt

# 3. 配置環境變數
cp .env.example .env
# (可選) 修改 .env 中的配置

# 4. 啟動服務
uvicorn main:app --reload
# 服務運行於 http://localhost:8000
# API 文檔: http://localhost:8000/docs
```

### 2. 啟動前端 (Frontend)
```bash
cd frontend
npm install
npm run dev
# 應用運行於 http://localhost:5173
```

## 📖 使用說明
1.打開瀏覽器訪問前端地址 (默認 http://localhost:5173)。
2. 註冊並登錄賬戶。
3. 進入 "股票 (Stocks)" 頁面添加新的關注標的 (如 AAPL)。
4. 記錄買入/賣出交易，系統將自動計算 FIFO 成本與盈虧。

## 🔐 部署配置 (Zeabur / Docker)
專案已對雲原生環境進行優化。
- **環境變數**: 生產環境請務必設置 `TOKEN_SECRET` 和 `ALLOWED_ORIGINS`。
- **持久化**: 確保數據庫文件 (`ledger.db`) 所在的目錄掛載了持久化存儲。
