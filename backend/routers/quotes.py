from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Stock, DailyQuote
from services.market_data import fetch_price
from datetime import datetime

from services.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/quotes", tags=["quotes"])

@router.post("/manual-update")
def manual_update_quotes(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """
    手动触发行情更新
    """
    from services.scheduler import update_all_quotes
    
    # Check if user is admin or allowed? For now, any logged-in user can trigger.
    try:
        update_all_quotes()
        return {"status": "success", "message": "Quote update triggered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.get("/fetch-price")
def get_historical_price(stock_id: int, date: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """
    获取特定日期的收盘价价格，优先从本地数据库获取
    """
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # 1. First check local database
    existing_quote = session.exec(
        select(DailyQuote).where(
            DailyQuote.stock_id == stock_id,
            DailyQuote.date == date
        )
    ).first()
    
    if existing_quote:
        return {"price": existing_quote.close, "source": "local"}
    
    # 2. If not in DB, fetch from internet
    from services.market_data import fetch_price
    price = fetch_price(stock.symbol, stock.market, date)
    
    if price is None:
        print(f"❌ Failed to fetch price for {stock.symbol} on {date}")
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {stock.symbol} on {date}")
        
    return {"price": price, "source": "remote"}

@router.get("/{stock_id}")
def get_quotes(stock_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Verify ownership
    stock = session.exec(select(Stock).where(Stock.id == stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    statement = select(DailyQuote).where(DailyQuote.stock_id == stock_id).order_by(DailyQuote.date)
    quotes = session.exec(statement).all()
    return quotes

@router.post("/")
def record_manual_quote(quote: DailyQuote, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """
    Manually record or update a quote for a specific date.
    Manual entries take precedence and won't be overwritten by the scheduler.
    """
    # Verify ownership
    stock = session.exec(select(Stock).where(Stock.id == quote.stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found or forbidden")

    existing = session.exec(
        select(DailyQuote).where(
            DailyQuote.stock_id == quote.stock_id,
            DailyQuote.date == quote.date
        )
    ).first()
    
    if existing:
        existing.close = quote.close
        existing.open = quote.open if quote.open else existing.open
        existing.high = quote.high if quote.high else existing.high
        existing.low = quote.low if quote.low else existing.low
        existing.volume = quote.volume if quote.volume else existing.volume
        existing.is_manual = True
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    else:
        quote.is_manual = True
        session.add(quote)
        session.commit()
        session.refresh(quote)
        return quote
