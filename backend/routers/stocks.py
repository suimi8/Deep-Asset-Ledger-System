from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List
from database import get_session, engine
from models import Stock, Transaction, DailyQuote, AssetSnapshot
from services.ledger import FifoLedger
from services.analytics import PortfolioAnalyzer
from datetime import date
from services.market_data import fetch_latest_quote
from services.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.post("", response_model=Stock)
def create_stock(stock: Stock, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stock.user_id = current_user.id
    session.add(stock)
    session.commit()
    session.refresh(stock)
    
    # 异步获取初始行情信息，防止网络延迟导致前端超时
    background_tasks.add_task(sync_initial_quote, stock.id, stock.symbol, stock.market)
    
    return stock

@router.get("")
def read_stocks(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stocks = session.exec(select(Stock).where(Stock.user_id == current_user.id)).all()
    results = []
    for stock in stocks:
        txs = session.exec(select(Transaction).where(Transaction.stock_id == stock.id)).all()
        quotes = session.exec(select(DailyQuote).where(DailyQuote.stock_id == stock.id).order_by(DailyQuote.date)).all()
        
        analyzer = PortfolioAnalyzer(txs, quotes)
        snapshot = analyzer.get_snapshot()
        timeline = analyzer.get_timeline()
        
        # Get sparkline data (last 7 days of total_pnl)
        sparkline = [round(entry["total_pnl"], 2) for entry in timeline[-7:]] if timeline else []
        
        stock_dict = stock.dict()
        stock_dict["holdings"] = round(snapshot.get("holdings_qty", 0), 4)
        stock_dict["total_pnl"] = round(snapshot.get("total_pnl", 0), 2)
        stock_dict["pnl_percent"] = round(snapshot.get("pnl_percent", 0), 2)
        stock_dict["sparkline"] = sparkline
        results.append(stock_dict)
    return results

@router.get("/{stock_id}", response_model=Stock)
def read_stock(stock_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.get("/search/query")
def search_stock(q: str):
    """Search for stocks in CN/HK/US markets"""
    from services.market_data import ak, yf
    results = []
    
    # 1. Try A-shares (CN)
    try:
        # 使用更轻量的获取所有股票列表的函数或缓存
        df = ak.stock_info_a_code_name()
        mask = df['code'].str.contains(q) | df['name'].str.contains(q)
        cn_results = df[mask].head(10)
        for _, row in cn_results.iterrows():
            results.append({
                "symbol": row['code'],
                "name": row['name'],
                "market": "CN"
            })
    except Exception as e:
        print(f"⚠️ A-share search failed: {e}")

    # 2. Try HK/US via yfinance
    # Only try yfinance if q is likely a ticker (alphanumeric)
    is_ascii = all(ord(c) < 128 for c in q)
    if is_ascii and len(results) < 10:
        # This is a basic ticker lookup. For real name search, yfinance is limited.
        potential_tickers = [q.upper()]
        if "." not in q:
            # Common suffixes
            potential_tickers.append(f"{q.upper()}.HK")
            potential_tickers.append(f"{q.upper()}.US")
            
        for ticker_sym in potential_tickers:
            try:
                # 避免对这种基础搜索产生过多的 404 错误日志
                stock = yf.Ticker(ticker_sym)
                # 访问 fast_info 而不是 info，因为它更快且更不容易触发全量摘要错误
                if stock.fast_info.get('exchange'):
                    market = "HK" if ticker_sym.endswith(".HK") else "US"
                    results.append({
                        "symbol": ticker_sym.replace(".HK", "").replace(".US", ""),
                        "name": ticker_sym.split('.')[0], # Simple fallback
                        "market": market
                    })
            except: continue
            
    return results[:10]

@router.put("/{stock_id}", response_model=Stock)
def update_stock(stock_id: int, stock: Stock, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not db_stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    stock_data = stock.dict(exclude_unset=True)
    for key, value in stock_data.items():
        setattr(db_stock, key, value)
    
    session.add(db_stock)
    session.commit()
    session.refresh(db_stock)
    return db_stock

@router.delete("/{stock_id}")
def delete_stock(stock_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    try:
        # 1. 删除交易记录
        tx_statement = select(Transaction).where(Transaction.stock_id == stock_id)
        for tx in session.exec(tx_statement).all():
            session.delete(tx)
            
        # 2. 删除行情记录
        quote_statement = select(DailyQuote).where(DailyQuote.stock_id == stock_id)
        for quote in session.exec(quote_statement).all():
            session.delete(quote)
            
        # 3. 删除资产快照记录
        snapshot_statement = select(AssetSnapshot).where(AssetSnapshot.stock_id == stock_id)
        for snapshot in session.exec(snapshot_statement).all():
            session.delete(snapshot)

        # 4. 最后删除股票本身
        session.delete(stock)
        session.commit()
        return {"ok": True, "message": f"Stock {stock.symbol} and all related data deleted successfully"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete stock data: {str(e)}")

@router.post("/{stock_id}/transactions", response_model=Transaction)
def create_transaction(stock_id: int, transaction: Transaction, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Verify ownership
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    transaction.stock_id = stock_id
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    
    # 自动获取或录入该日期的行情价，确保分析数据完整
    stock = session.get(Stock, stock_id)
    if stock:
        # 检查是否已存在该日期的行情
        existing_quote = session.exec(
            select(DailyQuote).where(
                DailyQuote.stock_id == stock_id,
                DailyQuote.date == transaction.date
            )
        ).first()
        
        # 如果是平仓交易，用户已经输入了收盘价，直接存入行情表，确保图表能显示该日期
        if transaction.type == 'CLOSE_POSITION':
            if existing_quote:
                # 更新已有行情，确保所有必填字段都有值
                existing_quote.close = transaction.price
                existing_quote.is_manual = True
                if existing_quote.open is None: existing_quote.open = transaction.price
                if existing_quote.high is None: existing_quote.high = transaction.price
                if existing_quote.low is None: existing_quote.low = transaction.price
                if existing_quote.volume is None: existing_quote.volume = 0
                session.add(existing_quote)
            else:
                new_quote = DailyQuote(
                    stock_id=stock_id,
                    date=transaction.date,
                    open=transaction.price,
                    high=transaction.price,
                    low=transaction.price,
                    close=transaction.price,
                    volume=0,
                    is_manual=True
                )
                session.add(new_quote)
            session.commit()
            print(f"✅ Auto-recorded quote for CLOSE_POSITION on {transaction.date}")
        elif not existing_quote:
            print(f"🔍 Auto: Triggering quote fetch for {stock.symbol} on {transaction.date}")
            background_tasks.add_task(sync_initial_quote, stock_id, stock.symbol, stock.market, transaction.date)
            
    return transaction

def sync_initial_quote(stock_id: int, symbol: str, market: str, specific_date: str = None):
    """Background task to sync quote (current or specific date)"""
    from services.market_data import fetch_latest_quote, fetch_historical_quote, fetch_and_save_history
    
    try:
        # 首先尝试获取最近 7 天的历史数据，确保图表不为空
        fetch_and_save_history(stock_id, symbol, market, days=7)
        
        # 针对特定日期（如果有）补充数据
        if specific_date:
            fetch_historical_quote(symbol, market, specific_date)
            # 注意：fetch_historical_quote 返回数据但不保存，这里可以改进，但 history 已经覆盖了大部分情况
            
    except Exception as e:
        print(f"⚠️ Auto: Failed to sync quote for {symbol}: {e}")

@router.get("/{stock_id}/transactions", response_model=List[Transaction])
def read_transactions(stock_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Verify ownership
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    statement = select(Transaction).where(Transaction.stock_id == stock_id).order_by(Transaction.date.desc(), Transaction.id.desc())
    transactions = session.exec(statement).all()
    return transactions

@router.get("/{stock_id}/analysis")
def get_stock_analysis(stock_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    transactions = session.exec(select(Transaction).where(Transaction.stock_id == stock_id)).all()
    quotes_list = session.exec(select(DailyQuote).where(DailyQuote.stock_id == stock_id).order_by(DailyQuote.date)).all()
    
    # 转换为字典以便按日期去重/快速查找
    quote_map = { (q.date if isinstance(q.date, str) else q.date.strftime('%Y-%m-%d')): q for q in quotes_list }
    
    # 补充平仓记录中的价格到行情中，确保图表能显示这些日期
    for tx in transactions:
        d_str = tx.date if isinstance(tx.date, str) else tx.date.strftime('%Y-%m-%d')
        if d_str not in quote_map and tx.type == 'CLOSE_POSITION':
            quote_map[d_str] = DailyQuote(
                stock_id=stock_id,
                date=tx.date,
                open=tx.price,
                high=tx.price,
                low=tx.price,
                close=tx.price,
                volume=0,
                is_manual=False
            )
            
    # 重新排序
    final_quotes = sorted(quote_map.values(), key=lambda x: (x.date if isinstance(x.date, str) else x.date.strftime('%Y-%m-%d')))
    
    analyzer = PortfolioAnalyzer(transactions, final_quotes)
    timeline = analyzer.get_timeline()
    return {
        "snapshot": analyzer.get_snapshot(),
        "timeline": timeline[-7:] if len(timeline) > 7 else timeline
    }
