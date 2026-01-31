from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, date
from sqlmodel import Session, select
from database import engine
from models import Stock, DailyQuote
from services.market_data import fetch_realtime_quote, fetch_historical_quote, is_market_open, fetch_latest_quote
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def update_all_quotes():
    """
    更新所有股票的行情数据
    """
    logger.info("Starting quote update task...")
    
    with Session(engine) as session:
        stocks = session.exec(select(Stock)).all()
        today = date.today().strftime("%Y-%m-%d")
        
        for stock in stocks:
            try:
                # 检查今天的记录是否已存在
                existing_quote = session.exec(
                    select(DailyQuote).where(
                        DailyQuote.stock_id == stock.id,
                        DailyQuote.date == today
                    )
                ).first()
                
                if existing_quote and existing_quote.is_manual:
                    continue

                # 优先获取最新价格 (可能是实时或最近交易日)
                quote_data, quote_date = fetch_latest_quote(stock.symbol, stock.market)
                
                if quote_data:
                    # 如果返回的日期是今天，则更新/插入今天的记录
                    # 如果返回的是之前的日期，且数据库没有当天的价格，则作为最新价格插入
                    target_date = quote_date if quote_date else today
                    
                    target_quote = session.exec(
                        select(DailyQuote).where(
                            DailyQuote.stock_id == stock.id,
                            DailyQuote.date == target_date
                        )
                    ).first()
                    
                    if target_quote:
                        if not target_quote.is_manual:
                            target_quote.open = quote_data.get('open', target_quote.open)
                            target_quote.high = quote_data.get('high', target_quote.high)
                            target_quote.low = quote_data.get('low', target_quote.low)
                            target_quote.close = quote_data['close']
                            target_quote.volume = quote_data.get('volume', target_quote.volume)
                            session.add(target_quote)
                    else:
                        new_quote = DailyQuote(
                            stock_id=stock.id,
                            date=target_date,
                            open=quote_data.get('open', 0),
                            high=quote_data.get('high', 0),
                            low=quote_data.get('low', 0),
                            close=quote_data['close'],
                            volume=quote_data.get('volume', 0),
                            is_manual=False
                        )
                        session.add(new_quote)
                    
                    logger.info(f"Updated quote for {stock.symbol} on {target_date}: {quote_data['close']}")
                
            except Exception as e:
                logger.error(f"Error updating quote for {stock.symbol}: {e}")
                continue
        
        session.commit()
        logger.info("Quote update task completed.")

def start_scheduler():
    # ... (same as before)
    scheduler.add_job(
        update_all_quotes,
        trigger=CronTrigger(minute='*/5'),
        id='update_quotes_5min',
        name='Update stock quotes every 5 minutes',
        replace_existing=True
    )
    # ... other jobs
    scheduler.start()

# For simplicity, keeping the start_scheduler logic
def start_scheduler():
    scheduler.add_job(
        update_all_quotes,
        trigger=CronTrigger(minute='*/5'),
        id='update_quotes_5min',
        name='Update stock quotes every 5 minutes',
        replace_existing=True
    )
    scheduler.add_job(
        update_all_quotes,
        trigger=CronTrigger(hour=15, minute=5),
        id='update_quotes_cn_close',
        name='Update CN stock quotes after market close',
        replace_existing=True
    )
    scheduler.add_job(
        update_all_quotes,
        trigger=CronTrigger(hour=16, minute=5),
        id='update_quotes_hk_close',
        name='Update HK stock quotes after market close',
        replace_existing=True
    )
    scheduler.add_job(
        update_all_quotes,
        trigger=CronTrigger(hour=6, minute=5),
        id='update_quotes_us_close',
        name='Update US stock quotes after market close',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started successfully")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler stopped")
