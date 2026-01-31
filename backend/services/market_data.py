import akshare as ak
import yfinance as yf
from datetime import datetime, date, timedelta
import pandas as pd

def fetch_realtime_quote(symbol: str, market: str):
    """
    获取实时行情数据（开盘、最高、最低、收盘、成交量）
    """
    try:
        if market == "CN":
            # A股实时行情 - 添加重试机制
            max_retries = 3
            import time
            for attempt in range(max_retries):
                try:
                    df = ak.stock_zh_a_spot_em()
                    clean_symbol = str(symbol).zfill(6)
                    stock_data = df[df['代码'] == clean_symbol]
                    
                    if not stock_data.empty:
                        return {
                            'open': float(stock_data['今开'].values[0]),
                            'high': float(stock_data['最高'].values[0]),
                            'low': float(stock_data['最低'].values[0]),
                            'close': float(stock_data['最新价'].values[0]),
                            'volume': int(stock_data['成交量'].values[0]),
                            'is_closed': False
                        }
                    break # 如果成功获取到 df 但没有数据，不需要重试，直接退出
                except Exception as e:
                    if attempt == max_retries - 1:
                        print(f"Error fetching CN realtime data after {max_retries} attempts: {e}")
                        return None
                    time.sleep(2) # 等待 2 秒后重试
                
        elif market == "HK":
            # 港股实时行情
            try:
                ticker = f"{symbol}.HK"
                stock = yf.Ticker(ticker)
                info = stock.info
                
                return {
                    'open': info.get('open', 0),
                    'high': info.get('dayHigh', 0),
                    'low': info.get('dayLow', 0),
                    'close': info.get('currentPrice', info.get('previousClose', 0)),
                    'volume': info.get('volume', 0),
                    'is_closed': False
                }
            except Exception as e:
                print(f"Error fetching HK realtime data: {e}")
                return None
                
        elif market == "US":
            # 美股实时行情
            try:
                stock = yf.Ticker(symbol)
                info = stock.info
                
                return {
                    'open': info.get('open', 0),
                    'high': info.get('dayHigh', 0),
                    'low': info.get('dayLow', 0),
                    'close': info.get('currentPrice', info.get('previousClose', 0)),
                    'volume': info.get('volume', 0),
                    'is_closed': False
                }
            except Exception as e:
                print(f"Error fetching US realtime data: {e}")
                return None
                
    except Exception as e:
        print(f"Error in fetch_realtime_quote: {e}")
        return None

