# Deep Asset Ledger System - System Design Document

## 1. System Overview
The Deep Asset Ledger System is a financial tracking application designed to manage single-stock investment timelines. It allows users to track their trading history, calculate real-time costs using specific accounting methods (FIFO, Weighted Average), and visualize performance over time.

## 2. Architecture
The system follows a standard client-server architecture:
- **Frontend**: React (Vite) + Tailwind CSS + Recharts (for visualization).
- **Backend**: FastAPI (Python) for API handling and financial logic.
- **Database**: SQL Database (SQLite for dev, PostgreSQL for prod) managed via SQLAlchemy.
- **Data Source**: External APIs (mocked for initial phase, extensible for Tushare/Yahoo Finance).

## 3. Data Model Design (ER Schema)

### 3.1. Entity: Stock (股票基础信息)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer (PK) | Unique ID |
| symbol | String | Stock Code (e.g., 600519.SH) |
| name | String | Stock Name |
| market | String | Market (SH/SZ/HK/US) |
| created_at | DateTime | Creation Timestamp |

### 3.2. Entity: Transaction (交易记录)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer (PK) | Unique ID |
| stock_id | Integer (FK) | Related Stock |
| type | String | BUY, SELL, DIVIDEND_CASH, DIVIDEND_STOCK |
| date | Date | Transaction Date |
| price | Decimal | Unit Price |
| quantity | Decimal | Quantity (positive for buy, negative for sell usually, but stored absolute with usage logic) |
| fees | Decimal | Commission, Taxes, etc. |
| notes | String | Optional notes |

### 3.3. Entity: DailyQuote (每日行情)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer (PK) | Unique ID |
| stock_id | Integer (FK) | Related Stock |
| date | Date | Quote Date |
| open | Decimal | Open Price |
| close | Decimal | Close Price |
| high | Decimal | High Price |
| low | Decimal | Low Price |
| volume | BigInt | Trading Volume |

### 3.4. Entity: AssetSnapshot (市值与盈亏快照)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer (PK) | Unique ID |
| stock_id | Integer (FK) | Related Stock |
| date | Date | Snapshot Date |
| holdings_qty | Decimal | Quantity held at end of day |
| cost_basis | Decimal | Average cost per share (based on selected method) |
| total_cost | Decimal | Total invested cost |
| market_value | Decimal | holdings * close_price |
| daily_pnl | Decimal | Daily Profit/Loss |
| total_pnl | Decimal | Cumulative P/L |

## 4. Logical Algorithms

### 4.1 Cost Basis Calculation (FIFO)
The system maintains a queue of "Tax Lots" for each stock:
1. **Buy**: Push {date, price, qty} to queue.
2. **Sell**: Pop from queue front until sell qty is satisfied.
   - Realized P/L = (Sell Price - Lot Price) * Matched Qty.
3. **Dividend**: Adjust Cash or Cost Basis depending on type.

## 5. API Interface Design

### 5.1 Stocks
- `GET /api/stocks`: List all tracked stocks.
- `POST /api/stocks`: Add new stock.
- `GET /api/stocks/{id}`: Get details.

### 5.2 Transactions
- `GET /api/stocks/{id}/transactions`: Get history.
- `POST /api/transactions`: Record trade.

### 5.3 Analysis
- `GET /api/stocks/{id}/timeline`: Get full timeline (quotes + snapshots).
- `GET /api/stocks/{id}/pnl`: Get P/L analysis.
- `GET /api/portfolio/summary`: Global summary.

## 6. Implementation Plan
1. **Backend**: Setup FastAPI, define SQLModel classes.
2. **Logic**: Implement FIFO Tax Lot engine.
3. **Frontend**: Create Dashboard, Stock List, Detail View with Charts.
