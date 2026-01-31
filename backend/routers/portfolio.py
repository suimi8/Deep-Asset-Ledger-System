from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import Stock, Transaction, DailyQuote
from services.analytics import PortfolioAnalyzer
from datetime import date, timedelta
from services.auth import get_current_user
from models import User


router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

@router.get("/stats")
def get_portfolio_stats(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stocks = session.exec(select(Stock).where(Stock.user_id == current_user.id)).all()
    
    total_net_worth = 0.0
    total_unrealized_pnl = 0.0
    total_realized_pnl = 0.0
    total_purchase_cost = 0.0
    
    total_daily_pnl = 0.0
    active_stock_count = 0
    
    for stock in stocks:
        transactions = session.exec(select(Transaction).where(Transaction.stock_id == stock.id)).all()
        quotes = session.exec(select(DailyQuote).where(DailyQuote.stock_id == stock.id)).all()
        
        analyzer = PortfolioAnalyzer(transactions, quotes)
        snapshot = analyzer.get_snapshot()
        
        total_net_worth += snapshot["market_value"]
        total_unrealized_pnl += snapshot["unrealized_pnl"]
        total_realized_pnl += snapshot["realized_pnl"]
        total_purchase_cost += snapshot.get("total_cost", 0)
        
        if snapshot["holdings_qty"] > 0:
            active_stock_count += 1
            
        # Calculate Daily P/L based on the last two available quotes
        if len(quotes) >= 2:
            latest_quote = quotes[-1]
            prev_close = quotes[-2].close
            daily_change = latest_quote.close - prev_close
            total_daily_pnl += daily_change * snapshot["holdings_qty"]

    total_pnl = total_unrealized_pnl + total_realized_pnl
    
    # PnL percentage should be relative to total invested capital
    pnl_percent = (total_pnl / total_purchase_cost * 100) if total_purchase_cost > 0 else 0
    daily_pnl_percent = (total_daily_pnl / total_net_worth * 100) if total_net_worth > 0 else 0
    
    return {
        "net_worth": total_net_worth,
        "total_pnl": total_pnl,
        "daily_pnl": total_daily_pnl,
        "total_pnl_percent": pnl_percent,
        "daily_pnl_percent": daily_pnl_percent,
        "stock_count": active_stock_count
    }

@router.get("/chart")
def get_portfolio_chart(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """
    获取过去7天的每日总盈亏状况（累计，严格连续7天）
    """
    stocks = session.exec(select(Stock).where(Stock.user_id == current_user.id)).all()
    
    # 合并所有股票的 timeline
    master_timeline = {}
    for stock in stocks:
        txs = session.exec(select(Transaction).where(Transaction.stock_id == stock.id)).all()
        quotes = session.exec(select(DailyQuote).where(DailyQuote.stock_id == stock.id)).all()
        
        analyzer = PortfolioAnalyzer(txs, quotes)
        timeline = analyzer.get_timeline()
        
        for entry in timeline:
            d_str = entry["date"]
            if d_str not in master_timeline:
                master_timeline[d_str] = {"pnl": 0.0, "market_value": 0.0}
            master_timeline[d_str]["pnl"] += entry["total_pnl"]
            master_timeline[d_str]["market_value"] += entry["market_value"]
            
    if not master_timeline:
        return []

    today = date.today()
    
    # 我们需要 7 天的数据点，外加一个起始点来计算第一天的变化
    # 也就是从 today-7 到 today，总共 8 个点用于计算 7 个变动
    chart_data = []
    
    # 首先获取历史数据中所有可用的日期排序
    all_known_dates = sorted(master_timeline.keys())
    
    for i in range(7, -1, -1):
        target_date = today - timedelta(days=i)
        d_str = target_date.isoformat()
        
        # 寻找该日期或之前最近的一天数据
        day_data = None
        if d_str in master_timeline:
            day_data = master_timeline[d_str]
        else:
            # 找最后一个小于等于 target_date 的日期
            for prev_date in reversed(all_known_dates):
                if prev_date <= d_str:
                    day_data = master_timeline[prev_date]
                    break
        
        if not day_data:
            day_data = {"pnl": 0.0, "market_value": 0.0}
            
        chart_data.append({
            "name": d_str,
            "date": d_str,
            "pnl": round(day_data["pnl"], 2),
            "market_value": round(day_data["market_value"], 2)
        })

    # 计算每日变动
    final_data = []
    for i in range(1, len(chart_data)):
        prev = chart_data[i-1]
        curr = chart_data[i]
        
        daily_change = curr["pnl"] - prev["pnl"]
        dt = date.fromisoformat(curr["date"])
        
        final_data.append({
            **curr,
            "day": dt.strftime("%a"),
            "daily_change": round(daily_change, 2)
        })
        
    return final_data