def fetch_historical_quote(symbol: str, market: str, target_date: str):
    """
    获取历史行情数据
    target_date: YYYY-MM-DD 格式
    """
    try:
        if market == "CN":
            try:
                clean_symbol = str(symbol).zfill(6)
                df = ak.stock_zh_a_hist(symbol=clean_symbol, period="daily", adjust="qfq")
                df['日期'] = pd.to_datetime(df['日期']).dt.strftime('%Y-%m-%d')
                stock_data = df[df['日期'] == target_date]
                
                if not stock_data.empty:
                    return {
                        'open': float(stock_data['开盘'].values[0]),
                        'high': float(stock_data['最高'].values[0]),
                        'low': float(stock_data['最低'].values[0]),
                        'close': float(stock_data['收盘'].values[0]),
                        'volume': int(stock_data['成交量'].values[0]),
                        'is_closed': True
                    }
            except Exception as e:
                print(f"Error fetching CN historical data: {e}")
                return None
                
        elif market in ["HK", "US"]:
            try:
                ticker = f"{symbol}.HK" if market == "HK" else symbol
                stock = yf.Ticker(ticker)
                hist = stock.history(start=target_date, end=(datetime.strptime(target_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d'))
                
                if not hist.empty:
                    return {
                        'open': float(hist['Open'].values[0]),
                        'high': float(hist['High'].values[0]),
                        'low': float(hist['Low'].values[0]),
                        'close': float(hist['Close'].values[0]),
                        'volume': int(hist['Volume'].values[0]),
                        'is_closed': True
                    }
            except Exception as e:
                print(f"Error fetching {market} historical data: {e}")
                return None
    except Exception as e:
        print(f"Error in fetch_historical_quote: {e}")
        return None

def fetch_latest_quote(symbol: str, market: str):
    """
    获取最新的行情数据（优先今天，否则最近一个交易日）
    """
    today_str = date.today().strftime("%Y-%m-%d")
    
    # 1. 尝试实时行情 (不仅在开盘时尝试，收盘后通常也包含最后价格)
    quote = fetch_realtime_quote(symbol, market)
    if quote:
        return quote, today_str
            
    # 2. 尝试历史记录 (Back fallback)
    try:
        if market == "CN":
            # 确保 symbol 是 6 位字符串
            clean_symbol = str(symbol).zfill(6)
            df = ak.stock_zh_a_hist(symbol=clean_symbol, period="daily", adjust="qfq")
            if not df.empty:
                latest = df.iloc[-1]
                return {
                    'open': float(latest['开盘']),
                    'high': float(latest['最高']),
                    'low': float(latest['最低']),
                    'close': float(latest['收盘']),
                    'volume': int(latest['成交量']),
                    'is_closed': True
                }, pd.to_datetime(latest['日期']).strftime('%Y-%m-%d')
        elif market in ["HK", "US"]:
            ticker = f"{symbol}.HK" if market == "HK" else symbol
            stock = yf.Ticker(ticker)
            hist = stock.history(period="1d")
            if not hist.empty:
                latest_date = hist.index[-1].strftime('%Y-%m-%d')
                return {
                    'open': float(hist['Open'].iloc[-1]),
                    'high': float(hist['High'].iloc[-1]),
                    'low': float(hist['Low'].iloc[-1]),
                    'close': float(hist['Close'].iloc[-1]),
                    'volume': int(hist['Volume'].iloc[-1]),
                    'is_closed': True
                }, latest_date
    except Exception as e:
        print(f"⚠️ Error in fetch_latest_quote for {symbol}: {e}")
        
    return None, None

def is_market_open(market: str):
    now = datetime.now()
    weekday = now.weekday()
    hour = now.hour
    minute = now.minute
    if weekday >= 5: return False
    
    if market == "CN":
        morning = (hour == 9 and minute >= 30) or (10 <= hour < 11) or (hour == 11 and minute < 30)
        afternoon = (13 <= hour < 15) or (hour == 15 and minute == 0)
        return morning or afternoon
    elif market == "HK":
        morning = (hour == 9 and minute >= 30) or (10 <= hour < 12) or (hour == 12 and minute == 0)
        afternoon = (13 <= hour < 16) or (hour == 16 and minute == 0)
        return morning or afternoon
    elif market == "US":
        # Simplified US market time check
        return hour >= 22 or hour < 6
    return False

def fetch_price(symbol: str, market: str, target_date: str = None):
    if target_date is None:
        quote, q_date = fetch_latest_quote(symbol, market)
        return quote['close'] if quote else None
    
    quote = fetch_historical_quote(symbol, market, target_date)
    if quote: return quote['close']
    
    if target_date == date.today().strftime("%Y-%m-%d"):
        realtime = fetch_realtime_quote(symbol, market)
        if realtime: return realtime['close']
    
    return None

def fetch_and_save_history(stock_id: int, symbol: str, market: str, days: int = 14):
    """
    获取最近 N 天的历史数据并保存到本地
    """
    try:
        if market == "CN":
            clean_symbol = str(symbol).zfill(6)
            df = ak.stock_zh_a_hist(symbol=clean_symbol, period="daily", adjust="qfq")
            if df.empty: return False
            
            # 取最近 N 条
            df = df.tail(days)
            from database import engine
            from sqlmodel import Session, select
            from models import DailyQuote
            with Session(engine) as session:
                for _, row in df.iterrows():
                    d_str = pd.to_datetime(row['日期']).strftime('%Y-%m-%d')
                    # 检查是否已存在
                    existing = session.exec(
                        select(DailyQuote).where(DailyQuote.stock_id == stock_id, DailyQuote.date == d_str)
                    ).first()
                    if not existing:
                        close_val = float(row['收盘'])
                        new_q = DailyQuote(
                            stock_id=stock_id,
                            date=d_str,
                            open=float(row['开盘']) if pd.notnull(row['开盘']) else close_val,
                            high=float(row['最高']) if pd.notnull(row['最高']) else close_val,
                            low=float(row['最低']) if pd.notnull(row['最低']) else close_val,
                            close=close_val,
                            volume=int(row['成交量']) if pd.notnull(row['成交量']) else 0,
                            is_manual=False
                        )
                        session.add(new_q)
                session.commit()
            return True
        elif market in ["HK", "US"]:
            ticker = f"{symbol}.HK" if market == "HK" else symbol
            stock = yf.Ticker(ticker)
            hist = stock.history(period=f"{days}d")
            if hist.empty: return False
            
            from database import engine
            from sqlmodel import Session, select
            from models import DailyQuote
            with Session(engine) as session:
                for idx, row in hist.iterrows():
                    d_str = idx.strftime('%Y-%m-%d')
                    existing = session.exec(
                        select(DailyQuote).where(DailyQuote.stock_id == stock_id, DailyQuote.date == d_str)
                    ).first()
                    if not existing:
                        close_val = float(row['Close'])
                        new_q = DailyQuote(
                            stock_id=stock_id,
                            date=d_str,
                            open=float(row['Open']) if pd.notnull(row['Open']) else close_val,
                            high=float(row['High']) if pd.notnull(row['High']) else close_val,
                            low=float(row['Low']) if pd.notnull(row['Low']) else close_val,
                            close=close_val,
                            volume=int(row['Volume']) if pd.notnull(row['Volume']) else 0,
                            is_manual=False
                        )
                        session.add(new_q)
                session.commit()
            return True
    except Exception as e:
        print(f"⚠️ Error syncing history for {symbol}: {e}")
    return False

def fetch_diagnosis_data(symbol: str):
    """
    获取股票详细诊断信息 (详细行情 + 基本面概要)
    """
    # 尝试自动判断市场 (简单逻辑: 6位数字且不是以 0 开头或特定规律通常是 A 股)
    # 或者尝试从 symbols 列表中匹配也可以，但为了通用，我们尝试多种方案
    
    market = "CN"
    if symbol.isalpha():
        market = "US"
    elif len(symbol) <= 5 and symbol.isdigit():
        market = "HK"
    
    try:
        if market == "CN":
            clean_symbol = str(symbol).zfill(6)
            df = ak.stock_individual_info_em(symbol=clean_symbol)
            if df.empty:
                return None
            
            # 转为字典
            info_dict = dict(zip(df['项目'], df['值']))
            
            # 获取实时价格
            realtime = fetch_realtime_quote(clean_symbol, "CN")
            
            return {
                "symbol": clean_symbol,
                "name": info_dict.get("股票简称"),
                "market": "CN",
                "price": realtime['close'] if realtime else None,
                "details": {
                    "total_market_cap": info_dict.get("总市值"),
                    "circulating_market_cap": info_dict.get("流通市值"),
                    "pe_ratio": info_dict.get("市盈率-动态"),
                    "pb_ratio": info_dict.get("市净率"),
                    "industry": info_dict.get("行业"),
                    "area": info_dict.get("地区")
                },
                "status": "Success",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        
        elif market in ["HK", "US"]:
            ticker = f"{symbol}.HK" if market == "HK" else symbol
            stock = yf.Ticker(ticker)
            info = stock.info
            
            return {
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "market": market,
                "price": info.get("currentPrice", info.get("previousClose")),
                "details": {
                    "total_market_cap": info.get("marketCap"),
                    "pe_ratio": info.get("trailingPE"),
                    "forward_pe": info.get("forwardPE"),
                    "dividend_yield": info.get("dividendYield"),
                    "industry": info.get("industry"),
                    "summary": info.get("longBusinessSummary", "")[:200] + "..."
                },
                "status": "Success",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
    except Exception as e:
        print(f"Error in fetch_diagnosis_data: {e}")
        return None
    
    return None
